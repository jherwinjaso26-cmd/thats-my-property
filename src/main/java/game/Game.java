package game;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.*;
import java.util.concurrent.*;

/** One running match. Every method runs while holding Main.LOCK. */
class Game {
    static final double R = 18, SPEED = 240, DASH_SPEED = 720, TRAP_R = 20, PROT_BONUS = 1.06;
    static final long DASH_MS = 180, DASH_CD = 3000, HOLD_MS = 30_000, STEAL_GRACE = 1500, BACK_LOCK = 3000, DROWN_MS = 2500;
    static final String[] DISASTERS = {"METEOR", "LIGHTNING", "TORNADO", "FLOOD", "SINKHOLE", "HAIL", "BOULDER"};
    static final String[] MODS = {"NIGHT", "SPEEDY"};
    static final String[] POWERS = {"speed", "shield", "trap", "freeze", "smoke", "swap", "decoy", "magnet", "jump", "reveal", "ghost", "tele", "mine"};
    static final ScheduledExecutorService SCH = Executors.newScheduledThreadPool(2, r -> {
        Thread t = new Thread(r, "game-tick");
        t.setDaemon(true);
        return t;
    });

    enum Ph { ROLE, COUNT, PLAY, SCORE, OVER }

    static class Gp {
        Main.Player p;
        double x, y, dx, dy, fx = 1, fy = 0, ddx = 1, ddy = 0, vx, vy;
        double skill = 0.6 + Math.random() * 0.4, wander = Math.random() * 6.28; // bot behaviour
        long dashUntil, dashReady, speedUntil, shieldUntil, frozenUntil, trappedUntil, wetSince, padUntil, tpUntil, smokeUntil, magnetUntil, ghostUntil, abilityReady, heldMs;
        boolean alive = true, hasTrap, off;
        int steals, deaths, blocks; // stats for the end-of-match awards
        int streak;                 // steals in a row (3 in a row = speed boost)
        String lastRobber;          // who last stole from this player (stealing back = revenge shield)
    }

    /** Hazard: "m" meteor, "l" lightning, "h" hail, "s" sinkhole (warn, then hit; sinkholes stay open), "t" tornado (chases players), "b" boulder (warns, then rolls across the map). */
    static class Hz {
        int id;
        String k;
        double x, y, r, vx, vy;
        long hitAt;
    }

    /** A bear trap placed by a player. It arms shortly after placing and snaps on anyone except its owner. */
    static class Bt {
        int id;
        double x, y;
        String owner;
        long armAt;
        boolean mine;   // a mine throws players back instead of trapping them
    }

    /** Map terrain: "ice" slide, "slow" mud/sand/shallows (p = speed factor), "bush" hides, "bounce" pad, "portal" (link = partner index), "lava" kills. */
    static class Zn {
        String k;
        double x, y, r, p = 1;
        int link = -1;
    }

    /** A fake copy of a player (decoy lucky item). */
    static class Dc {
        double x, y;
        Gp owner;
        long until;
    }

    final Main.Room room;
    final double W, H;
    final boolean team, blitz, shrink, potato, dbl, survivor, hotswap, arena, chaos;
    final double abCd;   // ability cooldown factor (chaos = recharge twice as fast)
    final long holdMs;
    String roleId;              // this round's special-role player (null = nobody)
    String role = "";            // "sprinter" (+15% speed) or "grabber" (longer steal reach)
    final int target;
    final Random rnd = new Random();
    final int seed = rnd.nextInt();
    final List<double[]> obs = new ArrayList<>();   // x, y, radius, variant
    final List<double[]> traps = new ArrayList<>(); // x, y
    final List<Hz> hz = new ArrayList<>();
    final List<double[]> blocks = new ArrayList<>(); // lucky blocks: id, x, y
    final List<double[]> holes = new ArrayList<>();  // open sinkholes: x, y, radius
    final List<Zn> zones = new ArrayList<>();
    final List<Dc> decoys = new ArrayList<>();
    double fx, fy;                                    // flood: how far the water has risen from each edge
    final List<Bt> bears = new ArrayList<>();
    final Map<String, Gp> gp = new LinkedHashMap<>();
    final Map<String, Integer> scores = new HashMap<>();
    String holder, prevHolder, disaster = "", mod = "", lastBlocksSig = "", lastBearsSig = "";
    String holder2, prevHolder2;  // the second property in "double" mode (null otherwise)
    long lastSwap2, backLockUntil2;
    int round, hzId, lastHoles = -1;
    boolean forceFull = true;
    Ph ph;
    long phaseEnd, lastSwap, backLockUntil, nextHz, nextBlock, last = System.currentTimeMillis();
    ObjectNode lastScores;
    ScheduledFuture<?> task;

    Game(Main.Room room) {
        this.room = room;
        int n = room.players.size();
        int big = Math.min(n, 6), extra = Math.max(0, n - 6);
        arena = room.mode.equals("arena");     // small arena: everything is close together
        double sc = arena ? 0.62 : 1.0;
        W = (1000 + 250 * big + 120 * extra) * sc;   // more players = bigger map (grows slower past 6)
        H = (650 + 160 * big + 80 * extra) * sc;
        team = room.mode.equals("team");
        blitz = room.mode.equals("blitz");     // short 15s rounds, everyone always speedy
        survivor = room.mode.equals("survivor"); // the arena closes in and the last one standing wins the round
        shrink = room.mode.equals("shrink") || survivor;   // the arena closes in every round
        hotswap = room.mode.equals("hotswap"); // the property jumps to a random player every few seconds
        chaos = room.mode.equals("chaos");     // lucky blocks twice as often, abilities recharge twice as fast
        abCd = chaos ? 0.5 : 1.0;
        dbl = room.mode.equals("double");       // two properties at once
        potato = room.mode.equals("potato");   // the longer you hold the property, the slower you get
        holdMs = blitz ? 15_000 : HOLD_MS;
        target = room.target;
        for (Main.Player p : room.players) { Gp g = new Gp(); g.p = p; gp.put(p.id, g); }
        addObstacles((int) (W * H / 90000));
        MapFeatures.build(this);
        broadcast(initMsg(null));
        startRound();
        task = SCH.scheduleAtFixedRate(this::tick, 33, 33, TimeUnit.MILLISECONDS);
    }

