import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {newSequence,resetSequences,updateSequences,sequenceRuntime,emitSequenceSignal,conditionPass} from '../js/core/logic-sequences.js';
import {createGraph,applyGraph,inspectGraph,compileGraph} from '../js/core/blueprint-graph.js';
import {gameProject,restoreGameProject,captureGameScene} from '../js/core/game-project.js';
import {gameSession,tickGameSession,setGamePhase,saveGameSlot,readGameSlot,hasGameSlot,queueLoadGame} from '../js/core/game-session.js';
import {createBlueprintGameStarter} from '../js/core/blueprint-game-starter.js';
import {inspectBlueprintGame} from '../js/core/blueprint-validation.js';
import {prepareGameDefinition,gameBuildHtml,createZip,crc32} from '../js/core/game-build.js';
const entity=(id=1,extra={})=>({id,type:'player',name:'Player '+id,x:0,y:0,w:20,h:20,color:'#41cdb5',hp:100,...extra});
const seq=(steps,extra={})=>({...newSequence(),event:'start',instructions:steps,...extra});
const init=()=>{restoreGameProject({id:'test-game',title:'Test game'});resetSequences()};
const tick=(ctx,keys=[],dt=.1)=>updateSequences(dt,{playing:true,keys:new Set(keys),player:ctx.entities[0],...ctx});
const memory=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value))}};

test('multiple behaviours have independent once, interval, key and wait state',()=>{
 init();const o=entity(1,{sequence:seq([{type:'wait',value:.2},{type:'addVariable',key:'started',value:1}],{once:true}),sequences:[seq([{type:'addVariable',key:'pressed',value:1}],{event:'keyDown',key:'e',once:true}),seq([{type:'addVariable',key:'ticks',value:1}],{event:'interval',interval:.1,once:true})]});
 const ctx={entities:[o]};tick(ctx,['e']);tick(ctx);tick(ctx,['e']);tick(ctx);
 assert.deepEqual(sequenceRuntime.globals,{pressed:1,ticks:1,started:1});
 assert.equal(sequenceRuntime.fired.size,3);
});

test('disabling one behaviour leaves siblings active and removing it cancels its wait',()=>{
 init();const o=entity(1,{sequence:seq([{type:'setVariable',key:'disabled',value:1}],{enabled:false}),sequences:[seq([{type:'wait',value:.2},{type:'setVariable',key:'waited',value:1}]),seq([{type:'setVariable',key:'sibling',value:1}])]});const ctx={entities:[o]};tick(ctx);
 assert.equal(sequenceRuntime.globals.disabled,undefined);assert.equal(sequenceRuntime.globals.sibling,1);o.sequences[0].enabled=false;for(let i=0;i<4;i++)tick(ctx);assert.equal(sequenceRuntime.globals.waited,undefined);assert.equal(sequenceRuntime.jobs.length,0);
});

test('quick key taps between rendered frames are consumed exactly once by all matching behaviours',()=>{
 init();const o=entity(1,{sequence:seq([{type:'addVariable',key:'a',value:1}],{event:'keyDown',key:'e'}),sequences:[seq([{type:'addVariable',key:'b',value:1}],{event:'keyDown',key:'e'})]}),pressedKeys=new Set(['e']),ctx={entities:[o],pressedKeys};
 tick(ctx,[]);assert.equal(sequenceRuntime.globals.a,1);assert.equal(sequenceRuntime.globals.b,1);assert.equal(pressedKeys.size,0);tick(ctx,[]);assert.equal(sequenceRuntime.globals.a,1);pressedKeys.add('e');tick(ctx,[]);assert.equal(sequenceRuntime.globals.a,2);
});

test('condition graph runs only its chosen branch and permits a shared continuation',()=>{
 for(const value of [0,1]){
  init();const s=seq([]);s.graph={version:2,variables:[],nodes:[{id:'event',kind:'event',event:'start'},{id:'if',kind:'condition',conditions:[{type:'variable',key:'gate',value:1}]},{id:'yes',kind:'action',action:{type:'setVariable',key:'route',value:'yes'}},{id:'no',kind:'action',action:{type:'setVariable',key:'route',value:'no'}},{id:'join',kind:'action',action:{type:'addVariable',key:'joined',value:1}}],links:[{from:'event',to:'if'},{from:'if',port:'true',to:'yes'},{from:'if',port:'false',to:'no'},{from:'yes',to:'join'},{from:'no',to:'join'}]};
  assert.deepEqual(inspectGraph(s.graph),[]);applyGraph(s);sequenceRuntime.globals.gate=value;
  tick({entities:[entity(1,{sequence:s})]});
  assert.equal(sequenceRuntime.globals.route,value?'yes':'no');assert.equal(sequenceRuntime.globals.joined,1);
  assert.ok(sequenceRuntime.trace.some(t=>t.nodeId==='if'));
 }
});

