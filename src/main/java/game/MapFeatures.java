package game;

/** Gives every map its own terrain rule (ice, mud, bounce pads, portals, lava, hiding bushes). Built once per match. */
final class MapFeatures {
    private MapFeatures() { }

    static void build(Game G) {
        String kind;
        double speedFactor = 1;
        switch (G.room.map) {
            case "snow" -> kind = "ice";                                // slide
            case "swamp" -> { kind = "slow"; speedFactor = 0.5; }       // mud
            case "desert" -> { kind = "slow"; speedFactor = 0.45; }     // quicksand
            case "beach" -> { kind = "slow"; speedFactor = 0.65; }      // tide pools
            case "candy" -> kind = "bounce";                            // launch pads
            case "space", "ruins" -> kind = "portal";                   // teleport pairs
            case "lava" -> kind = "lava";                               // deadly pools
            default -> kind = "bush";                                   // forest, autumn: hide from far players
        }
        int n = (int) Math.max(4, G.W * G.H / 330000);
        switch (kind) {
            case "portal" -> {
                int pairs = Math.min(6, Math.max(1, n / 4));
                for (int i = 0; i < pairs; i++) {
                    Game.Zn a = place(G, "portal", 34, 1, true, null, 0);
                    if (a == null) continue;
                    Game.Zn b = place(G, "portal", 34, 1, true, a, Math.min(G.W, G.H) * 0.35);
                    if (b == null) { G.zones.remove(a); continue; }
                    a.link = G.zones.indexOf(b);
                    b.link = G.zones.indexOf(a);
                }
            }
            case "lava" -> { for (int i = 0; i < Math.max(2, n / 2); i++) place(G, "lava", 55 + G.rnd.nextDouble() * 30, 1, true, null, 0); }
            case "bounce" -> { for (int i = 0; i < n; i++) place(G, "bounce", 30, 1, true, null, 0); }
            case "bush" -> { for (int i = 0; i < n + 2; i++) place(G, "bush", 70 + G.rnd.nextDouble() * 40, 1, false, null, 0); }
            case "ice" -> { for (int i = 0; i < n; i++) place(G, "ice", 90 + G.rnd.nextDouble() * 60, 1, false, null, 0); }
            default -> { for (int i = 0; i < n; i++) place(G, "slow", 80 + G.rnd.nextDouble() * 50, speedFactor, false, null, 0); }
        }
    }

    /** Finds a free spot (no overlap with other zones, optionally clear of obstacles and far from another zone). */
    private static Game.Zn place(Game G, String kind, double r, double p, boolean avoidObs, Game.Zn far, double minFar) {
        for (int tries = 0; tries < 80; tries++) {
            double x = r + 50 + G.rnd.nextDouble() * (G.W - 2 * r - 100), y = r + 50 + G.rnd.nextDouble() * (G.H - 2 * r - 100);
            boolean ok = true;
            for (Game.Zn z : G.zones) if (Math.hypot(z.x - x, z.y - y) < z.r + r + 25) { ok = false; break; }
            if (ok && avoidObs) for (double[] o : G.obs) if (Math.hypot(o[0] - x, o[1] - y) < o[2] + r + 12) { ok = false; break; }
            if (ok && far != null && Math.hypot(far.x - x, far.y - y) < minFar) ok = false;
            if (!ok) continue;
            Game.Zn z = new Game.Zn();
            z.k = kind; z.x = x; z.y = y; z.r = r; z.p = p;
            G.zones.add(z);
            return z;
        }
        return null;
    }
}
