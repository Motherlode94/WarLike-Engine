const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export const defaultRpgProgression=()=>({enabled:true,level:1,experience:0,skillPoints:0,trainingFocus:'power',skills:{power:0,guard:0,command:0}});
export const experienceForLevel=level=>100*Math.max(1,Math.min(99,Math.floor(n(level,1))));
export function awardExperience(actor,amount){
 const p=actor?.rpgProgression;if(!p||p.enabled===false)return 0;
 p.level=Math.max(1,Math.min(100,Math.floor(n(p.level,1))));p.experience=Math.max(0,n(p.experience))+Math.max(0,n(amount));let gained=0;
 while(p.level<100&&p.experience>=experienceForLevel(p.level)){p.experience-=experienceForLevel(p.level);p.level++;p.skillPoints=Math.max(0,n(p.skillPoints))+1;gained++;
  if(actor.stats){actor.stats.maxHealth=Math.max(1,n(actor.stats.maxHealth,100))+10;actor.stats.health=Math.min(actor.stats.maxHealth,n(actor.stats.health,100)+10);actor.hp=actor.stats.health}
 }
 if(p.level===100)p.experience=Math.min(p.experience,experienceForLevel(99));return gained;
}
export function upgradeHeroSkill(actor,skill){
 const p=actor?.rpgProgression;if(!p||p.enabled===false||!['power','guard','command'].includes(skill)||n(p.skillPoints)<1)return false;
 p.skills??={power:0,guard:0,command:0};if(n(p.skills[skill])>=5)return false;p.skills[skill]=Math.max(0,Math.floor(n(p.skills[skill])))+1;p.skillPoints--;return true;
}
export const skillRank=(actor,skill)=>actor?.rpgProgression?.enabled===false?0:Math.max(0,Math.min(5,n(actor?.rpgProgression?.skills?.[skill])));
export const progressionDamageScale=actor=>1+Math.max(0,Math.min(99,n(actor?.rpgProgression?.enabled===false?1:actor?.rpgProgression?.level,1))-1)*.035+skillRank(actor,'power')*.12;
