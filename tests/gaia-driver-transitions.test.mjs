import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beginGaiaDriverTransition,advanceGaiaDriverTransition} from '../js/core/gaia-parking-runtime.js';

const vehicle=()=>({id:11,vehicleSystems:{seats:{driverId:7,transition:{
 enabled:true,enterSeconds:.2,exitSeconds:.3,enterClip:'get-in',exitClip:'get-out'
}}}});
const actor=()=>({id:7,x:0,y:0,elevation3d:0,animation:'idle'});
test('WB 2.9g.2b authored entry uses the exact clip and finishes at the driver seat',()=>{
 const v=vehicle(),p=actor(),state=beginGaiaDriverTransition(v,p,'enter',{x:10,y:4,elevation3d:2});
 assert.equal(state.clip,'get-in');
 assert.equal(advanceGaiaDriverTransition(state,v,p,.1).done,false);
 assert.equal(p.animation,'get-in');
 assert.equal(p._hiddenInVehicle,false);
 assert.equal(p.x,5);
 assert.equal(advanceGaiaDriverTransition(state,v,p,.1).done,true);
 assert.equal(p.x,10);assert.equal(p.y,4);assert.equal(p.elevation3d,2);
});
test('WB 2.9g.2b exit keeps actor visible, preserves an authored exit clip and rejects wrong actors',()=>{
 const v=vehicle(),p=actor();
 const state=beginGaiaDriverTransition(v,p,'exit',{x:-12,y:2,elevation3d:0});
 assert.equal(state.clip,'get-out');
 assert.equal(advanceGaiaDriverTransition(state,v,{...p,id:99},.1).invalid,true);
 assert.equal(advanceGaiaDriverTransition(state,v,p,.1).done,false);
 assert.equal(p.animation,'get-out');assert.equal(p._hiddenInVehicle,false);
 for(let i=0;i<3;i++)advanceGaiaDriverTransition(state,v,p,.1);
 assert.equal(p.x,-12);assert.equal(p.y,2);
});
test('WB 2.9g.2b transitions are opt-in and do not change legacy vehicles',()=>{
 const v=vehicle(),p=actor();
 delete v.vehicleSystems.seats.transition;
 assert.equal(beginGaiaDriverTransition(v,p,'enter',{x:10,y:3}),null);
 v.vehicleSystems.seats.transition={enabled:false};
 assert.equal(beginGaiaDriverTransition(v,p,'exit',{x:10,y:3}),null);
});
test('WB 2.9g.2b existing Play uses entry/exit transitions without a duplicate controller',()=>{
 const source=readFileSync(new URL('../js/core/vehicle-3d.js',import.meta.url),'utf8');
 assert.match(source,/beginGaiaDriverTransition\(nearest\.o,player,'enter'/);
 assert.match(source,/beginGaiaDriverTransition\(car,player,'exit'/);
 assert.match(source,/advanceGaiaDriverTransition\(transition,car,player,step\)/);
 assert.match(source,/groundVehicleInput=\{throttle:0,steer:0,brake:1,handbrake:1\}/);
});
