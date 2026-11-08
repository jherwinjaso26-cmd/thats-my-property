package game;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.net.URI;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Optional PostgreSQL storage for the leaderboard and match history.
 * It only switches on when the DATABASE_URL environment variable is set (Render sets it for you
 * when you add a Postgres database). Without it the game works exactly as before.
 * Every database call runs on a background thread, so a slow database can never lag a match.
 */
final class Db {
    private Db() { }

    /** One player's result in a finished match. */
    record Rec(String uid, String name, boolean won, int steals, int blocks, int deaths, long heldMs) { }

    static volatile boolean on = false;
    private static String url, user, pass;
    private static final ExecutorService EX = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "db");
        t.setDaemon(true);
        return t;
    });

    static void init() {
        String raw = System.getenv("DATABASE_URL");
        if (raw == null || raw.isBlank()) {
            System.out.println("[db] DATABASE_URL not set - leaderboard is off");
            return;
        }
        try {
            URI u = new URI(raw.trim().replaceFirst("^postgres(ql)?://", "http://"));
            String info = u.getUserInfo() == null ? "" : u.getUserInfo();
            int c = info.indexOf(':');
            user = c < 0 ? info : info.substring(0, c);
            pass = c < 0 ? "" : info.substring(c + 1);
            int port = u.getPort() < 0 ? 5432 : u.getPort();
            url = "jdbc:postgresql://" + u.getHost() + ":" + port + u.getPath() + "?sslmode=prefer";
            Class.forName("org.postgresql.Driver");
            try (Connection cn = DriverManager.getConnection(url, user, pass); Statement st = cn.createStatement()) {
                st.execute("CREATE TABLE IF NOT EXISTS players(uid TEXT PRIMARY KEY, name TEXT NOT NULL, matches INT NOT NULL DEFAULT 0, "
                        + "wins INT NOT NULL DEFAULT 0, steals INT NOT NULL DEFAULT 0, blocks INT NOT NULL DEFAULT 0, "
                        + "deaths INT NOT NULL DEFAULT 0, held_s BIGINT NOT NULL DEFAULT 0, updated TIMESTAMPTZ NOT NULL DEFAULT now())");
                st.execute("CREATE TABLE IF NOT EXISTS matches(id BIGSERIAL PRIMARY KEY, played TIMESTAMPTZ NOT NULL DEFAULT now(), "
                        + "map TEXT, mode TEXT, winner TEXT, players INT, rounds INT)");
            }
            on = true;
            System.out.println("[db] connected - leaderboard is on");
        } catch (Exception e) {
            System.out.println("[db] could not start, leaderboard stays off: " + e.getMessage());
        }
    }

    private static Connection open() throws Exception {
        return DriverManager.getConnection(url, user, pass);
    }

    /** Saves a finished match and updates every human player's totals (in the background). */
    static void recordMatch(String map, String mode, String winner, int rounds, int players, List<Rec> recs) {
        if (!on) return;
        List<Rec> copy = List.copyOf(recs);
        EX.submit(() -> {
            try (Connection cn = open()) {
                try (PreparedStatement ps = cn.prepareStatement("INSERT INTO matches(map,mode,winner,players,rounds) VALUES(?,?,?,?,?)")) {
                    ps.setString(1, map);
                    ps.setString(2, mode);
                    ps.setString(3, winner);
                    ps.setInt(4, players);
                    ps.setInt(5, rounds);
                    ps.executeUpdate();
                }
                String sql = "INSERT INTO players(uid,name,matches,wins,steals,blocks,deaths,held_s) VALUES(?,?,1,?,?,?,?,?) "
                        + "ON CONFLICT (uid) DO UPDATE SET name=EXCLUDED.name, matches=players.matches+1, wins=players.wins+EXCLUDED.wins, "
                        + "steals=players.steals+EXCLUDED.steals, blocks=players.blocks+EXCLUDED.blocks, deaths=players.deaths+EXCLUDED.deaths, "
                        + "held_s=players.held_s+EXCLUDED.held_s, updated=now()";
                try (PreparedStatement ps = cn.prepareStatement(sql)) {
                    for (Rec r : copy) {
                        ps.setString(1, r.uid());
                        ps.setString(2, r.name());
                        ps.setInt(3, r.won() ? 1 : 0);
                        ps.setInt(4, r.steals());
                        ps.setInt(5, r.blocks());
                        ps.setInt(6, r.deaths());
                        ps.setLong(7, r.heldMs() / 1000);
                        ps.executeUpdate();
                    }
                }
            } catch (Exception e) {
                System.out.println("[db] could not save match: " + e.getMessage());
            }
        });
    }

    /** JSON for the leaderboard page: top players, the asking player's own row, and the latest matches. */
    static String leaderboardJson(String uid) {
        ObjectNode out = Main.JSON.createObjectNode();
        out.put("on", on);
        if (!on) return out.toString();
        try (Connection cn = open()) {
            ArrayNode top = out.putArray("top");
            try (Statement st = cn.createStatement();
                 ResultSet rs = st.executeQuery("SELECT name,wins,matches,steals,blocks FROM players ORDER BY wins DESC, steals DESC LIMIT 20")) {
                while (rs.next()) {
                    top.addObject().put("name", rs.getString(1)).put("wins", rs.getInt(2)).put("matches", rs.getInt(3))
                            .put("steals", rs.getInt(4)).put("blocks", rs.getInt(5));
                }
            }
            if (uid != null && !uid.isEmpty()) {
                try (PreparedStatement ps = cn.prepareStatement("SELECT name,wins,matches,steals,blocks,deaths,held_s FROM players WHERE uid=?")) {
                    ps.setString(1, uid);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            out.putObject("me").put("name", rs.getString(1)).put("wins", rs.getInt(2)).put("matches", rs.getInt(3))
                                    .put("steals", rs.getInt(4)).put("blocks", rs.getInt(5)).put("deaths", rs.getInt(6)).put("held", rs.getLong(7));
                        }
                    }
                }
            }
            ArrayNode recent = out.putArray("recent");
            try (Statement st = cn.createStatement();
                 ResultSet rs = st.executeQuery("SELECT map,mode,winner,players,rounds FROM matches ORDER BY id DESC LIMIT 8")) {
                while (rs.next()) {
                    recent.addObject().put("map", rs.getString(1)).put("mode", rs.getString(2)).put("winner", rs.getString(3))
                            .put("players", rs.getInt(4)).put("rounds", rs.getInt(5));
                }
            }
        } catch (Exception e) {
            out.put("error", "database unavailable");
        }
        return out.toString();
    }
}
