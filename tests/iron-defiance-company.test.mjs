import test from 'node:test';
import assert from 'node:assert/strict';
import {createIronDefianceCompanyScene,SQUAD_SPECIALTIES,COMPANY_STRUCTURE} from '../js/core/iron-defiance-company-scene.js';
import {FACTIONS} from '../js/core/iron-defiance-uniforms.js';
import {validEntities} from '../js/core/game-project.js';
import {readFileSync} from 'node:fs';
const scene=faction=>createIronDefianceCompanyScene('3d',faction);
test('each of seven factions has exactly 108 unique soldiers, 3 platoons, 9 squads and 27 teams',()=>{
 for(const faction of Object.keys(FACTIONS)){
  const a=scene(faction),soldiers=a.entities.filter(e=>e.tags?.includes('iron-soldier'));
  assert.equal(soldiers.length,108,faction);
  assert.equal(a.company.platoons.length,3,faction);
  assert.equal(a.squads.length,9,faction);
  assert.ok(validEntities(a.entities),faction);
  assert.deepEqual(a.company.platoons.map(p=>p.squads.length),[3,3,3]);
  assert.equal(new Set(soldiers.map(e=>e.id)).size,108);
  for(const squad of a.squads){
   assert.deepEqual(Object.values(squad.teams).map(t=>t.soldierIds.length),[5,4,3]);
   assert.ok(squad.leaderId);
   assert.deepEqual(Object.values(squad.teams).map(t=>!!t.leaderId),[true,true,true]);
  }
 }
 assert.deepEqual(COMPANY_STRUCTURE,{platoons:3,squadsPerPlatoon:3,soldiersPerSquad:12,soldiers:108});
});
test('every one of the six decided specialized squad classes is present',()=>{
 const a=scene('rdc');
 assert.deepEqual(new Set(a.squads.map(s=>s.specialty)),new Set(SQUAD_SPECIALTIES));
});
test('each soldier has a faction uniform, editable native RTS component and unique squad signal',()=>{
 const a=scene('rdc');
 for(const soldier of a.entities.filter(e=>e.tags?.includes('iron-soldier'))){
  assert.equal(soldier.ironUniform.faction,'rdc');
  assert.equal(soldier.ironUniform.baseColor,'#17191A');
  assert.equal(soldier.tacticalUnit.autoAttack,false);
  assert.equal(soldier.sequence.event,'signal');
  assert.equal(soldier.sequence.instructions[0].type,'rtsOrder');
  assert.equal(soldier.sequence.instructions[0].value,'move');
  assert.ok(soldier.ironTraining.platoon&&soldier.ironTraining.squad&&soldier.ironTraining.team);
 }
});
test('every squad has a Blueprint-controlled terminal that broadcasts matching team signals',()=>{
 const a=scene('japan');
 const terminals=a.entities.filter(e=>e.name.startsWith('Terminal · '));
 assert.equal(terminals.length,9);
 for(const terminal of terminals){
  const instructions=terminal.sequence.instructions;
  assert.equal(terminal.sequence.event,'interact');
  assert.equal(instructions.filter(i=>i.type==='emitSignal').length,3);
  for(const emission of instructions.filter(i=>i.type==='emitSignal')){
   assert.equal(a.entities.filter(e=>e.tags?.includes('iron-soldier')&&e.sequence.signal===emission.value).length,
    emission.value.endsWith('alpha')?5:emission.value.endsWith('beta')?4:3);
  }
 }
});
test('company scene registration keeps the lightweight Academy and all seven alternatives',()=>{
 const loader=readFileSync(new URL('../js/core/scene.js',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../js/ui/demo-browser.js',import.meta.url),'utf8');
 assert.match(loader,/irondefiancetraining:createIronDefianceTrainingScene/);
 for(const faction of Object.keys(FACTIONS))assert.ok(browser.includes("id:'ironcompany-"+faction+"'"));
});
test('company builder rejects unsupported mode and faction',()=>{
 assert.throws(()=>createIronDefianceCompanyScene('2d','rdc'),/projet 3D/);
 assert.throws(()=>createIronDefianceCompanyScene('3d','unknown'),/Faction inconnue/);
});
