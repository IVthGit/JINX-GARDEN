// Jinx Garden: all the game's content tables. Logic lives in game.js, drawing in draw.js.
window.JG = window.JG || {};

JG.STATS = ["juggle", "tumble", "glow", "grit"];
JG.STAT_INFO = {
  juggle: { label: "Juggle", color: "#ff5fa8", hint: "Hits harder" },
  tumble: { label: "Tumble", color: "#ffd23f", hint: "Blocks more, dodges" },
  glow:   { label: "Glow",   color: "#8fe9ff", hint: "Heals more, stronger gunk" },
  grit:   { label: "Grit",   color: "#a6d94a", hint: "More health" }
};

// Food and toys. xp goes to stats, align pushes toward Stardust (+) or Sludge (-).
JG.ITEMS = {
  moonpie:   { name: "Moon Pie", desc: "Fills the belly. A little of everything.", color: "#e9d3a4", glyph: "◐", price: 8, belly: 40, mood: 8, xp: { juggle: 2, tumble: 2, glow: 2, grit: 2 } },
  plum:      { name: "Juggle Plum", desc: "Round and bouncy. Builds Juggle.", color: "#ff5fa8", glyph: "●", price: 14, belly: 15, xp: { juggle: 9 } },
  spring:    { name: "Springberry", desc: "Fizzy little coil-berries. Builds Tumble.", color: "#ffd23f", glyph: "❀", price: 14, belly: 15, xp: { tumble: 9 } },
  comet:     { name: "Cotton Comet", desc: "Spun stardust. Builds Glow, leans Stardust.", color: "#c9b8ff", glyph: "✵", price: 14, belly: 15, xp: { glow: 9 }, align: 0.07 },
  sludgepop: { name: "Sludge Pop", desc: "Green goo on a stick. Builds Grit, leans Sludge.", color: "#a6d94a", glyph: "♨", price: 14, belly: 15, xp: { grit: 9 }, align: -0.07 },
  floss:     { name: "Angel Floss", desc: "Tastes like a cloud's last thought. Big Stardust lean.", color: "#f4f0ff", glyph: "☁", price: 32, belly: 10, xp: { glow: 4 }, align: 0.22 },
  gum:       { name: "Black Hole Gum", desc: "Chewed by something huge. Big Sludge lean.", color: "#5d4a7a", glyph: "◉", price: 32, belly: 10, xp: { grit: 4 }, align: -0.22 },
  nose:      { name: "Red Rubber Nose", desc: "Squeak. A huge boost to Juggle.", color: "#ff3b4a", glyph: "⬤", price: 48, belly: 0, xp: { juggle: 28 } },
  shoe:      { name: "Mercury Shoe", desc: "Winged and too small. A huge boost to Tumble.", color: "#ffe680", glyph: "↑", price: 48, belly: 0, xp: { tumble: 28 } },
  shard:     { name: "Halo Shard", desc: "Still humming. A huge boost to Glow.", color: "#8fe9ff", glyph: "◇", price: 48, belly: 0, xp: { glow: 28 } },
  bolt:      { name: "Rust Bolt", desc: "Off the old ferris wheel. A huge boost to Grit.", color: "#c97a3d", glyph: "⚙", price: 48, belly: 0, xp: { grit: 28 } },
  cd:        { name: "Burned CD", desc: "Sharpie on the label: SAD SONGS 4 U. Cheers them right up.", color: "#d6e1ff", glyph: "◎", price: 20, belly: 0, mood: 40, love: 8 }
};
JG.SHOP_ITEMS = ["moonpie", "plum", "spring", "comet", "sludgepop", "cd", "floss", "gum"];
JG.RARE_ITEMS = ["nose", "shoe", "shard", "bolt", "floss", "gum"];
JG.COMMON_ITEMS = ["moonpie", "plum", "spring", "comet", "sludgepop", "cd"];

