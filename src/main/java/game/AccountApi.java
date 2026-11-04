package game;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.javalin.Javalin;
import io.javalin.http.Context;

/** The web routes for account management. The browser keeps the login token and sends it in the X-Token header. */
final class AccountApi {
    private AccountApi() { }

    static void routes(Javalin app) {
        // Create
        app.post("/api/account/register", ctx -> {
            JsonNode b = body(ctx);
            try {
                String password = b.path("password").asText("");
                Account a = Accounts.DEFAULT.register(b.path("username").asText(""), password, b.path("displayName").asText(""));
                ok(ctx, session(Accounts.DEFAULT.login(a.username(), password), a));
            } catch (IllegalArgumentException e) {
                fail(ctx, e.getMessage());
            }
        });
        // Login
        app.post("/api/account/login", ctx -> {
            JsonNode b = body(ctx);
            try {
                String username = b.path("username").asText("");
                String token = Accounts.DEFAULT.login(username, b.path("password").asText(""));
                ok(ctx, session(token, Accounts.DEFAULT.byToken(token)));
            } catch (IllegalArgumentException e) {
                fail(ctx, e.getMessage());
            }
        });
        // Logout
        app.post("/api/account/logout", ctx -> {
            Accounts.DEFAULT.logout(ctx.header("X-Token"));
            ok(ctx, Main.JSON.createObjectNode().put("ok", true));
        });
        // Read
        app.get("/api/account", ctx -> {
            Account a = Accounts.DEFAULT.byToken(ctx.header("X-Token"));
            if (a == null) fail(ctx, "Please log in first");
            else ok(ctx, a.toProfile());
        });
        // Update
        app.put("/api/account", ctx -> {
            JsonNode b = body(ctx);
            try {
                Integer fav = b.has("favorite") ? Integer.valueOf(b.path("favorite").asInt(-1)) : null;
                Account a = Accounts.DEFAULT.update(ctx.header("X-Token"), b.path("displayName").asText(""), fav,
                        b.path("currentPassword").asText(""), b.path("newPassword").asText(""));
                ok(ctx, a.toProfile());
            } catch (IllegalArgumentException e) {
                fail(ctx, e.getMessage());
            }
        });
        // Delete
        app.delete("/api/account", ctx -> {
            JsonNode b = body(ctx);
            try {
                Accounts.DEFAULT.delete(ctx.header("X-Token"), b.path("password").asText(""));
                ok(ctx, Main.JSON.createObjectNode().put("ok", true));
            } catch (IllegalArgumentException e) {
                fail(ctx, e.getMessage());
            }
        });
    }

    private static ObjectNode session(String token, Account a) {
        ObjectNode n = Main.JSON.createObjectNode();
        n.put("token", token);
        n.set("profile", a.toProfile());
        return n;
    }

    private static JsonNode body(Context ctx) {
        try {
            return Main.JSON.readTree(ctx.body());
        } catch (Exception e) {
            return Main.JSON.createObjectNode();
        }
    }

    private static void ok(Context ctx, JsonNode n) {
        ctx.contentType("application/json").result(n.toString());
    }

    private static void fail(Context ctx, String message) {
        ctx.status(400).contentType("application/json").result(Main.JSON.createObjectNode().put("error", message).toString());
    }
}
