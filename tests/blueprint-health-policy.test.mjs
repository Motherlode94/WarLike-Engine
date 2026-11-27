import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/core/state.js';
import {runtime,startComponentRuntime,resetComponentRuntime,applyComponentDamage} from '../js/core/component-runtime.js';
test('Immortality blocks lethal damage, supports invulnerability and can be disabled',()=>{
 const previous={entities:state.entities,playing:state.playing,document:globalThis.document,CustomEvent:globalThis.CustomEvent};
 globalThis.document={dispatchEvent(){}};
 globalThis.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options.detail}};
 const bp={kind:'BP_Immortality',enabled:true};
 const entity={id:1,hp:100,stats:{health:100,maxHealth:100},csharpComponents:[{kind:'Damageable'}],blueprintComponents:[bp]};
 try{
 state.entities=[entity];state.playing=true;startComponentRuntime();
 assert.equal(applyComponentDamage(entity,200),99);
 assert.equal(entity.hp,1);assert.equal(entity.stats.health,1);
 assert.equal(entity._componentDead,undefined);
 assert.equal(runtime.scores.size,0);
 bp.ignoreDamage=true;
 assert.equal(applyComponentDamage(entity,10),0);
 bp.enabled=false;
 assert.equal(applyComponentDamage(entity,10),10);
 assert.equal(entity.hp,0);assert.equal(entity._componentDead,true);
 }finally{resetComponentRuntime();state.entities=previous.entities;state.playing=previous.playing;globalThis.document=previous.document;globalThis.CustomEvent=previous.CustomEvent}
});
