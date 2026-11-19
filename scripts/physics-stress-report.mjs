import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {createPhysicsValidationScene} from '../js/core/physics-validation-scene.js';
import {loadRapier3d,createRapierScene,stepRapierScene,disposeRapierScene} from '../js/core/rapier-physics-3d.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
const coordinates=entities=>entities.filter(o=>o.rigidbody3d).map(o=>[o.id,o.x,o.elevation3d,o.y,o.rigidbody3d.vx,o.rigidbody3d.vy,o.rigidbody3d.vz]);
export async function runPhysicsStress({bodies=108,steps=1200}={}){
 if(!Number.isInteger(steps)||steps<120||steps>36000)throw Error('120–36000 fixed steps required');
 const demo=createPhysicsValidationScene({bodies}),source=JSON.stringify(demo.entities),api=await loadRapier3d();
 if(!api)throw Error('Real Rapier WASM unavailable');
 const exported=prepareGameDefinition({entities:demo.entities,mode:'3d',project:{...freshGameProject(),id:'physics-stress',physics3d:'rapier'}});
 if(JSON.stringify(demo.entities)!==source)throw Error('Export mutated authored physics scene');
 const portable=JSON.parse(JSON.stringify(exported.project.scenes.find(s=>s.id===exported.project.startupSceneId).entities));
 const simulate=entities=>{
  const session=createRapierScene(api,entities),samples=[],cost=[];let minHeight=Infinity,invalid=0;
  try{
   if(session.errors.length)throw Error(session.errors.join('; '));
   for(let step=0;step<steps;step++){
    const start=performance.now();stepRapierScene(session,1/60);cost.push(performance.now()-start);
    if(step%30===0||step===steps-1){const values=coordinates(entities);samples.push(values);for(const row of values){if(row.some(v=>!Number.isFinite(v)))invalid++;minHeight=Math.min(minHeight,row[2]);}}
   }
   cost.sort((a,b)=>a-b);
   return {samples,minHeight,invalid,p50:cost[Math.floor(cost.length*.5)],p95:cost[Math.floor(cost.length*.95)],max:cost.at(-1),final:coordinates(entities)};
  }finally{disposeRapierScene(session)}
 };
 const editor=simulate(structuredClone(demo.entities)),build=simulate(portable);let maxDelta=0;
 for(let i=0;i<editor.samples.length;i++)for(let j=0;j<editor.samples[i].length;j++){
  const a=editor.samples[i][j],b=build.samples[i][j];if(a[0]!==b?.[0])throw Error('Export changed physics IDs');
  for(let k=1;k<a.length;k++)maxDelta=Math.max(maxDelta,Math.abs(a[k]-b[k]));
 }
 const passed=!editor.invalid&&!build.invalid&&editor.minHeight>-.1&&build.minHeight>-.1&&maxDelta<.001;
 return {schema:'warlike.physics-stress.v1',environment:'Node + genuine Rapier WASM; no rendering, AI or browser FPS measurement',bodies,steps,fixedDelta:1/60,simulatedSeconds:steps/60,
  passed,invalidSamples:editor.invalid+build.invalid,maxEditorExportDelta:maxDelta,minElevation:Math.min(editor.minHeight,build.minHeight),
  physicsStepMs:{editor:{p50:editor.p50,p95:editor.p95,max:editor.max},exported:{p50:build.p50,p95:build.p95,max:build.max}},
  cases:['108 default bodies / configurable budget','box, sphere, capsule','gravity and mixed masses','three-level stacks, floor and walls','CCD enabled','authored scene unchanged','JSON export reconstruction','sampled trajectory and velocity parity'],
  limitations:['not a GPU benchmark','does not measure 108 soldiers with AI','not a full ZIP/browser test','no cross-platform determinism claim']};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const report=await runPhysicsStress();const json=JSON.stringify(report,null,2)+'\n';
 if(process.argv[2])await writeFile(process.argv[2],json);process.stdout.write(json);
 if(!report.passed)process.exitCode=1;
}
