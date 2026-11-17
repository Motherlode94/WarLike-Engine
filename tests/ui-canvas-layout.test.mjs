import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultUiCanvas,defaultUiRect,defaultUiElement,validateUiCanvas,validateUiRect,resolveUiRect,uiCanvasScale,uiLayoutTree} from '../js/core/ui-canvas-layout.js';
test('Canvas Scaler uses reference resolution and responsive geometric blend',()=>{
 const canvas=defaultUiCanvas();
 assert.equal(uiCanvasScale(canvas,1920,1080),1);
 assert.equal(uiCanvasScale({...canvas,scaleMode:'constantPixelSize'},960,540),1);
 assert.ok(Math.abs(uiCanvasScale(canvas,960,540)-.5)<1e-8);
 assert.ok(Math.abs(uiCanvasScale(canvas,1920,540)-Math.sqrt(.5))<1e-8);
});
test('RectTransform centers a fixed-size element at its pivot',()=>{
 const resolved=resolveUiRect(defaultUiRect(),{x:0,y:0,width:1000,height:600});
 assert.deepEqual(resolved,{x:400,y:270,width:200,height:60,rotation:0});
 const topRight=resolveUiRect({anchorMin:[1,1],anchorMax:[1,1],pivot:[1,1],anchoredPosition:[-20,-10],sizeDelta:[140,40]}, {x:0,y:0,width:1000,height:600});
 assert.deepEqual(topRight,{x:840,y:10,width:140,height:40,rotation:0});
});
test('RectTransform supports stretch anchors and layout adapts to parent',()=>{
 const rect={anchorMin:[0,0],anchorMax:[1,1],pivot:[.5,.5],sizeDelta:[-30,-20]};
 assert.deepEqual(resolveUiRect(rect,{x:0,y:0,width:800,height:600}),{x:15,y:10,width:770,height:580,rotation:0});
});
test('invalid UI properties fail explicitly without unsafe HTML or scripts',()=>{
 assert.throws(()=>validateUiCanvas({renderMode:'world'}),/pas encore opérationnel/);
 assert.throws(()=>validateUiCanvas({referenceResolution:[0,0]}));
 assert.throws(()=>validateUiRect({anchorMin:[1,1],anchorMax:[0,0]}));
 assert.equal(defaultUiElement().kind,'panel');
});
test('Canvas renders nested elements in native parent-child hierarchy',()=>{
 const entities=[
  {id:1,uiCanvas:defaultUiCanvas()},
  {id:2,parentId:1,uiRect:{anchorMin:[0,0],anchorMax:[0,0],pivot:[0,0],anchoredPosition:[20,-30],sizeDelta:[250,140]},uiElement:{kind:'panel',color:'#123456'}},
  {id:3,parentId:2,uiRect:{anchorMin:[.5,.5],anchorMax:[.5,.5],sizeDelta:[100,40]},uiElement:{kind:'button',text:'Jouer'}},
  {id:4,parentId:100,uiRect:defaultUiRect(),uiElement:{kind:'text',text:'Detached'}}
 ];
 const items=uiLayoutTree(entities,1920,1080);
 assert.deepEqual(items.map(x=>x.id),[2,3]);
 assert.deepEqual(items[0].rect,{x:20,y:30,width:250,height:140,rotation:0});
 assert.ok(Math.abs(items[1].rect.x-95)<1e-8);
 assert.ok(Math.abs(items[1].rect.y-80)<1e-8);
});
test('different viewport resolutions preserve relative UI scale and ordering',()=>{
 const entities=[
  {id:1,uiCanvas:{...defaultUiCanvas(),sortOrder:9}},
  {id:2,parentId:1,uiRect:defaultUiRect(),uiElement:{kind:'text',text:'HUD'}},
  {id:3,uiCanvas:{...defaultUiCanvas(),sortOrder:-1}},
  {id:4,parentId:3,uiRect:defaultUiRect(),uiElement:{kind:'panel'}}
 ];
 const large=uiLayoutTree(entities,1920,1080),small=uiLayoutTree(entities,960,540);
 assert.deepEqual(large.map(x=>x.id),[4,2]);
 assert.deepEqual(small.map(x=>x.id),[4,2]);
 assert.ok(Math.abs(small[0].rect.width-large[0].rect.width*.5)<1e-8);
});