test('graph conversion preserves legacy IF ELSE and rejects cycles on either output',()=>{
 const original=seq([],{branches:[{conditions:[{type:'variable',key:'key',value:1}],instructions:[{type:'message',value:'open'}]}],elseInstructions:[{type:'message',value:'locked'}]});
 const graph=createGraph(original),compiled=compileGraph(graph);
 assert.equal(compiled.instructions[0].type,'branch');assert.equal(compiled.instructions[0].thenInstructions[0].value,'open');assert.equal(compiled.instructions[0].elseInstructions[0].value,'locked');
 graph.links.push({from:graph.nodes.at(-1).id,to:graph.nodes[1].id});assert.ok(inspectGraph(graph).length);assert.throws(()=>compileGraph(graph));
});

test('inline If/Else converts into visible condition ports with a continuation',()=>{
 const s=seq([{type:'branch',conditions:[{type:'always'}],thenInstructions:[{type:'setVariable',key:'route',value:'yes'}],elseInstructions:[{type:'setVariable',key:'route',value:'no'}]},{type:'addVariable',key:'after',value:1}]);
 const graph=createGraph(s);assert.ok(graph.nodes.some(n=>n.kind==='condition'));assert.ok(graph.links.some(e=>e.port==='true'));assert.ok(graph.links.some(e=>e.port==='false'));init();s.graph=graph;applyGraph(s);tick({entities:[entity(1,{sequence:s})]});assert.equal(sequenceRuntime.globals.route,'yes');assert.equal(sequenceRuntime.globals.after,1);
});

test('objectives progress to completion and timer expiration fires once',()=>{
 init();const o=entity(1,{sequence:seq([{type:'setObjective',key:'collect',value:'Collect',total:2},{type:'startTimer',key:'clock',value:.2}]),sequences:[seq([{type:'addVariable',key:'expired',value:1}],{event:'timerExpired',signal:'clock'}),seq([{type:'addVariable',key:'done',value:1}],{event:'objectiveCompleted',signal:'collect'}),seq([{type:'addObjectiveProgress',key:'collect',value:1}],{event:'keyDown',key:'e'})]});
 const ctx={entities:[o]};tick(ctx);tick(ctx,['e']);tick(ctx);tick(ctx,['e']);tick(ctx);tick(ctx);
 assert.equal(gameSession.objectives.collect.status,'complete');assert.equal(sequenceRuntime.globals.done,1);assert.equal(sequenceRuntime.globals.expired,1);
 assert.equal(conditionPass({type:'objectiveComplete',key:'collect'},o,ctx),true);
});

test('pause freezes simulation clocks and waiting actions; paused-key behaviour resumes',()=>{
 init();const o=entity(1,{sequence:seq([{type:'wait',value:.3},{type:'addVariable',key:'done',value:1}]),sequences:[seq([{type:'resumeGame'}],{event:'keyDown',key:'p',runWhenPaused:true})]});const ctx={entities:[o]};
 tick(ctx);const time=sequenceRuntime.time;setGamePhase('paused');for(let i=0;i<10;i++)tick(ctx);
 assert.equal(sequenceRuntime.time,time);assert.equal(sequenceRuntime.globals.done,undefined);assert.equal(gameSession.elapsed,time);
 tick(ctx,['p']);assert.equal(gameSession.phase,'playing');for(let i=0;i<4;i++)tick(ctx);assert.equal(sequenceRuntime.globals.done,1);
});

test('healthChanged, death and variableChanged observe genuine transitions',()=>{
 init();const o=entity(1,{sequences:[seq([{type:'addVariable',key:'changes',value:1}],{event:'healthChanged'}),seq([{type:'loseGame',value:'Dead'}],{event:'death'})]});const ctx={entities:[o]};
 tick(ctx);o.hp=50;tick(ctx);assert.equal(sequenceRuntime.globals.changes,1);o.hp=0;tick(ctx);assert.equal(gameSession.phase,'lost');
 init();o.sequences=[seq([{type:'addVariable',key:'changed',value:1}],{event:'variableChanged',variable:'score'})];tick(ctx);sequenceRuntime.globals.score=1;tick(ctx);assert.equal(sequenceRuntime.globals.changed,1);
});