// Cards. type sets the color and which stat boosts it and grows from it.
// fx: dmg (with hits), block, heal, gunk, dazed, pied, hype, draw, energy, selfdmg, blockHit, doubleGunk, piedHit.
// Order matters. A card can carry one bonus that is added to fx when its condition holds:
//   opener: it is the first card played this turn
//   finisher: two or more cards were already played this turn
//   after: [type, bonus]: the card played just before it this turn was of that type
JG.CARDS = {
  pie:       { name: "Pie Toss", cost: 1, type: "atk", rarity: 0, fx: { dmg: 6 }, after: ["blk", { dmg: 4 }] },
  cart:      { name: "Cartwheel", cost: 1, type: "blk", rarity: 0, fx: { block: 5 }, opener: { block: 3 } },
  halohum:   { name: "Halo Hum", cost: 1, type: "eth", rarity: 0, fx: { heal: 3, block: 3 }, after: ["eth", { heal: 3 }] },
  gunkspit:  { name: "Gunk Spit", cost: 1, type: "gunk", rarity: 0, fx: { gunk: 4 }, finisher: { gunk: 3 } },
  honk:      { name: "Honk!", cost: 0, type: "atk", rarity: 0, fx: { dmg: 3, dazed: 1 }, opener: { draw: 1 } },

  juggle:    { name: "Juggle Stars", cost: 1, type: "atk", rarity: 1, fx: { dmg: 3, hits: 3 }, finisher: { hits: 1 } },
  seltzer:   { name: "Seltzer Spray", cost: 1, type: "atk", rarity: 1, fx: { dmg: 4, pied: 2 }, opener: { dmg: 3 } },
  mallet:    { name: "Big Mallet", cost: 2, type: "atk", rarity: 1, fx: { dmg: 13 }, finisher: { dmg: 7 } },
  chicken:   { name: "Rubber Chicken", cost: 0, type: "atk", rarity: 1, fx: { dmg: 3 }, after: ["atk", { dmg: 4 }] },
  kazoo:     { name: "Kazoo Wail", cost: 1, type: "blk", rarity: 1, fx: { block: 4, dazed: 2 } },
  backflip:  { name: "Backflip", cost: 1, type: "blk", rarity: 1, fx: { block: 7, draw: 1 }, after: ["atk", { block: 4 }] },
  pin:       { name: "Safety Pin", cost: 0, type: "blk", rarity: 1, fx: { block: 3 }, after: ["blk", { block: 4 }] },
  bath:      { name: "Sludge Bath", cost: 1, type: "gunk", rarity: 1, fx: { gunk: 6 }, opener: { gunk: 2 } },
  veil:      { name: "Stardust Veil", cost: 1, type: "eth", rarity: 1, fx: { block: 6, heal: 2 }, after: ["eth", { block: 4 }] },
  moonbeam:  { name: "Moonbeam", cost: 1, type: "eth", rarity: 1, fx: { dmg: 5, heal: 3 }, finisher: { dmg: 5 } },
  mirror:    { name: "Mirror Gag", cost: 1, type: "trick", rarity: 1, fx: { pied: 2, dazed: 1 }, opener: { draw: 1 } },

  chord:     { name: "Power Chord", cost: 1, type: "atk", rarity: 2, fx: { dmg: 6, hype: 1 }, after: ["trick", { hype: 1 }] },
  mosh:      { name: "Mosh Pit", cost: 1, type: "atk", rarity: 2, fx: { blockHit: 1 } },
  dive:      { name: "Stage Dive", cost: 1, type: "atk", rarity: 2, fx: { dmg: 13, selfdmg: 3 }, finisher: { dmg: 5 } },
  feedback:  { name: "Feedback", cost: 1, type: "atk", rarity: 2, fx: { dmg: 5, piedHit: 1 } },
  trapdoor:  { name: "Trapdoor", cost: 2, type: "blk", rarity: 2, fx: { block: 14 }, opener: { block: 5 } },
  tightrope: { name: "Tightrope", cost: 1, type: "blk", rarity: 2, fx: { block: 5, hype: 1 } },
  encoregunk:{ name: "Toxic Encore", cost: 1, type: "gunk", rarity: 2, fx: { doubleGunk: 1 } },
  seraph:    { name: "Seraph Strum", cost: 2, type: "eth", rarity: 2, fx: { heal: 7, block: 8 }, finisher: { heal: 4 } },
  wish:      { name: "Wish Upon a Star", cost: 1, type: "trick", rarity: 2, fx: { draw: 3 } },
  grease:    { name: "Greasepaint", cost: 0, type: "trick", rarity: 2, fx: { hype: 2 }, exhaust: true },
  encore:    { name: "Encore!", cost: 0, type: "trick", rarity: 2, fx: { energy: 1, draw: 1 }, exhaust: true },

  cannon:    { name: "Human Cannonball", cost: 3, type: "atk", rarity: 3, fx: { dmg: 28 }, exhaust: true },
  blackhole: { name: "Black Hole Gum", cost: 2, type: "gunk", rarity: 3, fx: { gunk: 5, dazed: 2, pied: 2 } },
  haloburst: { name: "Halo Burst", cost: 2, type: "eth", rarity: 3, fx: { dmg: 10, heal: 6 }, after: ["eth", { dmg: 8 }] },
  ringmaster:{ name: "Steal the Show", cost: 1, type: "trick", rarity: 3, fx: { hype: 3, selfdmg: 4 }, exhaust: true }
};
JG.TYPE_INFO = {
  atk:   { label: "Attack", color: "#ff5fa8", glyph: "✶", stat: "juggle" },
  blk:   { label: "Guard", color: "#ffd23f", glyph: "◆", stat: "tumble" },
  eth:   { label: "Ether", color: "#8fe9ff", glyph: "☾", stat: "glow" },
  gunk:  { label: "Sludge", color: "#a6d94a", glyph: "☣", stat: "grit" },
  trick: { label: "Trick", color: "#c9b8ff", glyph: "♠", stat: null }
};

