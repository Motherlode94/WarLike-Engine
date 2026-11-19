// Registry for declared editor components. Registration does not imply Play/export support.
// Extensions may attach data but must provide a separately verified runtime integration.
// Definitions/functions remain in the registry, never serialized into the scene.
const registry=new Map();
const idPattern=/^[a-z][a-zA-Z0-9]{2,63}$/;
const allowedTypes=new Set(['number','boolean','string','color','enum','vector3']);
const modes=new Set(['2d','3d']);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const safeClone=value=>structuredClone(value);
export function validateComponentManifest(spec,builtinIds=[]){
 if(!plain(spec))throw new TypeError('Component manifest must be an object');
 const {id,name,category,defaults,properties,description='',supportedModes=['2d','3d']} =spec;
 if(typeof id!=='string'||!idPattern.test(id)||id==='constructor'||id==='prototype'||id==='__proto__')throw Error('Invalid component ID');
 if(builtinIds.includes(id))throw Error('Component ID already belongs to the engine: '+id);
 if(typeof name!=='string'||!name.trim()||name.length>100)throw Error('Component name required');
 if(typeof category!=='string'||!category.trim()||category.length>80)throw Error('Component category required');
 if(typeof description!=='string'||description.length>500)throw Error('Invalid component description');
 if(!Array.isArray(supportedModes)||!supportedModes.length||supportedModes.some(x=>!modes.has(x)))throw Error('Invalid component modes');
 if(!plain(defaults))throw Error('Component defaults must be an object');
 if(!plain(properties))throw Error('Component properties must be an object');
 for(const [key,meta] of Object.entries(properties)){
  if(!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)||!plain(meta)||!allowedTypes.has(meta.type))throw Error('Invalid property schema: '+key);
  if(!Object.hasOwn(defaults,key))throw Error('Missing default for '+key);
  if(meta.type==='number'&&(!Number.isFinite(defaults[key])||(Number.isFinite(meta.min)&&defaults[key]<meta.min)||(Number.isFinite(meta.max)&&defaults[key]>meta.max)))throw Error('Invalid number default: '+key);
  if(meta.type==='boolean'&&typeof defaults[key]!=='boolean')throw Error('Invalid boolean default: '+key);
  if(meta.type==='string'&&typeof defaults[key]!=='string')throw Error('Invalid string default: '+key);
  if(meta.type==='color'&&!/^#[0-9a-f]{6}$/i.test(defaults[key]))throw Error('Invalid color default: '+key);
  if(meta.type==='enum'&&(!Array.isArray(meta.options)||!meta.options.includes(defaults[key])))throw Error('Invalid enum default: '+key);
  if(meta.type==='vector3'&&(!plain(defaults[key])||!['x','y','z'].every(axis=>Number.isFinite(defaults[key][axis]))))throw Error('Invalid vector3 default: '+key);
 }
 try{safeClone(defaults)}catch{throw Error('Defaults must be serializable')}
 const json=JSON.stringify(defaults);
 if(typeof json!=='string'||json.length>32768)throw Error('Component defaults too large');
 // Runtime is intentionally "unverified"; displaying a manifest does not implement behavior.
 return Object.freeze({id,name,category,description,modes:[...new Set(supportedModes)],runtime:'unverified',properties:safeClone(properties),defaults:safeClone(defaults)});
}
export function registerComponentManifest(spec,{builtinIds=[]}={}){
 const manifest=validateComponentManifest(spec,builtinIds);
 if(registry.has(manifest.id))throw Error('Component already registered: '+manifest.id);
 registry.set(manifest.id,manifest);
 return manifest.id;
}
export function unregisterComponentManifest(id){return registry.delete(id)}
export function getRegisteredComponentManifest(id){return registry.get(id)||null}
export function getRegisteredComponentManifests(mode){
 return [...registry.values()].filter(x=>x.modes.includes(mode));
}
export function registeredComponentChoices(mode){
 return getRegisteredComponentManifests(mode).map(spec=>({
  id:spec.id,name:spec.name,category:spec.category,description:spec.description+' · Runtime non intégré (données éditables uniquement).',
  modes:spec.modes,runtime:'unverified',properties:spec.properties,extension:true,
  create:()=>safeClone(spec.defaults)
 }));
}
