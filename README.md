# That's My Property

2D landscape multiplayer steal-the-property game. Java (Javalin) server, plain HTML/JS canvas client.

- Run locally: `mvn exec:java` then open http://localhost:8080
- Tests: `mvn test`
- Deploy: Dockerfile (Render). Render's free tier sleeps when idle; point an uptime pinger (e.g. UptimeRobot) at `/health` every ~10 minutes to keep it awake.
- Up to 15 players per room. Bots can be added by the host (also good for practising alone).
- Lobby music is generated live in the browser (`Music` in `fx.js`), so there are no audio files to host.