    int sendCount = 0;

    double tickMs;   // how long a game step takes (shown on screen so lag can be traced)

    void tick() {
        synchronized (Main.LOCK) {
            long t0 = System.nanoTime();
            try { step(); } catch (Exception e) { e.printStackTrace(); }
            tickMs = tickMs * 0.9 + (System.nanoTime() - t0) / 1e6 * 0.1;
        }
    }

    void step() {
        long now = System.currentTimeMillis();
        double dt = Math.min(0.1, (now - last) / 1000.0);
        last = now;
        switch (ph) {
            case ROLE -> { if (now >= phaseEnd) { ph = Ph.COUNT; phaseEnd = now + 3000; } }
            case COUNT -> {
                if (now >= phaseEnd) { ph = Ph.PLAY; phaseEnd = now + holdMs; nextHz = now + 3000; nextBlock = now + 10_000; startDisaster(); }
            }
            case PLAY -> {
                for (Gp g : gp.values()) if (g.p.bot) Bots.think(this, g, now);
                move(dt, now);
                Gp hg = gp.get(holder);
                if (hg != null && hg.alive) hg.heldMs += (long) (dt * 1000);
                Gp hg2 = holder2 == null ? null : gp.get(holder2);
                if (hg2 != null && hg2.alive) hg2.heldMs += (long) (dt * 1000);
                if (hotswap && now - lastSwap >= 9000) hotSwap(now);
                steals(now);
                hazards(now, dt);
                flood(now);
                powerups(now);
                decoys.removeIf(d -> now >= d.until);
                if (aliveCount() <= 1 || now >= phaseEnd) endRound(now); // timer never resets on steals
            }
            case SCORE -> { if (now >= phaseEnd) startRound(); }
            case OVER -> { if (now >= phaseEnd) { finish(); return; } }
        }
        // physics still runs at 30/s, but only 2 of every 3 steps are sent (20 updates/s): less CPU and bandwidth, the client smooths the rest
        int skip = gp.size() >= 10 ? 2 : 3; // big matches send fewer updates (15/s instead of 20/s) to save bandwidth and CPU
        if (++sendCount % skip != 0) broadcast(stateMsg(now));
    }

    // ---------- messages ----------

    ObjectNode evt(String k) { return Main.JSON.createObjectNode().put("t", "ev").put("k", k); }

    ObjectNode initMsg(String you) {
        ObjectNode init = Main.JSON.createObjectNode();
        init.put("t", "init").put("w", (int) W).put("h", (int) H).put("map", room.map)
            .put("seed", seed).put("mode", room.mode).put("target", target).put("hold", (int) (holdMs / 1000));
        if (you != null) init.put("you", you);
        ArrayNode a = init.putArray("players");
        for (Gp g : gp.values())
            a.addObject().put("id", g.p.id).put("name", g.p.name).put("character", g.p.character).put("team", g.p.team).put("acc", g.p.acc);
        return init;
    }

    ObjectNode roundMsg() {
        ObjectNode n = Main.JSON.createObjectNode();
        n.put("t", "round").put("round", round).put("holder", holder).put("holder2", holder2).put("disaster", disaster).put("mod", mod);
        ArrayNode a = n.putArray("obstacles");
        for (double[] o : obs) a.addArray().add((int) o[0]).add((int) o[1]).add((int) o[2]).add((int) o[3]);
        ArrayNode tr = n.putArray("traps");
        for (double[] t : traps) tr.addArray().add((int) t[0]).add((int) t[1]);
        ArrayNode zs = n.putArray("zones");
        for (Zn z : zones)
            zs.addObject().put("k", z.k).put("x", (int) z.x).put("y", (int) z.y).put("r", (int) z.r).put("p", z.p).put("l", z.link);
        return n;
    }

    /** Players are compact arrays: id, x, y, dashCooldown, dashing, alive, speed, shield, frozen, trapped, hasTrap, wet, smoke, offline. */
    ObjectNode stateMsg(long now) {
        ObjectNode n = Main.JSON.createObjectNode();
        n.put("t", "state").put("ms", (int) Math.round(tickMs)).put("ph", ph.name()).put("left", Math.max(0, phaseEnd - now) / 1000.0)
            .put("round", round).put("holder", holder).put("holder2", holder2).put("fx", (int) fx).put("fy", (int) fy);
        ArrayNode a = n.putArray("p");
        for (Gp g : gp.values())
            a.addArray().add(g.p.id).add((int) g.x).add((int) g.y).add((int) Math.max(0, g.dashReady - now))
                .add(now < g.dashUntil ? 1 : 0).add(g.alive ? 1 : 0)
                .add((int) Math.max(0, g.speedUntil - now)).add((int) Math.max(0, g.shieldUntil - now))
                .add((int) Math.max(0, g.frozenUntil - now)).add((int) Math.max(0, g.trappedUntil - now))
                .add(g.hasTrap ? 1 : 0).add(g.wetSince > 0 ? (int) Math.max(0, DROWN_MS - (now - g.wetSince)) : 0)
                .add((int) Math.max(0, g.smokeUntil - now)).add(g.off ? 1 : 0);
        ArrayNode hs = n.putArray("hz");
        for (Hz h : hz)
            hs.addObject().put("k", h.k).put("x", (int) h.x).put("y", (int) h.y).put("r", (int) h.r)
                .put("w", Math.max(0, h.hitAt - now)).put("vx", (int) h.vx).put("vy", (int) h.vy);
        ArrayNode dcs = n.putArray("dc");
        for (Dc d : decoys)
            dcs.addArray().add((int) d.x).add((int) d.y).add(d.owner.p.character).add((d.owner.p.id.equals(holder) || d.owner.p.id.equals(holder2)) ? 1 : 0).add(d.owner.p.id);
        // rarely-changing lists are only sent when they change (the client keeps the last copy)
        if (forceFull || holes.size() != lastHoles) {
            lastHoles = holes.size();
            ArrayNode ho = n.putArray("ho");
            for (double[] o : holes) ho.addObject().put("x", (int) o[0]).put("y", (int) o[1]).put("r", (int) o[2]);
        }
        StringBuilder bs = new StringBuilder();
        for (double[] b : blocks) bs.append((int) b[0]).append(',');
        if (forceFull || !bs.toString().equals(lastBlocksSig)) {
            lastBlocksSig = bs.toString();
            ArrayNode lb = n.putArray("lb");
            for (double[] b : blocks) lb.addObject().put("x", (int) b[1]).put("y", (int) b[2]);
        }
        StringBuilder ts = new StringBuilder();
        for (Bt b : bears) ts.append(b.id).append(now >= b.armAt ? 'a' : 'p').append(',');
        if (forceFull || !ts.toString().equals(lastBearsSig)) {
            lastBearsSig = ts.toString();
            ArrayNode bt = n.putArray("bt");
            for (Bt b : bears) bt.addObject().put("x", (int) b.x).put("y", (int) b.y).put("a", now >= b.armAt).put("m", b.mine);
        }
        forceFull = false;
        return n;
    }

