// WarLike Threat Intelligence: authorable NPC identity, faction and runtime perception.
// Scanner reads actual AI state and distance; it does not invent unseen enemies.
export const threatFactions=['civilian','player','guard','bandit','undead','military','creature','custom'];
export const threatRelations=['friendly','neutral','suspicious','hostile'];
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function threatProfile(entity,player){
 if(!entity||entity===player||!entity.ai?.enabled)return null;
 const intelligence=entity.threatIntel||{};
 const relation=threatRelations.includes(intelligence.relation)?intelligence.relation:'hostile';
 const faction=threatFactions.includes(intelligence.faction)?intelligence.faction:'custom';
 const hp=finite(entity.stats?.health??entity.hp,100);
 const maximum=Math.max(1,finite(entity.stats?.maxHealth,100));
 const px=finite(player?.x)+finite(player?.w)/2,py=finite(player?.y)+finite(player?.h)/2;
 const ex=finite(entity.x)+finite(entity.w)/2,ey=finite(entity.y)+finite(entity.h)/2;
 const distance=Math.hypot(ex-px,ey-py);
 const state=hp<=0?'dead':String(entity.ai.state||'idle');
 const detection=Math.max(0,finite(entity.ai.detection,450));
 const attackRange=Math.max(0,finite(entity.ai.attackRange,65));
 const damage=Math.max(0,finite(entity.ai.attackDamage,8));
 const level=clamp(Math.floor(finite(intelligence.level,1)),1,100);
 const severity=relation==='hostile'?clamp(Math.round(level*.5+damage*.8+(state==='attack'?20:state==='chase'?10:0)),0,100):0;
 return {id:entity.id,name:String(entity.name||'Inconnu').slice(0,80),faction,relation,
  className:String(intelligence.className||'PNJ').slice(0,40),level,weakness:String(intelligence.weakness||'Non identifiée').slice(0,100),
  state,distance:Math.round(distance),detection,attackRange,damage,
  health:clamp(Math.round(hp),0,maximum),maxHealth:maximum,severity,
  lastKnownX:Number.isFinite(entity.ai.lastKnownX)?entity.ai.lastKnownX:null,
  lastKnownY:Number.isFinite(entity.ai.lastKnownY)?entity.ai.lastKnownY:null,
  detected:entity.ai.detected===true,visible:entity.ai.visible===true};
}
export function scanThreats(entities,player,{radius=900,hostileOnly=false}={}){
 const reach=clamp(finite(radius,900),1,10000);
 return (entities||[]).map(o=>threatProfile(o,player))
  .filter(p=>p&&p.distance<=reach&&(!hostileOnly||p.relation==='hostile'))
  .sort((a,b)=>b.severity-a.severity||a.distance-b.distance||a.id-b.id);
}
