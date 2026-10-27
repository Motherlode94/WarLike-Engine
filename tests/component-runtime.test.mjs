import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/core/state.js';
import {runtime,startComponentRuntime,resetComponentRuntime,updateComponentRuntime,applyComponentDamage,tryComponentFire} from '../js/core/component-runtime.js';
const original=globalThis.document;
globalThis.document={dispatchEvent(){}};
globalThis.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options.detail}};
test('Deathmatch runtime: teams, score, match timer and respawn',()=>{
 const before={entities:state.entities,playing:state.playing};
 try{
 const attacker={id:1,hp:100,csharpComponents:[{kind:'Team',teamId:1},{kind:'Weapon',damage:120,fireRate:8}]};
 const victim={id:2,hp:100,csharpComponents:[{kind:'Team',teamId:2},{kind:'Damageable',armor:0},{kind:'Respawn',delay:1}]};
 const ally={id:3,hp:100,csharpComponents:[{kind:'Team',teamId:1},{kind:'Damageable'}]};
 state.entities=[attacker,victim,ally,{id:4,csharpComponents:[{kind:'DeathmatchRules',countdown:0,matchDuration:10,scoreLimit:1}]}];
 state.playing=true;startComponentRuntime();updateComponentRuntime(.01);
 assert.equal(runtime.phase,'playing');
 assert.equal(applyComponentDamage(ally,50,attacker),0);
 assert.equal(tryComponentFire(attacker,victim),true);
 assert.equal(victim._componentDead,true);
 assert.equal(runtime.scores.get(attacker.id).kills,1);
 updateComponentRuntime(.02);assert.equal(runtime.phase,'finished');
 for(let i=0;i<12;i++)updateComponentRuntime(.1);
 assert.equal(victim._componentDead,false);assert.equal(victim.hp,100);
 }finally{resetComponentRuntime();state.entities=before.entities;state.playing=before.playing}
});