    // ---------- movement and stealing ----------

    Zn zoneAt(Gp g) {
        for (Zn z : zones) {
            if (z.k.equals("bush") || z.k.equals("lava")) continue;
            if (Math.hypot(g.x - z.x, g.y - z.y) < z.r) return z;
        }
        return null;
    }

    boolean inLava(double x, double y, double pad) {
        for (Zn z : zones) if (z.k.equals("lava") && Math.hypot(z.x - x, z.y - y) < z.r + pad) return true;
        return false;
    }

    void move(double dt, long now) {
        double gm = mod.equals("SPEEDY") ? 1.3 : 1;
        for (Gp g : gp.values()) {
            if (!g.alive || g.off || now < g.frozenUntil || now < g.trappedUntil) { g.vx = g.vy = 0; continue; } // frozen / trapped = cannot move
            Zn z = zoneAt(g);
            if (z != null) zoneEffect(g, z, now);
            boolean dashing = now < g.dashUntil;
            double mul = gm;
            if (z != null && z.k.equals("slow")) mul *= z.p;
            if (g.wetSince > 0) mul *= 0.55;
            if (now < g.speedUntil) mul *= 1.6;
            if (g.p.id.equals(holder) || g.p.id.equals(holder2)) mul *= PROT_BONUS; // the protector is slightly quicker
            if (potato && g.p.id.equals(holder)) mul *= Math.max(0.55, 1.0 - (now - lastSwap) / 50000.0); // hot potato gets heavy
            if (g.p.id.equals(roleId) && role.equals("sprinter")) mul *= 1.15;
            if (dashing) {
                g.vx = g.ddx * DASH_SPEED;
                g.vy = g.ddy * DASH_SPEED;
            } else {
                double tvx = g.dx * SPEED * mul, tvy = g.dy * SPEED * mul;
                if (z != null && z.k.equals("ice")) { // ice: momentum, slow to steer
                    double k = Math.min(1, 1.6 * dt);
                    g.vx += (tvx - g.vx) * k;
                    g.vy += (tvy - g.vy) * k;
                } else { g.vx = tvx; g.vy = tvy; }
            }
            if (z != null && z.k.equals("belt") && !dashing) { // moving floor pushes you along (link = 0 right, 1 down, 2 left, 3 up)
                int d = z.link & 3;
                g.vx += (d == 0 ? 130 : d == 2 ? -130 : 0);
                g.vy += (d == 1 ? 130 : d == 3 ? -130 : 0);
            }
            g.x = clamp(g.x + g.vx * dt, R, W - R);
            g.y = clamp(g.y + g.vy * dt, R, H - R);
            if (now >= g.ghostUntil) for (double[] o : obs) { // ghosts walk through obstacles
                double ex = g.x - o[0], ey = g.y - o[1], d = Math.hypot(ex, ey), min = R + o[2] * 0.85;
                if (d < min && d > 0.001) { g.x = o[0] + ex / d * min; g.y = o[1] + ey / d * min; }
            }
        }
    }

    /** Bounce pads launch you forward; portals send you to their partner. */
    void zoneEffect(Gp g, Zn z, long now) {
        if (z.k.equals("bounce") && now >= g.padUntil) {
            g.padUntil = now + 900;
            double l = Math.hypot(g.dx, g.dy);
            if (l > 0.1) { g.ddx = g.dx / l; g.ddy = g.dy / l; } else { g.ddx = g.fx; g.ddy = g.fy; }
            g.dashUntil = now + 260;
            broadcast(evt("bounce").put("x", (int) z.x).put("y", (int) z.y));
        } else if (z.k.equals("portal") && z.link >= 0 && z.link < zones.size() && now >= g.tpUntil) {
            Zn o = zones.get(z.link);
            g.x = o.x;
            g.y = o.y;
            g.vx = g.vy = 0;
            g.tpUntil = now + 1500;
            broadcast(evt("tp").put("id", g.p.id).put("fromx", (int) z.x).put("fromy", (int) z.y).put("x", (int) o.x).put("y", (int) o.y));
        }
    }

    /** The holder is always the protector. Touching them steals the property and swaps roles (once per property in "double" mode). */
    void steals(long now) {
        stealSlot(0, now);
        if (holder2 != null) stealSlot(1, now);
    }

