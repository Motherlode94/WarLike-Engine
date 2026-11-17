// WarLike Narrative Director v1 — genre-neutral narrative decision model.
// Pure data: no DOM, network, script execution or renderer dependencies.
// Integrations with Scene, WarNode, camera and dialogue are intentionally separate.
const valid=(v,alt)=>Number.isFinite(Number(v))?Number(v):alt;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const narrativeGenres=Object.freeze(['horror','rts','tactical','rpg','simulation','adventure','openworld','survival','sports','racing','sandbox']);
export const createNarrativeState=({genre='adventure',episode=1}={})=>({
 genre:narrativeGenres.includes(genre)?genre:'adventure',episode:Math.max(1,Math.floor(valid(episode,1))),
 tension:0,beatIndex:0,flags:{},relationships:{},history:[],cooldown:0
});
const testCondition=(condition,state,context)=>{
 if(!condition||typeof condition!=='object')return false;
 const {type,key,value}=condition;
 if(type==='flag')return state.flags[String(key)]===value;
 if(type==='relationship')return valid(state.relationships[String(key)],0)>=valid(value,0);
 if(type==='context')return context?.[String(key)]===value;
 if(type==='tensionAtLeast')return state.tension>=valid(value,Infinity);
 return false; // strict allowlist: arbitrary code execution forbidden
};
export const eligibleNarrativeBeats=(state,beats=[],context={})=>{
 if(state.cooldown>0)return [];
 return beats.filter(beat=>beat&&typeof beat.id==='string'&&
  (!beat.genres||beat.genres.includes(state.genre))&&
  (!beat.episode||beat.episode===state.episode)&&
  (!beat.once||!state.history.some(h=>h.id===beat.id))&&
  (beat.conditions||[]).every(c=>testCondition(c,state,context)));
};
export function chooseNarrativeBeat(state,beats=[],context={}){
 const eligible=eligibleNarrativeBeats(state,beats,context);
 return eligible.sort((a,b)=>valid(b.priority,0)-valid(a.priority,0)||String(a.id).localeCompare(String(b.id)))[0]||null;
}
export function applyNarrativeBeat(state,beat){
 if(!beat||typeof beat.id!=='string')throw Error('Invalid narrative beat');
 state.beatIndex++;
 state.tension=clamp(state.tension+clamp(valid(beat.tensionDelta,0),-100,100),0,100);
 state.cooldown=clamp(valid(beat.cooldown,0),0,3600);
 if(beat.flags&&typeof beat.flags==='object')for(const [key,value] of Object.entries(beat.flags)){
  if(typeof value==='boolean'||typeof value==='string'||Number.isFinite(value))state.flags[key]=value;
 }
 if(beat.relationships&&typeof beat.relationships==='object')for(const [key,value] of Object.entries(beat.relationships)){
  state.relationships[key]=clamp(valid(state.relationships[key],0)+clamp(valid(value,0),-100,100),-100,100);
 }
 const event={id:beat.id,episode:state.episode,beatIndex:state.beatIndex};
 state.history.push(event);if(state.history.length>256)state.history.shift();
 // Front-end adapter may use the returned cue to invoke native camera, dialogue,
 // animation, WarNode or WarScript. It must still validate and authorize actions.
 return {event,cues:Array.isArray(beat.cues)?beat.cues.filter(c=>c&&
  ['dialogue','camera','animation','music','sound','objective','signal','subtitle'].includes(c.type)):[]};
}
export function advanceNarrativeTime(state,dt){
 state.cooldown=Math.max(0,state.cooldown-clamp(valid(dt,0),0,60));
}
export function nextNarrativeEpisode(state){
 state.episode++;state.cooldown=0;state.tension=clamp(state.tension*.4,0,100);
}
