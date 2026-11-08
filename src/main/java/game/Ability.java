package game;

/**
 * An animal's special move.
 *
 * <p>OOP notes: Ability is an abstract parent class. Every kind of move (speed, shield, stun...) is a subclass that
 * overrides {@link #use}. Game only ever calls use() on an Ability and does not care which kind it is (polymorphism).
 * The fields are private and read through methods (encapsulation), and they are set in the constructor.
 */
abstract class Ability {
    private final String key;
    private final String name;
    private final long cooldownMs;

    Ability(String key, String name, long cooldownMs) {
        this.key = key;
        this.name = name;
        this.cooldownMs = cooldownMs;
    }

    String key() { return key; }

    String name() { return name; }

    long cooldownMs() { return cooldownMs; }

    /** Does the move. Each subclass does it in its own way. */
    abstract void use(Game game, Game.Gp user, long now);

    @Override
    public String toString() { return name + " (" + cooldownMs / 1000 + "s)"; }
}

/** Run faster for a while. */
class SpeedAbility extends Ability {
    private final long ms;

    SpeedAbility(String key, String name, long cooldownMs, long ms) {
        super(key, name, cooldownMs);
        this.ms = ms;
    }

    @Override
    void use(Game game, Game.Gp user, long now) { user.speedUntil = Math.max(user.speedUntil, now + ms); }
}

/** A shield that blocks steals. */
class ShieldAbility extends Ability {
    private final long ms;

    ShieldAbility(String key, String name, long cooldownMs, long ms) {
        super(key, name, cooldownMs);
        this.ms = ms;
    }

    @Override
    void use(Game game, Game.Gp user, long now) { user.shieldUntil = Math.max(user.shieldUntil, now + ms); }
}

/** Walk through obstacles. */
class GhostAbility extends Ability {
    private final long ms;

    GhostAbility(String key, String name, long cooldownMs, long ms) {
        super(key, name, cooldownMs);
        this.ms = ms;
    }

    @Override
    void use(Game game, Game.Gp user, long now) { user.ghostUntil = Math.max(user.ghostUntil, now + ms); }
}

/** Longer reach when stealing. */
class MagnetAbility extends Ability {
    private final long ms;

    MagnetAbility(String key, String name, long cooldownMs, long ms) {
        super(key, name, cooldownMs);
        this.ms = ms;
    }

    @Override
    void use(Game game, Game.Gp user, long now) { user.magnetUntil = Math.max(user.magnetUntil, now + ms); }
}

/** Hide in a cloud of smoke. */
class SmokeAbility extends Ability {
    private final long ms;

    SmokeAbility(String key, String name, long cooldownMs, long ms) {
        super(key, name, cooldownMs);
        this.ms = ms;
    }

    @Override
    void use(Game game, Game.Gp user, long now) { user.smokeUntil = Math.max(user.smokeUntil, now + ms); }
}

/** A quick leap in the direction you are moving. */
class DashAbility extends Ability {
    private final long ms;

    DashAbility(String key, String name, long cooldownMs, long ms) {
        super(key, name, cooldownMs);
        this.ms = ms;
    }

    @Override
    void use(Game game, Game.Gp user, long now) {
        double l = Math.hypot(user.dx, user.dy);
        if (l > 0.1) { user.ddx = user.dx / l; user.ddy = user.dy / l; } else { user.ddx = user.fx; user.ddy = user.fy; }
        user.dashUntil = now + ms;
        user.dashReady = 0;
    }
}

/** Freezes everybody close by for a moment. */
class StunAbility extends Ability {
    private final double radius;
    private final long ms;

    StunAbility(String key, String name, long cooldownMs, double radius, long ms) {
        super(key, name, cooldownMs);
        this.radius = radius;
        this.ms = ms;
    }

    @Override
    void use(Game game, Game.Gp user, long now) {
        for (Game.Gp o : game.gp.values()) {
            if (o == user || !o.alive) continue;
            if (game.team && o.p.team.equals(user.p.team)) continue; // never hurt teammates
            if (now < o.shieldUntil) continue;                         // shields block it
            if (Math.hypot(o.x - user.x, o.y - user.y) < radius) o.frozenUntil = Math.max(o.frozenUntil, now + ms);
        }
    }
}

/** Blasts everybody close by away from the user. */
class PushAbility extends Ability {
    private final double radius;
    private final double dist;

    PushAbility(String key, String name, long cooldownMs, double radius, double dist) {
        super(key, name, cooldownMs);
        this.radius = radius;
        this.dist = dist;
    }

    @Override
    void use(Game game, Game.Gp user, long now) {
        for (Game.Gp o : game.gp.values()) {
            if (o == user || !o.alive) continue;
            if (game.team && o.p.team.equals(user.p.team)) continue;
            if (now < o.shieldUntil) continue;
            double dx = o.x - user.x, dy = o.y - user.y, d = Math.hypot(dx, dy);
            if (d >= radius) continue;
            if (d < 1) { dx = 1; dy = 0; d = 1; }
            o.x = Game.clamp(o.x + dx / d * dist, Game.R, game.W - Game.R);
            o.y = Game.clamp(o.y + dy / d * dist, Game.R, game.H - Game.R);
            o.vx = 0;
            o.vy = 0;
        }
    }
}

/** Drops a bear trap (holds the victim) or a mine (throws the victim back). */
class TrapAbility extends Ability {
    private final boolean mine;

    TrapAbility(String key, String name, long cooldownMs, boolean mine) {
        super(key, name, cooldownMs);
        this.mine = mine;
    }

    @Override
    void use(Game game, Game.Gp user, long now) {
        Game.Bt b = new Game.Bt();
        b.id = ++game.hzId;
        b.x = user.x;
        b.y = user.y;
        b.owner = user.p.id;
        b.armAt = now + (mine ? 1200 : 800);
        b.mine = mine;
        game.bears.add(b);
    }
}

/** Plays one of the lucky-block power-ups by name ("tele", "decoy"...). */
class PowerAbility extends Ability {
    private final String power;

    PowerAbility(String key, String name, long cooldownMs, String power) {
        super(key, name, cooldownMs);
        this.power = power;
    }

    @Override
    void use(Game game, Game.Gp user, long now) { game.applyPower(user, power, now); }
}

/** Lets the player see everybody. This is a display effect, so the server has nothing to change; the client shows it. */
class RevealAbility extends Ability {
    RevealAbility(String key, String name, long cooldownMs) { super(key, name, cooldownMs); }

    @Override
    void use(Game game, Game.Gp user, long now) { /* nothing to do on the server */ }
}

/** Several moves in one (an ability made of other abilities). */
class ComboAbility extends Ability {
    private final Ability[] parts;

    ComboAbility(String key, String name, long cooldownMs, Ability... parts) {
        super(key, name, cooldownMs);
        this.parts = parts;
    }

    @Override
    void use(Game game, Game.Gp user, long now) {
        for (Ability a : parts) a.use(game, user, now);
    }
}