    void stealSlot(int slot, long now) {
        String hid = slot == 0 ? holder : holder2;
        String other = slot == 0 ? holder2 : holder;
        String prev = slot == 0 ? prevHolder : prevHolder2;
        long swap = slot == 0 ? lastSwap : lastSwap2;
        long lock = slot == 0 ? backLockUntil : backLockUntil2;
        Gp h = gp.get(hid);
        if (h == null || !h.alive || now - swap < STEAL_GRACE || now < h.shieldUntil) return; // shield blocks stealing
        for (Gp g : gp.values()) {
            if (g == h || !g.alive || g.off) continue;
            if (g.p.id.equals(other)) continue;                                      // already holds the other property
            if (team && g.p.team.equals(h.p.team)) continue;                          // teammates don't steal from each other
            if (g.p.id.equals(prev) && now < lock) continue;                         // no instant steal-back
            double reach = now < g.magnetUntil ? 2 * R + 60 : 2 * R + 4; // magnet power-up
            if (g.p.id.equals(roleId) && role.equals("grabber")) reach += 30;
            if (Math.hypot(g.x - h.x, g.y - h.y) < reach) {
                broadcast(evt("steal").put("from", hid).put("to", g.p.id));
                if (slot == 0) { prevHolder = holder; backLockUntil = now + BACK_LOCK; holder = g.p.id; lastSwap = now; }
                else { prevHolder2 = holder2; backLockUntil2 = now + BACK_LOCK; holder2 = g.p.id; lastSwap2 = now; }
                g.steals++;
                boolean revenge = h.p.id.equals(g.lastRobber); // stealing back from whoever robbed you
                h.streak = 0;
                h.lastRobber = g.p.id;
                g.streak++;
                if (revenge) { g.lastRobber = null; g.shieldUntil = Math.max(g.shieldUntil, now + 2000); }
                if (g.streak >= 3) { g.streak = 0; g.speedUntil = Math.max(g.speedUntil, now + 3000); }
                return;
            }
        }
    }

    // ---------- hazards, traps, death ----------

    void startDisaster() {
        hz.clear();
        if (!disaster.equals("TORNADO")) return;
        for (int i = 0; i < Math.min(4 + gp.size() / 5, 1 + round / 3 + gp.size() / 6); i++) {
            Hz h = new Hz();
            h.id = ++hzId; h.k = "t"; h.r = 52;
            for (int tries = 0; tries < 40; tries++) {
                h.x = 80 + rnd.nextDouble() * (W - 160); h.y = 80 + rnd.nextDouble() * (H - 160);
                boolean far = true;
                for (Gp g : gp.values()) if (Math.hypot(g.x - h.x, g.y - h.y) < 350) { far = false; break; }
                if (far) break;
            }
            hz.add(h);
        }
        if (round % 5 == 0) { // boss: one giant tornado, started far from everyone
            Hz b = new Hz();
            b.id = ++hzId; b.k = "t"; b.r = 95;
            for (int tries = 0; tries < 40; tries++) {
                b.x = 120 + rnd.nextDouble() * (W - 240); b.y = 120 + rnd.nextDouble() * (H - 240);
                boolean far = true;
                for (Gp g : gp.values()) if (Math.hypot(g.x - b.x, g.y - b.y) < 400) { far = false; break; }
                if (far) break;
            }
            hz.add(b);
            broadcast(evt("boss"));
        }
    }

    void hazards(long now, double dt) {
        int n = gp.size();
        if (now >= nextHz) {
            switch (disaster) {
                case "METEOR" -> { strikes("m", 1 + round / 2 + n / 5, 75, 1600, 0.6, now); nextHz = now + Math.max(500, 1400 - 120L * round); }
                case "LIGHTNING" -> { strikes("l", 1 + round / 3 + n / 5, 48, 900, 0.7, now); nextHz = now + Math.max(350, 800 - 60L * round); }
                case "HAIL" -> { strikes("h", 3 + round / 2 + n / 2, 34, 1000, 0.5, now); nextHz = now + Math.max(700, 1300 - 80L * round); }
                case "SINKHOLE" -> {
                    long pending = hz.stream().filter(h -> h.k.equals("s")).count();
                    if (holes.size() + pending < 14) strikes("s", 1 + n / 6, 70, 1800, 0.65, now);
                    nextHz = now + Math.max(900, 2200 - 130L * round);
                }
                case "BOULDER" -> { boulders(1 + round / 3 + n / 6, now); nextHz = now + Math.max(1800, 3600 - 200L * round); }
                default -> nextHz = Long.MAX_VALUE; // tornado and flood have no timed strikes
            }
        }
        for (Iterator<Hz> it = hz.iterator(); it.hasNext(); ) {
            Hz h = it.next();
            if (h.k.equals("t")) {
                moveTornado(h, dt);
                for (Gp g : gp.values())
                    if (g.alive && Math.hypot(g.x - h.x, g.y - h.y) < h.r * 0.8 + R * 0.6) kill(g, now);
            } else if (h.k.equals("b")) {
                if (now < h.hitAt) continue; // still warning
                h.x += h.vx * dt; h.y += h.vy * dt;
                for (Gp g : gp.values())
                    if (g.alive && Math.hypot(g.x - h.x, g.y - h.y) < h.r * 0.85 + R * 0.6) kill(g, now);
                if (h.x < -h.r - 5 || h.x > W + h.r + 5 || h.y < -h.r - 5 || h.y > H + h.r + 5) it.remove();
            } else if (now >= h.hitAt) {
                it.remove();
                if (h.k.equals("s")) holes.add(new double[]{h.x, h.y, h.r});
                broadcast(evt("boom").put("hk", h.k).put("x", (int) h.x).put("y", (int) h.y).put("r", (int) h.r));
                for (Gp g : gp.values())
                    if (g.alive && Math.hypot(g.x - h.x, g.y - h.y) < h.r + R * 0.5) kill(g, now);
            }
        }
        for (double[] o : holes)
            for (Gp g : gp.values())
                if (g.alive && Math.hypot(g.x - o[0], g.y - o[1]) < o[2] * 0.8 + R * 0.3) kill(g, now);
        for (Zn z : zones)
            if (z.k.equals("lava"))
                for (Gp g : gp.values())
                    if (g.alive && Math.hypot(g.x - z.x, g.y - z.y) < z.r * 0.85 + R * 0.3) kill(g, now);
        for (double[] t : traps)
            for (Gp g : gp.values())
                if (g.alive && Math.hypot(g.x - t[0], g.y - t[1]) < TRAP_R + R * 0.6) kill(g, now);
    }

