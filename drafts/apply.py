"""Builds a copy of the game with the foe drafts switched in, without touching the game itself.

    python3 drafts/apply.py /tmp/jinx-drafts      # from the top folder
    cd /tmp/jinx-drafts && python3 -m http.server 8766
    JINX_URL=http://localhost:8766/index.html node drafts/shots.cjs      # from the top folder, in another terminal

In the copy, JG.draw.foeArt chooses how foes are drawn: "now", "night" (the repaint) or "redo" (redrawn).
The hooks below are found by exact text, so if draw.js has changed since, an assert says which one moved.
"""
import os, shutil, sys
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.dirname(here)
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/jinx-drafts'
os.makedirs(out, exist_ok=True)
for f in ['index.html', 'data.js', 'draw.js', 'stage.js', 'music.js', 'game.js']:
    shutil.copy(os.path.join(src, f), os.path.join(out, f))
p = os.path.join(out, 'draw.js')
s = open(p).read()

def rep(old, new):
    global s
    assert s.count(old) == 1, ('hook not found exactly once', old[:70])
    s = s.replace(old, new)

def body(name):      # a fragment, without its leading comment lines
    lines = open(os.path.join(here, name)).read().split('\n')
    while lines and lines[0].startswith('//'):
        lines.pop(0)
    return '\n'.join(lines)

# the fragments go just before the puppet code, where every helper they use is already defined
rep("  // ---- foes are jointed paper puppets ----", body('night-repaint.js') + body('foes-redrawn.js') + "\n  // ---- foes are jointed paper puppets ----")
# eyes keep their own colour in the repaint, and get a little light
rep("  function eye(x, y, w, h, o) {\n    o = o || {};",
    "  function eye(x, y, w, h, o) {\n    const on = D.foeArt === \"night\";\n    nightSkip++;\n    try { if (on && !(o && o.kind === \"x\")) glow(x, y, w * 2.6, (o && (o.glow || o.iris)) || \"#ffffff\", 0.4); eye0(x, y, w, h, o); } finally { nightSkip--; }\n  }\n  function eye0(x, y, w, h, o) {\n    o = o || {};")
# each way of drawing a foe has its own measured parts and its own stored stickers
rep("key = f.def.id + \":\" + Math.round(r) + \":\" + DPR;", "key = f.def.id + \":\" + Math.round(r) + \":\" + DPR + \":\" + D.foeArt;")
# while the art is drawn, colours pass through the repaint
rep("      PS = { g, i: -1, opts: {}, lights: [],", "      const gp = D.foeArt === \"night\" ? nightCtx(g) : g;\n      PS = { g: gp, i: -1, opts: {}, lights: [],")
rep("      ctx = g;\n      cutDepth++;\n      g.save();\n      try {\n        PS.mark({ z: 0.5 });", "      ctx = gp;\n      cutDepth++;\n      g.save();\n      try {\n        PS.mark({ z: 0.5 });")
rep("    const art = ART[f.def.id] || ART.mime;", "    const art = (D.foeArt === \"redo\" && ART2[f.def.id]) || ART[f.def.id] || ART.mime;")
open(p, 'w').write(s)
print('drafts applied in', out)
