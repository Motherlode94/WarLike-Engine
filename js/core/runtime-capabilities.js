import {inspectWebScripts} from './web-script-runtime.js';
import {inspectWarScripts} from './war-script-runtime.js';
// One ownership table is used by Play, the Inspector and the Web exporter.
export const webComponentKinds=new Set(['Weapon','Damageable','Health','Team','Respawn','DeathmatchRules']);
export const portableComponentKinds=new Set(['Roleplay','RacingRules','SimulationEconomy','RpgProgression','FourXEmpire','VehicleController']);
export const isWebComponent=(entity,c)=>webComponentKinds.has(c.kind)||c.runtime==='web'&&portableComponentKinds.has(c.kind);
export const nativeComponentKinds=new Set(['SpawnPoint','AmmoPickup','HealthPickup','KillZone','ObjectiveZone','Projectile','Team','Damageable','Score','Weapon','Respawn','AutoRotate','Health','LinearMotion','Rigidbody','Roleplay','RacingRules','SimulationEconomy','RpgProgression','FourXEmpire','VehicleController','FollowActor','TacticalSquad','DeathmatchRules']);
export function inspectRuntimeCompatibility(entities,{target='web',backend='web',project=null}={}){
 const issues=[],add=(message,entityId=null)=>issues.push({severity:'error',message,entityId,target});
 if(target==='web'&&backend==='native')add('Ce projet utilise le runtime C# local. Choisis Play Web et remplace les composants natifs avant l’export Web.');
 for(const e of entities||[]){
  const components=[...(e.csharpComponents||[]),...(e.csharpComponent?[e.csharpComponent]:[])];
  for(const c of components){
   if(!c||c.enabled===false)continue;
   if(isWebComponent(e,c))continue;
   if(target==='native'&&nativeComponentKinds.has(c.kind))continue;
   add((e.name||'#'+e.id)+' · '+c.kind+' : '+(nativeComponentKinds.has(c.kind)?'nécessite le runtime C# local ; indisponible dans le jeu Web.':'composant non enregistré dans ce runtime.'),e.id);
  }
  if(e.csharpScript?.enabled!==false&&e.csharpScript?.source?.trim()&&target!=='native')add((e.name||'#'+e.id)+' · script '+e.csharpScript.name+' : ce script doit être compilé par Play C# local (.NET 8) ; utilise WarScript pour l’export Web.',e.id);
 }
 return [...issues,...inspectWarScripts(entities,project),...inspectWebScripts(entities,project)];
}
export function nativePlayEntities(entities){
 return entities.map(e=>({...structuredClone(e),tags:(e.tags||[]).filter(t=>t!=='race-vehicle'),csharpComponents:(e.csharpComponents||[]).filter(c=>c.enabled!==false&&!isWebComponent(e,c)),...(webComponentKinds.has(e.csharpComponent?.kind)?{csharpComponent:null}:{})}));
}

const portableFields={Roleplay:{money:'money',reputation:'reputation'},RacingRules:{elapsed:'raceElapsed',checkpoints:'raceCheckpoint',started:'raceStarted',finished:'raceFinished'},SimulationEconomy:{money:'money',materials:'materials',maintenance:'maintenance'},RpgProgression:{gold:'gold',experience:'experience'},FourXEmpire:{turn:'turn',food:'food',industry:'industry',science:'science',territory:'territory',army:'army'}};
export function initializeWebComponents(entities,globals){
 for(const e of entities)for(const c of e.csharpComponents||[]){if(c.runtime!=='web'||c.enabled===false)continue;
  if(c.kind==='VehicleController'){for(const key of ['maxSpeed','acceleration','brakeForce','turnRate','drag','reverseRatio'])if(Number.isFinite(c[key]))e[key]=c[key];continue}
  for(const [field,key] of Object.entries(portableFields[c.kind]||{}))if(!Object.hasOwn(globals,key))globals[key]=c[field]??0;
 }
}
export function captureWebComponents(entities,globals){
 for(const e of entities)for(const c of e.csharpComponents||[])if(c.runtime==='web'&&c.enabled!==false)for(const [field,key] of Object.entries(portableFields[c.kind]||{}))if(Object.hasOwn(globals,key))c[field]=structuredClone(globals[key]);
}