    /** Spawns warned circular strikes (meteor, lightning, hail, sinkhole); some are aimed near a player. */
    void strikes(String k, int cnt, double r, long warn, double aim, long now) {
        for (int i = 0; i < cnt; i++) {
            Hz h = new Hz();
            h.id = ++hzId; h.k = k; h.r = r; h.hitAt = now + warn;
            Gp t = randomAlive();
            if (t != null && rnd.nextDouble() < aim) {
                h.x = clamp(t.x + (rnd.nextDouble() - .5) * 240, 40, W - 40);
                h.y = clamp(t.y + (rnd.nextDouble() - .5) * 240, 40, H - 40);
            } else { h.x = 40 + rnd.nextDouble() * (W - 80); h.y = 40 + rnd.nextDouble() * (H - 80); }
            hz.add(h);
        }
    }

    /** Boulders: a lane lights up for 1.5s, then the boulder rolls straight across the whole map. */
    void boulders(int cnt, long now) {
        for (int i = 0; i < cnt; i++) {
            Hz h = new Hz();
            h.id = ++hzId; h.k = "b"; h.r = 46; h.hitAt = now + 1500;
            Gp t = randomAlive();
            double tx = t != null ? t.x + (rnd.nextDouble() - .5) * 200 : W / 2, ty = t != null ? t.y + (rnd.nextDouble() - .5) * 200 : H / 2;
            boolean pos = rnd.nextBoolean();
            if (rnd.nextBoolean()) { // rolls sideways
                h.y = clamp(ty, 60, H - 60); h.x = pos ? -h.r : W + h.r; h.vx = pos ? 460 : -460;
            } else {                 // rolls up or down
                h.x = clamp(tx, 60, W - 60); h.y = pos ? -h.r : H + h.r; h.vy = pos ? 460 : -460;
            }
            hz.add(h);
        }
    }

    /** Flood: water rises from every edge. Standing in it slows you, and after 2.5s you drown. */
    void flood(long now) {
        if (!disaster.equals("FLOOD") && !shrink) return;
        double f = Math.max(0, Math.min(1, 1 - (phaseEnd - now) / (double) holdMs));
        fx = f * 0.32 * W; fy = f * 0.32 * H;
        for (Gp g : gp.values()) {
            if (!g.alive) { g.wetSince = 0; continue; }
            boolean wet = g.x < fx || g.x > W - fx || g.y < fy || g.y > H - fy;
            if (!wet) { g.wetSince = 0; continue; }
            if (g.wetSince == 0) g.wetSince = now;
            if (now - g.wetSince >= DROWN_MS) kill(g, now);
        }
    }

    void moveTornado(Hz h, double dt) {
        Gp t = null;
        double best = 1e18;
        for (Gp g : gp.values()) {
            double d = Math.hypot(g.x - h.x, g.y - h.y);
            if (g.alive && d < best) { best = d; t = g; }
        }
        if (t != null) { // drifts toward the nearest player, but slower than they can run
            double d = Math.max(1, best);
            h.vx += (t.x - h.x) / d * 120 * dt;
            h.vy += (t.y - h.y) / d * 120 * dt;
        }
        double max = 70 + 8 * round, sp = Math.hypot(h.vx, h.vy);
        if (sp > max) { h.vx *= max / sp; h.vy *= max / sp; }
        h.x += h.vx * dt; h.y += h.vy * dt;
        if (h.x < h.r || h.x > W - h.r) { h.vx = -h.vx; h.x = clamp(h.x, h.r, W - h.r); }
        if (h.y < h.r || h.y > H - h.r) { h.vy = -h.vy; h.y = clamp(h.y, h.r, H - h.r); }
    }

    void kill(Gp g, long now) {
        if (!g.alive) return;
        g.alive = false; g.dx = g.dy = 0; g.deaths++;
        broadcast(evt("die").put("id", g.p.id));
        boolean s0 = g.p.id.equals(holder), s1 = g.p.id.equals(holder2);
        if (!s0 && !s1) return;
        String other = s0 ? holder2 : holder;
        Gp best = null;
        double bd = 1e18;
        for (Gp o : gp.values()) {
            double d = Math.hypot(o.x - g.x, o.y - g.y);
            if (o.alive && d < bd && !o.p.id.equals(other)) { bd = d; best = o; }
        }
        if (best != null) { // the property passes to the nearest survivor
            if (s0) { holder = best.p.id; lastSwap = now; prevHolder = null; broadcast(evt("pass").put("to", holder)); }
            else { holder2 = best.p.id; lastSwap2 = now; prevHolder2 = null; broadcast(evt("pass").put("to", holder2)); }
        }
    }

    boolean isHolder(String id) { return id != null && (id.equals(holder) || id.equals(holder2)); }

    /** The closest living property holder (other than g itself), or null. */
    Gp nearestHolder(Gp g) {
        Gp best = null;
        double bd = 1e18;
        for (String id : new String[] {holder, holder2}) {
            Gp o = id == null ? null : gp.get(id);
            if (o == null || o == g || !o.alive) continue;
            double d = Math.hypot(o.x - g.x, o.y - g.y);
            if (d < bd) { bd = d; best = o; }
        }
        return best;
    }

    int aliveCount() { int c = 0; for (Gp g : gp.values()) if (g.alive) c++; return c; }

    Gp randomAlive() {
        List<Gp> l = new ArrayList<>();
        for (Gp g : gp.values()) if (g.alive) l.add(g);
        return l.isEmpty() ? null : l.get(rnd.nextInt(l.size()));
    }

    // ---------- lucky blocks ----------

