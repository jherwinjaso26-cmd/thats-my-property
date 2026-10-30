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

/** "That's My Property" - lobby server. The server owns all state. */
public class Main {
    static final ObjectMapper JSON = new ObjectMapper();
    static final Object LOCK = new Object();
    static final Map<String, Room> rooms = new HashMap<>();
    static final Map<String, Player> bySession = new HashMap<>();
    static final Map<String, Player> byToken = new HashMap<>();
    static final int MAX_PLAYERS = 15;
    static final int MAX_ROOMS = 200;
    static final int CHARS = 20; // more characters than max players, so everyone can pick a unique one
    static final long IDLE_MS = 120_000;   // no input at all for 2 minutes = removed
    static final long GRACE_MS = 15_000;   // a dropped connection keeps its seat this long
    static final Set<String> MAPS = Set.of("forest", "desert", "snow", "lava", "swamp", "beach", "candy", "space", "autumn", "ruins");
    static final Set<String> TEAMS = Set.of("red", "blue", "green", "yellow");
    static final List<String> TEAM_LIST = List.of("red", "blue", "green", "yellow");
    static final String[] BOT_NAMES = {"Rex", "Mia", "Zed", "Pip", "Kai", "Nova", "Bolt", "Dot", "Juno", "Otto"};

    static class Player {
        String id, name, team = "red", token, sid;
        int character;
        boolean ready, bot;
        WsContext ctx;          // null for bots and while a player is reconnecting
        Room room;
        long lastActive = System.currentTimeMillis(), discAt, lastChat, lastEmote, tokenAt = System.currentTimeMillis();
        double tokens = 80;     // message budget (rate limit)
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
        app.get("/health", ctx -> ctx.result("ok")); // for uptime pings (keeps Render awake)
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
                    Player p = bySession.remove(ctx.sessionId());
                    if (p != null) disconnected(p);
                }
            });
        });
        Executors.newSingleThreadScheduledExecutor()
                .scheduleAtFixedRate(Main::sweep, 5, 3, TimeUnit.SECONDS);
        app.start(port);
    }

    static void handle(WsContext ctx, JsonNode m) {
        String t = m.path("t").asText();
        synchronized (LOCK) {
            Player p = bySession.get(ctx.sessionId());
            if (p == null) {
                if (t.equals("resume")) { resume(ctx, m.path("token").asText()); return; }
                if (!t.equals("create") && !t.equals("join")) return;
                String name = clean(m.path("name").asText(), 12);
                if (name.isEmpty()) { send(ctx, msg("error", "Enter a username")); return; }
                Room r;
                if (t.equals("create")) {
                    if (rooms.size() >= MAX_ROOMS) { send(ctx, msg("error", "Servers are busy, try again soon")); return; }
                    r = new Room();
                    r.code = newCode();
                    rooms.put(r.code, r);
                } else {
                    r = rooms.get(m.path("code").asText().trim().toUpperCase());
                    if (r == null) { send(ctx, msg("error", "Room not found")); return; }
                    if (r.game != null) { send(ctx, msg("error", "A match is in progress - try again when it ends")); return; }
                    if (r.players.size() >= MAX_PLAYERS) { send(ctx, msg("error", "Room is full (max " + MAX_PLAYERS + ")")); return; }
                }
                p = new Player();
                p.id = UUID.randomUUID().toString().substring(0, 6);
                p.token = UUID.randomUUID().toString();
                p.name = uniqueName(r, name);
                p.ctx = ctx;
                p.sid = ctx.sessionId();
                p.room = r;
                p.character = freeCharacter(r);
                r.players.add(p);
                if (r.host == null) r.host = p;
                bySession.put(p.sid, p);
                byToken.put(p.token, p);
                sendWelcome(p);
                broadcast(r);
                return;
            }
            long now = System.currentTimeMillis();
            p.tokens = Math.min(80, p.tokens + (now - p.tokenAt) / 1000.0 * 50); // ~50 msgs/sec sustained
            p.tokenAt = now;
            if (p.tokens < 1) return; // rate limited
            p.tokens -= 1;
            p.lastActive = now;
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
                case "ready" -> {
                    if (r.game != null) return;
                    p.ready = m.path("ready").asBoolean(!p.ready);
                    broadcast(r);
                }
                case "addbot" -> {
                    if (r.host != p || r.game != null) return;
                    if (r.players.size() >= MAX_PLAYERS) { send(p.ctx, msg("error", "Room is full (max " + MAX_PLAYERS + ")")); return; }
                    Random rnd = new Random();
                    Player b = new Player();
                    b.id = UUID.randomUUID().toString().substring(0, 6);
                    b.bot = true;
                    b.ready = true;
                    b.room = r;
                    b.name = uniqueName(r, "Bot " + BOT_NAMES[rnd.nextInt(BOT_NAMES.length)]);
                    b.character = freeCharacter(r);
                    b.team = TEAM_LIST.get(rnd.nextInt(TEAM_LIST.size()));
                    r.players.add(b);
                    broadcast(r);
                }
                case "chat" -> {
                    if (now - p.lastChat < 600) return;
                    p.lastChat = now;
                    String text = clean(m.path("text").asText(), 120);
                    if (text.isEmpty()) return;
                    ObjectNode n = JSON.createObjectNode();
                    n.put("t", "chat").put("from", p.name).put("text", text);
                    for (Player q : r.players) send(q.ctx, n);
                }
                case "emote" -> {
                    if (r.game != null && now - p.lastEmote > 1200) {
                        p.lastEmote = now;
                        r.game.emote(p, m.path("e").asInt(-1));
                    }
                }
                case "kick" -> {
                    if (r.host != p || r.game != null) return;
                    Player target = null;
                    for (Player q : r.players) if (q.id.equals(m.path("id").asText())) target = q;
                    if (target == null || target == p) return;
                    send(target.ctx, msg("kicked", "You were kicked by the host"));
                    WsContext tc = target.ctx;
                    leave(target);
                    if (tc != null) tc.closeSession();
                }
                case "start" -> {
                    if (r.host == p && r.game == null) {
                        if (r.players.size() < 2) send(p.ctx, msg("error", "Need at least 2 players (add a bot to practice alone)"));
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

    /** A dropped connection comes back with its token and takes its seat again. */
    static void resume(WsContext ctx, String token) {
        Player p = byToken.get(token);
        if (p == null || p.room == null) { send(ctx, msg("resumefail", "Your seat was released")); return; }
        if (p.sid != null) bySession.remove(p.sid);
        WsContext old = p.ctx;
        p.ctx = ctx;
        p.sid = ctx.sessionId();
        p.discAt = 0;
        p.lastActive = System.currentTimeMillis();
        bySession.put(p.sid, p);
        if (old != null && old != ctx) {
            try { old.closeSession(); } catch (Exception ignored) { }
        }
        sendWelcome(p);
        Room r = p.room;
        if (r.game != null) r.game.resync(p);
        else broadcast(r);
    }

    static void disconnected(Player p) {
        p.ctx = null;
        p.sid = null;
        p.discAt = System.currentTimeMillis();
        Room r = p.room;
        if (r == null) return;
        if (r.game != null) r.game.disconnected(p);
        else broadcast(r);
    }

    static void leave(Player p) {
        Room r = p.room;
        if (r == null) return;
        r.players.remove(p);
        if (p.sid != null) bySession.remove(p.sid);
        if (p.token != null) byToken.remove(p.token);
        p.room = null;
        boolean humans = false;
        for (Player q : r.players) if (!q.bot) humans = true;
        if (!humans) { // only bots (or nobody) left: close the room
            if (r.game != null) r.game.stop();
            r.game = null;
            r.players.clear();
            rooms.remove(r.code);
            return;
        }
        if (r.host == p || r.host == null || !r.players.contains(r.host)) {
            for (Player q : r.players) if (!q.bot) { r.host = q; break; }
        }
        boolean inGame = r.game != null;
        if (inGame) r.game.remove(p); // ends the match if fewer than 2 remain (and broadcasts the lobby then)
        else broadcast(r);
    }

    /** Drops players who vanished for too long and kicks players with no input for IDLE_MS. */
    static void sweep() {
        try {
            synchronized (LOCK) {
                long now = System.currentTimeMillis();
                for (Room r : new ArrayList<>(rooms.values())) {
                    for (Player p : new ArrayList<>(r.players)) {
                        if (p.bot) continue;
                        if (p.ctx == null) {
                            if (now - p.discAt > GRACE_MS) leave(p);
                        } else if (now - p.lastActive > IDLE_MS) {
                            WsContext pc = p.ctx;
                            send(pc, msg("kicked", "Removed for inactivity"));
                            leave(p);
                            pc.closeSession();
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace(); // never let an exception cancel the periodic task
        }
    }

    static void broadcast(Room r) {
        for (Player viewer : r.players) lobbyTo(viewer, r);
    }

    static void lobbyTo(Player viewer, Room r) {
        if (viewer.ctx == null || r.host == null) return;
        ObjectNode n = JSON.createObjectNode();
        n.put("t", "lobby").put("code", r.code).put("hostId", r.host.id).put("you", viewer.id).put("max", MAX_PLAYERS);
        n.put("map", r.map).put("mode", r.mode).put("target", r.target);
        ArrayNode arr = n.putArray("players");
        for (Player q : r.players) {
            arr.addObject().put("id", q.id).put("name", q.name)
                    .put("character", q.character).put("team", q.team)
                    .put("ready", q.ready).put("bot", q.bot).put("off", q.ctx == null && !q.bot);
        }
        send(viewer.ctx, n);
    }

    static void sendWelcome(Player p) {
        ObjectNode n = JSON.createObjectNode();
        n.put("t", "welcome").put("token", p.token).put("you", p.id).put("code", p.room.code);
        send(p.ctx, n);
    }

    static ObjectNode msg(String type, String text) {
        return JSON.createObjectNode().put("t", type).put("msg", text);
    }

    static void send(WsContext ctx, ObjectNode n) { sendRaw(ctx, n.toString()); }

    static void sendRaw(WsContext ctx, String s) {
        if (ctx == null) return;
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
        s = s.replaceAll("[<>\\p{Cntrl}]", "").trim();
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