test('save/load restores health, inventory, objectives, globals and once flags at a frame boundary',()=>{
 init();const p=entity(1,{sequence:seq([{type:'giveItem',key:'key',value:1,targetRole:'player'}],{once:true})}),storage=memory(),ctx={entities:[p],storage};
 tick(ctx);sequenceRuntime.globals.gold=12;gameSession.objectives.gate={id:'gate',label:'Gate',current:1,total:3,status:'active'};
 saveGameSlot({...ctx,globals:sequenceRuntime.globals,fired:sequenceRuntime.fired});assert.equal(hasGameSlot(ctx),true);
 p.hp=2;p.inventory.items[0].count=99;sequenceRuntime.globals.gold=999;
 queueLoadGame(ctx);tick(ctx);assert.equal(ctx.entities[0].hp,100);assert.equal(ctx.entities[0].inventory.items[0].count,1);assert.equal(sequenceRuntime.globals.gold,12);assert.equal(gameSession.objectives.gate.current,1);
 tick(ctx);assert.equal(ctx.entities[0].inventory.items[0].count,1,'start/once must not replay on loading');
});

test('disk save restores the active checkpoint and rejects malformed timer or objective values',()=>{
 init();const p=entity(1,{sequence:seq([{type:'setCheckpoint'}])}),ctx={entities:[p],storage:memory()};tick(ctx);saveGameSlot({...ctx,globals:sequenceRuntime.globals,fired:sequenceRuntime.fired});const data=readGameSlot(ctx);assert.equal(data.checkpoint.entities[0].id,1);gameSession.checkpoint=null;queueLoadGame(ctx);tick(ctx);assert.equal(gameSession.checkpoint.entities[0].id,1);
 data.session.timers.bad={remaining:-2,expired:false};ctx.storage.setItem('warlike.save.v1:test-game:quick',JSON.stringify(data));assert.throws(()=>readGameSlot(ctx),/Chronomètre/);
});

test('save slots are isolated between projects and corrupt data cannot mutate a live scene',()=>{
 init();const storage=memory(),ctx={entities:[entity()],globals:{score:1},fired:new Set(),storage};saveGameSlot(ctx);const saved=readGameSlot(ctx);
 gameProject.id='another-game';assert.equal(hasGameSlot(ctx),false);gameProject.id='test-game';
 const key='warlike.save.v1:test-game:quick';saved.entities[0].id=-2;storage.setItem(key,JSON.stringify(saved));assert.throws(()=>queueLoadGame(ctx));assert.equal(ctx.entities[0].id,1);assert.equal(gameSession.pending,null);
});

test('scene changes retain globals, start new behaviours and clear old wait jobs',()=>{
 init();captureGameScene([entity(1,{sequence:seq([{type:'addVariable',key:'sceneStarts',value:1}],{once:true})})],{x:0,y:0,zoom:1},{id:'next'});gameProject.activeSceneId='main';
 const ctx={entities:[entity(1,{sequence:seq([{type:'loadScene',value:'next'}])})]};sequenceRuntime.globals.gold=4;tick(ctx);tick(ctx);tick(ctx);
 assert.equal(gameSession.currentSceneId,'next');assert.equal(sequenceRuntime.globals.sceneStarts,1);assert.equal(sequenceRuntime.globals.gold,4);assert.equal(sequenceRuntime.jobs.length,0);
});

test('checkpoints restore an actual scene snapshot and missing slots are explicit trace errors',()=>{
 init();const p=entity(1,{sequence:seq([{type:'setCheckpoint'}]),sequences:[seq([{type:'restoreCheckpoint'}],{event:'keyDown',key:'r'}),seq([{type:'loadGame',key:'missing'}],{event:'keyDown',key:'l'})]}),ctx={entities:[p],storage:memory()};
 tick(ctx);p.x=300;tick(ctx,['r']);tick(ctx);assert.equal(ctx.entities[0].x,0);tick(ctx,['l']);assert.ok(sequenceRuntime.errors.at(-1).message.includes('Aucune sauvegarde'));
});

