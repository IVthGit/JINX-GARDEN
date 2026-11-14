# Drafts

Work that has been shown to the user but not chosen, kept here so it is not lost. Nothing in this folder is
loaded by the game.

## Props and the understudy on stage (November 2026)

The fights gained props and an understudy with no drawing on the stage. The user was shown three looks and
chose "rigging" for both, which is now built into `stage.js` and `draw.js`. The other two are kept here.

- `stage-extras.js`: three looks (`JG.draw.extras.set = "sticks" | "rigging" | "shadows"`), drawn by wrapping
  `drawJinx` and `drawFoe` so they sit in the fighters' layer.
- `stage-extras-shots.cjs`: takes the pictures from the real game into `stage-extras/` (18 MB, not kept in git: run it to remake them).
- `stage-extras.html`: the sheet. Open it in a browser.

Seen while making it: on a phone the name plates hide anything hung high (the "rigging" look), and the
"shadows" understudy dims with `ctx.filter`, which iPhones do not support, so it would need another way.

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
