package game;

import io.javalin.websocket.WsContext;

import java.util.ArrayDeque;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Sends the messages for ONE player's connection on a background thread.
 *
 * <p>Why: the game loop used to write to every phone itself. One phone on a weak Wi-Fi connection could make that
 * write wait, and then every other player lagged too. Now the game loop only puts messages in each player's queue
 * (instant) and a separate thread sends them. Position updates ("state") are special: if a phone is slow, old
 * updates are replaced by the newest one, so a slow phone catches up instead of falling further behind.
 */
final class Outbox {
    private static final int MAX_QUEUE = 300; // a stuck connection can never grow without limit
    private static final ExecutorService POOL = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "ws-send");
        t.setDaemon(true);
        return t;
    });

    private final WsContext ctx;
    private final ArrayDeque<String> queue = new ArrayDeque<>();
    private String latestState;   // newest position update that has not been sent yet
    private boolean draining;

    Outbox(WsContext ctx) { this.ctx = ctx; }

    /** A normal message: always delivered, in order. */
    void send(String message) { enqueue(message, false); }

    /** A position update: older ones that are still waiting are skipped. */
    void sendState(String message) { enqueue(message, true); }

    private void enqueue(String message, boolean state) {
        synchronized (this) {
            if (state) {
                latestState = message;
            } else {
                if (queue.size() >= MAX_QUEUE) queue.pollFirst();
                queue.addLast(message);
            }
            if (draining) return;
            draining = true;
        }
        POOL.execute(this::drain);
    }

    private void drain() {
        while (true) {
            String next;
            synchronized (this) {
                next = queue.pollFirst();
                if (next == null) {
                    next = latestState;
                    latestState = null;
                }
                if (next == null) {
                    draining = false;
                    return;
                }
            }
            try {
                ctx.send(next);
            } catch (Exception e) {
                // the player left; the loop ends when the queue is empty
            }
        }
    }
}
