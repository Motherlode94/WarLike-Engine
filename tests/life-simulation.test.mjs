import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGenreScene} from '../js/core/genre-templates.js';
import {genreCompatible,resolveGameGenre} from '../js/core/game-genres.js';
import {lifeTownSprites} from '../js/assets/life-sprites-2d.js';
import {lifeActor,ensureLifeState,relationship,requestLifeSocial,requestLifeActivity,walkLifeTo,tickLifeSimulation,cancelLifeTask} from '../js/core/life-simulation.js';
import {gameProject,freshGameProject} from '../js/core/game-project.js';
import {gameSession,resetGameSession,captureGameSave,validateGameSave,applySessionChange} from '../js/core/game-session.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {colliderRect2d} from '../js/core/physics-2d.js';
const advance=(entities,actor,seconds,options={})=>{for(let i=0;i<Math.ceil(seconds/.05);i++)tickLifeSimulation(entities,actor,.05,options)};
function fixture(){const scene=createGenreScene('lifesim','2d'),entities=scene.entities,actor=lifeActor(entities),npc=entities.find(o=>o.lifeNpc?.likes==='art');actor.x=npc.x-40;actor.y=npc.y;return {scene,entities,actor,npc,s:ensureLifeState(actor)};}
const talk=(f,action,options)=>{assert.equal(requestLifeSocial(f.actor,f.entities,f.npc.id,action,options),true);advance(f.entities,f.actor,5)};

