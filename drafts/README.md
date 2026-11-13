# Drafts

Work that has been shown to the user but not chosen, kept here so it is not lost. Nothing in this folder is
loaded by the game.

## Foe revisions (November 2026)

The user asked for revisions to the enemies, was shown a sheet with every foe three ways (as it is now,
repainted darker, and redrawn), and then paused it to work on other things. No choice has been made.

- `foes-redrawn.js`: a redrawn version of each of the 17 foes. First drafts: not yet cut into puppet parts.
- `night-repaint.js`: the repaint, which darkens and cools every colour of the current drawings as they are drawn.
- `apply.py`: makes a copy of the game with both switched in (`JG.draw.foeArt = "now" | "night" | "redo"`).
- `shots.cjs`: takes the three pictures of every foe from that copy, on the stage for its act.

The sheet the user saw: https://claude.ai/artifact/SDAxAG86r42qrBrKT2LT68

When this is picked up again: for each foe the user chooses Now, Repaint or Redrawn. A chosen redrawn foe
replaces its entry in `ART` in `draw.js` and needs `P()` markers adding so it moves as a puppet. A chosen
repaint is best done by editing that foe's colours by hand, not by shipping the colour-mapping proxy.

Also seen while making the sheet: the Ringleader's Shadow looks washed out in the game, because its
see-through body lets the white paper edge behind it show.
