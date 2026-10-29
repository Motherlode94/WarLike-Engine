import test from 'node:test';
import assert from 'node:assert/strict';
import {imagePoint,arrowHead,createAnnotationHistory,visibleAnnotations,drawAnnotation,annotationState} from '../js/core/annotations.js';
import {gameIsRunning,gameSession,resetGameSession} from '../js/core/game-session.js';
import {gameplayInputBlocked} from '../js/core/gameplay-input.js';
test('annotation coordinates track image pixels at mobile, desktop and 140% editor zoom',()=>{
 for(const rect of [{left:20,top:10,width:800,height:600},{left:10,top:40,width:320,height:240},{left:50,top:80,width:1120,height:840}]){assert.deepEqual(imagePoint(rect.left+rect.width/2,rect.top+rect.height/2,rect,1600,1200),{x:800,y:600});assert.deepEqual(imagePoint(-100,-100,rect,1600,1200),{x:0,y:0});assert.deepEqual(imagePoint(10000,10000,rect,1600,1200),{x:1600,y:1200})}
});
test('arrow heads remain behind the endpoint in every drawing direction',()=>{
 for(const to of [{x:100,y:0},{x:-100,y:0},{x:0,y:100},{x:0,y:-100}]){const points=arrowHead({x:0,y:0},to,5);for(const p of points){assert.ok((to.x-p.x)*to.x+(to.y-p.y)*to.y>0);assert.ok(Math.abs(Math.hypot(to.x-p.x,to.y-p.y)-20)<1e-6)}}
});
test('clear, undo, redo and a new edit preserve or discard the appropriate annotation history',()=>{
 const h=createAnnotationHistory();h.add({type:'note',text:'Un problème'});h.add({type:'arrow'});h.clear();assert.equal(visibleAnnotations(h.entries).length,0);h.undo();assert.equal(visibleAnnotations(h.entries).length,2);h.undo();assert.equal(h.entries.length,1);h.redo();assert.equal(h.entries.length,2);h.undo();h.add({type:'ellipse'});assert.equal(h.canRedo,false);h.reset();assert.equal(h.canUndo,false);const limited=createAnnotationHistory(1);limited.add({type:'note'});assert.throws(()=>limited.add({type:'arrow'}),/maximum/);limited.clear();limited.add({type:'ellipse'});assert.equal(visibleAnnotations(limited.entries).length,1);
});
test('drawing exports reverse ellipses and bounded, wrapped notes into the bitmap',()=>{
 const calls=[],ctx=new Proxy({measureText:t=>({width:t.length*10})},{get:(obj,key)=>key in obj?obj[key]:(...args)=>calls.push([key,...args]),set:(obj,key,value)=>{obj[key]=value;return true}});
 drawAnnotation(ctx,{type:'ellipse',from:{x:110,y:100},to:{x:10,y:20},color:'#f00',width:4},800,600);assert.deepEqual(calls.find(c=>c[0]==='ellipse').slice(1,5),[60,60,50,40]);
 drawAnnotation(ctx,{type:'note',from:{x:790,y:590},text:'Une note lisible près du bord',color:'#fff'},800,600);const rect=calls.find(c=>c[0]==='fillRect');assert.ok(rect[1]>=0&&rect[2]>=0&&rect[1]+rect[3]<=800&&rect[2]+rect[4]<=600);assert.ok(calls.some(c=>c[0]==='fillText'));
});
test('annotation mode freezes Play without changing its phase and blocks gameplay input',()=>{
 resetGameSession();assert.equal(gameIsRunning(),true);annotationState.open=true;try{assert.equal(gameIsRunning(),false);assert.equal(gameSession.phase,'playing');assert.equal(gameplayInputBlocked(),true)}finally{annotationState.open=false}assert.equal(gameIsRunning(),true);
});
