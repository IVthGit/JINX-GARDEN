# Checks for Jinx Garden

These drive the real game in a headless Chromium with Playwright. They are checks to run and read, not a
pass/fail suite: most print what happened and save pictures to `tests/out/` to look at.

From the top folder:

```
cd tests                          # once: install Playwright and its browser
npm install
npx playwright install chromium
cd ..
node tests/run.cjs quick          # the fast ones
node tests/run.cjs smoke          # one by name
PHONE=1 node tests/run.cjs fps    # some take settings from the environment
```

In Windows PowerShell, set a setting first and then run the check: `$env:PHONE = 1; node tests/run.cjs fps`.

`run.cjs` serves the game on port 8765 while a check runs. To use a server that is already running, set
`JINX_URL` and run the file directly: `JINX_URL=http://localhost:8000/index.html node tests/smoke.cjs`.

| Check | What it covers |
| --- | --- |
| `smoke` | Clicks through a new game at laptop and phone size: title, garden, a run, a fight. |
| `garden` | The garden: the snack tree, carrying, feeding, Clown College, the whistle. |
| `shows` | Hats, a talent show played to the end (cheering in time), a duet and its egg. |
| `kinds` | Picture sheets of the three kinds: every hat on every head, and every pose. |
| `kinds-save` | An old save becoming Umbras, and what duets pass on. |
| `abilities` | The nine part abilities, one kind at a time, in a real fight. |
| `rules` | Fight and run rules checked against exact numbers: statuses, Mosh Pit, the Fortune tent, crowd requests, second acts, props, the understudy, snacks, polished cards. Fails if one is wrong. |
| `stage` | Screenshots of fights in each act: idle, an attack in flight, the hit, a Showstopper, the foe's turn. PLAN=<json> picks the fights. |
| `defeat` | A foe being beaten, frame by frame. |
| `foes` | Close-ups of every foe, to check that parts line up. |
| `balance` | Bots play whole runs: one clicks at random, one plays well. Usage: balance.cjs [runs per setup]. FULL=1 for more setups. |
| `balance-kinds` | The smart bot with each kind of Jinx, and with abilities off. KINDS=none,Umbra,... LVS=12,25. |
| `fps` | Frames per second in the garden and in a fight in each act. PHONE=1 for phone size at 2x. |
| `profile` | CPU profiles of the garden and fights at laptop and phone size. |
| `copies` | Counts the canvas copies in a frame, which is where the time goes. |
| `music` | Renders every piece of music offline: errors, peak level, clipping. Writes short WAVs to out/. |

A check that ends with `no errors` saw no page errors. Anything visual still needs its pictures looked at:
a drawing can run without errors and be wrong.

Frame rates here come from software rendering, so they are slower than a real device. Compare them with
each other, not with what a player sees. The music can only be checked for errors and levels, not by ear.
