// Iron Defiance — fictional uniforms for seven playable factions.
// Pure serializable data. These symbols are original, not official insignias.
export const FACTIONS=Object.freeze({
 rdc:{name:'RDC',title:'Léopards du Congo',flag:'leopard-river',colors:{forest:'#17191A',urban:'#202225',desert:'#282626',winter:'#33363A',night:'#0D0F12'},accent:'#E3B847',patch:'leopard'},
 china:{name:'Chine',title:'Dragon de l’Aube',flag:'dawn-dragon',colors:{forest:'#52664A',urban:'#4F5960',desert:'#B19B72',night:'#33373B'},accent:'#D9B255',patch:'dragon'},
 russia:{name:'Russie',title:'Garde Boréale',flag:'boreal-bear',colors:{forest:'#566653',urban:'#66717A',desert:'#A59A7E',night:'#34454A',winter:'#C7CDD2'},accent:'#B3D6E3',patch:'polar-bear'},
 usa:{name:'USA',title:'Liberty Vanguard',flag:'liberty-eagle',colors:{forest:'#5D6651',urban:'#6D7372',desert:'#B2A07B',night:'#303C4D'},accent:'#CEDAE5',patch:'eagle'},
 france:{name:'France',title:'Légion de l’Aube',flag:'dawn-legion',colors:{forest:'#556554',urban:'#68706D',desert:'#AE9B79',night:'#313D50'},accent:'#E6C979',patch:'sword-lily'},
 ukraine:{name:'Ukraine',title:'Bouclier du Dniepr',flag:'dniepr-shield',colors:{forest:'#65704C',urban:'#68716C',desert:'#B7AA82',night:'#384652'},accent:'#E2CC65',patch:'shield'},
 japan:{name:'Japon',title:'Soleil Kensei',flag:'kensei-sun',colors:{forest:'#525E4D',urban:'#667079',desert:'#B0A18A',night:'#32383B'},accent:'#D88E83',patch:'rising-sun'}
});
export const UNIFORM_ROLES=Object.freeze(['infantry','recon','medic','engineer','crew','officer']);
export const UNIFORM_ENVIRONMENTS=Object.freeze(['forest','urban','desert','winter','night']);
const slots=['headgear','vest','gloves','boots','backpack'];
export const EQUIPMENT_OPTIONS=Object.freeze({
 headgear:['helmet','cap','beret','none'],vest:['light','standard','heavy'],gloves:['standard','reinforced'],boots:['standard','insulated'],backpack:['none','compact','field']
});
const isColor=value=>typeof value==='string'&&/^#[\da-f]{6}$/i.test(value);
export function createUniform(faction='rdc',{environment='forest',role='infantry',equipment={},customColor=null,patchEnabled=true,rankMark='none'}={}){
 const definition=FACTIONS[faction];if(!definition)throw Error('Faction inconnue : '+faction);
 if(!UNIFORM_ENVIRONMENTS.includes(environment))throw Error('Environnement inconnu.');
 if(!UNIFORM_ROLES.includes(role))throw Error('Spécialité inconnue.');
 if(customColor!==null&&!isColor(customColor))throw Error('Couleur uniforme invalide.');
 if(typeof patchEnabled!=='boolean')throw Error('Patch invalide.');
 if(typeof rankMark!=='string'||rankMark.length>32)throw Error('Grade invalide.');
 const kit={headgear:'helmet',vest:'standard',gloves:'standard',boots:'standard',backpack:'field'};
 for(const key of slots){const choice=equipment[key];if(choice!==undefined){if(!EQUIPMENT_OPTIONS[key].includes(choice))throw Error('Équipement invalide : '+key);kit[key]=choice;}}
 if(role==='medic')kit.backpack='field';
 if(role==='crew'&&equipment.headgear===undefined)kit.headgear='cap';
 return {version:1,faction,role,environment,baseColor:customColor||definition.colors[environment]||definition.colors.urban,accentColor:definition.accent,patch:patchEnabled?definition.patch:null,flag:definition.flag,rankMark,equipment:kit};
}
// Keeps mesh, scripts and runtime state intact; ordinary prefab colors render via entity.color.
export function applyUniform(entity,uniform){
 if(!entity||!uniform||uniform.version!==1||!FACTIONS[uniform.faction]||!isColor(uniform.baseColor))throw Error('Uniforme non valide.');
 entity.ironUniform=structuredClone(uniform);
 entity.color=uniform.baseColor;
 entity.colorCustomized=true;
 return entity;
}
export function updateUniform(entity,options={}){
 if(!entity?.ironUniform)throw Error('Uniforme absent.');
 return applyUniform(entity,createUniform(entity.ironUniform.faction,{
  environment:options.environment??entity.ironUniform.environment,
  role:options.role??entity.ironUniform.role,
  equipment:{...entity.ironUniform.equipment,...options.equipment},
  customColor:options.customColor??null,
  patchEnabled:options.patchEnabled??!!entity.ironUniform.patch,
  rankMark:options.rankMark??entity.ironUniform.rankMark
 }));
}
export function factionUniforms(faction){return UNIFORM_ENVIRONMENTS.map(environment=>createUniform(faction,{environment}));}
