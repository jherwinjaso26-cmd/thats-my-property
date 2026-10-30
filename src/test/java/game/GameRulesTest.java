package game;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Rule checks for stealing, scoring and the player cap. Run with: mvn test */
class GameRulesTest {
    static Main.Room room(int n, String mode) {
        Main.Room r = new Main.Room();
        r.code = "TEST";
        r.mode = mode;
        for (int i = 0; i < n; i++) {
            Main.Player p = new Main.Player();
            p.id = "p" + i;
            p.name = "P" + i;
            p.character = i;
            p.team = i % 2 == 0 ? "red" : "blue";
            p.room = r;
            r.players.add(p);
        }
        r.host = r.players.get(0);
        return r;
    }

    static Game match(Main.Room r) {
        Game g = new Game(r);
        g.stop(); // we drive the rules by hand instead of by the timer
        g.ph = Game.Ph.PLAY;
        g.lastSwap = 0;
        return g;
    }

    static void place(Game g, String id, double x, double y) {
        g.gp.get(id).x = x;
        g.gp.get(id).y = y;
    }

    @Test
    void roomHoldsFifteenPlayers() {
        assertEquals(15, Main.MAX_PLAYERS);
        assertTrue(Main.CHARS >= Main.MAX_PLAYERS, "every player can have a unique character");
    }

    @Test
    void touchingTheProtectorStealsTheProperty() {
        Game g = match(room(3, "solo"));
        g.holder = "p0";
        place(g, "p0", 500, 500); place(g, "p1", 520, 500); place(g, "p2", 1500, 900);
        g.steals(100_000);
        assertEquals("p1", g.holder);
        assertEquals(1, g.gp.get("p1").steals);
    }

    @Test
    void noInstantStealBack() {
        Game g = match(room(2, "solo"));
        g.holder = "p0";
        place(g, "p0", 500, 500); place(g, "p1", 520, 500);
        g.steals(100_000);
        g.steals(102_000); // grace is over, but the old holder is still locked out
        assertEquals("p1", g.holder);
        g.steals(104_000);
        assertEquals("p0", g.holder);
    }

    @Test
    void teammatesDoNotStealFromEachOther() {
        Game g = match(room(2, "team"));
        g.gp.get("p1").p.team = g.gp.get("p0").p.team;
        g.holder = "p0";
        place(g, "p0", 500, 500); place(g, "p1", 510, 500);
        g.steals(100_000);
        assertEquals("p0", g.holder);
    }

    @Test
    void shieldBlocksStealing() {
        Game g = match(room(2, "solo"));
        g.holder = "p0";
        g.gp.get("p0").shieldUntil = 200_000;
        place(g, "p0", 500, 500); place(g, "p1", 510, 500);
        g.steals(100_000);
        assertEquals("p0", g.holder);
    }

    @Test
    void survivingHolderScoresAtTheEndOfARound() {
        Game g = match(room(2, "solo"));
        g.holder = "p1";
        g.endRound(System.currentTimeMillis());
        assertEquals(1, g.scores.get("p1"));
        assertEquals(Game.Ph.SCORE, g.ph);
    }

    @Test
    void deadHolderPassesPropertyToNearestSurvivor() {
        Game g = match(room(3, "solo"));
        g.holder = "p0";
        place(g, "p0", 300, 300); place(g, "p1", 340, 300); place(g, "p2", 1500, 900);
        g.kill(g.gp.get("p0"), System.currentTimeMillis());
        assertEquals("p1", g.holder);
    }

    @Test
    void everyMapGetsItsOwnTerrain() {
        for (String map : Main.MAPS) {
            Main.Room r = room(4, "solo");
            r.map = map;
            Game g = match(r);
            assertTrue(!g.zones.isEmpty(), map + " has terrain");
        }
    }
}
