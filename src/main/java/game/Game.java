package game;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.*;
import java.util.concurrent.*;

/** One running match. Every method runs while holding Main.LOCK. */
class Game {
    static final double R = 18, SPEED = 240, DASH_SPEED = 720, TRAP_R = 20;
    static final long DASH_MS = 180, DASH_CD = 3000, HOLD_MS = 30_000, STEAL_GRACE = 1500;
    static final String[] DISASTERS = {"METEOR", "LIGHTNING", "TORNADO", "FLOOD", "SINKHOLE", "HAIL", "BOULDER"};
    static final long DROWN_MS = 2500;
    static final ScheduledExecutorService SCH = Executors.newScheduledThreadPool(2);

    enum Ph { ROLE, COUNT, PLAY, SCORE, OVER }

    static class Gp {
        Main.Player p;
        double x, y, dx, dy, fx = 1, fy = 0, ddx = 1, ddy = 0;
        long dashUntil, dashReady, speedUntil, shieldUntil, frozenUntil, trappedUntil, wetSince;
        boolean alive = true, hasTrap;
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
    }

    final Main.Room room;
    final double W, H;
    final boolean team;
    final int target;
    final Random rnd = new Random();
    final List<double[]> obs = new ArrayList<>();   // x, y, radius, variant
    final List<double[]> traps = new ArrayList<>(); // x, y
    final List<Hz> hz = new ArrayList<>();
    final List<double[]> blocks = new ArrayList<>(); // lucky blocks: id, x, y
    final List<double[]> holes = new ArrayList<>();  // open sinkholes: x, y, radius
    double fx, fy;                                    // flood: how far the water has risen from each edge
    final List<Bt> bears = new ArrayList<>();
    final Map<String, Gp> gp = new LinkedHashMap<>();
    final Map<String, Integer> scores = new HashMap<>();
    String holder, disaster = "";
    int round, hzId;
    Ph ph;
    long phaseEnd, lastSwap, nextHz, nextBlock, last = System.currentTimeMillis();
    ScheduledFuture<?> task;

    Game(Main.Room room) {
        this.room = room;
        int n = room.players.size();
        int big = Math.min(n, 6), extra = Math.max(0, n - 6);
        W = 1000 + 250 * big + 120 * extra;   // more players = bigger map (grows slower past 6)
        H = 650 + 160 * big + 80 * extra;
        team = room.mode.equals("team");
        target = room.target;
        for (Main.Player p : room.players) { Gp g = new Gp(); g.p = p; gp.put(p.id, g); }
        addObstacles((int) (W * H / 90000));

        ObjectNode init = Main.JSON.createObjectNode();
        init.put("t", "init").put("w", (int) W).put("h", (int) H).put("map", room.map)
            .put("seed", rnd.nextInt()).put("mode", room.mode).put("target", target);
        ArrayNode a = init.putArray("players");
        for (Gp g : gp.values())
            a.addObject().put("id", g.p.id).put("name", g.p.name).put("character", g.p.character).put("team", g.p.team);
        broadcast(init);
        startRound();
        task = SCH.scheduleAtFixedRate(this::tick, 33, 33, TimeUnit.MILLISECONDS);
    }

    void tick() {
        synchronized (Main.LOCK) {
            try { step(); } catch (Exception e) { e.printStackTrace(); }
        }
    }

