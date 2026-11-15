# Notes for Claude

**Jinx Garden** is a pet-raising garden plus a roguelike deckbuilder in a cosmic grunge-circus style, played in the browser. The player's guide is `README.md`. Keep it current whenever a feature changes.

The game was first built inside another repository and moved here in November 2026 with its history.

## About the user and the project

- **Questions and requests are different.** When they ask a question ("what could we do…?", "is it possible…?"), answer it and offer to build; don't start building. Build once they ask for it ("let's do it", "go ahead").
- **They like big, ambitious features**, then trying them themselves. Tell them plainly what was and wasn't tested, and on what.
- **They choose looks from draft sheets.** For a visual change, show a few options side by side on one page, tweak from their feedback, and build only what they pick.
- **The look they want:** cool and mysterious with only a little cute. Dark palette, a black sun backlight, fog and parallax layers. It should have edge.
- **Everything is original.** The genre is borrowed from games they love, but the creatures and look are their own: no Chao or other existing characters.

## Running it

Open `index.html` in Chrome or Edge, or serve the folder. There's no build step and nothing to install. Progress saves in the browser's localStorage.

## How it's built

Plain JavaScript on a 2D canvas, on `window.JG`. `index.html` loads the scripts in this order:

| File | What it holds |
| --- | --- |
| `data.js` | Content: items, hats, cards, charms, foes, acts, part abilities (`JG.PARTS`), talent show leagues, names. |
| `draw.js` | The garden, Jinxes, eggs and foes. |
| `stage.js` | The battle stage: a backdrop for each act, the crowd, attacks, impacts, Showstoppers. |
| `music.js` | Synthesised music: a 16-step sequencer and its instruments. |
| `game.js` | Garden sim, talent shows, duets, runs, battles, events, shops, sound effects, saving. |

`index.html` has no doctype, `<html>` or `<head>` tags, because it is also published as a claude.ai artifact (the page plus the five scripts as supporting files).

### Jinxes

- Three kinds: Umbra, Hollow, Lantern (`D.KINDS`). Each is a head, a headpiece and a body (`j.head`, `j.piece`, `j.body`).
- `paintJinx` in `draw.js` draws them in its own units, with a version of every part for each lean.
- Duets pass each part on separately, so there are 27 mixes.
- They have no mouths: mood shows in the eyes and a Lantern's chest light.
- Each part has a fight ability (`JG.PARTS` in `data.js`, applied through `has(B, slot, id)` in `game.js`). `JG.TUNE.noParts` switches them off for bot play-tests.
- The user chose these from draft sheets and asked for the original Umbra (comet tails, full corona) and a separate cloak for each kind to be kept. Don't tidy those away.

### Foes

- Foes are jointed paper puppets. Each foe's drawing in `ART` (`draw.js`) is cut into parts by `P(name, {...})` markers, and `puppet()` pastes each part with its own cut edge, shadow and pin.
- Add a marker when you add a part. Give flickering or far-ranging parts a fixed `box`.
- Behind each foe is a burst of torn paper strips (`tornBurst`), which the user picked because it really looks torn.

### Fights

Added in November 2026 because fights felt easy, samey and detached from the garden. All of it is in `game.js`, with content in `data.js`.

- **Crowd requests** (`newRequest`, `reqState`, `settleRequest`): one per turn, settled when the turn ends.
- **Second acts** (`nextMove`): at half health a foe with `act2` in `JG.FOES` swaps its routine; others gain Hype. A foe's live routine is `B.foe.moves`, not `def.moves`.
- **Props** (`JG.PROPS`, `makeProp`, `hurtProp`, `propTurn`): `B.prop` is a second target, chosen with `B.target`.
- **Understudy** (`G.run.uid`, `cue`): picked in `confirmRun`. `G.run.underOut` is set once it has taken the fall.
- **Snacks** (`snackFx`, `eatSnack`), **polished cards** (the `id + "+"` entries made at the bottom of the card table) and five rule-changing charms.
- **On stage:** the user chose the "from the rigging" look from a draft sheet. The understudy sits on a swing behind the lead with a bulb for each cue left (`understudy` in `stage.js`); a prop hangs from ropes between the two fighters (`prop` in `stage.js`, art in `PROP_ART` and `D.stageProp` in `draw.js`). It hangs in the middle because beside the foe the name plate covered it. `B.under`, `B.underOut` and `B.cueMax` are what the stage reads; `B.anim.cue`, `B.anim.fall` and `B.anim.propHurt` time the reactions.

### Speed

Nearly all of a frame's cost is copying between canvases, so little is drawn fresh each frame.

- A cut-out with a `key` keeps its finished sticker and remakes it about 12 times a second, or when its `sig` changes (`cutout` in `draw.js`).
- Foes keep a sticker for each part; only the parts' swing is live (`puppet`).
- The garden's sky and ground and each stage backdrop are `cachedLayer`s. Fog bands are painted small and stretched.
- The garden's far sky and island share one layer (`garden-scene`): every separate layer is a whole screen of copying each frame.
- Screen-sized pictures that are mostly hole (the garden's corner framing, the toy theatre's wings and ledge) go through `pasteSparse`, which copies only the blocks with paint in them.
- When adding something that must change at once, put it in the `sig`. When adding scenery, put it in a layer.
- Frame timings on the laptop swing by half from one run to the next, so compare by pixels copied per frame at a pretend 60 fps instead. A sweep in November 2026 took the garden from 6.5 to 4.6 million and fights from about 4.0 to 3.4.
- Measured in headless Chromium only: the phone-size garden went from 35 to 57 fps and Act III from 20 to 42. Real devices are unmeasured.

### Music

The music can't be checked by ear here. The pieces in `music.js` were only rendered offline for errors, clipping and band balance, so ask the user how they sound.

## Checks

`tests/` holds checks that play the real game in a headless Chromium with Playwright. See `tests/README.md`.

```
node tests/run.cjs quick     # the fast ones
node tests/run.cjs fps       # one by name
```

They print what happened and save pictures to `tests/out/`. Run the relevant ones before every push, and look at the pictures of anything visual: a drawing can run without errors and still be wrong.

## Drafts

`drafts/` holds work shown to the user but not chosen. The game doesn't load it.

- **Foe revisions (paused):** every foe three ways (as now, repainted darker, redrawn). The user paused this before choosing, so don't apply any of it unasked. See `drafts/README.md`.

## Known rough edges

Found in an audit in November 2026 and not fixed yet. Offer them; don't fix them unasked.

- The Ringleader's Shadow looks washed out: its see-through body lets the white paper edge show.
- The title screen's text still describes the older, cuter game.
- The side panel rebuilds every 2 seconds and can swallow a tap.
- The fight screen is crowded on a phone, more so now that a prop and the understudy's buttons sit on the name plates.
- The balance bots don't use crowd requests, props, the understudy, snacks or polishing, so they now underrate what a player can do.
- Balance has drifted easier, and the Sludge lean is the weakest. Bot results at level 25: no abilities 3/12 wins, Umbra 6/12, Lantern 7/12, Hollow 12/18. The bot ignores Foresight, and mixes are unmeasured.
- Most of the 27 mixes across the leans haven't been looked at by eye.
- Parallax and screen shake ignore the reduced-motion setting.

## Conventions

- **Match the surrounding code:** two-space indents, double quotes, short comments that explain why.
- **User-facing text** (the game, toasts, the README) is plain, friendly English without jargon.
- **Commit messages** explain what changed and why, in a few sentences.