    void powerups(long now) {
        if (now >= nextBlock) { // one lucky block every 10 seconds
            nextBlock = now + (chaos ? 5_000 : 10_000);
            for (int tries = 0; tries < 60; tries++) {
                double x = 70 + rnd.nextDouble() * (W - 140), y = 70 + rnd.nextDouble() * (H - 140);
                boolean ok = !inLava(x, y, 40);
                if (ok) for (double[] o : obs) if (Math.hypot(o[0] - x, o[1] - y) < o[2] + 40) { ok = false; break; }
                if (ok) { blocks.add(new double[]{++hzId, x, y}); break; }
            }
        }
        for (Iterator<double[]> it = blocks.iterator(); it.hasNext(); ) {
            double[] b = it.next();
            for (Gp g : gp.values()) {
                if (g.alive && Math.hypot(g.x - b[1], g.y - b[2]) < 22 + R) { it.remove(); open(g, now); break; }
            }
        }
        for (Iterator<Bt> it = bears.iterator(); it.hasNext(); ) {
            Bt b = it.next();
            if (now < b.armAt) continue;
            for (Gp g : gp.values()) {
                if (g.alive && !g.p.id.equals(b.owner) && now >= g.trappedUntil && Math.hypot(g.x - b.x, g.y - b.y) < R + 10) {
                    if (b.mine) { // a mine throws you back and stuns you briefly
                        double mx = g.x - b.x, my = g.y - b.y, md = Math.max(1, Math.hypot(mx, my));
                        g.x = clamp(g.x + mx / md * 150, R, W - R);
                        g.y = clamp(g.y + my / md * 150, R, H - R);
                        g.vx = g.vy = 0;
                        g.frozenUntil = now + 1200;
                    } else g.trappedUntil = now + 3000; // can't move for 3 seconds
                    it.remove();
                    broadcast(evt("snap").put("id", g.p.id).put("x", (int) b.x).put("y", (int) b.y));
                    break;
                }
            }
        }
    }

    /** Does the effect of a power-up (also used by the animals' special moves). */
    void applyPower(Gp g, String pw, long now) {
        switch (pw) {
            case "speed" -> g.speedUntil = now + 5000;
            case "shield" -> g.shieldUntil = now + 5000;
            case "trap" -> g.hasTrap = true;
            case "smoke" -> g.smokeUntil = now + 4000;
            case "decoy" -> { Dc d = new Dc(); d.x = g.x; d.y = g.y; d.owner = g; d.until = now + 8000; decoys.add(d); }
            case "freeze" -> g.frozenUntil = now + 3000; // bad luck: you freeze yourself
            case "magnet" -> g.magnetUntil = now + 6000; // longer reach when stealing
            case "jump" -> { // a free super leap, and your dash is ready again
                double l = Math.hypot(g.dx, g.dy);
                if (l > 0.1) { g.ddx = g.dx / l; g.ddy = g.dy / l; } else { g.ddx = g.fx; g.ddy = g.fy; }
                g.dashUntil = now + 420;
                g.dashReady = 0;
            }
            case "ghost" -> g.ghostUntil = now + 4000; // walk through obstacles
            case "mine" -> { Bt b = new Bt(); b.id = ++hzId; b.x = g.x; b.y = g.y; b.owner = g.p.id; b.armAt = now + 1200; b.mine = true; bears.add(b); }
            case "tele" -> { // jump to a random free spot
                for (int tries = 0; tries < 60; tries++) {
                    double tx = 80 + rnd.nextDouble() * (W - 160), ty = 80 + rnd.nextDouble() * (H - 160);
                    boolean ok = !inLava(tx, ty, 40);
                    if (ok) for (double[] o : obs) if (Math.hypot(o[0] - tx, o[1] - ty) < o[2] + R + 20) { ok = false; break; }
                    if (ok) {
                        broadcast(evt("tp").put("id", g.p.id).put("fromx", (int) g.x).put("fromy", (int) g.y).put("x", (int) tx).put("y", (int) ty));
                        g.x = tx; g.y = ty; g.vx = g.vy = 0;
                        break;
                    }
                }
            }
            default -> { } // swap already happened above
        }
    }

    void open(Gp g, long now) {
        g.blocks++;
        String pw = POWERS[rnd.nextInt(POWERS.length)];
        if (pw.equals("swap")) { // trade places with a random survivor
            List<Gp> others = new ArrayList<>();
            for (Gp o : gp.values()) if (o != g && o.alive) others.add(o);
            if (others.isEmpty()) pw = "speed";
            else {
                Gp o = others.get(rnd.nextInt(others.size()));
                double sx = g.x, sy = g.y;
                g.x = o.x; g.y = o.y; o.x = sx; o.y = sy;
                g.vx = g.vy = o.vx = o.vy = 0;
                broadcast(evt("swap").put("a", g.p.id).put("b", o.p.id));
            }
        }
        applyPower(g, pw, now);
        broadcast(evt("power").put("id", g.p.id).put("pw", pw));
    }

    /** The animal's special move (E key / ability button). The cooldown is enforced here, on the server. */
    void ability(Main.Player p) {
        Gp g = gp.get(p.id);
        long now = System.currentTimeMillis();
        if (g == null || !g.alive || g.off || ph != Ph.PLAY || now < g.abilityReady) return;
        if (now < g.frozenUntil || now < g.trappedUntil) return;
        Ability a = Abilities.forCharacter(p.character);
        g.abilityReady = now + (long) (a.cooldownMs() * abCd);
        a.use(this, g, now);
        broadcast(evt("ability").put("id", p.id).put("ab", Math.floorMod(p.character, Abilities.ALL.length)));
    }

    /** Hot Swap mode: every 9 seconds the property jumps to a random survivor. */
    void hotSwap(long now) {
        List<Gp> c = new ArrayList<>();
        for (Gp g : gp.values()) if (g.alive && !g.off && !g.p.id.equals(holder) && !g.p.id.equals(holder2)) c.add(g);
        lastSwap = now;
        if (c.isEmpty()) return;
        holder = c.get(rnd.nextInt(c.size())).p.id;
        prevHolder = null;
        broadcast(evt("pass").put("to", holder));
    }

    /** Places a stored bear trap at the player's position. */
    void use(Main.Player p) {
        Gp g = gp.get(p.id);
        if (g != null) useFor(g);
    }

    void useFor(Gp g) {
        long now = System.currentTimeMillis();
        if (!g.alive || ph != Ph.PLAY || !g.hasTrap || now < g.frozenUntil || now < g.trappedUntil) return;
        g.hasTrap = false;
        Bt b = new Bt();
        b.id = ++hzId; b.x = g.x; b.y = g.y; b.owner = g.p.id; b.armAt = now + 800;
        bears.add(b);
    }

    // ---------- rounds ----------

