import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattlefieldScene} from '../js/core/battlefield-scene.js';
import {resetBattlefield,tickBattlefield,battlefieldMatch as match,consumeBattlefieldShot,startBattlefieldReload,isBattlefieldSoldier} from '../js/core/battlefield-runtime.js';
import {get3dAsset} from '../js/assets/catalog-3d.js';
import {updateRtsOrders} from '../js/core/rts-orders.js';
import {setHealth} from '../js/core/gameplay-components.js';
import {healthOf} from '../js/core/ai-perception.js';
import {fireVehicleWeapon,tickVehicleWeapon} from '../js/core/vehicle-weapons-3d.js';
import {canDriveVehicle} from '../js/core/vehicle-components.js';
import {prepareGameDefinition,gameRuntimeModels} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';

function setup(){const scene=createBattlefieldScene();resetBattlefield(scene.entities);return {...scene,player:scene.entities.find(o=>o.playable3d)}}
function advance(entities,seconds){for(let i=0;i<Math.ceil(seconds/.1);i++)tickBattlefield(entities,.1)}
test('Front scene uses real bundled models, FPS, two teams and armed vehicles',()=>{
 const {entities,player}=setup();assert.equal(player.cameraRig.mode,'firstPerson');
 assert.equal(entities.filter(isBattlefieldSoldier).length,12);
 for(const entity of entities)assert.equal(get3dAsset(entity.model3dId)?.shape,'glb',entity.name);
 assert.equal(entities.filter(o=>o.vehicleWeapon?.enabled).length,2);
 assert.equal(match.sectors.length,3);
 const definition=prepareGameDefinition({entities,mode:'3d',project:{...freshGameProject(),genre:'battlefield'}});
 assert.equal(definition.project.genre,'battlefield');
 assert.ok(gameRuntimeModels(definition).some(o=>o.id===player.weaponSystem.model3dId));
});
test('reload transfers finite reserve ammunition and empty or dead weapons cannot fire',()=>{
 const {entities,player}=setup();
 for(let i=0;i<30;i++)assert.equal(consumeBattlefieldShot(player),true);
 assert.equal(consumeBattlefieldShot(player),false);assert.equal(startBattlefieldReload(player),true);
 assert.equal(consumeBattlefieldShot(player),false);advance(entities,2.1);
 assert.equal(match.ammo,30);assert.equal(match.reserve,120);
 setHealth(player,0);tickBattlefield(entities,.1);assert.equal(consumeBattlefieldShot(player),false);
});
test('capture is contested, neutralizes the previous owner and drains only the losing team',()=>{
 const {entities,player}=setup(),sector=match.sectors[1],enemy=entities.find(o=>isBattlefieldSoldier(o)&&o.team===2);
 player.x=sector.x-player.w/2;player.y=sector.y-player.depth3d/2;
 enemy.x=player.x;enemy.y=player.y;advance(entities,8);
 assert.equal(sector.contested,true);assert.equal(sector.owner,0);assert.equal(match.tickets[1],80);assert.equal(match.tickets[2],80);
 enemy.x=2500;advance(entities,8);assert.equal(sector.owner,1);assert.ok(match.tickets[2]<80);assert.equal(match.tickets[1],80);
 player.x=0;enemy.x=sector.x;enemy.y=sector.y;advance(entities,7.2);assert.equal(sector.owner,0);advance(entities,7.2);assert.equal(sector.owner,2);
});
test('eliminations cost one reinforcement, respawn once and reset when Play restarts',()=>{
 const {entities,player}=setup();let respawns=0;setHealth(player,0);
 for(let i=0;i<10;i++)tickBattlefield(entities,.1,{onPlayerRespawn:()=>respawns++});
 assert.equal(match.tickets[1],79);assert.equal(match.deaths,1);assert.equal(player._modeEliminated,true);
 for(let i=0;i<55;i++)tickBattlefield(entities,.1,{onPlayerRespawn:()=>respawns++});
 assert.equal(respawns,1);assert.equal(healthOf(player),100);assert.equal(match.dead.size,0);
 resetBattlefield(entities);assert.equal(match.deaths,0);assert.equal(match.tickets[1],80);
});
test('depleted tickets end a match and freeze subsequent rules and shooting',()=>{
 const {entities,player}=setup();match.tickets[2]=1;const enemy=entities.find(o=>isBattlefieldSoldier(o)&&o.team===2);setHealth(enemy,0);tickBattlefield(entities,.1);
 assert.equal(match.winner,1);const time=match.elapsed;tickBattlefield(entities,.1);assert.equal(match.elapsed,time);assert.equal(consumeBattlefieldShot(player),false);
});
test('bots receive sector orders and real RTS steering moves both teams into combat',()=>{
 const {entities}=setup(),bots=entities.filter(o=>o.tacticalUnit),before=bots.map(o=>[o.x,o.y]);tickBattlefield(entities,.1);
 assert.ok(bots.every(o=>o.rtsOrder?.type==='move'));
 for(let i=0;i<30;i++)updateRtsOrders(entities,.1,true,{mode:'3d'});
 assert.ok(bots.filter((o,i)=>Math.hypot(o.x-before[i][0],o.y-before[i][1])>20).length>=6);
});
test('vehicle cannon respects walls and friendly teams and destroyed vehicles stop',()=>{
 const car={id:1,type:'mesh3d',x:0,y:0,w:64,h:64,depth3d:64,rotation:0,team:1,vehicleWeapon:{enabled:true,range:700,damage:45,arc:35},stats:{health:100,maxHealth:100},vehicleConfig:{driveable:true}};
 const foe={id:2,type:'mesh3d',x:0,y:-300,w:64,h:100,depth3d:64,team:2,stats:{health:100,maxHealth:100}};
 const wall={id:3,type:'mesh3d',x:-50,y:-150,w:200,h:150,depth3d:20};
 assert.equal(fireVehicleWeapon(car,[car,foe,wall]).hit,false);assert.equal(healthOf(foe),100);tickVehicleWeapon(car,2);
 assert.equal(fireVehicleWeapon(car,[car,foe]).hit,true);assert.equal(healthOf(foe),55);tickVehicleWeapon(car,2);foe.team=1;
 assert.equal(fireVehicleWeapon(car,[car,foe]).hit,false);
 const {entities}=setup(),tank=entities.find(o=>o.vehicleWeapon);setHealth(tank,0);tickBattlefield(entities,.1);assert.equal(canDriveVehicle(tank),false);
});
