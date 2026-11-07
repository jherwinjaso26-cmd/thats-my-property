# That's My Property

2D landscape multiplayer steal-the-property game. Java (Javalin) server, plain HTML/JS canvas client.

- Run locally: `mvn exec:java` then open http://localhost:8080
- Tests: `mvn test`
- Deploy: Dockerfile (Render). Render's free tier sleeps when idle; point an uptime pinger (e.g. UptimeRobot) at `/health` every ~10 minutes to keep it awake.
- Up to 15 players per room. Bots can be added by the host (also good for practising alone).
- Lobby music is generated live in the browser (`Music` in `fx.js`), so there are no audio files to host.

## 3D version

The client now renders in 3D with [Three.js](https://threejs.org) (r128), loaded from cdnjs. For offline or self-hosted use, download
`three.min.js` (r128) into `src/main/resources/public/` and it is used automatically if the CDN is unreachable.

- `game3d.js` – the 3D renderer (all models, effects and textures are generated in code, nothing to download). If WebGL or Three.js is
  unavailable, or the renderer throws, the game falls back to the classic 2D view by itself. Players can also switch it off in ⚙️ Settings.
- Camera: Tilted / Top-down / Close-up (📷 button in a match). Graphics: Auto / High (shadows) / Medium / Low.
- New modes: **Blitz** (15 s rounds, everyone speedy) and **Shrinking Arena** (water closes in every round).
- Sound: per-map ambient beds, spatial (distance-faded) effects, thunder, footsteps, per-power-up sounds, and a faster in-match music track
  that speeds up in the last 5 seconds.
- The server protocol is unchanged apart from `init.hold` (round length in seconds) and the two new `mode` values.

## More features
- Power-ups: magnet, super jump, reveal. Modes: Hot Potato. Maps: Coral Reef, Haunted Mansion (12 maps total).
- Cute reaction faces, 11 accessories, winner victory dance, steal camera punch, day/sunset/dusk lighting.
- 8 emotes, streak and revenge banners, first-match tutorial, daily challenge and stats (stored on the device).
- Settings: left-handed controls, button size, colorblind-friendly team colors.
- 24 characters (new: owl, hippo, dragon, bee), screenshot button, bigger-text option, scrollable settings.

## Database (optional)
Add a Render PostgreSQL database, then on the web service add an environment variable `DATABASE_URL` with the database's **Internal Database URL**.
On start the server creates its two tables (`players`, `matches`) by itself. Without `DATABASE_URL` everything still works and the leaderboard just says it is not set up.
Players are identified by an anonymous random id stored in their browser (no passwords, no personal data). Match results are saved when a match ends.
- Special roles (Sprinter / Grabber), steal streak speed boost and revenge shield, moving floors on the Haunted Mansion map, Halloween and Christmas seasonal looks.
- Emote drawer: a 💬 button at the side opens a small panel (never over the middle of the screen); emotes work while moving.
- Boss round: every 5th round has a giant tornado.
- Accessory picker in the lobby (shared with other players), and every animal now has its own 3D features (tails, whiskers, horns, wings, spots...).
- Two Properties mode, new power-ups (ghost, teleport, mine), emote animations, and a victory pose for each animal.

## Accounts, special moves and more modes
- **Accounts (CRUD):** register, login/logout, view profile, edit profile (name, favorite animal, password), delete account. Stored by the server in `data/accounts.json`
  (set `ACCOUNTS_FILE` to change the path; on Render use a persistent disk path such as `/data/accounts.json`). Passwords are stored only as salted SHA-256 hashes.
  Routes: `POST /api/account/register`, `POST /api/account/login`, `POST /api/account/logout`, `GET /api/account`, `PUT /api/account`, `DELETE /api/account`.
- **Special moves:** each of the 24 animals has its own ability (key Q or the purple button). Java: abstract class `Ability` with subclasses (`SpeedAbility`, `StunAbility`, ...), see `Ability.java` and `Abilities.java`.
- **Modes:** Last Survivor, Hot Swap, Small Arena, Chaos (plus Solo, Team, Blitz, Shrinking Arena, Hot Potato, Two Properties).
- **Big matches:** fewer network updates, no shadows and smaller render size with 10+ players, off-screen characters are skipped, shared 3D geometry.
- Speed: no backdrop blur over the live game, shadows redrawn every other frame, no per-frame allocations in the 3D loop, idle particle systems skipped, optional battery saver (30 fps, automatic as a last resort), lobby preview at 30 fps, compressed static files.
- Network: every player's messages are sent from their own queue on a background thread (`Outbox.java`), so one slow phone cannot stall the game for the others; slow connections skip old position updates and catch up. The corner label shows ping, fps and server step time to help find lag.
