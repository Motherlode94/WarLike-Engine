import test from 'node:test';
import assert from 'node:assert/strict';
import {WarScriptRuntime} from '../js/core/war-script-runtime.js';
import {compileWarScript} from '../script-editor/warscript.js';
import {playMouseDown,playMouseUp,scriptMouseSnapshot,clearPlayMouse,consumePlayMousePresses} from '../js/core/script-mouse-input.js';
test('WarScript input respects remapped axes and native mouse edge state',()=>{
 clearPlayMouse();
 const source='Update(){Set("x",Input.GetAxis("Horizontal"));Set("z",Input.GetAxis("Vertical"));Set("held",Input.GetMouseButton(1));if(Input.GetMouseButtonDown(0)){Set("clicks",Get("clicks")+1);}}';
 assert.equal(compileWarScript(source).ok,true);
 const e={id:1,x:0,y:0,w:32,h:64,inputActions:{enabled:true,replaceDefaults:true,right:'l',forward:'i'},warScripts:[{scriptId:'input',name:'Input.wls',source}]};
 const ctx={mode:'3d',entities:[e],project:{scripts:[]},globals:{},keys:new Set(['l','i']),pressedKeys:new Set()};
 const rt=new WarScriptRuntime();
 try{
 playMouseDown(0);playMouseUp(0);playMouseDown(2);
 rt.update(.02,{...ctx,...scriptMouseSnapshot()});assert.deepEqual(rt.errors,[]);assert.deepEqual(ctx.globals,{x:1,z:1,held:true,clicks:1});
 consumePlayMousePresses();rt.update(.02,{...ctx,...scriptMouseSnapshot()});assert.equal(ctx.globals.clicks,1);
 rt.update(.02,{...ctx,keys:new Set(),...scriptMouseSnapshot(true)});assert.equal(ctx.globals.held,false);assert.equal(ctx.globals.x,0);
 }finally{rt.stop();clearPlayMouse()}
});
