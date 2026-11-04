package game;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class AccountsTest {
    private Path tempFile() throws Exception {
        Path f = Files.createTempFile("accounts", ".json");
        Files.delete(f);
        return f;
    }

    @Test
    void createReadUpdateDeleteAndLoginLogout() throws Exception {
        Path f = tempFile();
        Accounts a = new Accounts(f);
        a.register("jason_1", "secret1", "Jason");                          // Create
        String token = a.login("jason_1", "secret1");                       // Login
        assertEquals("Jason", a.byToken(token).displayName());               // Read
        a.update(token, "Jay", 3, null, null);                               // Update
        assertEquals("Jay", new Accounts(f).find("jason_1").displayName());  // saved in the file: survives a restart
        assertEquals(3, new Accounts(f).find("jason_1").favorite());
        a.logout(token);                                                     // Logout
        assertNull(a.byToken(token));
        String token2 = a.login("jason_1", "secret1");
        a.delete(token2, "secret1");                                         // Delete
        assertNull(new Accounts(f).find("jason_1"));
    }

    @Test
    void validationAndWrongPasswords() throws Exception {
        Accounts a = new Accounts(tempFile());
        assertThrows(IllegalArgumentException.class, () -> a.register("ab", "secret1", "x"));       // username too short
        assertThrows(IllegalArgumentException.class, () -> a.register("good_name", "123", "x"));    // password too short
        a.register("good_name", "secret1", "Good");
        assertThrows(IllegalArgumentException.class, () -> a.register("GOOD_NAME", "secret1", "x")); // duplicate (any case)
        assertThrows(IllegalArgumentException.class, () -> a.login("good_name", "wrong"));
        String token = a.login("good_name", "secret1");
        assertThrows(IllegalArgumentException.class, () -> a.delete(token, "wrong"));
        assertNotNull(a.byToken(token));
    }

    @Test
    void passwordsAreNotStoredAsPlainText() throws Exception {
        Path f = tempFile();
        new Accounts(f).register("secret_user", "mypassword", "S");
        assertTrue(!Files.readString(f).contains("mypassword"));
    }

    @Test
    void everyAnimalHasItsOwnAbility() {
        assertEquals(Main.CHARS, Abilities.ALL.length);
        Set<String> names = new HashSet<>();
        for (Ability a : Abilities.ALL) {
            assertTrue(a.cooldownMs() > 0);
            names.add(a.name());
        }
        assertEquals(Main.CHARS, names.size()); // all different
    }
}
