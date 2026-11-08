package game;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * One player account. The fields are private (encapsulation): other classes read them through methods, and the
 * password is only ever stored as a salted hash.
 */
final class Account {
    private final String username;
    private String salt;
    private String passwordHash;
    private String displayName;
    private int favorite;          // favourite animal (-1 = none)
    private final long created;
    private int matches, wins, steals;

    Account(String username, String salt, String passwordHash, String displayName, int favorite, long created) {
        this.username = username;
        this.salt = salt;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.favorite = favorite;
        this.created = created;
    }

    String username() { return username; }

    String displayName() { return displayName; }

    int favorite() { return favorite; }

    int matches() { return matches; }

    int wins() { return wins; }

    int steals() { return steals; }

    void setDisplayName(String name) { this.displayName = name; }

    void setFavorite(int animal) { this.favorite = animal; }

    boolean checkPassword(String password) { return passwordHash.equals(Accounts.hash(salt, password)); }

    void setPassword(String password) {
        this.salt = Accounts.newSalt();
        this.passwordHash = Accounts.hash(salt, password);
    }

    void addResult(boolean won, int stolen) {
        matches++;
        if (won) wins++;
        steals += stolen;
    }

    /** What the player may see about their own account (never the password data). */
    ObjectNode toProfile() {
        return Main.JSON.createObjectNode().put("username", username).put("displayName", displayName).put("favorite", favorite)
                .put("created", created).put("matches", matches).put("wins", wins).put("steals", steals);
    }

    /** Everything, for saving to the file. */
    ObjectNode toStored() {
        return toProfile().put("salt", salt).put("hash", passwordHash);
    }

    static Account fromStored(JsonNode n) {
        Account a = new Account(n.path("username").asText(), n.path("salt").asText(), n.path("hash").asText(),
                n.path("displayName").asText(), n.path("favorite").asInt(-1), n.path("created").asLong());
        a.matches = n.path("matches").asInt();
        a.wins = n.path("wins").asInt();
        a.steals = n.path("steals").asInt();
        return a;
    }
}

/**
 * The account storage: Create (register), Read (profile), Update, Delete, plus login and logout.
 * Accounts are kept in a JSON file so they are still there after the game is closed and opened again.
 * Methods are synchronized because several players can use the server at the same time.
 */
final class Accounts {
    private static final Pattern USERNAME = Pattern.compile("[A-Za-z0-9_]{3,16}");
    private static final SecureRandom RANDOM = new SecureRandom();
    static final Accounts DEFAULT = new Accounts(Paths.get(System.getenv().getOrDefault("ACCOUNTS_FILE", "data/accounts.json")));

    private final Path file;
    private final Map<String, Account> accounts = new HashMap<>();   // key = lower-case username
    private final Map<String, String> sessions = new HashMap<>();    // login token -> lower-case username

    Accounts(Path file) {
        this.file = file;
        load();
    }

    // ---------- helpers ----------

    static String newSalt() {
        byte[] b = new byte[16];
        RANDOM.nextBytes(b);
        return toHex(b);
    }

    static String hash(String salt, String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return toHex(md.digest((salt + ":" + password).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte x : bytes) sb.append(String.format("%02x", x));
        return sb.toString();
    }

    private static void checkPassword(String password) {
        if (password == null || password.length() < 6 || password.length() > 64) {
            throw new IllegalArgumentException("Password must be 6 to 64 characters");
        }
    }

    private static String checkDisplay(String display, String fallback) {
        String d = Main.clean(display == null ? "" : display, 12);
        return d.isEmpty() ? fallback : d;
    }

    // ---------- Create ----------

    synchronized Account register(String username, String password, String displayName) {
        if (username == null || !USERNAME.matcher(username).matches()) {
            throw new IllegalArgumentException("Username must be 3 to 16 letters, numbers or underscores");
        }
        checkPassword(password);
        String key = username.toLowerCase();
        if (accounts.containsKey(key)) throw new IllegalArgumentException("That username is already taken");
        String salt = newSalt();
        Account a = new Account(username, salt, hash(salt, password), checkDisplay(displayName, username), -1, System.currentTimeMillis());
        accounts.put(key, a);
        save();
        return a;
    }

    // ---------- Login / Logout ----------

    synchronized String login(String username, String password) {
        Account a = username == null ? null : accounts.get(username.toLowerCase());
        if (a == null || password == null || !a.checkPassword(password)) throw new IllegalArgumentException("Wrong username or password");
        byte[] b = new byte[24];
        RANDOM.nextBytes(b);
        String token = toHex(b);
        sessions.put(token, username.toLowerCase());
        return token;
    }

    synchronized void logout(String token) {
        if (token != null) sessions.remove(token);
    }

    // ---------- Read ----------

    synchronized Account byToken(String token) {
        String key = token == null ? null : sessions.get(token);
        return key == null ? null : accounts.get(key);
    }

    synchronized Account find(String username) {
        return username == null ? null : accounts.get(username.toLowerCase());
    }

    // ---------- Update ----------

    synchronized Account update(String token, String displayName, Integer favorite, String currentPassword, String newPassword) {
        Account a = byToken(token);
        if (a == null) throw new IllegalArgumentException("Please log in first");
        if (displayName != null && !displayName.isEmpty()) a.setDisplayName(checkDisplay(displayName, a.displayName()));
        if (favorite != null) a.setFavorite(Math.max(-1, Math.min(Main.CHARS - 1, favorite)));
        if (newPassword != null && !newPassword.isEmpty()) {
            if (currentPassword == null || !a.checkPassword(currentPassword)) throw new IllegalArgumentException("Current password is wrong");
            checkPassword(newPassword);
            a.setPassword(newPassword);
        }
        save();
        return a;
    }

    // ---------- Delete ----------

    synchronized void delete(String token, String password) {
        Account a = byToken(token);
        if (a == null) throw new IllegalArgumentException("Please log in first");
        if (password == null || !a.checkPassword(password)) throw new IllegalArgumentException("Password is wrong");
        String key = a.username().toLowerCase();
        accounts.remove(key);
        sessions.values().removeIf(v -> v.equals(key));
        save();
    }

    // ---------- Game results ----------

    synchronized void addResult(String username, boolean won, int steals) {
        Account a = find(username);
        if (a == null) return;
        a.addResult(won, steals);
        save();
    }

    // ---------- File handling ----------

    private void load() {
        try {
            if (!Files.exists(file)) return;
            JsonNode root = Main.JSON.readTree(Files.readString(file, StandardCharsets.UTF_8));
            for (JsonNode n : root) {
                Account a = Account.fromStored(n);
                accounts.put(a.username().toLowerCase(), a);
            }
        } catch (Exception e) {
            System.out.println("[accounts] could not read " + file + ": " + e.getMessage());
        }
    }

    private void save() {
        try {
            if (file.getParent() != null) Files.createDirectories(file.getParent());
            ArrayNode arr = Main.JSON.createArrayNode();
            for (Account a : accounts.values()) arr.add(a.toStored());
            Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
            Files.writeString(tmp, Main.JSON.writerWithDefaultPrettyPrinter().writeValueAsString(arr), StandardCharsets.UTF_8);
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            System.out.println("[accounts] could not save: " + e.getMessage());
        }
    }
}