// Lucky charms found on runs. Effects are checked by id in game.js.
JG.CHARMS = {
  nose:     { name: "Squeaky Nose", desc: "Start every fight with 1 Hype.", glyph: "●", color: "#ff3b4a" },
  ticket:   { name: "Lucky Stub", desc: "Fights pay 50% more Tix.", glyph: "✂", color: "#ffd23f" },
  bell:     { name: "Rusty Bell", desc: "Start every fight with 6 Block.", glyph: "⍾", color: "#c97a3d" },
  halo:     { name: "Gutter Halo", desc: "Heal 5 after every fight.", glyph: "◯", color: "#8fe9ff" },
  kazoo:    { name: "Ouija Kazoo", desc: "Foes start every fight Dazed for 1 turn.", glyph: "☥", color: "#c9b8ff" },
  heart:    { name: "Sludge Heart", desc: "12 more max health.", glyph: "♥", color: "#a6d94a" },
  shoes:    { name: "Moon Shoes", desc: "Draw 1 more card every turn.", glyph: "☽", color: "#f4f0ff" },
  lantern:  { name: "Paper Lantern", desc: "Naps in the Fortune Tent heal twice as much.", glyph: "☸", color: "#ffb36b" },
  patch:    { name: "Iron-On Patch", desc: "The first time you'd faint, you get back up with 1 health.", glyph: "✖", color: "#ff5fa8" },
  glowstick:{ name: "Glow Stick", desc: "1 extra energy on the first turn of every fight.", glyph: "∕", color: "#b6ff5c" },
  rose:     { name: "Thrown Rose", desc: "Start every fight with 25 Applause.", glyph: "✿", color: "#ff3b4a" }
};

