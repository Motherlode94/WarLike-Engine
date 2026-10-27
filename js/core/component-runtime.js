// WarLike primary component runtime — browser-side gameplay services.
// Data-driven and isolated from the standalone .NET execution layer.
import {state} from './state.js';
export const runtime={elapsed:0,phase:'waiting',remaining:0,scores:new Map(),events:[],running:false};
const components=(entity,kind)=>Array.isArray(entity.csharpComponents)?entity.csharpComponents.filter(c=>c.kind===kind):[];
const first=(entity,kind)=>components(entity,kind)[0];
const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
export function emitGameplayEvent(type,payload={}){const event={type,payload,time:runtime.elapsed};runtime.events.push(event);if(runtime.events.length>100)runtime.events.shift();document.dispatchEvent(new CustomEvent('warlike:gameplay',{detail:event}));return event}
export function resetComponentRuntime(){
 runtime.elapsed=0;runtime.phase='waiting';runtime.remaining=0;runtime.scores.clear();runtime.events=[];runtime.running=false;
 for(const entity of state.entities){delete entity._componentDead;delete entity._respawnTimer;delete entity._weaponCooldown}
}
export function startComponentRuntime(){
 resetComponentRuntime();runtime.running=true;
 const rules=state.entities.flatMap(entity=>components(entity,'DeathmatchRules'))[0];
 if(rules){runtime.phase='countdown';runtime.remaining=Math.max(0,num(rules.countdown,3));emitGameplayEvent('match:countdown')}
 else runtime.phase='playing';
}
export function applyComponentDamage(target,amount,source=null){
 if(!runtime.running||!target||target._componentDead)return 0;
 const damageable=first(target,'Damageable');if(!damageable||damageable.invulnerable)return 0;
 const ownTeam=first(target,'Team'),sourceTeam=source&&first(source,'Team');
 if(source&&source!==target&&ownTeam&&sourceTeam&&num(ownTeam.teamId)===num(sourceTeam.teamId)&&!ownTeam.friendlyFire)return 0;
 const damage=Math.max(0,num(amount));const dealt=damage*100/(100+Math.max(0,num(damageable.armor)));
 target.hp=Math.max(0,num(target.hp,100)-dealt);
 emitGameplayEvent('actor:damaged',{targetId:target.id,sourceId:source?.id??null,damage:dealt});
 if(target.hp<=0){target._componentDead=true;target._respawnTimer=Math.max(0,num(first(target,'Respawn')?.delay,5));
 const victim=runtime.scores.get(target.id)||{kills:0,deaths:0};victim.deaths++;runtime.scores.set(target.id,victim);
 if(source&&source!==target){const killer=runtime.scores.get(source.id)||{kills:0,deaths:0};killer.kills++;runtime.scores.set(source.id,killer)}
 emitGameplayEvent('actor:eliminated',{targetId:target.id,sourceId:source?.id??null})}
 return dealt;
}
export function updateComponentRuntime(dt){
 if(!state.playing||!runtime.running||!Number.isFinite(dt)||dt<=0)return;
 const delta=Math.min(dt,.1);runtime.elapsed+=delta;
 const rules=state.entities.flatMap(entity=>components(entity,'DeathmatchRules'))[0];
 if(rules&&runtime.phase!=='finished'){
 runtime.remaining=Math.max(0,runtime.remaining-delta);
 if(runtime.remaining===0&&runtime.phase==='countdown'){runtime.phase='playing';runtime.remaining=Math.max(0,num(rules.matchDuration,600));emitGameplayEvent('match:start')}
 else if(runtime.remaining===0&&runtime.phase==='playing'){runtime.phase='finished';emitGameplayEvent('match:end',{reason:'time'})}
 if(runtime.phase==='playing'&&num(rules.scoreLimit,25)>0&&[...runtime.scores.values()].some(s=>s.kills>=num(rules.scoreLimit,25))){runtime.phase='finished';emitGameplayEvent('match:end',{reason:'score'})}
 }
 for(const entity of state.entities){
 if(entity._componentDead&&first(entity,'Respawn')){
 entity._respawnTimer-=delta;
 if(entity._respawnTimer<=0){entity._componentDead=false;entity.hp=Math.max(1,num(entity.maxHp,100));emitGameplayEvent('actor:respawn',{actorId:entity.id})}
 }
 if(!entity._componentDead&&first(entity,'Health')){const regen=Math.max(0,num(first(entity,'Health').regen));if(regen)entity.hp=Math.min(Math.max(1,num(entity.maxHp,100)),num(entity.hp,100)+regen*delta)}
 if(entity._weaponCooldown>0)entity._weaponCooldown=Math.max(0,entity._weaponCooldown-delta);
 }
}
export function tryComponentFire(shooter,target){
 if(!runtime.running||runtime.phase!=='playing'||!shooter||!target||shooter._componentDead)return false;
 const weapon=first(shooter,'Weapon');if(!weapon||shooter._weaponCooldown>0)return false;
 const rate=num(weapon.fireRate,8);if(rate<=0)return false;
 shooter._weaponCooldown=1/rate;
 applyComponentDamage(target,Math.max(0,num(weapon.damage,25)),shooter);
 emitGameplayEvent('weapon:fired',{actorId:shooter.id,targetId:target.id});
 return true;
}
