import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTilemap2d,paintTile2d,tileAt,tilemapColliders2d,renderTilemap2d} from '../js/core/tilemap-2d.js';
import {defaultSpriteAnimation2d,spriteSheetFrame2d,drawSpriteSheet2d} from '../js/core/sprite-animation-2d.js';
import {moveBody2d} from '../js/core/physics-2d.js';

const map=()=>({id:31,type:'tilemap',x:32,y:64,tilemap2d:defaultTilemap2d(),collision3d:false});
test('tilemap painting is sparse, correctly snapped and undo-serializable',()=>{
 const entity=map();
 assert.deepEqual(tileAt(entity,64,96),{col:1,row:1,key:'1,1'});
 assert.equal(paintTile2d(entity,64,96,'wall'),true);
 assert.equal(paintTile2d(entity,65,97,'wall'),false);
 assert.equal(entity.tilemap2d.cells['1,1'],'wall');
 const restored=JSON.parse(JSON.stringify(entity));
 assert.equal(tilemapColliders2d([restored]).length,1);
 assert.equal(paintTile2d(restored,64,96,'erase'),true);
 assert.deepEqual(restored.tilemap2d.cells,{});
 assert.equal(paintTile2d(restored,-500,-500,'grass'),false);
 assert.equal(paintTile2d(restored,64,96,'not-a-tile'),false);
});
test('physics uses solid painted tiles without one GameObject per tile',()=>{
 const tilemap=map();
 paintTile2d(tilemap,64,96,'wall');
 paintTile2d(tilemap,96,96,'grass');
 const actor={id:22,type:'player',x:20,y:96,w:24,h:24,collider2d:{enabled:true}};
 const result=moveBody2d(actor,80,0,[actor,tilemap]);
 assert.equal(result.blockedX,true);
 assert.equal(actor.x,40);
 assert.deepEqual(result.hits,[tilemap.id]);
});
test('non-solid tiles do not block player movement',()=>{
 const tilemap=map();paintTile2d(tilemap,64,96,'grass');
 const actor={id:23,type:'player',x:20,y:96,w:24,h:24,collider2d:{enabled:true}};
 const result=moveBody2d(actor,80,0,[actor,tilemap]);
 assert.equal(result.blockedX,false);
 assert.equal(actor.x,100);
});
test('tilemap rendering paints sparse tiles and optional editor grid',()=>{
 const tilemap=map();paintTile2d(tilemap,64,96,'wall');
 const calls=[];const ctx={
  save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
  fillRect(...args){calls.push(args)}
 };
 renderTilemap2d(ctx,tilemap,{editor:false});
 assert.deepEqual(calls[0],[64,96,32,32]);
});
test('sprite sheet animation advances and clamps in non-loop mode',()=>{
 const a={...defaultSpriteAnimation2d(),enabled:true,frames:4,fps:4};
 assert.deepEqual(spriteSheetFrame2d(a,.5,true),{index:2,count:4});
 a.loop=false;
 assert.equal(spriteSheetFrame2d(a,5,true).index,3);
 assert.equal(spriteSheetFrame2d(a,.5,false).index,0);
 a.preview=true;
 assert.equal(spriteSheetFrame2d(a,.5,false).index,2);
});
test('sprite sheet renders the selected source frame without modifying image',()=>{
 const draws=[];
 const ctx={drawImage(...args){draws.push(args)}};
 const image={complete:true,naturalWidth:256,naturalHeight:64};
 const entity={x:8,y:16,w:64,h:64,spriteAnimation2d:{enabled:true,frames:4,fps:2,loop:true}};
 assert.equal(drawSpriteSheet2d(ctx,image,entity,1.5,true),true);
 assert.deepEqual(draws[0],[image,192,0,64,64,8,16,64,64]);
});

test('SpriteFrames grid supports ordered cells from multiple rows and retains a static first frame',()=>{
 const draws=[],ctx={drawImage(...args){draws.push(args)}},image={complete:true,naturalWidth:128,naturalHeight:64};
 const entity={x:0,y:0,w:32,h:32,spriteAnimation2d:{enabled:true,fps:2,loop:true,grid:{columns:4,rows:2,sequence:[5,2,7]}}};
 assert.equal(drawSpriteSheet2d(ctx,image,entity,0,false),true);
 assert.deepEqual(draws.at(-1),[image,32,32,32,32,0,0,32,32]);
 assert.equal(drawSpriteSheet2d(ctx,image,entity,.5,true),true);
 assert.deepEqual(draws.at(-1),[image,64,0,32,32,0,0,32,32]);
 entity.spriteAnimation2d.grid.sequence=[8];
 assert.equal(drawSpriteSheet2d(ctx,image,entity,0,true),false);
});

import {paintTileArea2d} from '../js/core/tilemap-2d.js';
test('WB2D rectangle, line and connected fill use sparse serialized cells',()=>{
 const entity=map();entity.tilemap2d.columns=5;entity.tilemap2d.rows=4;
 assert.equal(paintTileArea2d(entity,{col:2,row:0},{col:2,row:3},'wall','line'),4);
 assert.equal(paintTileArea2d(entity,{col:0,row:0},{col:0,row:0},'grass','fill'),8);
 assert.equal(entity.tilemap2d.cells['3,0'],undefined);
 assert.equal(paintTileArea2d(entity,{col:4,row:3},{col:3,row:2},'earth','rectangle'),4);
 assert.equal(tilemapColliders2d([entity]).length,4);
 assert.deepEqual(JSON.parse(JSON.stringify(entity)).tilemap2d.cells,entity.tilemap2d.cells);
 assert.equal(paintTileArea2d(entity,{col:-1,row:0},{col:0,row:0},'wall','line'),0);
});