test('life simulation is a separate 2D template with four neighbours and bundled Kenney art',()=>{
 const f=fixture();assert.equal(genreCompatible('lifesim','3d'),false);assert.throws(()=>createGenreScene('lifesim','3d'));
 assert.equal(f.entities.filter(o=>o.lifeNpc).length,4);assert.equal(f.entities.filter(o=>o.lifePlace).length,4);
 assert.equal(resolveGameGenre(null,f.entities),'lifesim');assert.equal(lifeTownSprites.length,132);
 assert.ok(lifeTownSprites.every(o=>o.author==='Kenney'&&o.license==='CC0-1.0'&&o.spriteUrl.startsWith('data:image/png;base64,')));
 assert.equal(new Set(f.entities.map(o=>o.id)).size,f.entities.length);
});
test('social actions require arrival and time before changing a relationship',()=>{
 const f=fixture();f.actor.x=100;f.actor.y=460;const r=relationship(f.actor,f.npc);
 assert.equal(requestLifeSocial(f.actor,f.entities,f.npc.id,'listen'),true);advance(f.entities,f.actor,.3);
 assert.equal(r.friendship,0);assert.equal(f.s.task.phase,'walking');advance(f.entities,f.actor,8);
 assert.equal(f.s.task,null);assert.ok(r.friendship>0);assert.ok(f.s.met.includes(f.npc.id));
});
test('a favourite topic increases affinity more than an unrelated topic',()=>{
 const a=fixture();talk(a,'chat',{topic:'art'});const correct=relationship(a.actor,a.npc).friendship;
 const b=fixture();talk(b,'chat',{topic:'music'});assert.ok(correct>relationship(b.actor,b.npc).friendship);
 assert.match(a.s.speech.text,/dessine/);
});
test('repeating the same line is less effective and apologies repair lost trust',()=>{
 const f=fixture();talk(f,'listen');const r=relationship(f.actor,f.npc),before=r.friendship;
 talk(f,'listen');assert.ok(r.friendship<before);assert.match(f.s.speech.text,/déjà/);
 r.trust=-12;talk(f,'apologize');assert.ok(r.trust>-12);
});
test('romance can be refused and a relationship starts only after a reciprocal response',()=>{
 const f=fixture(),r=relationship(f.actor,f.npc);talk(f,'flirt');assert.equal(r.dating,false);assert.equal(r.affection,0);assert.ok(r.trust<0);
 r.friendship=40;r.trust=30;r.affection=24;r.lastAction='listen';talk(f,'flirt');assert.equal(r.dating,true);
 const other=fixture();other.npc=other.entities.find(o=>o.lifeNpc?.romance===false);other.actor.x=other.npc.x-30;other.actor.y=other.npc.y;
 const friends=relationship(other.actor,other.npc);friends.friendship=90;friends.trust=90;friends.affection=90;talk(other,'flirt');assert.equal(friends.dating,false);assert.match(other.s.speech.text,/reste amis/);
});
test('gifts charge once on completion and cancellation does not spend money',()=>{
 const f=fixture(),before=f.s.money;requestLifeSocial(f.actor,f.entities,f.npc.id,'gift');advance(f.entities,f.actor,.3);assert.equal(f.s.money,before);
 cancelLifeTask(f.actor);advance(f.entities,f.actor,4);assert.equal(f.s.money,before);
 talk(f,'gift');assert.equal(f.s.money,before-12);advance(f.entities,f.actor,5);assert.equal(f.s.money,before-12);
 f.s.money=0;assert.equal(requestLifeSocial(f.actor,f.entities,f.npc.id,'gift'),false);
});
test('activities restore actual needs, respect payment and cannot finish at a distance',()=>{
 const f=fixture(),place=f.entities.find(o=>o.lifePlace?.kind==='home');f.s.needs.food=20;f.actor.x=place.lifePlace.entry.x-22;f.actor.y=place.lifePlace.entry.y-26;
 const before=f.s.money;assert.equal(requestLifeActivity(f.actor,f.entities,'snack'),true);advance(f.entities,f.actor,6);
 assert.ok(f.s.needs.food>40);assert.equal(f.s.money,before-4);
 assert.equal(requestLifeActivity(f.actor,f.entities,'shower'),true);advance(f.entities,f.actor,.2);f.actor.x=1100;f.actor.y=850;const hygiene=f.s.needs.hygiene;advance(f.entities,f.actor,5);assert.ok(f.s.needs.hygiene<=hygiene);assert.equal(f.s.task,null);
});
test('work has opening hours, fatigue requirements, wages and a daily shift limit',()=>{
 const f=fixture(),place=f.entities.find(o=>o.lifePlace?.kind==='work');f.actor.x=place.lifePlace.entry.x-22;f.actor.y=place.lifePlace.entry.y-26;
 f.s.minutes=22*60;assert.equal(requestLifeActivity(f.actor,f.entities,'work'),false);
 f.s.minutes=9*60;f.s.needs.energy=2;assert.equal(requestLifeActivity(f.actor,f.entities,'work'),false);f.s.needs.energy=90;
 const start=f.s.money;for(let i=0;i<3;i++){assert.equal(requestLifeActivity(f.actor,f.entities,'work'),true);advance(f.entities,f.actor,13)}
 assert.equal(f.s.money,start+105);assert.equal(f.s.earned,105);assert.equal(f.s.skills.craft,3);assert.equal(requestLifeActivity(f.actor,f.entities,'work'),false);
});
test('an empty wallet and hunger cannot lock the player out of recovery',()=>{
 const f=fixture(),garden=f.entities.find(o=>o.lifePlace?.kind==='garden');f.s.money=0;f.s.needs.food=0;
 f.actor.x=garden.lifePlace.entry.x-22;f.actor.y=garden.lifePlace.entry.y-26;
 assert.equal(requestLifeActivity(f.actor,f.entities,'snack'),false);assert.equal(requestLifeActivity(f.actor,f.entities,'pantry'),true);advance(f.entities,f.actor,5);
 assert.ok(f.s.needs.food>20);assert.equal(f.s.money,0);assert.equal(requestLifeActivity(f.actor,f.entities,'pantry'),false);
 const work=f.entities.find(o=>o.lifePlace?.kind==='work');f.actor.x=work.lifePlace.entry.x-22;f.actor.y=work.lifePlace.entry.y-26;
 assert.equal(requestLifeActivity(f.actor,f.entities,'work'),true);advance(f.entities,f.actor,13);assert.ok(f.s.money>=35);
});
test('pause freezes needs, jobs, money, clock and positions while allowing the next order',()=>{
 const f=fixture();f.s.paused=true;const before=JSON.stringify(f.entities);advance(f.entities,f.actor,8,{keys:new Set(['d'])});assert.equal(JSON.stringify(f.entities),before);
 assert.equal(requestLifeActivity(f.actor,f.entities,'relax'),true);f.s.paused=false;advance(f.entities,f.actor,.5);assert.ok(f.s.minutes>9*60);assert.notEqual(f.actor.x,f.npc.x-40);
});
test('click navigation reaches its destination and NPC routines keep running while walking',()=>{
 const f=fixture();f.s.minutes=13*60;const oldNpcX=f.npc.x;walkLifeTo(f.actor,{x:640,y:500});advance(f.entities,f.actor,5);
 assert.equal(f.s.task,null);assert.ok(Math.hypot(f.actor.x+22-640,f.actor.y+26-500)<15);assert.notEqual(f.npc.x,oldNpcX);
});
test('manual movement cancels a queued action, obeys house colliders and stays in the map',()=>{
 const f=fixture(),house=f.entities.find(o=>o.lifePlace?.kind==='home');f.actor.x=house.x-60;f.actor.y=house.y+55;
 requestLifeActivity(f.actor,f.entities,'relax');advance(f.entities,f.actor,2,{keys:new Set(['d'])});assert.equal(f.s.task,null);
 const body=colliderRect2d(f.actor),wall=colliderRect2d(house);assert.ok(body.x+body.w<=wall.x+.01);
 f.actor.x=5000;f.actor.y=-500;advance(f.entities,f.actor,.1);assert.ok(f.actor.x<1280&&f.actor.y>=24);
});
test('night closes social interactions and a new day resets work and bounds all needs',()=>{
 const f=fixture();f.s.minutes=23*60;assert.equal(requestLifeSocial(f.actor,f.entities,f.npc.id,'listen'),false);
 f.s.minutes=1439.9;f.s.shifts=3;for(const key of Object.keys(f.s.needs))f.s.needs[key]=0;advance(f.entities,f.actor,.2);
 assert.equal(f.s.day,2);assert.equal(f.s.shifts,0);assert.ok(Object.values(f.s.needs).every(v=>v>=0&&v<=100));
});
test('saves and exported game definitions retain relationships, needs, identity and tasks',()=>{
 const f=fixture();Object.assign(gameProject,freshGameProject(),{genre:'lifesim'});resetGameSession();gameSession.currentSceneId=gameProject.activeSceneId;
 talk(f,'listen');f.actor.name='Hardi';requestLifeActivity(f.actor,f.entities,'relax');
 const ctx={entities:f.entities,globals:{},fired:new Set()},save=captureGameSave(ctx);validateGameSave(save);
 f.actor.lifeState.money=0;gameSession.pending={kind:'restore',data:save};applySessionChange(ctx);
 const restored=lifeActor(ctx.entities);assert.equal(restored.name,'Hardi');assert.equal(restored.lifeState.money,80);assert.equal(restored.lifeState.task.key,'relax');assert.equal(relationship(restored,f.npc).friendship,6);
 const build=prepareGameDefinition({entities:ctx.entities,mode:'2d',project:gameProject});assert.equal(build.project.genre,'lifesim');
 const manifest=JSON.parse(readFileSync(new URL('../runtime-files.json',import.meta.url),'utf8'));for(const file of ['js/core/life-simulation.js','js/core/life-scene.js','js/assets/life-sprites-2d.js','js/ui/life-ui.js','css/life.css'])assert.ok(manifest.files.includes(file),file);
});
