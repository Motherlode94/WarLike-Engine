import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompanyScene} from '../js/core/company-scene.js';
import {makeCompanySquad,companyUnitTypes} from '../js/core/company-units.js';
import {resetCompany,companyMatch as match,tickCompany,commandCompany,companyCoverProtection,queueCompanyUnit,reinforceCompany,repairCompany,selectCompanySquad} from '../js/core/company-runtime.js';
import {moveCompanyCamera} from '../js/core/company-camera.js';
import {healthOf} from '../js/core/ai-perception.js';
import {setHealth} from '../js/core/gameplay-components.js';
import {get3dAsset} from '../js/assets/catalog-3d.js';
import {prepareGameDefinition,gameRuntimeModels} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
import {createGenreScene} from '../js/core/genre-templates.js';
import {genreCompatible} from '../js/core/game-genres.js';

const advance=(entities,seconds)=>{for(let i=0;i<Math.ceil(seconds/.1);i++)tickCompany(entities,.1)};
function fixture(role='rifle',enemyRole='rifle'){
 const full=createCompanyScene(),base=structuredClone(full.entities.find(o=>o.company)),opponent=structuredClone(full.entities.find(o=>o.companyBase?.team===2));
 base.id=1000;opponent.id=1001;base.collision3d=opponent.collision3d=false;
 const allies=makeCompanySquad(role,1,1,600,900),enemies=makeCompanySquad(enemyRole,2,11,2300,900);
 const entities=[base,opponent,...allies,...enemies];resetCompany(entities);match.aiTimer=match.trainTimer=Infinity;
 return {entities,base,opponent,allies,enemies};
}
test('Company is a separate 3D RTS template with real models and all four unit roles',()=>{
 const scene=createGenreScene('company','3d');assert.equal(genreCompatible('company','2d'),false);assert.throws(()=>createGenreScene('company','2d'));
 resetCompany(scene.entities);assert.equal(match.squads.size,10);assert.equal(match.sectors.length,5);
 assert.equal(new Set(scene.entities.map(o=>o.id)).size,scene.entities.length);
 for(const unit of scene.entities)assert.equal(get3dAsset(unit.model3dId)?.shape,'glb',unit.name);
 for(const role of Object.keys(companyUnitTypes))assert.ok(scene.entities.some(o=>o.companyUnit?.role===role));
 const data=prepareGameDefinition({...scene,mode:'3d',project:{...freshGameProject(),genre:'company'}});
 assert.equal(gameRuntimeModels(data).some(o=>o.id==='quaternius-animatedtanks-tank'),true);
 assert.equal(data.project.scenes[0].entities.find(o=>o.company).cameraRig.mode,'orbit');
});
test('selection and orders control complete friendly squads without granting control of enemies',()=>{
 const {entities,allies,enemies}=fixture(),ids=selectCompanySquad(entities,1);assert.equal(ids.length,3);
 assert.deepEqual(selectCompanySquad(entities,11,{selected:ids}),ids);
 assert.equal(commandCompany(entities,enemies.map(o=>o.id),'move',{x:0,y:0}),0);
 const before=allies[0].x;assert.equal(commandCompany(entities,ids,'move',{x:1100,y:900}),1);advance(entities,2);
 assert.ok(allies[0].x>before+40);
 assert.equal(commandCompany(entities,ids,'attack',allies[1].id),0);
 assert.equal(commandCompany(entities,ids,'move',{x:NaN,y:2}),0);
});
test('directional cover protects the front and can be bypassed by flanking',()=>{
 const {allies,enemies}=fixture();const defender=allies[0],attacker=enemies[0];defender.x=600;defender.y=900;attacker.x=1000;attacker.y=900;
 const cover={x:720,y:900,w:100,depth3d:45,companyCover:{radius:180,protection:.55}};
 assert.equal(companyCoverProtection(attacker,defender,[cover]),.55);
 attacker.x=300;assert.equal(companyCoverProtection(attacker,defender,[cover]),0);
});
test('moving squads cross friendly infantry without becoming trapped behind their own line',()=>{
 const {entities,allies}=fixture();
 const screen=makeCompanySquad('mg',1,40,600,1100);entities.push(...screen);resetCompany(entities);match.aiTimer=match.trainTimer=Infinity;
 commandCompany(entities,allies.map(o=>o.id),'move',{x:720,y:1500});advance(entities,9);
 assert.ok(allies.every(o=>o.y>1400),'all members must cross the stationary allied screen');
 assert.equal(screen[0].y,1100,'stationary allies keep their order');
});
test('the complete starting squad clears sector cover and reaches the munitions objective',()=>{
 const {entities}=createCompanyScene();resetCompany(entities);match.aiTimer=match.trainTimer=Infinity;
 const members=entities.filter(o=>o.companyUnit?.squadId===18);
 commandCompany(entities,members.map(o=>o.id),'move',{x:900,y:1430});advance(entities,22);
 assert.ok(members.every(o=>Math.hypot(o.x+o.w/2-900,o.y+o.depth3d/2-1430)<150),'each soldier clears the solid cover');
 assert.equal(match.sectors.find(o=>o.id==='M').owner,1);
});
test('sustained machine-gun fire suppresses infantry and slows its movement',()=>{
 const {entities,allies,enemies}=fixture('mg');for(const [i,unit] of enemies.entries()){unit.x=1000+i*120;unit.y=900}
 for(const unit of allies)unit.companyUnit.cooldown=0;
 advance(entities,4);
 assert.ok(enemies.some(o=>o.companyUnit.suppression>=.6));
 assert.ok(enemies.some(o=>o.tacticalUnit.speed<companyUnitTypes.rifle.speed));
 assert.ok(enemies.some(o=>healthOf(o)<100));
});
test('retreat cannot be overwritten, ends at the HQ, and surviving squads can reinforce',()=>{
 const {entities,allies,base}=fixture(),ids=allies.map(o=>o.id);
 assert.equal(commandCompany(entities,ids,'retreat'),1);assert.equal(commandCompany(entities,ids,'move',{x:2000,y:0}),0);
 for(const [i,unit] of allies.entries()){unit.x=base.x+base.w/2+i*120;unit.y=base.y+base.depth3d/2+320}
 tickCompany(entities,.1);assert.equal(match.squads.get(1).retreating,false);
 setHealth(allies[2],0);tickCompany(entities,.1);const resources=match.resources[1].manpower;
 assert.equal(reinforceCompany(entities,ids),1);assert.equal(match.resources[1].manpower,resources-25);assert.equal(healthOf(allies[2]),100);
 allies.forEach(o=>setHealth(o,0));assert.equal(reinforceCompany(entities,ids),0);
});
test('recruitment charges resources once, deploys actual members and rejects unaffordable armor',()=>{
 const {entities}=fixture(),before=entities.length,money=match.resources[1].manpower;
 assert.equal(queueCompanyUnit(entities,'rifle'),true);assert.equal(match.resources[1].manpower,money-180);
 assert.equal(queueCompanyUnit(entities,'tank'),false);advance(entities,9);
 assert.equal(entities.length,before+3);assert.equal(match.queues[1].length,0);
 const ids=entities.map(o=>o.id);assert.equal(new Set(ids).size,ids.length);
});
test('isolated resource sectors stop generating supplies until linked to their HQ',()=>{
 const {entities}=fixture();for(const unit of entities.filter(o=>o.companyUnit)){unit.x=1500;unit.y=1800}
 match.sectors=[{id:'A',x:700,y:200,kind:'victory',owner:1,progress:1,links:['base1']},{id:'F',x:1000,y:200,kind:'fuel',owner:1,progress:1,links:['A']}];
 const start=match.resources[1].fuel;advance(entities,2);assert.ok(match.resources[1].fuel>start);assert.equal(match.sectors[1].connected,true);
 match.sectors[0].owner=2;match.sectors[0].progress=-1;const isolated=match.resources[1].fuel;advance(entities,2);assert.equal(match.resources[1].fuel,isolated);assert.equal(match.sectors[1].connected,false);
});
test('contested sectors stall captures and majority control determines the winner',()=>{
 const {entities,allies,enemies}=fixture();match.sectors=[{id:'B',x:1200,y:900,kind:'victory',owner:0,progress:0,links:['base1','base2']}];
 for(const unit of [...allies,...enemies]){unit.x=1150;unit.y=880;unit.companyUnit.cooldown=100}
 advance(entities,1);assert.equal(match.sectors[0].contested,true);assert.equal(match.sectors[0].progress,0);
 enemies.forEach(o=>{o.x=2500});advance(entities,9);assert.equal(match.sectors[0].owner,1);
 match.points[2]=.01;tickCompany(entities,.1);assert.equal(match.winner,1);const elapsed=match.elapsed;tickCompany(entities,.1);assert.equal(match.elapsed,elapsed);
});
test('tactical pause freezes combat, recruitment and income while accepting prepared orders',()=>{
 const {entities,allies}=fixture();queueCompanyUnit(entities,'rifle');match.paused=true;const before=JSON.stringify({time:match.elapsed,resources:match.resources,queue:match.queues});
 advance(entities,3);assert.equal(JSON.stringify({time:match.elapsed,resources:match.resources,queue:match.queues}),before);
 assert.equal(commandCompany(entities,allies.map(o=>o.id),'move',{x:1200,y:900}),1);match.paused=false;tickCompany(entities,.1);assert.ok(match.elapsed>0);
});
test('engineers repair only nearby friendly armor and pay the ammunition cost',()=>{
 const {entities,allies}=fixture('engineer'),tank=makeCompanySquad('tank',1,40,700,900)[0];entities.push(tank);resetCompany(entities);match.aiTimer=match.trainTimer=Infinity;setHealth(tank,200);
 const before=match.resources[1].munitions;assert.equal(repairCompany(entities,allies.map(o=>o.id)),true);assert.equal(healthOf(tank),260);assert.equal(match.resources[1].munitions,before-10);
 tank.team=2;assert.equal(repairCompany(entities,allies.map(o=>o.id)),false);
});
test('camera movement is bounded and independent from unit locomotion',()=>{
 const bounds={minX:0,maxX:3200,minY:0,maxY:1900},initial=[10,0,10];const moved=moveCompanyCamera(initial,0,new Set(['arrowright']),.1,bounds);assert.ok(moved[0]>10);assert.deepEqual(initial,[10,0,10]);
 const atEdge=moveCompanyCamera([50,0,10],0,new Set(['arrowright']),.1,bounds);assert.equal(atEdge[0],50);
});
