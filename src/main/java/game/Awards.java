package game;

import com.fasterxml.jackson.databind.node.ArrayNode;

import java.util.Collection;

/** End-of-match awards, built from the per-player stats the match keeps. */
final class Awards {
    private Awards() { }

    static void fill(ArrayNode out, Collection<Game.Gp> all) {
        Game.Gp thief = null, tycoon = null, unlucky = null, lucky = null;
        for (Game.Gp g : all) {
            if (g.steals > (thief == null ? 0 : thief.steals)) thief = g;
            if (g.heldMs > (tycoon == null ? 0 : tycoon.heldMs)) tycoon = g;
            if (g.deaths > (unlucky == null ? 0 : unlucky.deaths)) unlucky = g;
            if (g.blocks > (lucky == null ? 0 : lucky.blocks)) lucky = g;
        }
        if (thief != null) add(out, "🥷", "Master thief", thief.p.name, thief.steals + (thief.steals == 1 ? " steal" : " steals"));
        if (tycoon != null) add(out, "🏠", "Property tycoon", tycoon.p.name, (tycoon.heldMs / 1000) + "s held");
        if (lucky != null) add(out, "🎁", "Lucky charm", lucky.p.name, lucky.blocks + (lucky.blocks == 1 ? " block" : " blocks"));
        if (unlucky != null) add(out, "💀", "Most unlucky", unlucky.p.name, unlucky.deaths + (unlucky.deaths == 1 ? " death" : " deaths"));
    }

    private static void add(ArrayNode out, String icon, String title, String name, String val) {
        out.addObject().put("icon", icon).put("title", title).put("name", name).put("val", val);
    }
}
