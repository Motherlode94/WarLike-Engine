import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSuperhero,attachHero,ensureHeroState,castHeroPower,tickHeroRuntime,resetHeroRuntime,heroRuntime} from '../js/core/superhero-runtime.js';
import {defaultStats,damage,updateController3d} from '../js/core/gameplay-components.js';
import {heroCenter,moveHero3d,stepHeroFlight} from '../js/core/hero-movement.js';
import {defaultRpgProgression,awardExperience,upgradeHeroSkill,progressionDamageScale} from '../js/core/rpg-progression.js';
import {defaultSimulationNode,updateSimulationNetworks,damageSimulationNode,interactSimulationNode} from '../js/core/simulation-nodes.js';
import {fxRuntime,resetFxRuntime,emitFx,tickFxRuntime,setFxQuality,defaultFxEmitter} from '../js/core/fx-runtime.js';
import {defaultTacticalUnit,orderRtsMove,orderRtsGroup,updateRtsOrders,isRtsUnit} from '../js/core/rts-orders.js';
import {createHeroForgeScene} from '../js/core/hero-forge-scene.js';
import {createGenreScene} from '../js/core/genre-templates.js';
import {inspectBlueprintGame} from '../js/core/blueprint-validation.js';
import {newSequence,resetSequences,updateSequences,conditionPass} from '../js/core/logic-sequences.js';
import {captureGameSave} from '../js/core/game-session.js';
const box=(id,x=0,y=0,extra={})=>({id,name:'Entity '+id,type:'object',x,y,w:20,h:20,depth3d:20,...extra});
const hero=(extra={})=>attachHero(box(1,0,0,{type:'player',team:1,stats:defaultStats(),...extra}));
const foe=(id=2,x=100,y=0)=>box(id,x,y,{type:'character',team:2,stats:defaultStats(),ai:{enabled:true}});
const tick=(entities,p,dt=.1,extra={})=>tickHeroRuntime(entities,p,dt,{mode:'2d',keys:new Set(),...extra});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-4,`${a} != ${b}`);
test('six powers spend energy, enforce cooldowns and reject inherited object keys',()=>{
 resetHeroRuntime();const p=hero(),entities=[p];ensureHeroState(p);const before=p.heroState.energy;assert.equal(castHeroPower(p,'shield',{entities}).ok,true);assert.equal(p.heroState.energy,before-25);assert.equal(castHeroPower(p,'shield',{entities}).ok,false);assert.equal(castHeroPower(p,'__proto__',{entities}).ok,false);assert.equal(castHeroPower(p,'constructor',{entities}).ok,false);p.heroState.energy=0;assert.equal(castHeroPower(p,'nova',{entities}).ok,false);assert.ok(Number.isFinite(p.heroState.energy));
});
test('shield absorbs actual incoming damage then expires; guard skills reduce remaining damage',()=>{
 resetHeroRuntime();const p=hero();castHeroPower(p,'shield',{entities:[p]});damage(p,70);near(p.stats.health,100);near(p.heroState.shield,30);damage(p,50);near(p.stats.health,80);near(p.heroState.shield,0);p.rpgProgression.skills.guard=5;damage(p,10);near(p.stats.health,72);
 p.heroState.shield=50;p.heroState.shieldTime=.1;tick([p],p,.1);assert.equal(p.heroState.shield,0);
});
test('energy bolts hit enemies, reward progression once and stop at a thin solid wall',()=>{
 resetHeroRuntime();const p=hero(),e=foe();e.stats.health=10;castHeroPower(p,'bolt',{entities:[p,e],mode:'2d'});for(let i=0;i<5;i++)tick([p,e],p);assert.equal(e.stats.health,0);assert.equal(p.rpgProgression.experience,50);assert.equal(heroRuntime.bolts.length,0);
 resetHeroRuntime();const a=hero(),b=foe(),wall=box(3,40,-10,{w:1,h:80});castHeroPower(a,'bolt',{entities:[a,b,wall],mode:'2d'});for(let i=0;i<8;i++)tick([a,b,wall],a);assert.equal(b.stats.health,100);assert.equal(heroRuntime.bolts.length,0);
});
test('nova affects hostile actors and destructible nodes while protecting teammates',()=>{
 resetHeroRuntime();const p=hero(),enemy=foe(2,50),ally=foe(3,40),crate=box(4,30,30,{simulationNode:{...defaultSimulationNode(),health:20,maxHealth:20}});ally.team=1;castHeroPower(p,'nova',{entities:[p,enemy,ally,crate],mode:'2d'});assert.ok(enemy.stats.health<100);assert.equal(ally.stats.health,100);assert.equal(crate.visible,false);assert.equal(crate.collision3d,false);assert.equal(p.heroState.materials,7);assert.ok(fxRuntime.rings.length>0);
});
test('ruée and flight obey thin 3D walls, ceilings and the world floor',()=>{
 resetHeroRuntime();const p=hero({type:'mesh3d',elevation3d:0}),wall=box(2,80,-20,{w:1,h:200,depth3d:80});castHeroPower(p,'dash',{entities:[p,wall],mode:'3d',yaw:-Math.PI/2});assert.ok(p.x+p.w<=80.001);const before=p.x;p.heroState.flight=true;updateController3d(p,new Set(['w']),.1,-Math.PI/2,[p,wall]);assert.ok(p.x>=before&&p.x+p.w<=80.001);
 const ceiling=box(3,-100,-100,{w:400,depth3d:400,h:20,elevation3d:1});for(let i=0;i<20;i++)stepHeroFlight(p,new Set([' ']),.1,[p,ceiling],'3d',0);assert.ok(p.elevation3d+p.h/64<=1.001);moveHero3d(p,0,0,-1000,[p]);assert.equal(p.elevation3d,0);
});
test('flight drains energy, stops when empty, and a charging station adds measurable regeneration',()=>{
 resetHeroRuntime();const p=hero();ensureHeroState(p);p.heroState.energy=20;castHeroPower(p,'flight',{entities:[p]});for(let i=0;i<20;i++)tick([p],p);assert.equal(p.heroState.flight,false);assert.ok(p.heroState.energy>=0);
 const gen=box(2,50,0,{simulationNode:{...defaultSimulationNode(),kind:'generator'}}),station=box(3,50,0,{simulationNode:{...defaultSimulationNode(),kind:'consumer',demand:2}});p.heroState.energy=0;tick([p,gen,station],p);near(p.heroState.energy,(p.superhero.energyRegen+8)*.1);
});
test('keyboard edges cast once, dialogues block powers and scene replacement clears old projectiles',()=>{
 resetHeroRuntime();const p=hero();tick([p],p,.1,{keys:new Set(['1'])});assert.equal(heroRuntime.casts,1);tick([p],p,.1,{keys:new Set(['1'])});assert.equal(heroRuntime.casts,1);tick([p],p,.1,{keys:new Set(['2']),inputBlocked:true});assert.equal(heroRuntime.casts,1);
 assert.ok(heroRuntime.bolts.length>0);const next=hero();tick([next],next,.1,{sceneId:'next'});assert.equal(heroRuntime.bolts.length,0);
});
test('ralliement heals and shields allied units, applies a temporary buff and gives a follow order',()=>{
 resetHeroRuntime();const p=hero(),a=box(2,50,0,{team:1,stats:{...defaultStats(),health:30},tacticalUnit:defaultTacticalUnit()}),enemy=foe(3,50);castHeroPower(p,'rally',{entities:[p,a,enemy],mode:'2d'});assert.equal(a.stats.health,55);assert.equal(a.heroState.shield,20);assert.deepEqual(a.rtsOrder,{type:'follow',targetId:1});assert.equal(enemy.stats.health,100);for(let i=0;i<70;i++)tick([p,a,enemy],p);assert.equal(a.heroState.commandTime,0);assert.equal(a.heroState.shield,0);
});
test('RPG levels award real skill points, health and distinct combat/defence/command ranks',()=>{
 const p=hero();assert.equal(awardExperience(p,350),2);assert.equal(p.rpgProgression.level,3);assert.equal(p.rpgProgression.experience,50);assert.equal(p.stats.maxHealth,120);const before=progressionDamageScale(p);assert.equal(upgradeHeroSkill(p,'power'),true);assert.ok(progressionDamageScale(p)>before);assert.equal(upgradeHeroSkill(p,'guard'),true);assert.equal(upgradeHeroSkill(p,'command'),false);assert.equal(upgradeHeroSkill(p,'__proto__'),false);
});
test('simulation energy networks allocate capacity by priority and react to damaged generators',()=>{
 const generator=box(1,0,0,{simulationNode:{...defaultSimulationNode(),kind:'generator',output:10,health:50}}),a=box(2,0,0,{simulationNode:{...defaultSimulationNode(),kind:'consumer',demand:4,priority:2}}),b=box(3,0,0,{simulationNode:{...defaultSimulationNode(),kind:'consumer',demand:4,priority:1}});let nets=updateSimulationNetworks([generator,a,b]);assert.equal(nets.get('city').capacity,5);assert.equal(a.simulationNode.powered,true);assert.equal(b.simulationNode.powered,false);generator.simulationNode.health=100;updateSimulationNetworks([generator,a,b]);assert.equal(b.simulationNode.powered,true);generator.simulationNode.enabled=false;updateSimulationNetworks([generator,a,b]);assert.equal(a.simulationNode.powered,false);
});
test('civilian rescue grants XP/reputation once; repairs consume materials and cannot farm destruction rewards',()=>{
 const p=hero(),civilian=box(2,30,0,{simulationNode:{...defaultSimulationNode(),kind:'civilian'}});assert.equal(interactSimulationNode(p,civilian).ok,true);assert.equal(p.heroState.rescues,1);assert.equal(p.rpgProgression.experience,40);assert.equal(interactSimulationNode(p,civilian).ok,false);assert.equal(p.heroState.reputation,2);
 const crate=box(3,40,0,{simulationNode:{...defaultSimulationNode(),health:10,maxHealth:10}});ensureHeroState(p);const initial=p.heroState.materials;damageSimulationNode(crate,20,p);const gained=p.heroState.materials;assert.equal(gained,initial+3);assert.equal(interactSimulationNode(p,crate).ok,true);assert.equal(crate.visible,true);assert.equal(p.heroState.materials,gained-2);damageSimulationNode(crate,20,p);assert.equal(p.heroState.materials,gained-2);
});
test('RTS attack and follow orders respect factions, disabled units and real damage cooldowns',()=>{
 resetFxRuntime();const a=box(1,0,0,{team:1,tacticalUnit:defaultTacticalUnit(),stats:defaultStats()}),b=foe(2,60),friend=box(3,90,0,{team:1,stats:defaultStats()});assert.equal(orderRtsGroup([a,b,friend],[1],'attack',friend.id),0);assert.equal(orderRtsGroup([a,b,friend],[1],'attack',b.id),1);updateRtsOrders([a,b,friend],.1,true);assert.equal(b.stats.health,91);updateRtsOrders([a,b,friend],.1,true);assert.equal(b.stats.health,91);assert.equal(orderRtsGroup([a,b,friend],[1],'follow',friend.id),1);assert.equal(a.rtsOrder.targetId,3);a.tags=['rts-unit'];a.tacticalUnit.enabled=false;assert.equal(isRtsUnit(a),false);
});
test('RTS move orders navigate around collider obstacles instead of passing through them',()=>{
 const a=box(1,0,0,{w:10,h:10,team:1,tags:['rts-unit'],rtsSpeed:100}),wall=box(2,60,-20,{w:10,h:70});orderRtsMove([a,wall],[1],{x:185,y:5});for(let i=0;i<160;i++){updateRtsOrders([a,wall],.1,true);assert.ok(!(a.x<70&&a.x+10>60&&a.y<50&&a.y+10>-20))}assert.ok(Math.hypot(a.x-180,a.y)<12);
});
test('FX are bounded, finite, expire and powered emitters react to their simulation node',()=>{
 resetFxRuntime();setFxQuality('low');for(let i=0;i<20;i++)emitFx('electric',{x:0,y:0,z:0},{count:200,mode:'3d'});assert.ok(fxRuntime.particles.length<=280);for(const p of fxRuntime.particles)assert.ok([p.x,p.y,p.z,p.vx,p.vy,p.vz].every(Number.isFinite));for(let i=0;i<90;i++)tickFxRuntime([],.1,'3d');assert.equal(fxRuntime.particles.length,0);
 const e=box(1,0,0,{fxEmitter:{...defaultFxEmitter(),rate:60},simulationNode:{...defaultSimulationNode(),kind:'consumer',powered:false}});tickFxRuntime([e],.1);assert.equal(fxRuntime.particles.length,0);e.simulationNode.powered=true;tickFxRuntime([e],.1);assert.ok(fxRuntime.particles.length>0);setFxQuality('standard');
});
test('Blueprint can grant XP, cast powers, emit FX and evaluate progression/world conditions',()=>{
 resetSequences();resetHeroRuntime();const p=hero(),owner=box(10,0,0,{sequence:{...newSequence(),event:'start',instructions:[{type:'giveExperience',targetRole:'player',value:120},{type:'upgradeHeroSkill',targetRole:'player',value:'power'},{type:'castHeroPower',targetRole:'player',value:'shield'},{type:'restoreHeroEnergy',targetRole:'player',value:30},{type:'emitFx',value:'heal'}]}});updateSequences(.1,{playing:true,mode:'2d',entities:[p,owner],player:p,keys:new Set()});assert.equal(p.rpgProgression.level,2);assert.equal(p.rpgProgression.skills.power,1);assert.ok(p.heroState.shield>0);assert.equal(p.heroState.energy,p.superhero.maxEnergy);assert.ok(fxRuntime.particles.length>0);assert.equal(conditionPass({type:'rpgLevelAtLeast',targetRole:'player',value:2},owner,{player:p,entities:[p,owner]}),true);assert.equal(conditionPass({type:'heroPowerReady',targetRole:'player',value:'shield'},owner,{player:p,entities:[p,owner]}),false);
});
test('Hero Forge scenes contain actual assets, three mission goals and reusable components in both modes',()=>{
 for(const mode of ['2d','3d']){const s=createHeroForgeScene(mode),p=s.entities.find(e=>e.id===s.heroId);assert.ok(p.superhero);assert.ok(p.rpgProgression);assert.equal(s.entities.filter(e=>e.tacticalUnit).length,2);assert.equal(s.entities.filter(e=>e.simulationNode?.kind==='civilian').length,1);assert.equal(new Set(s.entities.map(e=>e.id)).size,s.entities.length);assert.deepEqual(inspectBlueprintGame(s.entities).filter(i=>i.severity==='error'),[]);assert.ok(createGenreScene('superhero',mode).entities.length>10)}assert.throws(()=>createHeroForgeScene('bad'));
});
test('game snapshots preserve powers, progression, repairs, squad orders and consumed energy',()=>{
 resetSequences();const p=hero();ensureHeroState(p);p.heroState.energy=42;p.rpgProgression.skills.guard=2;const node=box(2,30,0,{simulationNode:{...defaultSimulationNode(),kind:'civilian',rescued:true},rtsOrder:{type:'follow',targetId:1}});const save=captureGameSave({entities:[p,node],globals:{},fired:[]});const restored=JSON.parse(JSON.stringify(save));assert.equal(restored.entities[0].heroState.energy,42);assert.equal(restored.entities[0].rpgProgression.skills.guard,2);assert.equal(restored.entities[1].simulationNode.rescued,true);assert.equal(restored.entities[1].rtsOrder.targetId,1);
});

