import test from 'node:test';
import assert from 'node:assert/strict';
import {resizedWindowRect,dockedPanelWidths,projectPanelRange,bindPanelSplitter} from '../js/ui/resizable-window.js';

test('all eight resize directions preserve their opposite edges',()=>{
 const rect={x:200,y:150,width:400,height:300},limits={width:1400,height:1000,minWidth:260,minHeight:180};
 for(const edge of ['n','s','e','w','ne','nw','se','sw']){
  const r=resizedWindowRect(rect,edge,40,30,limits);
  if(edge.includes('w'))assert.equal(r.x+r.width,600);else assert.equal(r.x,200);
  if(edge.includes('n'))assert.equal(r.y+r.height,450);else assert.equal(r.y,150);
  if(edge.includes('e'))assert.equal(r.width,440);
  if(edge.includes('s'))assert.equal(r.height,330);
 }
});
test('floating windows stop at the viewport and remain usable on tiny screens',()=>{
 for(const width of [180,320,1400])for(const height of [120,300,1000])for(const edge of ['ne','nw','se','sw'])for(const delta of [-10000,10000]){
  const r=resizedWindowRect({x:0,y:0,width:Math.min(400,width),height:Math.min(300,height)},edge,delta,delta,{width,height,minWidth:260,minHeight:210});
  assert.ok(r.x>=0&&r.y>=0&&r.width>0&&r.height>0);assert.ok(r.x+r.width<=width&&r.y+r.height<=height);
 }
});
test('docked panels can grow beyond legacy caps without stealing the central work area',()=>{
 const wide=dockedPanelWidths({width:1600,left:245,right:800});assert.equal(wide.right,800);assert.ok(wide.left+wide.right<=1288);
 const hierarchy=dockedPanelWidths({width:1600,left:600,right:350,prefer:'left'});assert.equal(hierarchy.left,600);
 for(const width of [400,600,900,1600])for(const prefer of ['left','right']){
  const r=dockedPanelWidths({width,left:640,right:880,prefer});assert.ok(r.left>=0&&r.right>=0);assert.ok(r.left+r.right<=width-12-Math.min(300,width*.4)+1);
 }
});
test('floating a side panel releases its width for the remaining editor',()=>{
 assert.equal(dockedPanelWidths({width:900,leftFloating:true}).left,0);assert.equal(dockedPanelWidths({width:900,rightFloating:true}).right,0);
 assert.deepEqual(dockedPanelWidths({width:900,leftFloating:true,rightFloating:true}),{left:0,right:0});
});
test('Project can use more than half the center while keeping a reachable scene',()=>{
 assert.deepEqual(projectPanelRange(800,60),{min:120,max:580});
 for(const height of [0,90,180,500,800]){const r=projectPanelRange(height,60);assert.ok(r.min>=0&&r.max>=r.min&&r.max<=Math.max(0,height-60))}
});
test('Escape cancels the entire split operation at UI zoom, releases capture and restores both panels',()=>{
 const old={document:globalThis.document,window:globalThis.window,getComputedStyle:globalThis.getComputedStyle},classes=new Set(),win=new EventTarget();
 class Handle extends EventTarget{capture=null;attributes={};classList={add:v=>classes.add(v),remove:v=>classes.delete(v)};setAttribute(k,v){this.attributes[k]=v}setPointerCapture(id){this.capture=id}hasPointerCapture(id){return this.capture===id}releasePointerCapture(){this.capture=null}}
 const handle=new Handle(),size={left:245,right:350};let before,ends=0;
 const event=(type,values)=>Object.assign(new Event(type,{cancelable:true}),values);
 try{
  globalThis.window=win;globalThis.document={body:{classList:handle.classList,style:{setProperty(){}}}};globalThis.getComputedStyle=()=>({zoom:'1.4'});
  bindPanelSplitter(handle,{getValue:()=>size.left,setValue:v=>{size.left=v;if(v>300)size.right=200},getLimits:()=>({min:160,max:640}),defaultValue:245,onStart:()=>before={...size},onCancel:()=>Object.assign(size,before),onEnd:()=>ends++});
  handle.dispatchEvent(event('pointerdown',{button:0,pointerId:7,clientX:140}));handle.dispatchEvent(event('pointermove',{pointerId:7,clientX:280}));assert.deepEqual(size,{left:345,right:200});
  win.dispatchEvent(event('keydown',{key:'Escape'}));assert.deepEqual(size,{left:245,right:350});assert.equal(handle.capture,null);assert.equal(classes.has('resizing-panels'),false);assert.equal(ends,1);
  handle.dispatchEvent(event('keydown',{key:'ArrowRight',shiftKey:true}));assert.equal(size.left,309);handle.dispatchEvent(event('dblclick',{}));assert.equal(size.left,245);
 }finally{Object.assign(globalThis,old)}
});
