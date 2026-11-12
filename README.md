# Jinx Garden

A cosmic circus roguelike. Raise little jester creatures called Jinxes on a floating sludge island, then send one at a time into a three-act card-battle run through the circus at the end of the universe. How they play on a run decides how they grow.

Open `circus/index.html` in Chrome or Edge, or serve the folder (for example `npx serve circus`). Nothing to install. Progress saves in the browser.

## The garden

- **Tap a Jinx** to see it. Tap it again to pet it. Petting raises Mood and Love.
- **Feed** from the pantry. Food fills the Belly and raises stats:
  - Juggle Plum raises Juggle, Springberry raises Tumble, Cotton Comet raises Glow, Sludge Pop raises Grit.
  - The rare items (Red Rubber Nose, Mercury Shoe, Halo Shard, Rust Bolt) give a big boost.
  - Burned CDs cheer a Jinx up.
- **Lean:** Cotton Comets and Angel Floss lean a Jinx toward Stardust. Sludge Pops and Black Hole Gum lean it toward Sludge. Some sideshows on runs change the lean too.
- **Growing up:** after 3 shows a child becomes an adult:
  - **Stardust** Jinxes glow and wear a halo.
  - **Sludge** Jinxes drip and wear a safety pin.
  - Jinxes in the middle become harlequins.
  - The best stat shows too: juggled planets, spring feet, a glowing antenna, or a spiked hat.
- **The last show:** after 12 shows a Jinx rises into the sky as a constellation. If its Love is 50 or more, it leaves an egg that keeps a little of its stats and lean.
- **Concession stand:** buy snacks, or an egg for 80 Tix. The garden holds 6.
- **Eggs** hatch on their own. Tap one to keep it warm and it hatches sooner.

## A run

- **The acts:** three acts, The Midway, The Hall of Warped Mirrors and The Big Top Below. Each one ends with a Ringmaster.
- **The map:** pick a path through Hecklers (fights), Headliners (hard fights that drop a charm), Sideshows (events), Snack stands (shops) and Fortune tents (rest, or train a stat for good).
- **Fights** are turn based with a deck of tricks. You get 3 energy and draw 5 cards each turn, and the foe shows what it will do next.
  - **Stats boost cards:** Juggle adds to attacks, Tumble to Block (and gives a small chance to dodge), Glow to heals and Gunk, and Grit to health.
  - **Statuses:** Hype adds damage. Dazed deals 25% less. Pied takes 50% more. Gunk loses health every turn.
- **Applause:** the crowd's meter fills when you play cards (more for switching card types), land a hit of 15 or more, dodge, or get through a foe's turn without losing health. It drains when you take damage, when a foe Heckles, or when you end a turn without playing anything. When it's full, the **Showstopper** button appears (key S).
- **A mind of its own:**
  - Between your turn and the foe's, a Jinx may **improvise** a free move. The chance grows with its Love when the run started.
  - A Jinx whose Mood was low at the start sometimes **phones it in**, and a card works at half strength.
  - Every Jinx hatches with a **trait**: Show-off, Scaredy-cat, Glutton, Daydreamer, Copycat or Hothead. The garden panel explains each one.
- **How it leans changes how it fights:**
  - **Sludge** builds Corruption from Gunk. At 10 or more, every hit adds Gunk. Its Showstopper is Sludge Flood.
  - **Stardust** builds Starlight from Ether cards, up to 5, and starts each turn with 2 Block per Starlight. Its Showstopper is Supernova.
  - **Harlequins** get one Wild card in every hand that plays twice. Their Showstopper is Harlequin Shuffle.
- **Training:** every card played trains its stat. Attacks train Juggle, guards Tumble, ether Glow, and taking hits trains Grit.
- **Winning** all three acts brings home everything in the bag, the Tix and 1.5 times the training.
- **Fainting** keeps half the Tix, one thing from the bag and 0.6 times the training, and the Jinx comes home sad.
- **Keys:** 1 to 9 play cards, E ends the turn.

## Files

- `index.html`: the page and its styles.
- `data.js`: items, cards, charms, foes, acts, names and sideshow text.
- `draw.js`: the garden, Jinxes, eggs and foes, drawn on the canvas.
- `stage.js`: the battle stage: a backdrop for each act, the crowd, attack animations, impacts and Showstoppers.
- `game.js`: garden sim, runs, battles, events, shops, music and sound effects, saving.

The look and the creatures are original. The genre (a pet-raising garden plus a roguelike deckbuilder) is borrowed from games we love.
