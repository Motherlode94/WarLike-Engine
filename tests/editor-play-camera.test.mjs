import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditorPlayCamera} from '../js/core/editor-play-camera.js';
import {cleanupPlay} from '../js/core/play-cleanup.js';
test('rapid Play/Stop restores every navigation property without needing a render frame',()=>{
 const view={yaw:1,pitch:.7,radius:30,target:[1,2,3],followPlayer:true,drag:{id:1},gl:{}};
 const original=structuredClone(view);let enters=0,leaves=0;
 const sync=createEditorPlayCamera(view,{enter(){enters++;view.yaw=8;view.target[0]=99},leave(){leaves++}});
 for(let i=0;i<2;i++){sync(true);sync(true);sync(false);sync(false);assert.deepEqual(view,{...original,drag:null})}
 assert.equal(enters,2);assert.equal(leaves,2);
});
test('camera restoration survives a renderer cleanup error',()=>{
 const view={yaw:1,pitch:2,radius:3,target:[4,5,6],followPlayer:false};
 const sync=createEditorPlayCamera(view,{enter(){view.yaw=99},leave(){throw Error('cleanup')}});
 sync(true);assert.throws(()=>sync(false),/cleanup/);assert.equal(view.yaw,1);assert.deepEqual(view.target,[4,5,6]);sync(false);
});
test('all cleanup steps run even when a preceding shutdown fails',()=>{
 const ran=[];const errors=cleanupPlay([()=>{ran.push('runtime');throw Error('script')},()=>{ran.push('hero');throw Error('hero')},()=>ran.push('diagnostics'),()=>ran.push('sequences')]);
 assert.deepEqual(ran,['runtime','hero','diagnostics','sequences']);assert.equal(errors.length,2);
});
