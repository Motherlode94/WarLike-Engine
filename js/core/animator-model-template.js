// Character Animator profile built from the *real* clip list of an imported GLB.
// Never silently invent missing animations: return explicit diagnostics instead.
import {inspectAnimatorGraph} from './animator-graph.js';
const LABELS={
 idle:{name:'Repos',words:/\b(idle|stand|rest|breath|wait)\b/i},
 walk:{name:'Marche',words:/\b(walk|walking|stride)\b/i},
 run:{name:'Course',words:/\b(run|running|jog|sprint)\b/i},
 jump:{name:'Saut',words:/\b(jump|leap|hop)\b/i},
 fall:{name:'Chute',words:/\b(fall|falling|drop)\b/i},
 attack:{name:'Attaque',words:/\b(attack|slash|punch|hit|strike|shoot)\b/i},
 death:{name:'Mort',words:/\b(death|die|dead)\b/i}
};
const clean=s=>String(s||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ');
export function matchModelAnimationClips(clips=[]){
 const candidates=(Array.isArray(clips)?clips:[]).filter(c=>typeof(c?.name??c)==='string').map(c=>typeof c==='string'?{name:c,duration:1}:c);
 const found={};
 for(const [key,spec] of Object.entries(LABELS)){
  const item=candidates.find(c=>spec.words.test(clean(c.name)));
  if(item)found[key]={name:item.name,duration:Number.isFinite(item.duration)&&item.duration>.05?item.duration:1};
 }
 return found;
}
export function createCharacterAnimatorGraph(clips=[]){
 const clipsFound=matchModelAnimationClips(clips),warnings=[];
 if(!clipsFound.idle){
  const first=clips.find(c=>(typeof c==='string'?c:c?.name));
  if(!first)throw Error('Aucun clip GLB : importe un modèle animé ou crée un clip dans Squelette.');
  const name=typeof first==='string'?first:first.name;
  clipsFound.idle={name,duration:typeof first==='string'?1:first.duration||1};
  warnings.push('Aucun Idle reconnu : '+name+' utilisé comme état de repos. Vérifie son animation.');
 }
 const states=[{id:'motion',name:'Locomotion',clip:clipsFound.idle.name,loop:true,speed:1,duration:clipsFound.idle.duration,x:240,y:190,events:[]}];
 if(clipsFound.walk&&clipsFound.run){
  states[0].blend=[{clip:clipsFound.idle.name,threshold:0},{clip:clipsFound.walk.name,threshold:2.2},{clip:clipsFound.run.name,threshold:5.5}];
  states[0].parameter='speed';
 }else if(clipsFound.walk||clipsFound.run){
  const clip=clipsFound.walk||clipsFound.run;
  states[0].blend=[{clip:clipsFound.idle.name,threshold:0},{clip:clip.name,threshold:clipsFound.walk?2.2:5.5}];
  states[0].parameter='speed';
  warnings.push('Locomotion partielle : il manque '+(clipsFound.walk?'Run':'Walk')+'.');
 }else warnings.push('Locomotion sans Walk/Run : un seul clip disponible.');
 const transitions=[];
 for(const [key,y] of [['jump',10],['fall',320],['attack',470],['death',620]]){
  const clip=clipsFound[key];if(!clip){warnings.push('Clip manquant : '+LABELS[key].name);continue}
  states.push({id:key,name:LABELS[key].name,clip:clip.name,loop:key==='fall',speed:1,duration:clip.duration,x:660,y,events:[]});
  const conditions=key==='jump'?[{parameter:'grounded',operator:'==',value:false},{parameter:'vertical',operator:'>',value:0}]:
   key==='fall'?[{parameter:'grounded',operator:'==',value:false}]:
   key==='attack'?[{parameter:'attacking',operator:'==',value:true}]:
   [{parameter:'dead',operator:'==',value:true}];
  transitions.push({from:'*',to:key,conditions,blend:.16});
  if(key!=='death')transitions.push({from:key,to:'motion',conditions:key==='attack'?[{parameter:'attacking',operator:'==',value:false}]:[{parameter:'grounded',operator:'==',value:true}],hasExitTime:key==='attack',exitTime:key==='attack'?1:undefined,blend:.18});
 }
 const graph={enabled:true,entry:'motion',states,transitions,layers:[],parameters:[],profileId:'meshy-character'};
 const issues=inspectAnimatorGraph(graph);if(issues.length)throw Error('Animator généré invalide : '+issues.join(' · '));
 return {graph,warnings,mapping:clipsFound};
}
