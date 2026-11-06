import {setAnimatorParameter,playAnimatorState} from './animator-graph.js';
// Apply snapshots from the explicitly connected local .NET process.
export function applyCsharpFrame(entities,actors,{expected=null}={}){
 if(!Array.isArray(actors))throw Error('Réponse C# invalide.');
 const byId=new Map(entities.map(o=>[o.id,o]));let applied=0;
 for(const a of actors){const target=byId.get(a.id);if(!target||![a.x,a.y,a.elevation3d,a.rotation].every(Number.isFinite))continue;
  const before=expected?.find(o=>o.id===a.id);
  for(const key of ['x','y','elevation3d','rotation'])if(!before||Object.is(Number(target[key])||0,before[key]))target[key]=a[key];
  for(const command of (a.animatorCommands||[]).slice(0,64)){if(command.method==='Play')playAnimatorState(target,command.name,null,{offset:command.value||0});else if(command.method==='CrossFade')playAnimatorState(target,command.name,null,{fade:(command.duration||0)*(target._animatorFrame?.duration||1)});else if(['SetFloat','SetInteger','SetBool','SetTrigger','ResetTrigger'].includes(command.method))setAnimatorParameter(target,command.name,command.value);}
  if(typeof a.enabled==='boolean'&&(!before||(target.enabled!==false)===before.enabled))target.enabled=a.enabled;
  if(Number.isFinite(a.hp)&&(!before||(target.stats?.health??target.hp??100)===before.hp)){target.hp=a.hp;if(target.stats)target.stats.health=a.hp}applied++;
 }return applied;
}
