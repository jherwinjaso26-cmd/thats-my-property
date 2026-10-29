package game;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
import io.javalin.websocket.WsContext;

import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/** "That's My Property" - lobby server (step 1-2). The server owns all state. */
public class Main {
    static final ObjectMapper JSON = new ObjectMapper();
    static final Object LOCK = new Object();
    static final Map<String, Room> rooms = new HashMap<>();
    static final Map<String, Player> bySession = new HashMap<>();
    static final int MAX_PLAYERS = 15;
    static final int CHARS = 20; // more characters than max players, so everyone can pick a unique one
    static final long IDLE_MS = 120_000;
    static final Set<String> MAPS = Set.of("forest", "desert", "snow", "lava", "swamp", "beach", "candy", "space", "autumn", "ruins");
    static final Set<String> TEAMS = Set.of("red", "blue", "green", "yellow");

    static class Player {
        String id, name, team = "red";
        int character;
        WsContext ctx;
        Room room;
        long lastActive = System.currentTimeMillis();
    }

    static class Room {
        String code, map = "forest", mode = "solo";
        int target = 5;
        Player host;
        Game game;
        final List<Player> players = new ArrayList<>();
    }

    public static void main(String[] args) {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        Javalin app = Javalin.create(c -> c.staticFiles.add("/public", Location.CLASSPATH));
        app.ws("/ws", ws -> {
            ws.onConnect(ctx -> ctx.enableAutomaticPings(20, TimeUnit.SECONDS));
            ws.onMessage(ctx -> {
                try {
                    handle(ctx, JSON.readTree(ctx.message()));
                } catch (Exception e) {
                    send(ctx, msg("error", "Bad request"));
                }
            });
            ws.onClose(ctx -> {
                synchronized (LOCK) {
                    Player p = bySession.get(ctx.sessionId());
                    if (p != null) leave(p);
                }
            });
        });
        Executors.newSingleThreadScheduledExecutor()
                .scheduleAtFixedRate(Main::sweepIdle, 5, 5, TimeUnit.SECONDS);
        app.start(port);
    }

    static void handle(WsContext ctx, JsonNode m) {
        String t = m.path("t").asText();
        synchronized (LOCK) {
            Player p = bySession.get(ctx.sessionId());
            if (p == null) {
                if (!t.equals("create") && !t.equals("join")) return;
                String name = clean(m.path("name").asText(), 12);
                if (name.isEmpty()) { send(ctx, msg("error", "Enter a username")); return; }
                Room r;
                if (t.equals("create")) {
                    r = new Room();
                    r.code = newCode();
                    rooms.put(r.code, r);
                } else {
                    r = rooms.get(m.path("code").asText().trim().toUpperCase());
                    if (r == null) { send(ctx, msg("error", "Room not found")); return; }
                    if (r.players.size() >= MAX_PLAYERS) { send(ctx, msg("error", "Room is full (max " + MAX_PLAYERS + ")")); return; }
                }
                p = new Player();
                p.id = UUID.randomUUID().toString().substring(0, 6);
                p.name = uniqueName(r, name);
                p.ctx = ctx;
                p.room = r;
                p.character = freeCharacter(r);
                r.players.add(p);
                if (r.host == null) r.host = p;
                bySession.put(ctx.sessionId(), p);
                broadcast(r);
                return;
            }
            p.lastActive = System.currentTimeMillis();
            Room r = p.room;
            switch (t) {
                case "profile" -> {
                    if (r.game != null) return;
                    int ch = Math.max(0, Math.min(CHARS - 1, m.path("character").asInt(p.character)));
                    boolean taken = false;
                    for (Player q : r.players) if (q != p && q.character == ch) taken = true;
                    if (taken) send(p.ctx, msg("error", "That character is already taken"));
                    else p.character = ch;
                    String team = m.path("team").asText(p.team);
                    if (TEAMS.contains(team)) p.team = team;
                    broadcast(r);
                }
                case "settings" -> {
                    if (r.host != p || r.game != null) return;
                    String map = m.path("map").asText(r.map), mode = m.path("mode").asText(r.mode);
                    if (MAPS.contains(map)) r.map = map;
                    if (mode.equals("solo") || mode.equals("team")) r.mode = mode;
                    r.target = Math.max(1, Math.min(10, m.path("target").asInt(r.target)));
                    broadcast(r);
                }
                case "chat" -> {
                    String text = clean(m.path("text").asText(), 120);
                    if (text.isEmpty()) return;
                    ObjectNode n = JSON.createObjectNode();
                    n.put("t", "chat").put("from", p.name).put("text", text);
                    for (Player q : r.players) send(q.ctx, n);
                }
                case "kick" -> {
                    if (r.host != p || r.game != null) return;
                    Player target = null;
                    for (Player q : r.players) if (q.id.equals(m.path("id").asText())) target = q;
                    if (target == null || target == p) return;
                    send(target.ctx, msg("kicked", "You were kicked by the host"));
                    leave(target);
                    target.ctx.closeSession();
                }
                case "start" -> {
                    if (r.host == p && r.game == null) {
                        if (r.players.size() < 2) send(p.ctx, msg("error", "Need at least 2 players"));
                        else r.game = new Game(r);
                    }
                }
                case "input" -> { if (r.game != null) r.game.input(p, m.path("x").asDouble(), m.path("y").asDouble()); }
                case "dash" -> { if (r.game != null) r.game.dash(p); }
                case "use" -> { if (r.game != null) r.game.use(p); }
                case "leave" -> { leave(p); }
                default -> { } // "active" heartbeat only refreshes lastActive
            }
        }
    }

