// Entity-scoped input bindings, shared by player and vehicle controllers.
// Bindings are data-only and serializable; legacy controls remain the default.
export const inputActionDefaults=Object.freeze({
 forward:'w,z,arrowup',backward:'s,arrowdown',left:'a,q,arrowleft',right:'d,arrowright',
 sprint:'shift',jump:'space',dodge:'control',interact:'e',handbrake:'space',crouch:'control,c',flashlight:'l'
});
const targets=Object.freeze({
 forward:'w',backward:'s',left:'a',right:'d',sprint:'shift',
 jump:'space',dodge:'control',interact:'e',handbrake:'space',crouch:'c',flashlight:'l'
});
const validKey=/^(?:[a-z0-9]|arrow(?:up|down|left|right)|space|shift|control|alt|enter|tab|escape|f[1-9]|f1[0-2])$/;
const parseKeys=value=>String(value??'').split(',').map(key=>key.trim().toLowerCase()).filter(Boolean);
const aliases=key=>key==='space'?['space',' ']:[key];
export const defaultInputActions=()=>({enabled:true,replaceDefaults:false,...inputActionDefaults});
export function inspectInputActions(config){
 if(!config||typeof config!=='object'||Array.isArray(config))return ['Input Actions : configuration invalide.'];
 const errors=[];
 for(const [action,value] of Object.entries(inputActionDefaults)){
  const keys=parseKeys(config[action]??value);
  if(!keys.length||keys.length>8||keys.some(key=>!validKey.test(key)))errors.push('Input Actions : touche invalide pour '+action);
 }
 if(config.replaceDefaults!==undefined&&typeof config.replaceDefaults!=='boolean')errors.push('Input Actions : replaceDefaults doit être booléen.');
 return errors;
}
export function resolveInputKeys(owner,rawKeys,{context='player'}={}){
 if(!owner?.inputActions||owner.inputActions.enabled===false||inspectInputActions(owner.inputActions).length)return rawKeys;
 const bindings=owner.inputActions;
 const keys=new Set(rawKeys instanceof Set?rawKeys:Array.isArray(rawKeys)?rawKeys:[]);
 const active=context==='vehicle'?['forward','backward','left','right','handbrake','interact']:['forward','backward','left','right','sprint','jump','dodge','interact','crouch','flashlight'];
 // Replace defaults only in this controller's projected view, not globally.
 if(bindings.replaceDefaults){
  for(const action of active)for(const key of parseKeys(inputActionDefaults[action]))for(const alias of aliases(key))keys.delete(alias);
 }
 for(const action of active){
  const values=parseKeys(bindings[action]??inputActionDefaults[action]);
  if(values.some(key=>aliases(key).some(alias=>rawKeys?.has?.(alias))))keys.add(targets[action]);
 }
 return keys;
}
