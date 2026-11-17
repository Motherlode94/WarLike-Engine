// Shared data-only horror creature profiles. No model files or executable graphs are bundled.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):min));
export const horrorCreatureProfiles=Object.freeze({
 walker:Object.freeze({id:'walker',label:'Marcheur',shape:'humanoid',visionRange:240,hearingRange:280,memorySeconds:7,chaseSpeed:63,searchSpeed:26,attackRange:50,damage:8,cooldown:2,alertsAllies:true,windup:0.55}),
 brute:Object.freeze({id:'brute',label:'Colosse',shape:'heavy_humanoid',visionRange:190,hearingRange:400,memorySeconds:10,chaseSpeed:45,searchSpeed:18,attackRange:85,damage:25,cooldown:4,alertsAllies:false,windup:1.3}),
 crawler:Object.freeze({id:'crawler',label:'Rampant',shape:'quadruped',visionRange:165,hearingRange:250,memorySeconds:5,chaseSpeed:118,searchSpeed:45,attackRange:42,damage:12,cooldown:3,alertsAllies:false,windup:0.35}),
 stalker:Object.freeze({id:'stalker',label:'Traqueur',shape:'humanoid',visionRange:310,hearingRange:210,memorySeconds:14,chaseSpeed:83,searchSpeed:36,attackRange:55,damage:10,cooldown:2.6,alertsAllies:false,windup:0.7})
});
export const horrorAnimationStates=Object.freeze({
 humanoid:['Idle','Walk','Run','Investigate','Attack','Hit','Death'],
 heavy_humanoid:['Idle','Walk','Charge','Windup','Smash','Stagger','Death'],
 quadruped:['Idle','Crawl','Sprint','Hide','Pounce','Hit','Death']
});
export function creaturePreset(kind='walker',overrides={}){
 const base=horrorCreatureProfiles[kind];
 if(!base)throw Error('Profil de créature inconnu : '+String(kind));
 const config={...base,...overrides,id:base.id};
 for(const key of ['visionRange','hearingRange','memorySeconds','chaseSpeed','searchSpeed','attackRange','damage','cooldown','windup']){
  config[key]=clamp(config[key],0,10000);
 }
 return {
  horrorCreature:{kind:base.id,schemaVersion:1,animationShape:base.shape,assets:{modelId:null,textureIds:[],animationIds:[],audioIds:[]}},
  horrorAiConfig:{enabled:true,...Object.fromEntries(['visionRange','hearingRange','memorySeconds','chaseSpeed','searchSpeed'].map(k=>[k,config[k]]))},
  horrorCombat:{attackRange:config.attackRange,damage:config.damage,cooldown:config.cooldown,windup:config.windup},
  horrorAI:{awareness:0,searchTimer:0,lastKnown:null,state:'patrol',cooldownRemaining:0,attackTimer:0}
 };
}
// Pure decision calculation, without moving through walls or applying damage.
// The existing collision/navigation and combat systems own actual physical actions.
export function decideCreatureAction(profile,observation={},state={}){
 const kind=profile?.kind||'walker',base=horrorCreatureProfiles[kind];
 if(!base)throw Error('Profil de créature inconnu');
 const current=state.state||'patrol',visible=Boolean(observation.visible),heard=Boolean(observation.heard);
 const distance=clamp(observation.distance??Infinity,0,Infinity);
 const awareness=clamp(state.awareness??0,0,1),memory=clamp(state.searchTimer??0,0,3600);
 const cooldown=clamp(state.cooldownRemaining??0,0,3600),attackTimer=clamp(state.attackTimer??0,0,3600);
 if(state.dead)return {state:'dead',intent:'none',animation:'Death'};
 if(attackTimer>0)return {state:'attack',intent:'hold',animation:kind==='brute'?'Windup':kind==='crawler'?'Pounce':'Attack'};
 if(visible&&distance<=base.attackRange&&cooldown<=0&&awareness>.5)
  return {state:'attack',intent:'attack',animation:kind==='brute'?'Windup':kind==='crawler'?'Pounce':'Attack'};
 if(visible&&awareness>.65)return {state:'chase',intent:'approach',animation:kind==='crawler'?'Sprint':kind==='brute'?'Charge':'Run'};
 if(heard||memory>0)return {state:'search',intent:'investigate',animation:kind==='crawler'?'Crawl':'Investigate'};
 return {state:current==='search'?'patrol':current==='dead'?'dead':'patrol',intent:'patrol',animation:kind==='crawler'?'Crawl':'Walk'};
}
export function creatureAnimationContract(kind='walker'){
 const profile=horrorCreatureProfiles[kind];if(!profile)throw Error('Profil inconnu');
 return {profile:kind,shape:profile.shape,states:[...horrorAnimationStates[profile.shape]],events:['AttackImpact','Footstep','DeathComplete'],requiredSockets:kind==='brute'?['AttackOrigin']:['Head','AttackOrigin'],compatibleAssetKind:'glb'};
}
export function creatureAssetManifest(kind='walker'){
 if(!horrorCreatureProfiles[kind])throw Error('Profil inconnu');
 return {schema:'warlike.creature-assets.v1',creatureId:kind,modelR2Key:null,textureR2Keys:[],animationR2Keys:[],audioR2Keys:[],license:'unverified',ready:false};
}
