import test from 'node:test';
import assert from 'node:assert/strict';
import {sunShadowFrame3d} from '../js/core/shadow-map-3d.js';
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const len=v=>Math.hypot(...v);
test('sun shadow camera is an orthonormal frame aimed at the scene',()=>{
 for(const sun of [[.3,.9,.1],[0,1,0],[-.4,.2,.7],[0,-1,0]]){
  const view=sunShadowFrame3d({eye:[4,6,8],forward:[-.3,-.15,-1]},sun);
  assert.ok(view);
  for(const name of ['right','up','forward'])assert.ok(Math.abs(len(view[name])-1)<1e-9,name);
  for(const [a,b] of [['right','up'],['right','forward'],['up','forward']])assert.ok(Math.abs(dot(view[a],view[b]))<1e-9);
  assert.ok(dot(sub(view.target,view.eye),view.forward)>0);
  assert.ok(Math.abs(dot(sub(view.target,view.eye),view.right))<1e-9);
  assert.ok(Math.abs(dot(sub(view.target,view.eye),view.up))<1e-9);
 }
});
test('shadow projection stays stable for a moving camera and rejects invalid vectors',()=>{
 const camera={eye:[0,2,5],forward:[0,0,-1]},sun=[.4,.7,.1];
 const a=sunShadowFrame3d(camera,sun),b=sunShadowFrame3d({eye:[1,2,5],forward:[0,0,-1]},sun);
 assert.equal(b.target[0]-a.target[0],1);
 assert.deepEqual(a.right,b.right);assert.deepEqual(a.up,b.up);
 assert.equal(sunShadowFrame3d(camera,[0,0,0]),null);
 assert.equal(sunShadowFrame3d(camera,sun,{extent:0}),null);
 assert.equal(sunShadowFrame3d({eye:[NaN,0,0],forward:[0,0,-1]},sun),null);
});