// Foes. moves cycle in order: atk with n hits, blk, heal, hype, dazed, pied, gunk, heckle, and two that ask for an answer:
//   charge with flinch: it winds up a big hit. Deal that much damage in one turn and it flinches and loses the hit.
//   counter: until its next turn, every hit on it hurts you back.
// weak and resist name a card type (atk, eth or gunk): 50% more or 50% less from those cards.
// atk picks the attack animation in stage.js. body and size place the drawing from draw.js.
JG.FOES = {
  mime:     { name: "Sad Mime", atk: "punch", hp: [28, 32], body: "tall", size: 1,
              moves: [{ atk: 7 }, { counter: 4, blk: 4 }, { atk: 5, dazed: 1 }, { blk: 6, heckle: 15 }] },
  goblin:   { name: "Popcorn Goblin", atk: "popcorn", hp: [24, 28], weak: "gunk", body: "round", size: 0.85,
              moves: [{ atk: 3, n: 3 }, { hype: 1, blk: 5 }, { atk: 4, n: 2, gunk: 2 }] },
  balloon:  { name: "Static Balloon", atk: "zap", hp: [20, 24], weak: "atk", resist: "gunk", body: "balloon", size: 0.95,
              moves: [{ charge: 1, flinch: 12, blk: 4 }, { atk: 13 }, { atk: 5 }] },
  tearer:   { name: "Ticket Tearer", atk: "tickets", hp: [30, 34], weak: "eth", body: "wide", size: 1,
              moves: [{ blk: 8, heckle: 10 }, { atk: 10 }, { atk: 6, pied: 1 }] },
  strongman:{ name: "The Strongman Who Cries", atk: "smash", hp: [58, 62], elite: true, weak: "eth", body: "wide", size: 1.25,
              moves: [{ atk: 9 }, { charge: 1, flinch: 16, blk: 6 }, { atk: 15 }, { hype: 2, blk: 8 }, { atk: 6, n: 2 }] },
  calliope: { name: "Calliope Wraith", atk: "notes", hp: [105, 105], boss: true, weak: "gunk", resist: "eth", body: "wisp", size: 1.4,
              moves: [{ dazed: 2, blk: 10, heckle: 20 }, { atk: 11 }, { atk: 4, n: 3 }, { charge: 1, flinch: 20 }, { atk: 16 }, { heal: 10, hype: 2 }] },

  seal:     { name: "Grease Seal", atk: "dive", hp: [40, 44], weak: "atk", resist: "gunk", body: "blob", size: 1.05,
              moves: [{ gunk: 3, atk: 6 }, { atk: 11 }, { blk: 10, hype: 1 }] },
  glass:    { name: "Glass Juggler", atk: "glass", hp: [34, 38], weak: "atk", body: "tall", size: 1,
              moves: [{ atk: 4, n: 3 }, { counter: 5, blk: 8 }, { atk: 5, n: 3, pied: 1 }] },
  moth:     { name: "Moth Acrobat", atk: "dive", hp: [42, 46], weak: "eth", body: "tall", size: 1.05,
              moves: [{ atk: 12 }, { blk: 9, hype: 1 }, { atk: 7, dazed: 1 }, { charge: 1, flinch: 18 }, { atk: 17 }] },
  double:   { name: "Funhouse Double", atk: "punch", hp: [46, 50], body: "round", size: 1,
              moves: [{ atk: 9, pied: 2 }, { counter: 5 }, { atk: 14 }, { blk: 12, heckle: 15 }] },
  shadow:   { name: "Ringleader's Shadow", atk: "dark", hp: [92, 96], elite: true, weak: "eth", resist: "atk", body: "wisp", size: 1.3,
              moves: [{ atk: 15 }, { dazed: 2, pied: 2, heckle: 20 }, { atk: 6, n: 3 }, { hype: 2, blk: 10 }] },
  mirrorrm: { name: "The Mirror Ringmaster", atk: "glass", hp: [175, 175], boss: true, resist: "eth", body: "tall", size: 1.5,
              moves: [{ atk: 9, n: 2 }, { counter: 6, blk: 14, hype: 1 }, { charge: 1, flinch: 26 }, { atk: 19 }, { pied: 2, dazed: 2, gunk: 4, heckle: 20 }] },

  comet:    { name: "Comet Clown", atk: "fireball", hp: [58, 64], weak: "gunk", body: "round", size: 1.05,
              moves: [{ atk: 8, n: 2 }, { charge: 1, flinch: 22, blk: 10 }, { atk: 20 }] },
  usher:    { name: "Void Usher", atk: "dark", hp: [64, 68], weak: "eth", resist: "gunk", body: "tall", size: 1.15,
              moves: [{ blk: 14, heckle: 15 }, { atk: 14, dazed: 1 }, { gunk: 5, atk: 6 }] },
  angel:    { name: "Static Angel", atk: "beam", hp: [58, 62], weak: "gunk", resist: "eth", body: "wisp", size: 1.1,
              moves: [{ heal: 10, blk: 8 }, { atk: 7, n: 3 }, { counter: 6 }, { atk: 18 }] },
  trapeze:  { name: "The Last Trapeze", atk: "dive", hp: [138, 142], elite: true, weak: "atk", body: "tall", size: 1.3,
              moves: [{ atk: 10, n: 2 }, { blk: 14, hype: 2 }, { charge: 1, flinch: 28 }, { atk: 22 }, { dazed: 2, gunk: 4 }] },
  mother:   { name: "Mother Static", atk: "static", hp: [280, 280], boss: true, body: "tv", size: 1.6,
              moves: [{ atk: 11, n: 2 }, { gunk: 5, dazed: 2, heckle: 25 }, { counter: 7, blk: 20, hype: 2 }, { charge: 1, flinch: 34 }, { atk: 24 }, { heal: 20, pied: 2 }] }
};
for (const k in JG.FOES) JG.FOES[k].look = { body: JG.FOES[k].body, size: JG.FOES[k].size };

