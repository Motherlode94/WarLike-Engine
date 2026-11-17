// Iron Defiance faction gameplay identities. Fictional, balanced for gameplay;
// these are not assertions about real military forces or their capabilities.
export const IRON_DOCTRINES=Object.freeze({
 rdc:{name:'Léopards du Congo',style:'Jungle et embuscade',signature:'Sentiers noirs',strength:'recon',speed:1.08,range:0.94,damage:1,attackInterval:1,roles:{recon:1.2,engineer:1.05},terrain:['jungle','river'],vehicleStyle:'4x4 léger et patrouille',voice:'fr-CG',flag:'leopard-river'},
 china:{name:'Dragon de l’Aube',style:'Coordination mécanisée',signature:'Écran du Dragon',strength:'fire-support',speed:0.97,range:1.08,damage:1,attackInterval:0.96,roles:{'fire-support':1.15,engineer:1.05},terrain:['urban','industrial'],vehicleStyle:'blindé de soutien',voice:'zh-CN',flag:'dawn-dragon'},
 russia:{name:'Garde Boréale',style:'Tenue de position',signature:'Rempart boréal',strength:'anti-tank',speed:0.91,range:1.06,damage:1.12,attackInterval:1.08,roles:{'anti-tank':1.2},terrain:['snow','forest'],vehicleStyle:'blindé lourd',voice:'ru-RU',flag:'boreal-bear'},
 usa:{name:'Liberty Vanguard',style:'Mobilité et soutien',signature:'Œil d’aigle',strength:'recon',speed:1.07,range:1.08,damage:0.98,attackInterval:0.96,roles:{recon:1.16,medic:1.04},terrain:['desert','urban'],vehicleStyle:'reconnaissance et transport',voice:'en-US',flag:'liberty-eagle'},
 france:{name:'Légion de l’Aube',style:'Manœuvre flexible',signature:'Avant-garde',strength:'assault',speed:1.06,range:1,damage:1.02,attackInterval:0.98,roles:{assault:1.12,medic:1.08},terrain:['urban','hills'],vehicleStyle:'transport léger',voice:'fr-FR',flag:'dawn-legion'},
 ukraine:{name:'Bouclier du Dniepr',style:'Défense et réparation',signature:'Bouclier mobile',strength:'engineer',speed:1.01,range:1.04,damage:1,attackInterval:1,roles:{engineer:1.22,'anti-tank':1.08},terrain:['fields','urban'],vehicleStyle:'défense mobile',voice:'uk-UA',flag:'dniepr-shield'},
 japan:{name:'Soleil Kensei',style:'Précision et reconnaissance',signature:'Silence Kensei',strength:'recon',speed:1.12,range:1.02,damage:0.96,attackInterval:0.93,roles:{recon:1.18,assault:1.04},terrain:['mountain','urban'],vehicleStyle:'reconnaissance rapide',voice:'ja-JP',flag:'kensei-sun'}
});
export function factionTacticalConfig(faction,specialty='assault',base={}){
 const doctrine=IRON_DOCTRINES[faction];if(!doctrine)throw Error('Doctrine inconnue : '+faction);
 const roleFactor=doctrine.roles[specialty]||1;
 const round=value=>Math.round(value*100)/100;
 return {...base,
  speed:round((Number(base.speed)||95)*doctrine.speed*(specialty===doctrine.strength?1.03:1)),
  attackRange:round((Number(base.attackRange)||190)*doctrine.range),
  damage:round((Number(base.damage)||9)*doctrine.damage*roleFactor),
  attackInterval:round((Number(base.attackInterval)||.8)*doctrine.attackInterval),
  ironDoctrine:{faction,signature:doctrine.signature,style:doctrine.style,terrain:doctrine.terrain.slice(),vehicleStyle:doctrine.vehicleStyle,voice:doctrine.voice,flag:doctrine.flag}
 };
}
