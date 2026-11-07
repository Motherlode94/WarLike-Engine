import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenreScene} from '../js/core/genre-templates.js';
import {compatibleGenres,resolveGameGenre} from '../js/core/game-genres.js';
import {freshGameProject,restoreGameProject} from '../js/core/game-project.js';
import {resetSequences,updateSequences,sequenceRuntime} from '../js/core/logic-sequences.js';
import {gameSession} from '../js/core/game-session.js';
import {adventureTarget} from '../js/core/adventure-runtime.js';
import {interactionCenter} from '../js/core/interaction-range.js';
import {colliderRect2d,solidCollider2d,moveBody2d} from '../js/core/physics-2d.js';
import {collisionBox3d,solidBody3d,boxesOverlap3d,moveBody3d} from '../js/core/collision-3d.js';
import {inspectBlueprintGame} from '../js/core/blueprint-validation.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {getAsset} from '../js/assets/catalog.js';
import {get3dAsset} from '../js/assets/catalog-3d.js';
import {updateRtsOrders,orderRtsMove} from '../js/core/rts-orders.js';
import {resetDriving3d,updateDriving3d,driving3d,isDriveable3d} from '../js/core/vehicle-3d.js';

function boot(genre,mode){
 restoreGameProject({id:'starter-check',genre});resetSequences();const scene=createGenreScene(genre,mode),p=scene.entities.find(o=>o.id===scene.selected[0]);
 const tick=(keys=[])=>updateSequences(1/60,{playing:true,mode,player:p,entities:scene.entities,keys:new Set(keys)});
 tick();return {scene,p,tick,mode,find:name=>scene.entities.find(o=>o.name===name)};
}
function standable(f,probe){
 const others=f.scene.entities.filter(o=>o!==f.p);
 if(f.mode==='3d')return !others.some(o=>solidBody3d(o)&&boxesOverlap3d(collisionBox3d(probe),collisionBox3d(o)));
 const a=colliderRect2d(probe);return !others.some(o=>{if(!solidCollider2d(o))return false;const b=colliderRect2d(o);return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y});
}
// Search only the walking directions, then replay the path through the real
// collision solvers. The player is never teleported to an interaction.
function walkTo(f,name){
 const target=f.find(name);assert.ok(target,name);const from=interactionCenter(f.p,f.mode),step=24,queue=[[0,0]],parents=new Map([['0,0',null]]);let found=null;
 for(let index=0;index<queue.length&&index<10000;index++){
  const [gx,gy]=queue[index],x=from.x+gx*step,y=from.y+gy*step,probe={...f.p,x:x-f.p.w/2,y:y-(f.mode==='3d'?f.p.depth3d:f.p.h)/2};
  const actors=[probe,...f.scene.entities.filter(o=>o!==f.p)];
  if(adventureTarget(probe,actors,{mode:f.mode})===target){found=[gx,gy];break}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=gx+dx,ny=gy+dy,key=nx+','+ny,px=from.x+nx*step,py=from.y+ny*step;
   if(parents.has(key)||px<0||px>1340||py<0||py>840)continue;
   if(!standable(f,{...probe,x:probe.x+dx*step,y:probe.y+dy*step}))continue;
   parents.set(key,[gx,gy]);queue.push([nx,ny]);
  }
 }
 assert.ok(found,`${f.mode}: no walking route to ${name}`);
 const route=[];for(let node=found;node;node=parents.get(node.join(',')))route.unshift(node);
 for(const [gx,gy] of route){const x=from.x+gx*step,y=from.y+gy*step;
  for(let i=0;i<80;i++){const at=interactionCenter(f.p,f.mode),dx=x-at.x,dy=y-at.y,len=Math.hypot(dx,dy);if(len<.01)break;const amount=Math.min(len,190/60);if(f.mode==='3d')moveBody3d(f.p,dx/len*amount,dy/len*amount,0,f.scene.entities);else moveBody2d(f.p,dx/len*amount,dy/len*amount,f.scene.entities);f.tick()}
  const at=interactionCenter(f.p,f.mode);assert.ok(Math.hypot(x-at.x,y-at.y)<.1,'Walking collided along planned route');
 }
 assert.equal(adventureTarget(f.p,f.scene.entities,{mode:f.mode}),target);f.tick(['e']);f.tick();
}
for(const mode of ['2d','3d']){
 test(`${mode}: every compatible starter has valid Blueprints and exports with its own genre`,()=>{
  for(const [genre] of compatibleGenres(mode)){const scene=createGenreScene(genre,mode),project={...freshGameProject(),...scene.game,id:'starter-check',genre};assert.deepEqual(inspectBlueprintGame(scene.entities,{project,requirePlayer:false}).filter(x=>x.severity==='error'),[],genre);assert.doesNotThrow(()=>prepareGameDefinition({...scene,mode,project}),genre)}
 });
 test(`${mode}: RP, simulation, RPG, delivery, horror and 4X have complete walkable mission routes`,()=>{
  const routes={rp:['Citoyen','Travail','Boutique'],simulation:['Machine de production','Commande client','Maintenance'],rpg:['Donneur de quête','Ruines','Donneur de quête'],openworld:['Citoyen','Livraison'],horror:['Generatrice','Evacuation'],fourx:['Explorer','Coloniser','Camp ennemi']};
  for(const [genre,route] of Object.entries(routes)){const f=boot(genre,mode);for(const name of route)walkTo(f,name);for(let i=0;i<30;i++)f.tick();assert.equal(gameSession.phase,'won',genre);assert.deepEqual(sequenceRuntime.errors,[],genre);assert.equal(resolveGameGenre(undefined,f.scene.entities),genre)}
 });
 test(`${mode}: quest rewards and purchases enforce their prerequisites and inventory capacity`,()=>{
  let f=boot('rpg',mode);walkTo(f,'Ruines');assert.equal(sequenceRuntime.globals.questCompleted,0);assert.equal(sequenceRuntime.globals.experience,0);
  sequenceRuntime.globals.gold=0;walkTo(f,'Marchand');assert.equal(sequenceRuntime.globals.gold,0);assert.equal(f.p.inventory.items.length,0);
  sequenceRuntime.globals.gold=100;f.p.inventory.items=Array.from({length:16},(_,i)=>({id:'full'+i,count:1}));walkTo(f,'Marchand');assert.equal(sequenceRuntime.globals.gold,100);
  f=boot('simulation',mode);walkTo(f,'Commande client');assert.equal(sequenceRuntime.globals.money,100);assert.equal(sequenceRuntime.globals.materials,5);
  f=boot('horror',mode);walkTo(f,'Evacuation');assert.equal(sequenceRuntime.globals.escaped,0);assert.equal(gameSession.phase,'playing');
 });
 test(`${mode}: RTS requires a commanded squad at the objective, rather than the commander's proximity`,()=>{
  const f=boot('rts',mode);walkTo(f,'Mine');const target=f.find('Capture'),unit=f.find('Escouade A');
  // A regular RTS move order drives the squad through the scene's obstacles.
  assert.equal(orderRtsMove(f.scene.entities,[unit.id],{x:target.x+30,y:target.y+30}),1);
  for(let i=0;i<1800&&gameSession.phase==='playing';i++){updateRtsOrders(f.scene.entities,1/60,true,{mode});f.tick()}
  assert.equal(gameSession.phase,'won');assert.equal(sequenceRuntime.globals.outpostCaptured,1);
 });
 test(`${mode}: departure, terrain and mission props are concrete scene assets`,()=>{
  for(const genre of ['rp','rpg','simulation','openworld','horror','fourx','rts','tactical','fieldlab']){
   const f=boot(genre,mode);assert.ok(standable(f,f.p),'blocked departure '+genre);assert.ok(f.scene.entities.some(o=>o.hierarchyGroup==='Terrain'));assert.ok(f.scene.entities.some(o=>o.hierarchyGroup==='Limites'));
   for(const o of f.scene.entities)if(o.assetId)assert.ok(mode==='3d'?get3dAsset(o.model3dId||o.assetId):getAsset(o.assetId),o.assetId);
  }
  const f=boot('openworld',mode),car=f.find('Jeep');assert.equal(mode==='3d'?isDriveable3d(car):getAsset(car.assetId)?.category==='Vehicles',true);
 });
}
test('3D vehicle entry retains E taps received between simulation frames',()=>{
 resetDriving3d();const p={id:1,x:100,y:100,w:35,h:90,depth3d:32,elevation3d:0},car={id:2,x:150,y:110,w:130,h:65,depth3d:75,tags:['race-vehicle'],collision3d:true};
 assert.equal(updateDriving3d([p,car],p,new Set(),1/60,{pressedKeys:new Set(['e'])}),true);assert.equal(driving3d.vehicleId,car.id);
 updateDriving3d([p,car],p,new Set(),1/60);updateDriving3d([p,car],p,new Set(),1/60,{pressedKeys:new Set(['e'])});assert.equal(driving3d.vehicleId,null);
});
