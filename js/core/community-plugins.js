// WarLike Open Ecosystem — data-only community packs (v1).
// Deliberately NO remote loading, eval, dynamic import, or executable extensions.
// A pack can register only validated Logic Sequence recipes.
import {sequenceEvents,sequenceConditions,sequenceInstructions} from './logic-sequences.js';
export const communityApiVersion='1.0';
const KEY='warlike.community.packs.v1',MAX_PACKS=30,MAX_RECIPES=20,MAX_BYTES=131072;
const safeText=(v,max=80)=>typeof v==='string'?v.trim().slice(0,max):'';
const slug=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{2,63}$/.test(v);
const reserved=new Set(['__proto__','constructor','prototype']);
const safeKey=v=>typeof v==='string'&&/^[a-zA-Z][a-zA-Z0-9_:-]{0,59}$/.test(v)&&!reserved.has(v);
const allowedActions=new Set(sequenceInstructions.filter(x=>!['destroyObject','teleportObject','moveObject','damageObject','setHealth','addHealth'].includes(x)));
const allowedConditions=new Set(sequenceConditions.filter(x=>x!=='randomChance'));
const keys=new Set(['enabled','event','key','radius','once','interval','signal','conditions','instructions','branches','elseInstructions']);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const scalar=v=>typeof v==='string'?v.slice(0,160):typeof v==='boolean'?v:Number.isFinite(v)?v:null;
const allowedSteps=steps=>{
 if(!Array.isArray(steps)||steps.length>24)throw Error('Une recette accepte au plus 24 actions.');
 return steps.map(s=>{
  if(!s||typeof s!=='object'||Array.isArray(s)||!allowedActions.has(s.type))throw Error('Action Blueprint non autorisée.');
  const result={type:s.type};
  for(const k of ['key','value','targetRole','slot','x','y']){
   if(!own(s,k))continue;
   if(k==='targetRole'&&s[k]!=='player')throw Error('Seule la cible player est autorisée.');
   if(k==='key'||k==='slot'){const value=safeText(s[k],60);if(!safeKey(value))throw Error('Clé non autorisée.');result[k]=value;continue}
   const value=scalar(s[k]);if(value===null)throw Error('Paramètre non scalaire.');result[k]=value;
  }
  return result;
 });
};
const conditions=value=>{
 if(!Array.isArray(value)||value.length>8)throw Error('Trop de conditions.');
 return value.map(c=>{
  if(!c||typeof c!=='object'||!allowedConditions.has(c.type))throw Error('Condition non autorisée.');
  const key=safeText(c.key,60);
  if((c.type==='variable'||c.type==='localVariable')&&!safeKey(key))throw Error('Clé de condition non autorisée.');
  if(c.value!==undefined&&scalar(c.value)===null)throw Error('Valeur de condition non scalaire.');
  return {type:c.type,key,value:scalar(c.value)??0,operator:['==','!=','>','<','>=','<='].includes(c.operator)?c.operator:'=='};
 });
};
function sequence(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Séquence absente.');
 for(const key of Object.keys(value))if(!keys.has(key))throw Error('Champ Blueprint non autorisé : '+key);
 if(!sequenceEvents.includes(value.event))throw Error('Déclencheur inconnu.');
 const result={enabled:true,event:value.event,key:safeText(value.key,1)||'e',
  radius:Math.max(0,Math.min(500,Number(value.radius)||110)),once:value.once===true,
  interval:Math.max(.1,Math.min(120,Number(value.interval)||2)),
  signal:safeText(value.signal,60),conditions:conditions(value.conditions||[]),
  instructions:allowedSteps(value.instructions||[])};
 if(value.branches!==undefined){
  if(!Array.isArray(value.branches)||value.branches.length>4)throw Error('Trop de branches.');
  result.branches=value.branches.map(b=>({conditions:conditions(b.conditions||[]),instructions:allowedSteps(b.instructions||[])}));
 }
 if(value.elseInstructions!==undefined)result.elseInstructions=allowedSteps(value.elseInstructions);
 return result;
}
export function validateCommunityPack(input){
 const size=JSON.stringify(input).length;
 if(size>MAX_BYTES)throw Error('Pack trop volumineux (128 Ko max).');
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Manifest JSON requis.');
 if(input.apiVersion!==communityApiVersion)throw Error('Version API incompatible.');
 if(!slug(input.id))throw Error('Identifiant requis : minuscules, chiffres et tirets.');
 if(!/^\d+\.\d+\.\d+$/.test(input.version||''))throw Error('Version SemVer x.y.z requise.');
 if(!Array.isArray(input.recipes)||input.recipes.length<1||input.recipes.length>MAX_RECIPES)throw Error('Entre 1 et 20 recettes requises.');
 const seen=new Set();
 const recipes=input.recipes.map(recipe=>{
  if(!recipe||!slug(recipe.id)||seen.has(recipe.id))throw Error('Identifiant de recette invalide ou dupliqué.');
  seen.add(recipe.id);
  const modes=recipe.modes===undefined?packModes:recipe.modes;
  if(!Array.isArray(modes)||!modes.length||modes.some(m=>!packModes.includes(m))||new Set(modes).size!==modes.length)throw Error('Modes de recette incompatibles.');
  return {id:recipe.id,modes:[...modes],name:safeText(recipe.name,80)||recipe.id,
   description:safeText(recipe.description,200),sequence:sequence(recipe.sequence)};
 });
 return {apiVersion:communityApiVersion,id:input.id,version:input.version,
  name:safeText(input.name,80)||input.id,modes:[...packModes],author:safeText(input.author,80)||'Communauté',
  description:safeText(input.description,300),recipes};
}
export function compareCommunityVersions(a,b){
 const semver=/^\d+\.\d+\.\d+$/;
 if(!semver.test(a)||!semver.test(b))throw Error('Version SemVer invalide.');
 const aa=a.split('.').map(Number),bb=b.split('.').map(Number);
 if([...aa,...bb].some(n=>!Number.isSafeInteger(n)))throw Error('Numéro de version trop élevé.');
 for(let i=0;i<3;i++)if(aa[i]!==bb[i])return aa[i]>bb[i]?1:-1;
 return 0;
}
export function previewCommunityPack(input){
 const pack=validateCommunityPack(input);
 const installed=packs.find(p=>p.id===pack.id);
 const relation=installed?compareCommunityVersions(pack.version,installed.version):null;
 return {pack,installedVersion:installed?.version||null,
  action:!installed?'install':relation>0?'upgrade':relation===0?'same-version':'downgrade',
  compatible:pack.apiVersion===communityApiVersion,
  permissions:['Écrire des variables Blueprint','Déclencher les actions Blueprint autorisées'],
  recipes:pack.recipes.map(r=>({id:r.id,name:r.name,modes:r.modes,event:r.sequence.event,actions:r.sequence.instructions.map(x=>x.type) }))};
}
let packs=[];
export function installedCommunityPacks(){return packs.map(p=>structuredClone(p))}
export function loadCommunityPacks(storage=globalThis.localStorage){
 let raw='[]';try{raw=storage?.getItem(KEY)||'[]'}catch{}
 try{const parsed=JSON.parse(raw);packs=Array.isArray(parsed)?parsed.slice(0,MAX_PACKS).flatMap(p=>{try{return [validateCommunityPack(p)]}catch{return []}}):[]}
 catch{packs=[]}
 return installedCommunityPacks();
}
export function installCommunityPack(input,storage=globalThis.localStorage){
 const pack=validateCommunityPack(input);
 const existing=packs.find(p=>p.id===pack.id);
 if(existing&&compareCommunityVersions(pack.version,existing.version)<=0)throw Error('Cette version est déjà installée ou plus ancienne.');
 const next=[...packs.filter(p=>p.id!==pack.id),pack];
 if(next.length>MAX_PACKS)throw Error('Limite de 30 packs atteinte.');
 try{storage?.setItem(KEY,JSON.stringify(next))}catch{throw Error('Stockage local indisponible : pack non installé.')}
 packs=next;return structuredClone(pack);
}
export function uninstallCommunityPack(id,storage=globalThis.localStorage){
 const next=packs.filter(p=>p.id!==id);
 if(next.length===packs.length)return false;
 try{storage?.setItem(KEY,JSON.stringify(next))}catch{throw Error('Impossible de sauvegarder la suppression.')}
 packs=next;return true;
}
export function communityRecipes(mode=null){
 return packs.flatMap(pack=>pack.recipes.filter(recipe=>!mode||recipe.modes.includes(mode)).map(recipe=>({
  id:'community:'+pack.id+':'+recipe.id,name:recipe.name,
  description:pack.name+' · '+recipe.description,category:'Communauté',
  author:pack.author,modes:[...recipe.modes]
 })));
}
export function applyCommunityRecipe(entity,id,mode=null){
 if(!entity||typeof entity!=='object'||typeof id!=='string'||!id.startsWith('community:'))return false;
 for(const pack of packs)for(const recipe of pack.recipes){
  if(id==='community:'+pack.id+':'+recipe.id&&(!mode||recipe.modes.includes(mode))){
   entity.sequence=structuredClone(recipe.sequence);
   return true;
  }
 }
 return false;
}
