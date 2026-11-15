import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCharacterAnimatorGraph,matchModelAnimationClips} from '../js/core/animator-model-template.js';
import {inspectAnimatorGraph,animatorBlendSamples,stepAnimator,resetAnimators} from '../js/core/animator-graph.js';
const clips=[
 {name:'Idle',duration:1.5},{name:'Walk_Cycle',duration:.9},{name:'Run',duration:.62},
 {name:'Jump_Up',duration:.75},{name:'Fall',duration:.7},{name:'Attack_01',duration:.58},{name:'Death',duration:1.2}
];
test('character Animator maps real GLB clips into an executable 1D locomotion and state graph',()=>{
 const {graph,warnings,mapping}=createCharacterAnimatorGraph(clips);
 assert.deepEqual(warnings,[]);
 assert.equal(graph.entry,'motion');
 assert.equal(mapping.run.name,'Run');
 assert.equal(mapping.walk.name,'Walk_Cycle');
 assert.equal(graph.states.find(s=>s.id==='attack').clip,'Attack_01');
 assert.deepEqual(inspectAnimatorGraph(graph),[]);
 const motion=graph.states.find(s=>s.id==='motion');
 assert.deepEqual(motion.blend.map(p=>p.clip),['Idle','Walk_Cycle','Run']);
 assert.deepEqual(animatorBlendSamples(motion,{speed:2.2}),[{clip:'Walk_Cycle',weight:1}]);
 assert.ok(graph.transitions.some(t=>t.from==='*'&&t.to==='attack'&&t.conditions.some(c=>c.parameter==='attacking')));
 const owner={id:1,x:0,y:0,elevation3d:0,animatorGraph:graph};
 resetAnimators();
 const frame=stepAnimator(owner,.016,{mode:'3d'});
 assert.ok(frame,'Animator should advance with Play runtime');
 assert.equal(owner._animatorFrame.stateId,'motion');
});
test('GLB Animator never invents missing clips or silently claims full rig support',()=>{
 const {graph,warnings}=createCharacterAnimatorGraph([{name:'Walk',duration:1},{name:'Idle',duration:2}]);
 assert.deepEqual(inspectAnimatorGraph(graph),[]);
 assert.ok(warnings.some(s=>s.includes('Run')));
 assert.equal(graph.states.some(s=>s.id==='attack'),false);
 assert.throws(()=>createCharacterAnimatorGraph([]),/Aucun clip GLB/);
});
test('model animation detector normalizes camelCase and underscores',()=>{
 const mapping=matchModelAnimationClips([{name:'characterIdleLoop'},{name:'fastRun_Cycle'}]);
 assert.equal(mapping.idle.name,'characterIdleLoop');
 assert.equal(mapping.run.name,'fastRun_Cycle');
});
test('WarNode launches its existing executable visual scripting Graph rather than a static clone',()=>{
 const root=new URL('../',import.meta.url),ui=readFileSync(new URL('js/ui/blueprint-workspace.js',root),'utf8'),
  menu=readFileSync(new URL('js/ui/focus-menu.js',root),'utf8'),
  runtime=readFileSync(new URL('js/core/blueprint-graph.js',root),'utf8');
 assert.ok(menu.includes("warlike:warnode-open"));
 assert.ok(ui.includes("workspaceBrand='warnode'"));
 assert.ok(ui.includes('renderBlueprintGraph(page,sequence,change'));
 assert.ok(ui.includes("warlike:animator-open"));
 assert.ok(runtime.includes('export function createGraph('));
 assert.ok(runtime.includes('export function applyGraph('));
});
