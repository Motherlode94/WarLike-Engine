import {validateScene,reparent,worldTransformMatrices,decomposeTransformMatrix,legacyReferenceMatrix3d} from './scene-graph-v2.js';

export const SCENE_SCHEMA='warlike.scene.v2';
export const UNITS_PER_METRE=64;
const clone=value=>structuredClone(value);
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const validId=id=>Number.isSafeInteger(id)&&id>0;
const webKeys=['webScripts','warScripts','stats','inventory','ai','controller2d','controller3d','socket3d','collider2d','collider3d','rigidbody2d','rigidbody3d','joint3d','sequence','animatorGraph','animationStudio','animationRig','superhero','rpgProgression','survival','simulationNode'];

// Canonical transforms use metres, degrees and X/Y/Z. Legacy x/y are the
// ground-plane X/Z in pixels; elevation3d is vertical Y in metres.
export function canonicalScene(entities,{id='main',name='Scène'}={}){
 if(!Array.isArray(entities))throw Error('Liste d’objets attendue.');
 const ids=new Set();for(const e of entities){if(!validId(e?.id)||ids.has(e.id))throw Error('Identifiant d’objet invalide ou dupliqué.');ids.add(e.id)}
 const keys=new Map(entities.map(e=>[e.id,e.sceneObjectId||'entity-'+e.id]));
 const objects=entities.map(e=>{
  const components=[{type:'Transform',position:[finite(e.x)/64,finite(e.elevation3d),finite(e.y)/64],rotation:[finite(e.rotationX3d),finite(e.rotation),finite(e.rotationZ3d)],scale:[1,1,1]},
   {type:'LegacyEntity',data:clone(e)}];
  if(Array.isArray(e.worldMatrix3d)&&e.worldMatrix3d.length===16&&e.worldMatrix3d.every(Number.isFinite)){
   components[0].matrix=[...e.worldMatrix3d];components[0].matrixMode='affine';
  }
  for(const key of webKeys)if(e[key]&&typeof e[key]==='object')components.push({type:key,data:clone(e[key])});
  for(const [index,c] of (e.csharpComponents||[]).entries())components.push({type:'NativeBehaviour',index,data:clone(c)});
  return {id:keys.get(e.id),sourceEntityId:e.id,name:e.name||'GameObject',parentId:keys.get(e.parentId)??null,active:e.enabled!==false,components};
 });
 const scene={schema:SCENE_SCHEMA,id,name,objects};const errors=validateScene(scene);if(errors.length)throw Error(errors.join('; '));
 // Legacy entity coordinates are WORLD space. Convert each authored parent
 // link to LOCAL space without visually moving any object. Exact affine
 // matrices retain shear induced by rotated/non-uniformly scaled parents.
 const parents=objects.filter(o=>o.parentId!==null).map(o=>[o.id,o.parentId]);
 for(const o of objects)o.parentId=null;
 for(const [child,parent] of parents)reparent(scene,child,parent);
 return scene;
}
export function runtimeEntities(scene){
 if(scene?.schema!==SCENE_SCHEMA){if(Array.isArray(scene?.entities))return clone(scene.entities);throw Error('Schéma de scène inconnu.')}
 const errors=validateScene(scene);if(errors.length)throw Error(errors.join('; '));
 const worlds=worldTransformMatrices(scene);
 const used=new Set(),ids=new Map();let next=1;
 for(const o of scene.objects){const legacy=o.components.find(c=>c.type==='LegacyEntity')?.data,preferred=o.sourceEntityId??legacy?.id;
  if(preferred!==undefined){if(!validId(preferred)||used.has(preferred))throw Error('ID runtime invalide ou dupliqué.');used.add(preferred);ids.set(o.id,preferred)}}
 for(const o of scene.objects)if(!ids.has(o.id)){while(used.has(next))next++;ids.set(o.id,next);used.add(next++)}
 return scene.objects.map(o=>{
  const legacy=o.components.find(c=>c.type==='LegacyEntity')?.data,t=o.components.find(c=>c.type==='Transform'),mesh=o.components.find(c=>c.type==='MeshRenderer');
  const e=legacy?clone(legacy):{type:mesh?'mesh3d':'object',w:64,h:64,depth3d:64,color:mesh?.color||'#8195ef'};
  e.id=ids.get(o.id);e.name=o.name;e.enabled=o.active!==false;
  if(!legacy)e.sceneObjectId=o.id;
  if(o.parentId!==null)e.parentId=ids.get(o.parentId);else delete e.parentId;
  const world=worlds.get(o.id),pose=decomposeTransformMatrix(world);
  // The legacy renderer now consumes exact affine correction matrices where TRS cannot represent shear.
  const position=pose?.position||[world[12],world[13],world[14]],rotation=pose?.rotation||t.rotation,scale=pose?.scale||[1,1,1];
  Object.assign(e,{x:position[0]*64,y:position[2]*64,elevation3d:position[1],rotation:rotation[1],rotationX3d:rotation[0],rotationZ3d:rotation[2],
   w:Math.max(.001,finite(e.w,64)*Math.abs(scale[0])),h:Math.max(.001,finite(e.h,64)*Math.abs(scale[1])),depth3d:Math.max(.001,finite(e.depth3d,64)*Math.abs(scale[2]))});
  if(!pose){
   e.worldMatrix3d=[...world];
   e.matrixReference3d=legacyReferenceMatrix3d(e);
  }else{delete e.worldMatrix3d;delete e.matrixReference3d;}
  if(mesh)Object.assign(e,{assetId:'primitive-'+({box:'cube',sphere:'sphere',cylinder:'cylinder'}[mesh.shape]||'cube'),meshShape:mesh.shape==='box'?'cube':mesh.shape,color:mesh.color,visible:mesh.visible!==false,materialRoughness:mesh.roughness,materialMetallic:mesh.metalness});
  const box=o.components.find(c=>c.type==='BoxCollider');if(box)e.collider3d={enabled:true,shape:'box',size:clone(box.size),isTrigger:box.isTrigger===true};
  const body=o.components.find(c=>c.type==='Rigidbody');if(body)e.rigidbody3d={enabled:true,bodyType:body.bodyType,mass:body.mass,gravityScale:body.gravityScale};
  for(const key of webKeys){const c=o.components.find(c=>c.type===key);if(c)e[key]=clone(c.data)}
  const native=o.components.filter(c=>c.type==='NativeBehaviour');if(native.length)e.csharpComponents=native.map(c=>clone(c.data));
  return e;
 });
}
export function bridgeScene(entities,options){const scene=canonicalScene(entities,options);return {...scene,version:6,entities:runtimeEntities(scene)}}
export function runtimeFrame(entities){return entities.map(e=>({id:e.id,x:finite(e.x),y:finite(e.y),elevation3d:finite(e.elevation3d),rotation:finite(e.rotation),hp:finite(e.stats?.health,finite(e.hp,100)),enabled:e.enabled!==false,...(e.animatorGraph?{animator:{stateId:e._animatorFrame?.stateId||'',normalizedTime:e._animatorFrame?.normalizedTime||0,transition:(e._animatorFrame?.blend??1)<1,parameters:{...(e._animatorFrame?.parameters||{}),...(e.animatorParameters||{})}}}:{})}))}