JG.ACTS = [
  { name: "The Midway", tint: "#d62839", foes: ["mime", "goblin", "balloon", "tearer"], elite: ["strongman"], boss: "calliope" },
  { name: "The Hall of Warped Mirrors", tint: "#2fb7c9", foes: ["seal", "glass", "moth", "double"], elite: ["shadow"], boss: "mirrorrm" },
  { name: "The Big Top Below", tint: "#8a3dff", foes: ["comet", "usher", "angel"], elite: ["trapeze"], boss: "mother" }
];

JG.NAMES = ["Pickles", "Static", "Bonbon", "Wednesday", "Fizz", "Tinsel", "Gutter", "Moth", "Kazoo", "Nova", "Sprocket",
  "Velvet", "Doodle", "Bobo", "Lux", "Crumb", "Juniper", "Zigzag", "Marrow", "Sable", "Pip", "Skronk", "Halley", "Dregs",
  "Glitter", "Rerun", "Smudge", "Comet", "Ribbon", "Bruise", "Tadpole", "Echo", "Mixtape", "Gloom", "Sprinkles", "Vex"];

// Sideshow events. Choices are handled in game.js by id.
JG.EVENTS = [
  { id: "cat", title: "The Fortune Cat", text: "A cat in a velvet turban sits in a booth that smells like burnt sugar. \"Twenty Tix,\" it says, \"and I'll give you something from my sleeve.\"",
    choices: [{ id: "pay", label: "Pay 20 Tix for a lucky charm", need: { tix: 20 } }, { id: "pet", label: "Pet the cat (it might bite)" }, { id: "leave", label: "Walk on" }] },
  { id: "puddle", title: "A Puddle of Something", text: "It glows. It hums a little tune you almost know. Your Jinx is very interested.",
    choices: [{ id: "drink", label: "Let them drink it: heal 12, leans Sludge for good" }, { id: "bottle", label: "Bottle it to take home" }, { id: "leave", label: "Absolutely not" }] },
  { id: "kid", title: "A Lost Little Clown", text: "A tiny clown sits on an upturned bucket, crying glitter. They can't find the way back to their tent.",
    choices: [{ id: "help", label: "Walk them home (lose 6 health)" }, { id: "leave", label: "Point vaguely and keep going" }] },
  { id: "mirror", title: "The Mirror Booth", text: "A cracked mirror shows your deck, but slightly wrong. You could leave one card behind in there.",
    choices: [{ id: "remove", label: "Leave a card in the mirror" }, { id: "leave", label: "Don't look too long" }] },
  { id: "mosh", title: "A Mosh Pit by the Bumper Cars", text: "A band of three skeletons plays the same chord over and over. The crowd is going feral. Someone dropped their tips jar.",
    choices: [{ id: "dive", label: "Dive in: lose 8 health, grab 35 Tix" }, { id: "watch", label: "Watch from the edge and nod along: heal 6" }] },
  { id: "candy", title: "Cotton Candy Nebula", text: "A whole cloud of spun sugar drifts low over the path, pink at the edges and starry in the middle.",
    choices: [{ id: "eat", label: "Eat it: 6 more max health, leans Stardust for good" }, { id: "pocket", label: "Pocket some to take home" }] },
  { id: "well", title: "The Wishing Well of Static", text: "You hear a radio station at the bottom, playing something sad from 2003. A sign says WISHES: 15 TIX.",
    choices: [{ id: "wish", label: "Throw in 15 Tix", need: { tix: 15 } }, { id: "leave", label: "Change the station in your head and go" }] },
  { id: "tattoo", title: "Stick-and-Poke Tent", text: "A moth with a needle offers your Jinx a tiny tattoo. It is very professional about it.",
    choices: [{ id: "star", label: "A star: learn Wish Upon a Star" }, { id: "skull", label: "A skull: learn Stage Dive" }, { id: "leave", label: "Maybe next time" }] }
];

