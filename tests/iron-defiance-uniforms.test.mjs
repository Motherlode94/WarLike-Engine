import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTIONS,createUniform,applyUniform,updateUniform,UNIFORM_ENVIRONMENTS} from '../js/core/iron-defiance-uniforms.js';
import {createIronDefianceTrainingScene} from '../js/core/iron-defiance-training-scene.js';
test('seven distinct fictional factions have uniform definitions',()=>{
 assert.equal(Object.keys(FACTIONS).length,7);
 assert.equal(new Set(Object.values(FACTIONS).map(f=>f.flag)).size,7);
});
test('Congo defaults to black uniforms with gold leopard accent in all environments',()=>{
 for(const environment of UNIFORM_ENVIRONMENTS){
  const uniform=createUniform('rdc',{environment});
  assert.match(uniform.baseColor,/^#(?:0D0F12|17191A|202225|282626|33363A)$/i);
  assert.equal(uniform.accentColor,'#E3B847');assert.equal(uniform.patch,'leopard');
 }
});
test('Academy soldiers use Congo black uniform without losing RTS behaviors',()=>{
 const soldiers=createIronDefianceTrainingScene('3d').entities.filter(e=>e.tags?.includes('iron-soldier'));
 assert.equal(soldiers.length,12);
 for(const soldier of soldiers){assert.equal(soldier.ironUniform.faction,'rdc');assert.equal(soldier.color,'#17191A');assert.equal(soldier.tacticalUnit.autoAttack,false);}
});
test('uniform changes preserve health, orders and script references',()=>{
 const entity={id:1,stats:{health:55},rtsOrder:{type:'hold'},sequence:{event:'signal'}};
 applyUniform(entity,createUniform('rdc'));const s=entity.sequence;updateUniform(entity,{environment:'night',equipment:{headgear:'beret'}});
 assert.equal(entity.color,'#0D0F12');assert.equal(entity.ironUniform.equipment.headgear,'beret');
 assert.equal(entity.stats.health,55);assert.equal(entity.rtsOrder.type,'hold');assert.equal(entity.sequence,s);
});
test('invalid faction, color and equipment are refused',()=>{
 assert.throws(()=>createUniform('missing'),/Faction/);
 assert.throws(()=>createUniform('rdc',{customColor:'url(bad)'}),/Couleur/);
 assert.throws(()=>createUniform('rdc',{equipment:{headgear:'laser'}}),/Équipement/);
});