    void endRound(long now) {
        if (survivor && aliveCount() == 1) { // last survivor mode: the one still standing scores
            for (Gp g : gp.values()) if (g.alive) holder = g.p.id;
        }
        Gp hg = gp.get(holder);
        Gp hg2 = holder2 == null ? null : gp.get(holder2);
        boolean award = hg != null && hg.alive, award2 = hg2 != null && hg2.alive, won = false;
        Gp winGp = null;
        if (award) {
            int pts = scores.merge(team ? hg.p.team : holder, 1, Integer::sum);
            if (pts >= target) { won = true; winGp = hg; }
        }
        if (award2) { // the second property scores too
            int pts2 = scores.merge(team ? hg2.p.team : holder2, 1, Integer::sum);
            if (pts2 >= target) { won = true; if (winGp == null) winGp = hg2; }
        }
        ph = won ? Ph.OVER : Ph.SCORE;
        phaseEnd = now + (won ? 9000 : 5000);
        hz.clear(); blocks.clear(); bears.clear(); holes.clear(); decoys.clear();
        fx = fy = 0;
        for (Gp g : gp.values()) g.wetSince = 0;

        List<ObjectNode> rows = new ArrayList<>();
        if (team) {
            Map<String, List<String>> m = new LinkedHashMap<>();
            for (Gp g : gp.values()) m.computeIfAbsent(g.p.team, k -> new ArrayList<>()).add(g.p.name);
            for (Map.Entry<String, List<String>> e : m.entrySet())
                rows.add(Main.JSON.createObjectNode().put("label", String.join(", ", e.getValue()))
                        .put("team", e.getKey()).put("pts", scores.getOrDefault(e.getKey(), 0)));
        } else {
            for (Gp g : gp.values())
                rows.add(Main.JSON.createObjectNode().put("label", g.p.name).put("ch", g.p.character)
                        .put("pts", scores.getOrDefault(g.p.id, 0)));
        }
        rows.sort((a, b) -> b.get("pts").asInt() - a.get("pts").asInt());
        ObjectNode n = Main.JSON.createObjectNode();
        n.put("t", "scores").put("round", round).put("none", !award && !award2);
        if (award) n.put("holderName", hg.p.name);
        if (award2) n.put("holderName2", hg2.p.name);
        ArrayNode arr = n.putArray("rows");
        for (ObjectNode r : rows) arr.add(r);
        if (won) {
            n.put("winner", rows.get(0).get("label").asText());
            Awards.fill(n.putArray("awards"), gp.values());
        }
        lastScores = n;
        broadcast(n);
        if (won && winGp != null) recordToDb(winGp);
    }

    /** Saves the finished match to the optional database (does nothing when there is none). */
    void recordToDb(Gp winnerGp) {
        try { // logged-in players: update their saved account stats (works without a database)
            for (Gp g : gp.values()) {
                if (g.p.bot || g.p.acct == null || g.p.acct.isEmpty()) continue;
                boolean w = team ? g.p.team.equals(winnerGp.p.team) : g == winnerGp;
                Accounts.DEFAULT.addResult(g.p.acct, w, g.steals);
            }
        } catch (Exception e) {
            // never let account saving break a match
        }
        if (!Db.on) return;
        try {
            List<Db.Rec> recs = new ArrayList<>();
            for (Gp g : gp.values()) {
                if (g.p.bot || g.p.uid == null || g.p.uid.isEmpty()) continue;
                boolean w = team ? g.p.team.equals(winnerGp.p.team) : g == winnerGp;
                recs.add(new Db.Rec(g.p.uid, g.p.name, w, g.steals, g.blocks, g.deaths, g.heldMs));
            }
            Db.recordMatch(room.map, room.mode, winnerGp.p.name, round, gp.size(), recs);
        } catch (Exception e) {
            // the game never depends on the database
        }
    }

    void startRound() {
        long now = System.currentTimeMillis();
        round++;
        if (round > 1) addObstacles(4); // each round gets harder
        List<double[]> sp = spawns(gp.size());
        int i = 0;
        for (Gp g : gp.values()) {
            double[] s = sp.get(i++);
            g.x = s[0]; g.y = s[1]; g.dx = g.dy = g.vx = g.vy = 0; g.dashUntil = 0; g.dashReady = 0; g.alive = true; // everyone revives
            g.speedUntil = g.shieldUntil = g.frozenUntil = g.trappedUntil = g.wetSince = g.padUntil = g.tpUntil = g.smokeUntil = g.magnetUntil = g.ghostUntil = 0;
            g.hasTrap = false;
            g.abilityReady = 0;
            g.streak = 0;
            g.lastRobber = null;
        }
        placeTraps(sp);
        hz.clear(); blocks.clear(); bears.clear(); holes.clear(); decoys.clear();
        fx = fy = 0;
        String next;
        do { next = DISASTERS[rnd.nextInt(DISASTERS.length)]; } while (next.equals(disaster)); // never the same twice in a row
        disaster = next;
        if (round % 5 == 0) disaster = "TORNADO"; // every 5th round is a boss round with a giant tornado
        mod = blitz ? "SPEEDY" : (round >= 2 && rnd.nextDouble() < 0.4) ? MODS[rnd.nextInt(MODS.length)] : ""; // some rounds add a twist
        holder = new ArrayList<>(gp.keySet()).get(rnd.nextInt(gp.size())); // exactly one protector
        prevHolder = null;
        holder2 = null;
        prevHolder2 = null;
        if (dbl && gp.size() >= 3) { // two properties are in play
            List<String> ids2 = new ArrayList<>(gp.keySet());
            ids2.remove(holder);
            holder2 = ids2.get(rnd.nextInt(ids2.size()));
        }
        roleId = null;
        role = "";
        if (gp.size() >= 3) { // one lucky non-holder gets a special role this round
            List<String> ids = new ArrayList<>(gp.keySet());
            ids.remove(holder);
            ids.remove(holder2);
            roleId = ids.get(rnd.nextInt(ids.size()));
            role = rnd.nextBoolean() ? "sprinter" : "grabber";
        }
        ph = Ph.ROLE;
        phaseEnd = now + 3000;
        lastSwap = now;
        lastSwap2 = now;
        broadcast(roundMsg());
        if (roleId != null) broadcast(evt("role").put("id", roleId).put("role", role));
    }