test('brief buffered key presses are consumed even after key-up and non-hero simulation/RPG remain usable',()=>{
 resetHeroRuntime();const p=hero();tick([p],p,.1,{keys:new Set(),pressedKeys:new Set(['4'])});assert.ok(p.heroState.shield>0);
 const worker=box(1,0,0,{type:'player',rpgProgression:defaultRpgProgression()}),civilian=box(2,30,0,{simulationNode:{...defaultSimulationNode(),kind:'civilian'}});resetHeroRuntime();tick([worker,civilian],worker,.1,{keys:new Set(),pressedKeys:new Set(['e'])});assert.equal(civilian.simulationNode.rescued,true);assert.equal(worker.rpgProgression.experience,40);assert.equal(worker.superhero,undefined);
});
test('ordinary action attacks can destroy simulation props and collect resources without hero powers',()=>{
 const worker=box(1,0,0,{type:'player',rpgProgression:defaultRpgProgression()}),crate=box(2,30,0,{simulationNode:{...defaultSimulationNode(),health:5,maxHealth:5}});resetSequences();const source=box(10,0,0,{sequence:{...newSequence(),event:'start',instructions:[{type:'damageObject',targetId:crate.id,value:10}]}});updateSequences(.1,{mode:'2d',playing:true,entities:[worker,crate,source],player:worker,keys:new Set()});assert.equal(crate.visible,false);assert.equal(worker.heroState.materials,3);assert.equal(worker.rpgProgression.experience,20);
});
test('3D ray picking selects an actor in front of a large ground tile, rather than its projected bounding circle',async()=>{
 const {pickEntity3d,sceneCamera3d,project3d,objectBounds3d}=await import('../js/core/viewport-3d.js');
 const ground=box(1,-1000,-1000,{type:'mesh3d',w:2000,h:3,depth3d:2000,elevation3d:-.05}),actor=box(2,0,0,{type:'mesh3d',w:64,h:128,depth3d:48,elevation3d:0});const b=objectBounds3d(actor),cam=sceneCamera3d([b.x,b.y,b.z],0,.5,8),point=project3d([b.x,b.y,b.z],cam,1000,700);assert.equal(pickEntity3d([ground,actor],{x:point.x,y:point.y,w:1000,h:700},cam)?.id,2);actor.editorHidden=true;assert.notEqual(pickEntity3d([ground,actor],{x:point.x,y:point.y,w:1000,h:700},cam)?.id,2);
});
