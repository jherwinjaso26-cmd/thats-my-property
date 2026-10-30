package game;

import java.util.Random;

/** Server-side bots: chase the property (or run from stealers when they hold it) while dodging every hazard. */
final class Bots {
    private Bots() { }

    static final Random RND = new Random();

    static void think(Game G, Game.Gp g, long now) {
        if (G.ph != Game.Ph.PLAY || !g.alive || now < g.frozenUntil || now < g.trappedUntil) { g.dx = g.dy = 0; return; }
        boolean prot = g.p.id.equals(G.holder);
        Game.Gp h = G.gp.get(G.holder);
        Game.Gp near = nearest(G, g);
        double tx = 0, ty = 0;

        if (prot) { // run away from the closest stealer, drifting toward the middle so we never get pinned on a wall
            if (near != null) {
                double ex = g.x - near.x, ey = g.y - near.y, d = Math.max(1, Math.hypot(ex, ey));
                double w = Math.max(0.15, Math.min(1, 1 - d / 700));
                tx += ex / d * w;
                ty += ey / d * w;
            }
            double cx = G.W / 2 - g.x, cy = G.H / 2 - g.y, cd = Math.max(1, Math.hypot(cx, cy));
            tx += cx / cd * 0.35;
            ty += cy / cd * 0.35;
        } else if (h != null && h != g && h.alive && !(G.team && h.p.team.equals(g.p.team))) { // chase, leading the target a little
            double ex = h.x - g.x, ey = h.y - g.y, d = Math.max(1, Math.hypot(ex, ey));
            double lead = Math.min(0.4, d / 900);
            ex += h.dx * 240 * lead;
            ey += h.dy * 240 * lead;
            d = Math.max(1, Math.hypot(ex, ey));
            tx += ex / d;
            ty += ey / d;
        } else { // nothing to chase (teammate holds it): wander
            if (RND.nextDouble() < 0.02) g.wander += (RND.nextDouble() - 0.5) * 2;
            tx += Math.cos(g.wander);
            ty += Math.sin(g.wander);
        }

        // lucky blocks are worth a detour
        double bd = 380;
        double[] best = null;
        for (double[] b : G.blocks) {
            double d = Math.hypot(b[1] - g.x, b[2] - g.y);
            if (d < bd) { bd = d; best = b; }
        }
        if (best != null) {
            double ex = best[1] - g.x, ey = best[2] - g.y, d = Math.max(1, Math.hypot(ex, ey));
            tx += ex / d * 0.55;
            ty += ey / d * 0.55;
        }

        // avoidance: everything that can hurt us pushes us away
        double[] a = new double[2];
        for (double[] o : G.obs) rep(a, g, o[0], o[1], o[2] * 0.85 + Game.R + 35, 1.2);
        for (double[] t : G.traps) rep(a, g, t[0], t[1], Game.TRAP_R + Game.R + 50, 3);
        for (double[] o : G.holes) rep(a, g, o[0], o[1], o[2] + Game.R + 55, 3);
        for (Game.Zn z : G.zones) if (z.k.equals("lava")) rep(a, g, z.x, z.y, z.r + Game.R + 60, 3);
        for (Game.Hz hz : G.hz) {
            if (hz.k.equals("t")) rep(a, g, hz.x, hz.y, hz.r + Game.R + 140, 3);
            else if (hz.k.equals("b")) {
                if (hz.vx != 0 && Math.abs(g.y - hz.y) < hz.r + Game.R + 40) a[1] += Math.signum(g.y - hz.y + 0.001) * 2.5;
                if (hz.vy != 0 && Math.abs(g.x - hz.x) < hz.r + Game.R + 40) a[0] += Math.signum(g.x - hz.x + 0.001) * 2.5;
            } else rep(a, g, hz.x, hz.y, hz.r + Game.R + 70, 3.5);
        }
        for (Game.Bt b : G.bears) if (now >= b.armAt && !g.p.id.equals(b.owner)) rep(a, g, b.x, b.y, 70, 2);
        if (G.disaster.equals("FLOOD") && (G.fx > 0 || G.fy > 0)) {
            double inX = Math.min(g.x - G.fx, G.W - G.fx - g.x), inY = Math.min(g.y - G.fy, G.H - G.fy - g.y);
            if (Math.min(inX, inY) < 140) {
                double cx = G.W / 2 - g.x, cy = G.H / 2 - g.y, cd = Math.max(1, Math.hypot(cx, cy));
                a[0] += cx / cd * 2.5;
                a[1] += cy / cd * 2.5;
            }
        }
        if (g.x < 90) a[0] += (90 - g.x) / 90 * 1.5;
        if (g.x > G.W - 90) a[0] -= (g.x - (G.W - 90)) / 90 * 1.5;
        if (g.y < 90) a[1] += (90 - g.y) / 90 * 1.5;
        if (g.y > G.H - 90) a[1] -= (g.y - (G.H - 90)) / 90 * 1.5;

        double vx = tx + a[0] * g.skill, vy = ty + a[1] * g.skill; // weaker bots dodge a little worse
        double l = Math.hypot(vx, vy);
        if (l < 0.05) { vx = vy = 0; } else { vx /= l; vy /= l; }
        vx = g.dx * 0.5 + vx * 0.5; // smooth the steering
        vy = g.dy * 0.5 + vy * 0.5;
        l = Math.hypot(vx, vy);
        if (l > 1) { vx /= l; vy /= l; }
        g.dx = vx;
        g.dy = vy;

        // dash to close the gap or to break away
        if (!prot && h != null && h != g) {
            double d = Math.hypot(h.x - g.x, h.y - g.y);
            if (d > 60 && d < 230 && RND.nextDouble() < 0.08) G.dashFor(g);
        } else if (prot && near != null && Math.hypot(near.x - g.x, near.y - g.y) < 130 && RND.nextDouble() < 0.1) {
            G.dashFor(g);
        }
        // drop a stored bear trap when someone is close
        if (g.hasTrap) {
            Game.Gp t = prot ? near : h;
            if (t != null && t != g && Math.hypot(t.x - g.x, t.y - g.y) < 210 && RND.nextDouble() < 0.1) G.useFor(g);
        }
    }

    private static Game.Gp nearest(Game G, Game.Gp me) {
        Game.Gp best = null;
        double bd = 1e18;
        for (Game.Gp o : G.gp.values()) {
            if (o == me || !o.alive) continue;
            double d = Math.hypot(o.x - me.x, o.y - me.y);
            if (d < bd) { bd = d; best = o; }
        }
        return best;
    }

    /** Pushes away from (ox, oy) when closer than range; strength grows toward the object. */
    private static void rep(double[] acc, Game.Gp g, double ox, double oy, double range, double strength) {
        double ex = g.x - ox, ey = g.y - oy, d = Math.hypot(ex, ey);
        if (d >= range || d < 0.001) return;
        double k = (1 - d / range) * strength;
        acc[0] += ex / d * k;
        acc[1] += ey / d * k;
    }
}
