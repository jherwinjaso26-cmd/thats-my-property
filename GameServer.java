import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;

public class GameServer {
    private final int port;
    private final Map<String, ActiveMatch> activeMatches = new ConcurrentHashMap<>();

    public GameServer(int port) {
        this.port = port;
    }

    public void start() {
        try (ServerSocket serverSocket = new ServerSocket(port)) {
            while (true) {
                Socket socket = serverSocket.accept();
                new Thread(new MatchSessionWorker(socket)).start();
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private class MatchSessionWorker implements Runnable {
        private final Socket socket;

        public MatchSessionWorker(Socket socket) {
            this.socket = socket;
        }

        @Override
        public void run() {
            try (BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                 PrintWriter out = new PrintWriter(socket.getOutputStream(), true)) {
                
                String line;
                while ((line = in.readLine()) != null) {
                    String[] tokens = line.split(":");
                    String cmd = tokens[0];

                    if ("INITIALIZE_LOBBY".equals(cmd)) {
                        String matchId = "MATCH_" + UUID.randomUUID().toString().substring(0, 4);
                        String mode = tokens[1];
                        int matchDuration = Integer.parseInt(tokens[2]);
                        int targetScore = Integer.parseInt(tokens[3]);

                        ActiveMatch newMatch = new ActiveMatch(matchId, mode, matchDuration, targetScore);
                        activeMatches.put(matchId, newMatch);
                        out.println("LOBBY_CREATED:" + matchId + ":" + newMatch.maxPlayers);
                    } else if ("SYNC_ROUND".equals(cmd)) {
                        String matchId = tokens[1];
                        ActiveMatch match = activeMatches.get(matchId);
                        if (match != null) {
                            match.checkRoundProgression();
                            out.println("ROUND_UPDATE:" + match.currentRound + ":" + match.obstacleMultiplier);
                        }
                    }
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    private static class ActiveMatch {
        String id;
        String mode;
        int duration;
        int targetScore;
        int maxPlayers;
        int currentRound = 1;
        double obstacleMultiplier = 1.0;

        ActiveMatch(String id, String mode, int duration, int targetScore) {
            this.id = id;
            this.mode = mode;
            this.duration = duration;
            this.targetScore = targetScore;

            if ("1V1".equals(mode)) this.maxPlayers = 2;
            else if ("2V2".equals(mode)) this.maxPlayers = 4;
            else this.maxPlayers = 4;
        }

        void checkRoundProgression() {
            if (currentRound == 1) {
                obstacleMultiplier = 1.0;
            } else if (currentRound == 2) {
                obstacleMultiplier = 2.2;
            } else if (currentRound >= 3) {
                obstacleMultiplier = 4.0;
            }
        }
    }

    public static void main(String[] args) throws Exception {
        Properties config = new Properties();
        int serverPort = 8080;
        try (FileInputStream fis = new FileInputStream("config.properties")) {
            config.load(fis);
            serverPort = Integer.parseInt(config.getProperty("server.port"));
        } catch (IOException e) {
            System.out.println("Fallback port active.");
        }
        new GameServer(serverPort).start();
    }
}
