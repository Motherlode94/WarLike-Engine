import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gaiaSafeDriverExit} from '../js/core/gaia-parking-runtime.js';

const vehicle=(rotation=0)=>({id:9,x:100,y:200,w:80,depth3d:120,h:40,
 rotation,elevation3d:2});
const actor={id:7,w:20,depth3d:20,h:30};

test('WB 2.9g.4 chooses left exit with legacy heading and preserves input entities',()=>{
 const v=vehicle(),before=structuredClone(v);
 const result=gaiaSafeDriverExit(v,actor,{canPlace:()=>true});
 assert.deepEqual(result,{x:68,y:250,elevation3d:2,side:'left'});
 assert.deepEqual(v,before);
});
test('WB 2.9g.4 rotates exit candidates with the vehicle and tries alternate sides',()=>{
 const v=vehicle(90);
 const seen=[];
 const result=gaiaSafeDriverExit(v,actor,{canPlace:p=>{seen.push(p);return seen.length===2}});
 assert.equal(seen.length,2);
 assert.equal(result.side,'right');
 assert(Math.abs(result.x-130)<1e-9);
 assert(Math.abs(result.y-312)<1e-9);
});
test('WB 2.9g.4 never releases a driver when every exit collides',()=>{
 const v=vehicle(),before=structuredClone(v);
 let calls=0;
 const result=gaiaSafeDriverExit(v,actor,{canPlace:()=>{calls++;return false}});
 assert.equal(result,null);
 assert.equal(calls,4);
 assert.deepEqual(v,before);
});
test('WB 2.9g.4 preserves runtime collision backend and rechecks after animated exits',()=>{
 const source=readFileSync(new URL('../js/core/vehicle-3d.js',import.meta.url),'utf8');
 assert.match(source,/gaiaSafeDriverExit\(car,player/);
 assert.match(source,/backend\.canPlace\(player,pose,\{ignore:car\}\)/);
 assert.match(source,/transition\.action==='exit'&&!canExitAt\(entities,car,player,transition\.to\)/);
 assert.match(source,/placeGaiaDriverAtSeat\(car,player\)/);
 assert.match(source,/vehicleComponents\(car\)\.seats\.driverId=null/);
});
