export const CONFIG = Object.freeze({requiredRelays:3,playerMaxHealth:100,enemyDamage:10,fireCooldown:0.24,enemyRange:2.15,playerSpeed:5.8});
export const initialMission=()=>({phase:"menu",relays:[false,false,false],health:100,kills:0,shots:0,elapsed:0,message:"Active les trois relais, puis rejoins l'extraction."});
export const countRelays=mission=>mission.relays.filter(Boolean).length;
export function activateRelay(mission,index){
  if(mission.phase!=="playing"||!Number.isInteger(index)||index<0||index>=mission.relays.length)return false;
  if(mission.relays[index])return false;
  mission.relays[index]=true;mission.message="Relais "+(index+1)+" activé ("+countRelays(mission)+"/"+CONFIG.requiredRelays+").";return true;
}
export function tryExtract(mission){
  if(mission.phase!=="playing")return false;
  if(countRelays(mission)!==CONFIG.requiredRelays){mission.message="Extraction verrouillée : active tous les relais.";return false;}
  mission.phase="won";mission.message="OPÉRATION RÉUSSIE — tous les relais sont actifs.";return true;
}
export function damagePlayer(mission,amount){
  if(mission.phase!=="playing")return;
  mission.health=Math.max(0,mission.health-Math.max(0,amount));
  if(mission.health===0){mission.phase="lost";mission.message="ÉCHEC DE LA MISSION — équipe neutralisée.";}
}
export function startMission(){const mission=initialMission();mission.phase="playing";return mission;}
