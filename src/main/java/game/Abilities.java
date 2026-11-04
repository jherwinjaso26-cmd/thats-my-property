package game;

/** The special move of each animal, in the same order as the character list (0 = cat ... 23 = bee). */
final class Abilities {
    private Abilities() { }

    static final Ability[] ALL = {
        /* 0 cat      */ new DashAbility("pounce", "Pounce", 9_000, 520),
        /* 1 dog      */ new RevealAbility("sniff", "Sniff Out", 16_000),
        /* 2 fox      */ new PowerAbility("decoy", "Fox Decoy", 16_000, "decoy"),
        /* 3 panda    */ new ShieldAbility("bamboo", "Bamboo Guard", 18_000, 3_500),
        /* 4 frog     */ new MagnetAbility("tongue", "Long Tongue", 15_000, 4_500),
        /* 5 monkey   */ new TrapAbility("banana", "Banana Trap", 14_000, false),
        /* 6 bunny    */ new SpeedAbility("hop", "Super Hop", 14_000, 3_500),
        /* 7 bear     */ new StunAbility("roar", "Bear Roar", 20_000, 170, 1_200),
        /* 8 tiger    */ new ComboAbility("strike", "Tiger Strike", 15_000, new DashAbility("", "", 0, 520), new MagnetAbility("", "", 0, 2_500)),
        /* 9 lion     */ new PushAbility("mighty", "Mighty Roar", 20_000, 200, 170),
        /* 10 pig     */ new TrapAbility("truffle", "Truffle Bomb", 16_000, true),
        /* 11 cow     */ new ComboAbility("stampede", "Stampede", 18_000, new SpeedAbility("", "", 0, 2_500), new ShieldAbility("", "", 0, 1_500)),
        /* 12 koala   */ new GhostAbility("climb", "Tree Climb", 18_000, 3_500),
        /* 13 mouse   */ new PowerAbility("squeak", "Squeak Escape", 16_000, "tele"),
        /* 14 wolf    */ new ComboAbility("howl", "Pack Howl", 17_000, new SpeedAbility("", "", 0, 3_000), new RevealAbility("", "", 0)),
        /* 15 raccoon */ new SmokeAbility("sneak", "Sneaky Smoke", 15_000, 4_500),
        /* 16 penguin */ new ComboAbility("slide", "Belly Slide", 14_000, new DashAbility("", "", 0, 700), new ShieldAbility("", "", 0, 1_200)),
        /* 17 chick   */ new ComboAbility("peck", "Peck Frenzy", 14_000, new SpeedAbility("", "", 0, 2_000), new MagnetAbility("", "", 0, 3_500)),
        /* 18 unicorn */ new ComboAbility("rainbow", "Rainbow Dash", 18_000, new SpeedAbility("", "", 0, 3_500), new ShieldAbility("", "", 0, 1_500)),
        /* 19 robot   */ new RevealAbility("radar", "Radar Scan", 22_000),
        /* 20 owl     */ new ComboAbility("gust", "Wing Gust", 16_000, new PushAbility("", "", 0, 150, 120), new SpeedAbility("", "", 0, 1_500)),
        /* 21 hippo   */ new ComboAbility("stomp", "Splash Stomp", 20_000, new StunAbility("", "", 0, 150, 1_000), new ShieldAbility("", "", 0, 2_000)),
        /* 22 dragon  */ new ComboAbility("fire", "Fire Breath", 18_000, new StunAbility("", "", 0, 220, 800), new PushAbility("", "", 0, 220, 90)),
        /* 23 bee     */ new ComboAbility("buzz", "Buzz Sting", 15_000, new SpeedAbility("", "", 0, 2_500), new TrapAbility("", "", 0, true)),
    };

    static Ability forCharacter(int character) {
        return ALL[Math.floorMod(character, ALL.length)];
    }
}
