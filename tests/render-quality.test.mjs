import test from 'node:test';
import assert from 'node:assert/strict';
import {renderQuality,setRenderQuality,loadRenderQuality,saveRenderQuality} from '../js/core/render-quality.js';
test('render-quality parameters clamp corrupt or extreme user settings',()=>{
 setRenderQuality({ambient2d:-100,lightRadius2d:999999,exposure3d:'bad',fog3d:10});
 assert.equal(renderQuality.ambient2d,.15);
 assert.equal(renderQuality.lightRadius2d,600);
 assert.equal(renderQuality.fog3d,.045);
 assert.ok(renderQuality.exposure3d>=.4&&renderQuality.exposure3d<=2.5);
});
test('render-quality settings can persist and restore',()=>{
 const store=new Map();const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 setRenderQuality({lighting2d:false,ambient2d:.55,exposure3d:1.4});
 assert.equal(saveRenderQuality(storage),true);
 setRenderQuality({lighting2d:true,ambient2d:1,exposure3d:1});
 loadRenderQuality(storage);
 assert.equal(renderQuality.lighting2d,false);
 assert.equal(renderQuality.ambient2d,.55);
 assert.equal(renderQuality.exposure3d,1.4);
});