    void step() {
        long now = System.currentTimeMillis();
        double dt = Math.min(0.1, (now - last) / 1000.0);
        last = now;
        switch (ph) {
            case ROLE -> { if (now >= phaseEnd) { ph = Ph.COUNT; phaseEnd = now + 3000; } }
            case COUNT -> {
                if (now >= phaseEnd) { ph = Ph.PLAY; phaseEnd = now + HOLD_MS; nextHz = now + 3000; nextBlock = now + 10_000; startDisaster(); }
            }
            case PLAY -> {
                move(dt);
                steals(now);
                hazards(now, dt);
                flood(now);
                powerups(now);
                if (aliveCount() <= 1 || now >= phaseEnd) endRound(now); // timer never resets on steals
            }
            case SCORE -> { if (now >= phaseEnd) startRound(); }
            case OVER -> { if (now >= phaseEnd) { finish(); return; } }
        }
        ObjectNode n = Main.JSON.createObjectNode();
        n.put("t", "state").put("ph", ph.name()).put("left", Math.max(0, phaseEnd - now) / 1000.0)
            .put("round", round).put("holder", holder).put("fx", (int) fx).put("fy", (int) fy);
        ArrayNode a = n.putArray("p");
        for (Gp g : gp.values())
            a.addObject().put("id", g.p.id).put("x", (int) g.x).put("y", (int) g.y)
                .put("dc", Math.max(0, g.dashReady - now)).put("d", now < g.dashUntil).put("a", g.alive)
                .put("sp", Math.max(0, g.speedUntil - now)).put("sh", Math.max(0, g.shieldUntil - now))
                .put("fz", Math.max(0, g.frozenUntil - now)).put("tr", Math.max(0, g.trappedUntil - now)).put("it", g.hasTrap)
                .put("wt", g.wetSince > 0 ? Math.max(0, DROWN_MS - (now - g.wetSince)) : 0);
        ArrayNode hs = n.putArray("hz");
        for (Hz h : hz)
            hs.addObject().put("k", h.k).put("x", (int) h.x).put("y", (int) h.y).put("r", (int) h.r)
                .put("w", Math.max(0, h.hitAt - now)).put("vx", (int) h.vx).put("vy", (int) h.vy);
        ArrayNode ho = n.putArray("ho");
        for (double[] o : holes) ho.addObject().put("x", (int) o[0]).put("y", (int) o[1]).put("r", (int) o[2]);
        ArrayNode lb = n.putArray("lb");
        for (double[] b : blocks) lb.addObject().put("x", (int) b[1]).put("y", (int) b[2]);
        ArrayNode bt = n.putArray("bt");
        for (Bt b : bears) bt.addObject().put("x", (int) b.x).put("y", (int) b.y).put("a", now >= b.armAt);
        broadcast(n);
    }

    void move(double dt) {
        long now = System.currentTimeMillis();
        for (Gp g : gp.values()) {
            if (!g.alive || now < g.frozenUntil || now < g.trappedUntil) continue; // frozen / trapped = cannot move
            boolean dashing = now < g.dashUntil;
            double vx = dashing ? g.ddx : g.dx, vy = dashing ? g.ddy : g.dy, s = dashing ? DASH_SPEED : SPEED * (now < g.speedUntil ? 1.6 : 1) * (g.wetSince > 0 ? 0.55 : 1);
            g.x = clamp(g.x + vx * s * dt, R, W - R);
            g.y = clamp(g.y + vy * s * dt, R, H - R);
            for (double[] o : obs) {
                double ex = g.x - o[0], ey = g.y - o[1], d = Math.hypot(ex, ey), min = R + o[2] * 0.85;
                if (d < min && d > 0.001) { g.x = o[0] + ex / d * min; g.y = o[1] + ey / d * min; }
            }
        }
    }

