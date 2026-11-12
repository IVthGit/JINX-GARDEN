# Jinx Garden

A cosmic circus roguelike. Raise little jester creatures called Jinxes on a floating sludge island, then send one at a time into a three-act card-battle run through the circus at the end of the universe. How they play on a run decides how they grow.

Open `circus/index.html` in Chrome or Edge, or serve the folder (for example `npx serve circus`). Nothing to install. Progress saves in the browser.

## The garden

- **Tap a Jinx** to see it. Tap it again to pet it. Petting raises Mood and Love.
- **Carry a Jinx** by dragging it. Drop it by the pond, the TV, a toy, a snack on the grass or another Jinx and it joins in.
- **The candy-floss tree** grows snacks. Tap it to shake down the ripe ones. Tap a snack to put it in the pantry, or drag it onto a Jinx. A hungry Jinx finds snacks on the grass by itself.
- **Toys** from the Concession stand (juggling pins, a trampoline, a crystal ball, a punching bag) each train one stat a little at a time. Jinxes wander over on their own.
- **Clown College** teaches the selected Jinx a trick. It keeps up to 2 and brings those cards on every run. The classes change after each show.
- **Whistle** calls everyone over.
- **Aptitude:** the letter beside each stat, E up to S, is how fast that Jinx learns it. It is set at birth. An egg left by a loved Jinx often has better grades.
- **Feed** from the pantry. Food fills the Belly and raises stats:
  - Juggle Plum raises Juggle, Springberry raises Tumble, Cotton Comet raises Glow, Sludge Pop raises Grit.
  - The rare items (Red Rubber Nose, Mercury Shoe, Halo Shard, Rust Bolt) give a big boost.
  - Burned CDs cheer a Jinx up.
- **Lean:** Cotton Comets and Angel Floss lean a Jinx toward Stardust. Sludge Pops and Black Hole Gum lean it toward Sludge. Some sideshows on runs change the lean too.
- **Motley or Moonlit:** a second lean that only matters for a Jinx that stays between Stardust and Sludge. Moon Pies and Paper Moons lean Moonlit. Motley Jawbreakers lean Motley.
- **Growing up:** after 3 shows a child becomes an adult:
  - **Stardust** Jinxes glow and wear a halo.
  - **Sludge** Jinxes drip and wear a safety pin.
  - Jinxes in the middle become **Harlequins**, or **Pierrots** if they lean Moonlit: a white face, a black skullcap, a wide ruff, long sleeves and a painted tear.
  - The best stat shows too: juggled planets, spring feet, a glowing antenna, or a spiked hat.
- **The last show:** after 12 shows a Jinx rises into the sky as a constellation. If its Love is 50 or more, it leaves an egg that keeps a little of its stats and lean.
- **Concession stand:** buy snacks, or an egg for 80 Tix. The garden holds 6.
- **On their own**, Jinxes wander, nap, watch the old TV, splash in the sludge pond and play with each other, which lifts their Mood. Their eyes follow your pointer, and they bob in time with the music.
- **Eggs** hatch on their own. Tap one to keep it warm and it hatches sooner.

## A run

- **The acts:** three acts, The Midway, The Hall of Warped Mirrors and The Big Top Below. Each one ends with a Ringmaster.
- **The map:** pick a path through Hecklers (fights), Headliners (hard fights that drop a charm), Sideshows (events), Snack stands (shops) and Fortune tents (rest, or train a stat for good).
- **Each act has its own stage:** a midway with booths and a ferris wheel, a hall of mirrors that reflects the fight, and an upside-down big top over a floating platform.
- **Fights** are turn based with a deck of tricks. You get 3 energy and draw 5 cards each turn, and the foe shows what it will do next.
  - **Order matters:** many cards have a bonus for being the first card of the turn, for coming after two others, or for following a certain kind of card. A card glows when its bonus is live.
  - **Hold:** you can hold one card when you end your turn. It stays in your hand instead of a new draw, so you can save a Guard for a big hit.
  - **Hat Trick:** play 3 different kinds of card in one turn for 1 extra energy next turn.
  - **Wind-ups:** when a foe winds up, deal the damage shown that turn to make it flinch and lose the big hit.
  - **Counter stance:** every hit on the foe hurts you back until its next turn. Guard, Sludge and Trick cards are safe.
  - **Weak spots:** a foe can be weak to Attacks, Ether or Sludge (50% more) or shrug one off (50% less).
  - **Stats boost cards:** Juggle adds to attacks, Tumble to Block (and gives a small chance to dodge), Glow to heals and Gunk, and Grit to health.
  - **Statuses:** Hype adds damage. Dazed deals 25% less. Pied takes 50% more. Gunk loses health every turn.
- **Applause:** the crowd's meter fills a little for every card (more for switching card types), and more for combos, Hat Tricks, hits of 15 or more, making a foe flinch, dodging, and getting through a foe's turn unhurt. It drains by the damage you take, when a foe Heckles, and when you end a turn without playing anything. When it's full, the **Showstopper** button appears (key S).
- **A mind of its own:**
  - Between your turn and the foe's, a Jinx may **improvise** a free move. The chance grows with its Love when the run started.
  - A Jinx whose Mood was low at the start sometimes **phones it in**, and a card works at half strength.
  - Every Jinx hatches with a **trait**: Show-off, Scaredy-cat, Glutton, Daydreamer, Copycat or Hothead. The garden panel explains each one.
- **How it leans changes how it fights:**
  - **Sludge** builds Corruption from Gunk. At 6 or more, every hit adds Gunk. Its Showstopper is Sludge Flood.
  - **Stardust** builds Starlight from Ether cards, up to 5, and starts each turn with 3 Block per Starlight. Its Showstopper is Supernova.
  - **Harlequins** get one Wild card in every hand that plays twice. Their Showstopper is Harlequin Shuffle.
  - **Pierrots** can hold 2 cards instead of 1, and a card they held costs 1 less. Their Showstopper is Moonlit Pirouette.
- **Training:** every card played trains its stat. Attacks train Juggle, guards Tumble, ether Glow, and taking hits trains Grit.
- **Winning** all three acts brings home everything in the bag, the Tix and 1.5 times the training.
- **Fainting** keeps half the Tix, one thing from the bag and 0.6 times the training, and the Jinx comes home sad.
- **Keys:** 1 to 9 play cards, E ends the turn.

## The look

The whole game is a paper theatre made from a photocopied zine:

- **Cut-outs:** Jinxes, foes, the tent, the tree and the toys are paper cut-outs with a white edge and a hard shadow. In a fight they stand on sticks behind a cardboard stage front, and each foe is pasted onto a torn scrap of printed paper. A beaten foe flips over like a card and flutters away.
- **Zine print:** titles are cut-out letters from different magazines, buttons and map stops are stickers, and the cards and sky are printed in dots.
- **Blacklight:** the third act is lit by blacklight, so the cut edges glow green and pink.

## Files

- `index.html`: the page and its styles.
- `data.js`: items, cards, charms, foes, acts, names and sideshow text.
- `draw.js`: the garden, Jinxes, eggs and foes, drawn on the canvas.
- `stage.js`: the battle stage: a backdrop for each act, the crowd, attack animations, impacts and Showstoppers.
- `game.js`: garden sim, runs, battles, events, shops, music and sound effects, saving.

The look and the creatures are original. The genre (a pet-raising garden plus a roguelike deckbuilder) is borrowed from games we love.
