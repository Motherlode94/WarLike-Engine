"""Compose Liens de vie from Kenney Tiny Town tiles, without runtime downloads.

Usage: python scripts/assets/build-life-art.py /path/to/tiny-town
The source directory contains Tiles/tile_0000.png and the other original tiles.
"""
from pathlib import Path
from PIL import Image
import base64
import io
import json
import sys

source = Path(sys.argv[1])
root = Path(__file__).resolve().parents[2]
tiles = {int(p.stem[5:]): Image.open(p).convert('RGBA') for p in (source / 'Tiles').glob('tile_*.png')}
def data(im):
    out = io.BytesIO()
    im.save(out, format='PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(out.getvalue()).decode()
def composite(rows):
    im = Image.new('RGBA', (len(rows[0])*16, len(rows)*16))
    for y,row in enumerate(rows):
        for x,index in enumerate(row):
            im.alpha_composite(tiles[index], (x*16,y*16))
    return data(im)
ground = Image.new('RGBA',(640,480))
for y in range(30):
    for x in range(40):
        index = 2 if (x*17+y*23)%47==0 else 1 if (x*13+y*7)%11==0 else 0
        if 14<=y<=16 or 19<=x<=21 or 10<=y<=11 and (7<=x<=29) or 24<=y<=25 and (8<=x<=29):
            index=25
        ground.alpha_composite(tiles[index],(x*16,y*16))
for x,y in [(2,2),(5,4),(33,3),(36,6),(3,22),(6,27),(33,22),(36,25),(26,20),(28,26),(4,11),(35,12)]:
    ground.alpha_composite(tiles[5],(x*16,y*16))
    ground.alpha_composite(tiles[16],(x*16,(y+1)*16))
for x,y in [(31,21),(32,21),(33,21),(31,27),(32,27),(33,27)]:
    ground.alpha_composite(tiles[2],(x*16,y*16))
art={'ground':data(ground),
     'home':composite([[48,49,49,50],[60,61,61,62],[76,77,77,79],[88,77,89,77]]),
     'cafe':composite([[52,53,53,54],[64,65,65,66],[72,73,73,75],[84,73,85,73]]),
     'studio':composite([[48,49,49,49,50],[60,61,61,61,62],[76,77,77,77,79],[88,77,89,77,88]])}
entries=[]
for index,im in sorted(tiles.items()):
    entries.append({'id':f'life-town-tile-{index:04}', 'name':f'Tiny Town · tuile {index:03}',
      'category':'Terrain' if index<43 else 'Props','kind':'prop','width':32,'height':32,
      'sourceType':'png','spriteUrl':data(im),'pixelArt':True,'author':'Kenney','license':'CC0-1.0',
      'pack':'tiny-town','packName':'Tiny Town','sourceUrl':'https://kenney.nl/assets/tiny-town'})
(root/'js/assets/life-sprites-2d.js').write_text('// Kenney · Tiny Town · CC0-1.0. Composites assembled by WarLike.\nexport const lifeArt='+json.dumps(art,separators=(',',':'))+';\nexport const lifeTownSprites='+json.dumps(entries,separators=(',',':'))+';\n')
print(f'{len(entries)} original tiles and {len(art)} scene composites embedded.')
