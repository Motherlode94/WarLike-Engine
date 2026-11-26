import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTilemap2d,captureTilePattern2d,stampTilePattern2d} from '../js/core/tilemap-2d.js';
test('sparse patterns serialize, stamp onto active layer and reject out-of-bounds atomically',()=>{
 const map=defaultTilemap2d();map.cells={'1,1':'wall','2,2':'grass'};
 const pattern=captureTilePattern2d(map,{col:1,row:1},{col:2,row:2},'Maison');
 assert.deepEqual(pattern,{name:'Maison',width:2,height:2,tiles:{'0,0':'wall','1,1':'grass'}});
 map.patterns=[pattern];map.layers=[{name:'Decor',cells:{'5,4':'water'}}];map.activeLayer=1;
 const restored=JSON.parse(JSON.stringify(map));
 assert.equal(stampTilePattern2d(restored,{col:4,row:4},restored.patterns[0]),2);
 assert.deepEqual(restored.layers[0].cells,{'5,4':'water','4,4':'wall','5,5':'grass'});
 assert.deepEqual(restored.cells,map.cells);
 const before=JSON.stringify(restored);assert.equal(stampTilePattern2d(restored,{col:19,row:11},pattern),0);assert.equal(JSON.stringify(restored),before);
});