test('spawn uses the configured real object template and creates independent components',()=>{
 init();const template=entity(2,{type:'prefab',assetId:'scout',inventory:{items:[{id:'key',count:1}],equipment:{}}}),ctx={entities:[entity(1,{sequence:seq([{type:'spawnObject',value:2,x:80,y:90}])}),template]};tick(ctx);
 const copy=ctx.entities[2];assert.equal(copy.assetId,'scout');assert.notEqual(copy.id,2);assert.equal(copy.x,80);copy.inventory.items[0].count=8;assert.equal(template.inventory.items[0].count,1);
});

test('a complete starter game can progress from start to collection and victory in 2D and 3D',()=>{
 for(const mode of ['2d','3d']){
  init();const sample=createBlueprintGameStarter(mode),p=sample.entities[0],ctx={entities:sample.entities};tick(ctx);
  assert.equal(gameSession.objectives.lanterns.current,0);assert.equal(gameSession.timers.mission.remaining,180);
  if(mode==='3d')assert.ok(sample.entities.every(o=>o.assetId.startsWith('real-')));
  for(const item of sample.entities.slice(1)){p.x=item.x;p.y=item.y;tick(ctx,['e']);tick(ctx)}
  assert.equal(gameSession.objectives.lanterns.current,3);assert.equal(gameSession.phase,'won');assert.equal(p.inventory.items[0].count,3);
 }
});

test('validation identifies invalid graph, missing targets and nonexistent destination scenes',()=>{
 init();const o=entity(1,{sequence:seq([{type:'damageObject',targetId:55},{type:'loadScene',value:'missing'}])});const issues=inspectBlueprintGame([o]);assert.equal(issues.filter(i=>i.severity==='error').length,2);
});

test('validation reads graph nodes rather than obsolete compiled actions',()=>{
 init();const s=seq([{type:'winGame'}]);s.graph=createGraph(s);s.graph.nodes[1].action={type:'unknownInstruction'};const issues=inspectBlueprintGame([entity(1,{sequence:s})]);assert.ok(issues.some(i=>i.severity==='error'&&i.message.includes('unknownInstruction')));
});

test('Web build includes startup configuration and safely embeds HTML-like user text',()=>{
 init();const scene=[entity(1,{sequence:seq([{type:'winGame'}])})],data=prepareGameDefinition({entities:scene,camera:{x:0,y:0,zoom:1},mode:'2d'});
 data.project.title='My $& </script><script>alert(1)</script>';
 const template=readFileSync(new URL('../index.html',import.meta.url),'utf8'),html=gameBuildHtml(template,data);
 assert.match(html,/src="\.\/js\/game-build-player.js"/);assert.match(html,/__WARLIKE_BUILD__=true/);assert.match(html,/My \$&amp;/);
 const json=html.match(/id="warlikeGameData">([\s\S]*?)<\/script>/)[1];assert.equal(JSON.parse(json).project.title,data.project.title);assert.ok(!json.includes('</script>'));
});

test('ZIP output contains valid CRCs, offsets, central directory and UTF-8 filenames',async()=>{
 assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
 const blob=createZip([{name:'index.html',data:'hello'},{name:'jeu/scène.json',data:'{}'}]),bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer);
 assert.equal(view.getUint32(0,true),0x04034b50);assert.equal(view.getUint32(14,true),crc32(new TextEncoder().encode('hello')));
 const end=bytes.length-22;assert.equal(view.getUint32(end,true),0x06054b50);assert.equal(view.getUint16(end+10,true),2);const central=view.getUint32(end+16,true);assert.equal(view.getUint32(central,true),0x02014b50);
 assert.throws(()=>createZip([{name:'../escape',data:''}]));
});

test('runtime manifest covers every source module and both exported entry points',()=>{
 const root=new URL('../',import.meta.url),manifest=JSON.parse(readFileSync(new URL('runtime-files.json',root),'utf8'));
 const walk=dir=>readdirSync(new URL(dir+'/',root),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(dir+'/'+entry.name):entry.name.endsWith('.js')?[dir+'/'+entry.name]:[]);
 for(const file of walk('js'))assert.ok(manifest.files.includes(file),file);
 assert.ok(manifest.files.includes('index.html'));assert.ok(manifest.files.includes('css/studio-polish.css'));assert.ok(manifest.files.includes('js/game-build-player.js'));
});
