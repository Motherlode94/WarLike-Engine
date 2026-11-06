"""Bake authored demo ground layouts from the bundled Kenney CC0 Tiny Town tiles."""
from pathlib import Path
import base64, io, json, random, subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
raw = subprocess.check_output(['node', '--input-type=module', '-e', "import {lifeTownSprites} from './js/assets/life-sprites-2d.js'; console.log(JSON.stringify(lifeTownSprites))"], cwd=ROOT)
tiles = {int(a['id'].split('-')[-1]): Image.open(io.BytesIO(base64.b64decode(a['spriteUrl'].split(',')[1]))).convert('RGBA') for a in json.loads(raw)}
OUT = ROOT / 'assets/demos'
OUT.mkdir(parents=True, exist_ok=True)
T = 48

def tile(im, number, x, y, size=T):
    art = tiles[number].resize((size, size), Image.Resampling.NEAREST)
    im.paste(art, (x, y), art)

def ground(w, h, seed):
    im = Image.new('RGBA', (w, h), '#89bd69')
    rng = random.Random(seed)
    for y in range(0, h, T):
        for x in range(0, w, T):
            tile(im, 1 if rng.random() < .14 else 0, x, y)
    return im

def paths(im, cells):
    # Match the nine dirt edge/corner tiles to their neighbours.
    for x, y in sorted(cells):
        left, right = (x-1,y) in cells, (x+1,y) in cells
        up, down = (x,y-1) in cells, (x,y+1) in cells
        number = 25
        if not left: number = 24
        if not right: number = 26
        if not up: number = 13 if left and right else 12 if not left else 14
        if not down: number = 37 if left and right else 36 if not left else 38
        tile(im, number, x*T, y*T)

town = ground(1728, 1152, 19)
roads = {(x,y) for x in range(3,33) for y in range(13,17)}
roads |= {(x,y) for x in range(9,13) for y in range(4,22)}
roads |= {(x,y) for x in range(22,26) for y in range(4,20)}
paths(town, roads)
town.convert('RGB').save(OUT/'town-ground.png', optimize=True)

garage = ground(1728, 1200, 29)
track = {(x,y) for x in range(4,32) for y in range(4,22) if x<9 or x>=27 or y<9 or y>=17}
paths(garage, track)
draw = ImageDraw.Draw(garage)
for x in range(280,470,24):
    for y in range(844,868,12):
        draw.rectangle((x,y,x+11,y+11), fill='#f5e5be' if (x//24+y//12)%2 else '#3b4146')
garage.convert('RGB').save(OUT/'garage-ground.png', optimize=True)

nature = ground(1920,1536,47)
trail = {(x,y) for x in range(7,29) for y in range(15,18)}
trail |= {(x,y) for x in range(14,17) for y in range(7,26)}
paths(nature,trail)
draw = ImageDraw.Draw(nature)
draw.ellipse((1260,850,1620,1130),fill='#5b99a9',outline='#b7cf8c',width=18)
for y in range(900,1090,36): draw.line((1340,y,1530,y),fill='#79b4bc',width=3)
nature.convert('RGB').save(OUT/'nature-ground.png', optimize=True)

sky = Image.new('RGB',(2380,900))
draw = ImageDraw.Draw(sky)
for y in range(900):
    t=y/900;draw.line((0,y,2380,y), fill=(int(107+55*t),int(170+35*t),int(199+15*t)))
for x,y in [(50,510),(350,470),(800,520),(1180,460),(1660,500),(2050,450)]:
    tile(sky,4,x,y,220)
sky.save(OUT/'platformer-backdrop.png',optimize=True)
print('Baked four authored demo maps from bundled CC0 tiles.')