    /** The holder is always the protector. Touching them steals the property and swaps roles. */
    void steals(long now) {
        Gp h = gp.get(holder);
        if (h == null || !h.alive || now - lastSwap < STEAL_GRACE || now < h.shieldUntil) return; // shield blocks stealing
        for (Gp g : gp.values()) {
            if (g != h && g.alive && Math.hypot(g.x - h.x, g.y - h.y) < 2 * R + 4) {
                ObjectNode ev = Main.JSON.createObjectNode();
                ev.put("t", "ev").put("k", "steal").put("from", holder).put("to", g.p.id);
                holder = g.p.id;
                lastSwap = now;
                broadcast(ev);
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
                ObjectNode ev = Main.JSON.createObjectNode();
                ev.put("t", "ev").put("k", "boom").put("hk", h.k).put("x", (int) h.x).put("y", (int) h.y).put("r", (int) h.r);
                broadcast(ev);
                for (Gp g : gp.values())
                    if (g.alive && Math.hypot(g.x - h.x, g.y - h.y) < h.r + R * 0.5) kill(g, now);
            }
        }
        for (double[] o : holes)
            for (Gp g : gp.values())
                if (g.alive && Math.hypot(g.x - o[0], g.y - o[1]) < o[2] * 0.8 + R * 0.3) kill(g, now);
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
        if (!disaster.equals("FLOOD")) return;
        double f = Math.max(0, Math.min(1, 1 - (phaseEnd - now) / (double) HOLD_MS));
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
        g.alive = false; g.dx = g.dy = 0;
        ObjectNode ev = Main.JSON.createObjectNode();
        ev.put("t", "ev").put("k", "die").put("id", g.p.id);
        broadcast(ev);
        if (!g.p.id.equals(holder)) return;
        Gp best = null;
        double bd = 1e18;
        for (Gp o : gp.values()) {
            double d = Math.hypot(o.x - g.x, o.y - g.y);
            if (o.alive && d < bd) { bd = d; best = o; }
        }
        if (best != null) { // the property passes to the nearest survivor
            holder = best.p.id; lastSwap = now;
            ObjectNode pass = Main.JSON.createObjectNode();
            pass.put("t", "ev").put("k", "pass").put("to", holder);
            broadcast(pass);
        }
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
            nextBlock = now + 10_000;
            for (int tries = 0; tries < 60; tries++) {
                double x = 70 + rnd.nextDouble() * (W - 140), y = 70 + rnd.nextDouble() * (H - 140);
                boolean ok = true;
                for (double[] o : obs) if (Math.hypot(o[0] - x, o[1] - y) < o[2] + 40) { ok = false; break; }
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
                    g.trappedUntil = now + 3000; // can't move for 3 seconds
                    it.remove();
                    ObjectNode ev = Main.JSON.createObjectNode();
                    ev.put("t", "ev").put("k", "snap").put("id", g.p.id).put("x", (int) b.x).put("y", (int) b.y);
                    broadcast(ev);
                    break;
                }
            }
        }
    }

    void open(Gp g, long now) {
        String pw = new String[]{"speed", "shield", "trap", "freeze"}[rnd.nextInt(4)];
        switch (pw) {
            case "speed" -> g.speedUntil = now + 5000;
            case "shield" -> g.shieldUntil = now + 5000;
            case "trap" -> g.hasTrap = true;
            default -> g.frozenUntil = now + 3000; // bad luck: you freeze yourself
        }
        ObjectNode ev = Main.JSON.createObjectNode();
        ev.put("t", "ev").put("k", "power").put("id", g.p.id).put("pw", pw);
        broadcast(ev);
    }

    /** Places a stored bear trap at the player's position. */
    void use(Main.Player p) {
        Gp g = gp.get(p.id);
        long now = System.currentTimeMillis();
        if (g == null || !g.alive || ph != Ph.PLAY || !g.hasTrap || now < g.frozenUntil || now < g.trappedUntil) return;
        g.hasTrap = false;
        Bt b = new Bt();
        b.id = ++hzId; b.x = g.x; b.y = g.y; b.owner = p.id; b.armAt = now + 800;
        bears.add(b);
    }

    // ---------- rounds ----------

    void endRound(long now) {
        Gp hg = gp.get(holder);
        boolean award = hg != null && hg.alive, won = false;
        if (award) {
            int pts = scores.merge(team ? hg.p.team : holder, 1, Integer::sum);
            won = pts >= target;
        }
        ph = won ? Ph.OVER : Ph.SCORE;
        phaseEnd = now + (won ? 8000 : 5000);
        hz.clear(); blocks.clear(); bears.clear(); holes.clear();
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
        n.put("t", "scores").put("round", round).put("none", !award);
        ArrayNode arr = n.putArray("rows");
        for (ObjectNode r : rows) arr.add(r);
        if (won) n.put("winner", rows.get(0).get("label").asText());
        broadcast(n);
    }

    void startRound() {
        long now = System.currentTimeMillis();
        round++;
        if (round > 1) addObstacles(4); // each round gets harder
        List<double[]> sp = spawns(gp.size());
        int i = 0;
        for (Gp g : gp.values()) {
            double[] s = sp.get(i++);
            g.x = s[0]; g.y = s[1]; g.dx = g.dy = 0; g.dashUntil = 0; g.dashReady = 0; g.alive = true; // everyone revives
            g.speedUntil = g.shieldUntil = g.frozenUntil = g.trappedUntil = g.wetSince = 0; g.hasTrap = false;
        }
        placeTraps(sp);
        hz.clear(); blocks.clear(); bears.clear(); holes.clear();
        fx = fy = 0;
        String next;
        do { next = DISASTERS[rnd.nextInt(DISASTERS.length)]; } while (next.equals(disaster)); // never the same twice in a row
        disaster = next;
        holder = new ArrayList<>(gp.keySet()).get(rnd.nextInt(gp.size())); // exactly one protector
        ph = Ph.ROLE;
        phaseEnd = now + 3000;
        lastSwap = now;
        ObjectNode n = Main.JSON.createObjectNode();
        n.put("t", "round").put("round", round).put("holder", holder).put("disaster", disaster);
        ArrayNode a = n.putArray("obstacles");
        for (double[] o : obs) a.addArray().add((int) o[0]).add((int) o[1]).add((int) o[2]).add((int) o[3]);
        ArrayNode tr = n.putArray("traps");
        for (double[] t : traps) tr.addArray().add((int) t[0]).add((int) t[1]);
        broadcast(n);
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

    /** More traps every round, never near a spawn point. */
    void placeTraps(List<double[]> sp) {
        traps.clear();
        for (int i = 0; i < Math.min(Math.max(14, 2 * gp.size()), 2 * round); i++) {
            for (int tries = 0; tries < 80; tries++) {
                double x = 60 + rnd.nextDouble() * (W - 120), y = 60 + rnd.nextDouble() * (H - 120);
                boolean ok = true;
                for (double[] o : obs) if (Math.hypot(o[0] - x, o[1] - y) < o[2] + TRAP_R + 25) { ok = false; break; }
                if (ok) for (double[] s : sp) if (Math.hypot(s[0] - x, s[1] - y) < 160) { ok = false; break; }
                if (ok) for (double[] t : traps) if (Math.hypot(t[0] - x, t[1] - y) < 90) { ok = false; break; }
                if (ok) { traps.add(new double[]{x, y}); break; }
            }
        }
    }

    /** Random spawns that stay far apart and clear of obstacles. */
    List<double[]> spawns(int n) {
        for (double minD = Math.min(W, H) * 0.55; ; minD *= 0.85) {
            List<double[]> out = new ArrayList<>();
            for (int tries = 0; tries < 2000 && out.size() < n; tries++) {
                double x = 100 + rnd.nextDouble() * (W - 200), y = 100 + rnd.nextDouble() * (H - 200);
                boolean ok = true;
                for (double[] s : out) if (Math.hypot(s[0] - x, s[1] - y) < minD) { ok = false; break; }
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
        long now = System.currentTimeMillis();
        if (g == null || !g.alive || ph != Ph.PLAY || now < g.dashReady || now < g.frozenUntil || now < g.trappedUntil) return;
        g.dashReady = now + DASH_CD;
        g.dashUntil = now + DASH_MS;
        double l = Math.hypot(g.dx, g.dy);
        if (l > 0.1) { g.ddx = g.dx / l; g.ddy = g.dy / l; } else { g.ddx = g.fx; g.ddy = g.fy; }
    }

    void remove(Main.Player p) {
        gp.remove(p.id);
        if (gp.size() < 2) { finish(); return; }
        if (p.id.equals(holder)) { holder = gp.keySet().iterator().next(); lastSwap = System.currentTimeMillis(); }
    }

    void stop() { if (task != null) task.cancel(false); }

    void finish() {
        stop();
        room.game = null;
        Main.broadcast(room); // sends everyone back to the lobby
    }

    void broadcast(ObjectNode n) {
        String s = n.toString(); // serialize once, send to everyone
        for (Gp g : gp.values()) Main.sendRaw(g.p.ctx, s);
    }

    static double clamp(double v, double lo, double hi) { return Math.max(lo, Math.min(hi, v)); }
}