    static void leave(Player p) {
        Room r = p.room;
        if (r == null) return;
        r.players.remove(p);
        bySession.remove(p.ctx.sessionId());
        p.room = null;
        if (r.players.isEmpty()) {
            if (r.game != null) r.game.stop();
            rooms.remove(r.code);
            return;
        }
        if (r.host == p) r.host = r.players.get(0);
        if (r.game != null) r.game.remove(p); // ends the match if fewer than 2 remain
        if (r.game == null) broadcast(r);
    }

    /** Kicks lobby players with no user input for IDLE_MS. */
    static void sweepIdle() {
        synchronized (LOCK) {
            long now = System.currentTimeMillis();
            for (Player p : new ArrayList<>(bySession.values())) {
                if (now - p.lastActive > IDLE_MS) {
                    send(p.ctx, msg("kicked", "Removed for inactivity"));
                    leave(p);
                    p.ctx.closeSession();
                }
            }
        }
    }

    static void broadcast(Room r) {
        for (Player viewer : r.players) {
            ObjectNode n = JSON.createObjectNode();
            n.put("t", "lobby").put("code", r.code).put("hostId", r.host.id).put("you", viewer.id);
            n.put("map", r.map).put("mode", r.mode).put("target", r.target);
            ArrayNode arr = n.putArray("players");
            for (Player q : r.players) {
                arr.addObject().put("id", q.id).put("name", q.name)
                        .put("character", q.character).put("team", q.team);
            }
            send(viewer.ctx, n);
        }
    }

    static ObjectNode msg(String type, String text) {
        return JSON.createObjectNode().put("t", type).put("msg", text);
    }

    static void send(WsContext ctx, ObjectNode n) { sendRaw(ctx, n.toString()); }

    static void sendRaw(WsContext ctx, String s) {
        try { ctx.send(s); } catch (Exception ignored) { }
    }

    /** A random character nobody in the room is using yet. */
    static int freeCharacter(Room r) {
        boolean[] used = new boolean[CHARS];
        for (Player q : r.players) used[q.character] = true;
        List<Integer> free = new ArrayList<>();
        for (int i = 0; i < CHARS; i++) if (!used[i]) free.add(i);
        return free.isEmpty() ? 0 : free.get(new Random().nextInt(free.size()));
    }

    static String clean(String s, int max) {
        s = s.replaceAll("[<>]", "").trim();
        return s.length() > max ? s.substring(0, max) : s;
    }

    static String uniqueName(Room r, String name) {
        String n = name;
        int i = 2;
        boolean clash = true;
        while (clash) {
            clash = false;
            for (Player q : r.players) if (q.name.equalsIgnoreCase(n)) { clash = true; n = name + i++; break; }
        }
        return n;
    }

    static String newCode() {
        String abc = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        Random rnd = new Random();
        String c;
        do {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 4; i++) sb.append(abc.charAt(rnd.nextInt(abc.length())));
            c = sb.toString();
        } while (rooms.containsKey(c));
        return c;
    }
}
