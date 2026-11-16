import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAP,obstacles,specs,createMission,live,walkable,findPath,lineClear,giveOrder,applyDamage,tick,serialize,restore} from '../game-rules.js';
test('battlefield coordinates are navigable and initial units have positive radii',()=>{
 const m=createMission();
 assert.equal(m.units.length,14);
 for(const u of m.units){assert.ok(u.radius>0,u.id);assert.ok(walkable(u.x,u.z,u.radius),'Unit overlaps world geometry: '+u.id)}
 assert.equal(m.units.filter(x=>x.team==='friendly').length,8);
 assert.equal(m.units.filter(x=>x.team==='enemy').length,6);
});
test('A* route finds walkable waypoints around buildings',()=>{
 const path=findPath({x:-20,z:-25},{x:29,z:22},1.4);
 assert.ok(path.length>8,'No route from convoy to extraction');
 for(const p of path)assert.ok(walkable(p.x,p.z,1.4),'Bad path waypoint: '+JSON.stringify(p));
});
test('RTS formation orders apply only to friendly units',()=>{
 const m=createMission(),count=giveOrder(m,['alpha1','alpha2','bot1'],{x:6,z:10});
 assert.equal(count,2);assert.ok(m.units.find(u=>u.id==='alpha1').path.length);
 assert.equal(m.units.find(u=>u.id==='bot1').order,null);
});
test('solid structures occlude line of sight while adjacent objects do not',()=>{
 assert.equal(lineClear({x:-35,z:-18},{x:-20,z:-18}),false);
 assert.equal(lineClear({x:-35,z:-26},{x:-20,z:-26}),true);
});
test('armor mitigation, destruction and morale-equivalent persistence',()=>{
 const m=createMission(),tank=m.units.find(u=>u.id==='tank');
 const attacker=m.units.find(u=>u.id==='armor1'),original=tank.hp;
 const effective=applyDamage(m,tank,80,attacker);
 assert.ok(effective>0&&effective<80);assert.equal(tank.hp,original-effective);
 applyDamage(m,tank,10000,attacker);assert.equal(tank.alive,false);assert.equal(m.losses,1);
});
test('supply truck restores nearby allies without creating unlimited reserves',()=>{
 const m=createMission(),supply=m.units.find(u=>u.id==='supply'),soldier=m.units.find(u=>u.id==='alpha1');
 soldier.x=supply.x+2;soldier.z=supply.z;soldier.hp=30;soldier.reserve=0;
 for(let i=0;i<180;i++)tick(m,.05);
 assert.ok(soldier.hp>30,'Supply repair absent');
 assert.ok(soldier.reserve>0,'Supply ammo absent');
 assert.ok(soldier.reserve<=specs.infantry.reserve,'Ammo oversupply');
});
test('victory, defeat and full save roundtrip are deterministic',()=>{
 const m=createMission();let stored=serialize(m),restored=restore(stored);
 assert.equal(restored.units.length,m.units.length);assert.equal(restored.phase,'playing');
 restored.routeIndex=restored.convoyRoute.length;Object.assign(restored.units.find(u=>u.id==='convoy'),{x:29,z:22});
 tick(restored,.03);assert.equal(restored.phase,'won');
 const savedWin=restore(serialize(restored));assert.equal(savedWin.phase,'won');
 const loss=createMission();loss.units.find(u=>u.id==='convoy').alive=false;tick(loss,.01);assert.equal(loss.phase,'lost');
 assert.throws(()=>restore('{"version":9,"units":[]}'));
});