    void addObstacles(int k) {
        for (int i = 0; i < k; i++) {
            for (int tries = 0; tries < 60; tries++) {
                double r = 26 + rnd.nextDouble() * 14, x = 90 + rnd.nextDouble() * (W - 180), y = 90 + rnd.nextDouble() * (H - 180);
                boolean ok = true;
                for (double[] o : obs) if (Math.hypot(o[0] - x, o[1] - y) < o[2] + r + 30) { ok = false; break; }
                if (ok) { obs.add(new double[]{x, y, r, rnd.nextInt(2)}); break; }
            }
        }
    }

    /** More traps every round, never near a spawn point (or in lava). */
    void placeTraps(List<double[]> sp) {
        traps.clear();
        for (int i = 0; i < Math.min(Math.max(14, 2 * gp.size()), 2 * round); i++) {
            for (int tries = 0; tries < 80; tries++) {
                double x = 60 + rnd.nextDouble() * (W - 120), y = 60 + rnd.nextDouble() * (H - 120);
                boolean ok = !inLava(x, y, 30);
                if (ok) for (double[] o : obs) if (Math.hypot(o[0] - x, o[1] - y) < o[2] + TRAP_R + 25) { ok = false; break; }
                if (ok) for (double[] s : sp) if (Math.hypot(s[0] - x, s[1] - y) < 160) { ok = false; break; }
                if (ok) for (double[] t : traps) if (Math.hypot(t[0] - x, t[1] - y) < 90) { ok = false; break; }
                if (ok) { traps.add(new double[]{x, y}); break; }
            }
        }
    }

    /** Random spawns that stay far apart and clear of obstacles and lava. */
    List<double[]> spawns(int n) {
        for (double minD = Math.min(W, H) * 0.55; ; minD *= 0.85) {
            List<double[]> out = new ArrayList<>();
            for (int tries = 0; tries < 2000 && out.size() < n; tries++) {
                double x = 100 + rnd.nextDouble() * (W - 200), y = 100 + rnd.nextDouble() * (H - 200);
                boolean ok = !inLava(x, y, R + 60);
                if (ok) for (double[] s : out) if (Math.hypot(s[0] - x, s[1] - y) < minD) { ok = false; break; }
                if (ok) for (double[] o : obs) if (Math.hypot(o[0] - x, o[1] - y) < o[2] + R + 30) { ok = false; break; }
                if (ok) out.add(new double[]{x, y});
            }
            if (out.size() == n) return out;
        }
    }

    // ---------- input / lifecycle ----------

    void input(Main.Player p, double x, double y) {
        Gp g = gp.get(p.id);
        if (g == null || Double.isNaN(x) || Double.isNaN(y)) return;
        double l = Math.hypot(x, y);
        if (l > 1) { x /= l; y /= l; l = 1; }
        g.dx = x; g.dy = y;
        if (l > 0.1) { g.fx = x / l; g.fy = y / l; }
    }

    void dash(Main.Player p) {
        Gp g = gp.get(p.id);
        if (g != null) dashFor(g);
    }

    void dashFor(Gp g) {
        long now = System.currentTimeMillis();
        if (!g.alive || ph != Ph.PLAY || now < g.dashReady || now < g.frozenUntil || now < g.trappedUntil) return;
        g.dashReady = now + DASH_CD;
        g.dashUntil = now + DASH_MS;
        double l = Math.hypot(g.dx, g.dy);
        if (l > 0.1) { g.ddx = g.dx / l; g.ddy = g.dy / l; } else { g.ddx = g.fx; g.ddy = g.fy; }
    }

    void emote(Main.Player p, int e) {
        if (e < 0 || e > 11 || !gp.containsKey(p.id)) return;
        broadcast(evt("emote").put("id", p.id).put("e", e));
    }

    /** A player's connection dropped: they stand still and keep their seat until the grace period ends. */
    void disconnected(Main.Player p) {
        Gp g = gp.get(p.id);
        if (g != null) { g.off = true; g.dx = g.dy = 0; }
    }

    /** A returning player gets the whole picture again (map, round, scores) and then the normal state stream. */
    void resync(Main.Player p) {
        Gp g = gp.get(p.id);
        if (g == null) { Main.lobbyTo(p, room); return; }
        g.off = false;
        forceFull = true;
        Main.send(p.ctx, initMsg(p.id));
        Main.send(p.ctx, roundMsg());
        if ((ph == Ph.SCORE || ph == Ph.OVER) && lastScores != null) Main.send(p.ctx, lastScores);
    }

    void remove(Main.Player p) {
        Gp old = gp.remove(p.id);
        decoys.removeIf(d -> d.owner == old);
        if (gp.size() < 2) { finish(); return; }
        if (p.id.equals(holder)) {
            holder = randomAlive() != null ? randomAlive().p.id : gp.keySet().iterator().next();
            lastSwap = System.currentTimeMillis();
            prevHolder = null;
            broadcast(evt("pass").put("to", holder));
        }
        if (holder2 != null && (p.id.equals(holder2) || holder2.equals(holder))) {
            Gp r2 = randomAlive();
            holder2 = (r2 != null && !r2.p.id.equals(holder)) ? r2.p.id : null;
            lastSwap2 = System.currentTimeMillis();
            prevHolder2 = null;
            if (holder2 != null) broadcast(evt("pass").put("to", holder2));
        }
    }

    void stop() { if (task != null) task.cancel(false); }

    void finish() {
        stop();
        room.game = null;
        for (Main.Player p : room.players) if (!p.bot) p.ready = false;
        Main.broadcast(room); // sends everyone back to the lobby
    }

    void broadcast(ObjectNode n) {
        String s = n.toString(); // serialize once, send to everyone
        boolean state = "state".equals(n.path("t").asText()); // position updates may be skipped for slow connections
        for (Gp g : gp.values()) Main.sendRaw(g.p.ctx, s, state);
    }

    static double clamp(double v, double lo, double hi) { return Math.max(lo, Math.min(hi, v)); }
}
