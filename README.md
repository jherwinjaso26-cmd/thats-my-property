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