// Personality: every Jinx hatches with one. Effects are checked by id in game.js.
JG.TRAITS = {
  showoff:  { name: "Show-off", desc: "Earns extra Applause for every card, improvises more, and always improvises an attack." },
  scaredy:  { name: "Scaredy-cat", desc: "Below half health, often ducks behind a free Block on its own." },
  glutton:  { name: "Glutton", desc: "Starts a run with 6 more health if its Belly is 70 or more." },
  daydream: { name: "Daydreamer", desc: "Sometimes draws an extra card. Sometimes forgets one." },
  copycat:  { name: "Copycat", desc: "When it improvises, it repeats the last card you played at half strength." },
  hothead:  { name: "Hothead", desc: "Gains 1 Hype whenever a single hit takes 8 or more health." }
};

// How a Jinx fights depends on its lean. Child or adult, it's the same.
JG.FORMS = {
  sludge: { name: "Sludge", res: "Corruption", show: "Sludge Flood", color: "#a6d94a",
    desc: "Builds Corruption whenever it applies Gunk or Gunk eats away at a foe. At 6 or more, every hit adds 1 Gunk.",
    showDesc: "Deal 8 plus one and a half times your Corruption, apply 6 Gunk, and spend all the Corruption." },
  stardust: { name: "Stardust", res: "Starlight", show: "Supernova", color: "#8fe9ff",
    desc: "Every Ether card adds 1 Starlight, up to 5. Each turn starts with 3 Block for every Starlight.",
    showDesc: "Deal 6 plus 4 per Starlight, heal 4 plus 3 per Starlight, shake off Dazed, Pied and Gunk, and spend the Starlight." },
  harlequin: { name: "Harlequin", res: null, show: "Harlequin Shuffle", color: "#ff5fa8",
    desc: "One card in every hand is Wild and plays twice.",
    showDesc: "Swap your whole hand for 5 new cards, then gain 1 energy and 1 Hype." }
};

// Difficulty dials, set by play-testing with automated players (a careless one should faint in Act I).
JG.TUNE = { hp: [1.5, 1.7, 2.1], dmg: [1.9, 1.9, 2.3], bossHeal: 0.25, baseHp: 30 };   // hp and dmg are per act
