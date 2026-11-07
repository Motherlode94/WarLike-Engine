// WarLike Core V2 — independent, versioned scene graph. No browser dependency.
const clone=value=>structuredClone(value);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const vector=(input,defaultValue)=>Array.isArray(input)&&input.length===3&&input.every(finite)?[...input]:[...defaultValue];
export function createScene(name='Untitled'){
 return {schema:'warlike.scene.v2',id:'scene-'+crypto.randomUUID(),name,objects:[]};
}
export function createGameObject(name='GameObject',id=crypto.randomUUID()){
 return {id,name,parentId:null,active:true,components:[
  {type:'Transform',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}
 ]};
}
export function addGameObject(scene,object,parentId=null){
 if(!scene?.objects||!object?.id||scene.objects.some(o=>o.id===object.id))throw Error('GameObject invalide ou identifiant en double');
 if(parentId!==null&&!scene.objects.some(o=>o.id===parentId))throw Error('Parent introuvable');
 object.parentId=parentId;scene.objects.push(object);return object;
}
export function addComponent(object,component){
 if(!object?.components||!component?.type||typeof component.type!=='string')throw Error('Composant invalide');
 if(component.type==='Transform'&&object.components.some(c=>c.type==='Transform'))throw Error('Transform unique par GameObject');
 const entry=clone(component);object.components.push(entry);return entry;
}
// Column-major affine Matrix4 (metres, XYZ Euler degrees) for the canonical
// scene graph. Matrix overrides preserve affine shear after Keep World reparent.
export const identityMatrix4=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
export function multiplyMatrix4(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==16||b.length!==16||![...a,...b].every(finite))throw Error('Matrices invalides');
 const out=Array(16).fill(0);
 for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];
 return out;
}
export function invertMatrix4(input){
 if(!Array.isArray(input)||input.length!==16||!input.every(finite))throw Error('Matrice invalide');
 const rows=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>c<4?input[c*4+r]:Number(c-4===r)));
 for(let c=0;c<4;c++){
  let pivot=c;for(let r=c+1;r<4;r++)if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c]))pivot=r;
  if(Math.abs(rows[pivot][c])<1e-10)throw Error('Transform parent non inversible (échelle nulle ou matrice singulière)');
  [rows[c],rows[pivot]]=[rows[pivot],rows[c]];
  const value=rows[c][c];for(let j=0;j<8;j++)rows[c][j]/=value;
  for(let r=0;r<4;r++)if(r!==c){const v=rows[r][c];for(let j=0;j<8;j++)rows[r][j]-=v*rows[c][j]}
 }
 return Array.from({length:16},(_,i)=>rows[i%4][4+Math.floor(i/4)]);
}
export function composeTransformMatrix(position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]){
 if(![position,rotation,scale].every(v=>Array.isArray(v)&&v.length===3&&v.every(finite)))throw Error('Transform TRS invalide');
 const [x,y,z]=rotation.map(v=>v*Math.PI/360),cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);
 const qx=sx*cy*cz+cx*sy*sz,qy=cx*sy*cz-sx*cy*sz,qz=cx*cy*sz+sx*sy*cz,qw=cx*cy*cz-sx*sy*sz;
 const x2=qx*2,y2=qy*2,z2=qz*2,xx=qx*x2,xy=qx*y2,xz=qx*z2,yy=qy*y2,yz=qy*z2,zz=qz*z2,wx=qw*x2,wy=qw*y2,wz=qw*z2;
 return [
  (1-yy-zz)*scale[0],(xy+wz)*scale[0],(xz-wy)*scale[0],0,
  (xy-wz)*scale[1],(1-xx-zz)*scale[1],(yz+wx)*scale[1],0,
  (xz+wy)*scale[2],(yz-wx)*scale[2],(1-xx-yy)*scale[2],0,
  ...position,1
 ];
}
export function decomposeTransformMatrix(m){
 if(!Array.isArray(m)||m.length!==16||!m.every(finite))throw Error('Matrice de transformation invalide');
 const position=[m[12],m[13],m[14]],scale=[Math.hypot(m[0],m[1],m[2]),Math.hypot(m[4],m[5],m[6]),Math.hypot(m[8],m[9],m[10])];
 if(scale.some(v=>v<1e-10))return null;
 const determinant=m[0]*(m[5]*m[10]-m[6]*m[9])-m[4]*(m[1]*m[10]-m[2]*m[9])+m[8]*(m[1]*m[6]-m[2]*m[5]);
 if(determinant<0)scale[0]=-scale[0];
 const a=m.map((v,i)=>i<12?v/scale[Math.floor(i/4)]:v);
 const clamp=(v)=>Math.max(-1,Math.min(1,v));const y=Math.asin(clamp(a[8]));
 const x=Math.abs(a[8])<.9999999?Math.atan2(-a[9],a[10]):Math.atan2(a[6],a[5]);
 const z=Math.abs(a[8])<.9999999?Math.atan2(-a[4],a[0]):0;
 const rotation=[x,y,z].map(v=>v*180/Math.PI),reconstructed=composeTransformMatrix(position,rotation,scale);
 if(reconstructed.some((v,i)=>Math.abs(v-m[i])>1e-7*Math.max(1,Math.abs(m[i]))))return null;
 return {position,rotation,scale};
}
export const localTransformMatrix=object=>{
 const t=object?.components?.find(c=>c.type==='Transform');
 if(!t)throw Error('Transform requis');
 if(t.matrix!==undefined){
  if(!Array.isArray(t.matrix)||t.matrix.length!==16||!t.matrix.every(finite))throw Error('Matrice affine invalide');
  return [...t.matrix];
 }
 return composeTransformMatrix(t.position,t.rotation,t.scale);
};
export function worldTransformMatrices(scene){
 const errors=validateScene(scene);if(errors.length)throw Error(errors.join('; '));
 const byId=new Map(scene.objects.map(o=>[o.id,o])),cache=new Map();
 const compute=id=>{
  if(cache.has(id))return cache.get(id);
  const o=byId.get(id);if(!o)throw Error('GameObject absent');
  const local=localTransformMatrix(o),parent=o.parentId===null||o.parentId===undefined?null:compute(o.parentId);
  const world=parent?multiplyMatrix4(parent,local):local;
  cache.set(id,world);return world;
 };
 for(const o of scene.objects)compute(o.id);
 return cache;
}
export function setLocalTransform(scene,id,{position,rotation,scale}){
 const object=scene.objects.find(o=>o.id===id);if(!object)throw Error('GameObject introuvable');
 const t=object.components.find(c=>c.type==='Transform');
 const next={position:position??t.position,rotation:rotation??t.rotation,scale:scale??t.scale};
 const m=composeTransformMatrix(next.position,next.rotation,next.scale);
 if(next.scale.some(v=>Math.abs(v)<1e-10))throw Error('Échelle nulle interdite');
 Object.assign(t,next);delete t.matrix;delete t.matrixMode;
 return m;
}
export function reparent(scene,id,parentId,{keepWorld=true}={}){
 const object=scene.objects.find(o=>o.id===id);
 if(!object||parentId!==null&&!scene.objects.some(o=>o.id===parentId))throw Error('Objet ou parent inconnu');
 let next=parentId;const seen=new Set([id]);
 while(next!==null){if(seen.has(next))throw Error('Parentage cyclique');seen.add(next);next=scene.objects.find(o=>o.id===next)?.parentId??null}
 if((object.parentId??null)===(parentId??null))return object;
 let local=null;
 if(keepWorld){
  const worlds=worldTransformMatrices(scene);
  local=parentId===null?[...worlds.get(id)]:multiplyMatrix4(invertMatrix4(worlds.get(parentId)),worlds.get(id));
  const decomposition=decomposeTransformMatrix(local);
  const t=object.components.find(c=>c.type==='Transform');
  if(decomposition){Object.assign(t,decomposition);delete t.matrix;delete t.matrixMode}
  else{t.matrix=local;t.matrixMode='affine';t.position=[local[12],local[13],local[14]]}
 }
 object.parentId=parentId;return object;
}

export function validateScene(scene){
 const errors=[];if(scene?.schema!=='warlike.scene.v2'||!Array.isArray(scene.objects))return ['Schéma de scène invalide'];
 const ids=new Set();
 for(const object of scene.objects){
  if(!object||typeof object.id!=='string'||!object.id||ids.has(object.id)){errors.push('ID manquant ou dupliqué');continue}
  ids.add(object.id);
  if(!Array.isArray(object.components)||object.components.filter(c=>c?.type==='Transform').length!==1){errors.push(object.id+': Transform requis et unique');continue}
  const t=object.components.find(c=>c.type==='Transform');
  for(const field of ['position','rotation','scale'])if(!Array.isArray(t[field])||t[field].length!==3||!t[field].every(finite))errors.push(object.id+': '+field+' invalide');
  if(Array.isArray(t.scale)&&t.scale.some(n=>n===0))errors.push(object.id+': échelle nulle');
  if(t.matrix!==undefined&&(!Array.isArray(t.matrix)||t.matrix.length!==16||!t.matrix.every(finite)))errors.push(object.id+': matrice affine invalide');
 }
 for(const object of scene.objects){
  if(!object?.id||!ids.has(object.id))continue;
  if(object.parentId!==null&&object.parentId!==undefined&&!ids.has(object.parentId))errors.push(object.id+': parent absent');
  const visited=new Set([object.id]);let parent=object.parentId;
  while(parent!==null&&parent!==undefined){if(visited.has(parent)){errors.push(object.id+': cycle de parentage');break}visited.add(parent);parent=scene.objects.find(o=>o.id===parent)?.parentId}
 }
 return errors;
}
export function serializeScene(scene){const errors=validateScene(scene);if(errors.length)throw Error(errors.join('; '));return JSON.stringify(scene,null,2)}
export function deserializeScene(json){const scene=JSON.parse(json);const errors=validateScene(scene);if(errors.length)throw Error(errors.join('; '));return clone(scene)}
export function duplicateGameObject(scene,id){
 const original=scene.objects.find(o=>o.id===id);if(!original)throw Error('GameObject introuvable');
 const copy=clone(original);copy.id=crypto.randomUUID();copy.name+=' Copy';if(copy.sourceEntityId!==undefined){copy.sourceEntityId=Math.max(0,...scene.objects.map(o=>o.sourceEntityId||0))+1;const legacy=copy.components.find(c=>c.type==='LegacyEntity');if(legacy?.data)legacy.data.id=copy.sourceEntityId;}scene.objects.push(copy);return copy;
}
export function removeGameObject(scene,id){
 const removed=new Set([id]);let size;
 do{size=removed.size;for(const object of scene.objects)if(removed.has(object.parentId))removed.add(object.id)}while(size!==removed.size);
 scene.objects=scene.objects.filter(o=>!removed.has(o.id));return removed.size;
}

// Hierarchy operations also support the legacy editor entity format.
// parentId only; children are derived. Does not mutate incoming collections.
export function hierarchyIndex(entities){
 const byId=new Map(entities.map(o=>[o.id,o])),children=new Map([[null,[]]]);
 for(const item of entities){
  const parent=byId.has(item.parentId)&&item.parentId!==item.id?item.parentId:null;
  if(!children.has(parent))children.set(parent,[]);
  children.get(parent).push(item);
 }
 return {byId,children};
}
export function descendants(entities,id){
 const {children,byId}=hierarchyIndex(entities);
 if(!byId.has(id))return new Set();
 const seen=new Set(),stack=[id];
 while(stack.length){
  const next=stack.pop();
  if(seen.has(next))continue;
  seen.add(next);
  for(const item of children.get(next)||[])stack.push(item.id);
 }
 return seen;
}
export function validateReparent(entities,id,parentId){
 const {byId}=hierarchyIndex(entities);
 if(!byId.has(id))throw Error('GameObject introuvable');
 if(parentId===id)throw Error('Un objet ne peut pas être son propre parent');
 if(parentId!==null&&!byId.has(parentId))throw Error('Parent inexistant');
 if(parentId!==null&&descendants(entities,id).has(parentId))throw Error('Parentage cyclique interdit');
 return true;
}
export function reparentEntities(entities,id,parentId){
 validateReparent(entities,id,parentId);
 return entities.map(o=>o.id===id?{...o,parentId}:o);
}
export function deleteEntitySubtrees(entities,ids){
 const removed=new Set();
 for(const id of ids)for(const child of descendants(entities,id))removed.add(child);
 return {entities:entities.filter(o=>!removed.has(o.id)),removed};
}
export function duplicateEntitySubtrees(entities,ids,nextId,{offset=24}={}){
 const byId=new Map(entities.map(o=>[o.id,o]));
 const roots=ids.filter(id=>byId.has(id)&&!ids.some(parent=>parent!==id&&descendants(entities,parent).has(id)));
 const all=new Set();for(const id of roots)for(const child of descendants(entities,id))all.add(child);
 const idMap=new Map();let serial=nextId;
 for(const o of entities)if(all.has(o.id))idMap.set(o.id,serial++);
 const copies=entities.filter(o=>all.has(o.id)).map(o=>{
  const clone=structuredClone(o);
  clone.id=idMap.get(o.id);
  clone.name=o.name+' Copy';
  clone.parentId=idMap.get(o.parentId)??(o.parentId??null);
  if(roots.includes(o.id)){if(Number.isFinite(clone.x))clone.x+=offset;if(Number.isFinite(clone.y))clone.y+=offset;}
  return clone;
 });
 return {entities:[...entities,...copies],selected:roots.map(id=>idMap.get(id)),nextId:serial};
}

// WebGL affine bridge. Keep in canonical scene graph so packaged editor runtimes include it.
// Affine bridge between canonical (column-major) scene matrices and the
// existing WebGL renderer. Legacy geometry already has a world-space origin;
// the correction converts that reference pose into its exact affine pose.
const finiteMatrix=m=>Array.isArray(m)&&m.length===16&&m.every(Number.isFinite);
export const hasAffinePose=o=>finiteMatrix(o?.worldMatrix3d)&&finiteMatrix(o?.matrixReference3d);
export function affineCorrection3d(o){
 if(!hasAffinePose(o))return null;
 return multiplyMatrix4(o.worldMatrix3d,invertMatrix4(o.matrixReference3d));
}
export function normalMatrix3d(m){
 if(!finiteMatrix(m))throw Error('Matrice affine invalide');
 const inv=invertMatrix4(m);
 // Column-major inverse-transpose of linear 3x3.
 return [inv[0],inv[4],inv[8],inv[1],inv[5],inv[9],inv[2],inv[6],inv[10]];
}
export function legacyReferenceMatrix3d(o){
 return composeTransformMatrix([
  (Number(o.x)||0)/64,Number(o.elevation3d)||0,(Number(o.y)||0)/64
 ],[Number(o.rotationX3d)||0,-(Number(o.rotation)||0),Number(o.rotationZ3d)||0],[1,1,1]);
}
// Moving the editor gizmo must not discard authored affine shear.
// This updates the world matrix with an exact delta in the editor's world frame.
export function moveAffinePose3d(o,delta){
 if(!hasAffinePose(o))return false;
 if(!Array.isArray(delta)||delta.length!==3||!delta.every(Number.isFinite))throw Error('Déplacement 3D invalide');
 const world=[...o.worldMatrix3d];for(let axis=0;axis<3;axis++)world[12+axis]+=delta[axis];
 o.worldMatrix3d=world;return true;
}
// Kinematic/dynamic physics cannot represent shear in rigid body orientations.
// Keep the visual affine matrix intact, moving its origin along with the body.
export function followPhysicsPosition3d(o,newPosition,oldPosition){
 if(!hasAffinePose(o))return false;
 if(![newPosition,oldPosition].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))throw Error('Position physique invalide');
 return moveAffinePose3d(o,newPosition.map((n,i)=>n-oldPosition[i]));
}

export function updateAffineEditorPose3d(o,previousWorld=o.worldMatrix3d,previousReference=o.matrixReference3d){
 if(!Array.isArray(previousWorld)||previousWorld.length!==16||!previousWorld.every(finite)||!Array.isArray(previousReference)||previousReference.length!==16||!previousReference.every(finite))return false;
 const reference=legacyReferenceMatrix3d(o);
 const change=multiplyMatrix4(reference,invertMatrix4(previousReference));
 o.worldMatrix3d=multiplyMatrix4(change,previousWorld);
 o.matrixReference3d=reference;
 return true;
}

// Sync the legacy editor's world-space coordinates with canonical parent/child
// matrices. A child's localMatrix3d is authoritative after its first attach.
// Physics-driven dynamic children remain world-authoritative during Play.
export function updateEditorEntityHierarchy3d(entities,{physicsOwnsDynamics=false,worldOverrideIds=null}={}){
 if(!Array.isArray(entities))throw Error('Entités invalides');
 const byId=new Map(entities.map(o=>[o.id,o])),cache=new Map(),visiting=new Set();
 const calculate=id=>{
  if(cache.has(id))return cache.get(id);
  const o=byId.get(id);if(!o)throw Error('GameObject absent');
  if(visiting.has(id))throw Error('Cycle de parentage 3D');
  visiting.add(id);
  const parent=o.parentId!==null&&o.parentId!==undefined?byId.get(o.parentId):null;
  const parentWorld=parent?calculate(parent.id):null;
  const reference=legacyReferenceMatrix3d(o);
  // Inspector, scripts and legacy controllers may mutate x/y/rotation directly.
  // Convert those world-space edits into an affine delta before propagating.
  const externalEdit=hasAffinePose(o)&&reference.some((v,i)=>Math.abs(v-o.matrixReference3d[i])>1e-8);
  if(externalEdit)updateAffineEditorPose3d(o,[...o.worldMatrix3d],[...o.matrixReference3d]);
  const worldDriven=externalEdit||(physicsOwnsDynamics&&o.rigidbody3d?.enabled&&!o.rigidbody3d.kinematic)||worldOverrideIds?.has(o.id);
  let world;
  if(parentWorld){
   if(worldDriven||!Array.isArray(o.localMatrix3d)){
    const absolute=hasAffinePose(o)?o.worldMatrix3d:reference;
    o.localMatrix3d=multiplyMatrix4(invertMatrix4(parentWorld),absolute);
    world=[...absolute];
   }else{
    if(o.localMatrix3d.length!==16||!o.localMatrix3d.every(finite))throw Error('Transformation locale de '+o.name+' invalide');
    world=multiplyMatrix4(parentWorld,o.localMatrix3d);
   }
   const pose=decomposeTransformMatrix(world);
   o.x=world[12]*64;o.elevation3d=world[13];o.y=world[14]*64;
   if(pose){o.rotation=-pose.rotation[1];o.rotationX3d=pose.rotation[0];o.rotationZ3d=pose.rotation[2]}
   o.worldMatrix3d=world;
   o.matrixReference3d=legacyReferenceMatrix3d(o);
  }else{
   // Root poses still follow existing editor controls.
   if(o.localMatrix3d!==undefined)delete o.localMatrix3d;
   world=hasAffinePose(o)?o.worldMatrix3d:reference;
  }
  cache.set(id,world);visiting.delete(id);return world;
 };
 for(const o of entities)calculate(o.id);
 return cache;
}

// Snap in world metres. Keep one quantization implementation for project-drop
// placement, gizmos and Inspector editing.
export function snap3d(value,step=0){
 if(!Number.isFinite(value)||!Number.isFinite(step)||step<0)throw Error('Valeur de snapping invalide');
 return step>0?Math.round(value/step)*step:value;
}
export function placeEntityOnSurface3d(entity,hit,{snap=0,alignNormal=false}={}){
 if(!entity||!hit||!Array.isArray(hit.point)||hit.point.length!==3||!hit.point.every(Number.isFinite))throw Error('Point de placement 3D invalide');
 const [x,y,z]=hit.point;
 const width=(Number(entity.w)||64)/64,depth=(Number(entity.depth3d??entity.h)||64)/64;
 entity.x=Math.round((snap3d(x,snap)-width/2)*64);
 entity.y=Math.round((snap3d(z,snap)-depth/2)*64);
 entity.elevation3d=Math.max(0,snap3d(y,snap));
 if(alignNormal&&Array.isArray(hit.normal)&&hit.normal.length===3&&hit.normal.every(Number.isFinite)){
  const n=hit.normal,len=Math.hypot(...n);
  if(len>1e-8){
   // Rotate local up towards surface normal (editor Euler yaw/pitch convention).
   entity.rotationX3d=Math.atan2(n[2],n[1])*180/Math.PI;
   const roll=-Math.atan2(n[0],Math.hypot(n[1],n[2]))*180/Math.PI;entity.rotationZ3d=roll===0?0:roll;
  }
 }
 return entity;
}

export function gizmoAxis3d(axis,quaternion,{local=false}={}){
 const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
 if(!Object.hasOwn(axes,axis))throw Error('Axe Gizmo inconnu');
 const v=axes[axis];if(!local)return [...v];
 if(!quaternion||![quaternion.x,quaternion.y,quaternion.z,quaternion.w].every(Number.isFinite))throw Error('Quaternion invalide');
 const {x,y,z,w}=quaternion,mag=Math.hypot(x,y,z,w);
 if(mag<1e-10)throw Error('Quaternion nul');
 const qx=x/mag,qy=y/mag,qz=z/mag,qw=w/mag;
 const t=[2*(qy*v[2]-qz*v[1]),2*(qz*v[0]-qx*v[2]),2*(qx*v[1]-qy*v[0])];
 return [v[0]+qw*t[0]+qy*t[2]-qz*t[1],v[1]+qw*t[1]+qz*t[0]-qx*t[2],v[2]+qw*t[2]+qx*t[1]-qy*t[0]];
}

/**
 * Resolve an animated glTF bone socket to a world position. Input boneWorld is
 * the actual sampled bone world matrix (before geometry normalization).
 * Offsets are in metres along the normalized model axes.
 */
export function boneSocketPoint3d(parent,boneWorld,geometry,renderBox,quaternion,offset=[0,0,0]){
 if(!Array.isArray(boneWorld)||boneWorld.length!==16||!boneWorld.every(finite))throw Error('Pose osseuse invalide');
 const scale=geometry?.normalizationScale,center=geometry?.normalizationCenter,size=geometry?.normalizedSize;
 if(!Number.isFinite(scale)||scale<=0||!Array.isArray(center)||center.length!==3||!Array.isArray(size))throw Error('Normalisation GLB indisponible');
 const factor=Math.min(renderBox.w/size[0],renderBox.h/size[1],renderBox.d/size[2]);
 if(!Number.isFinite(factor)||factor<=0)throw Error('Échelle de rendu GLB invalide');
 const point=[0,1,2].map(i=>((boneWorld[12+i]-center[i])/scale)*factor+([0,1,2].reduce((total,axis)=>total+boneWorld[axis*4+i]*(Number(offset[axis])||0),0))*factor/scale);
 const q=quaternion,mag=Math.hypot(q.x,q.y,q.z,q.w);
 if(mag<1e-9)throw Error('Rotation parent invalide');
 const [x,y,z,w]=[q.x/mag,q.y/mag,q.z/mag,q.w/mag];
 const t=[2*(y*point[2]-z*point[1]),2*(z*point[0]-x*point[2]),2*(x*point[1]-y*point[0])];
 const world=[point[0]+w*t[0]+y*t[2]-z*t[1]+renderBox.x,point[1]+w*t[1]+z*t[0]-x*t[2]+renderBox.y,point[2]+w*t[2]+x*t[1]-y*t[0]+renderBox.z];
 const affine=affineCorrection3d(parent);
 return affine?[
  affine[0]*world[0]+affine[4]*world[1]+affine[8]*world[2]+affine[12],
  affine[1]*world[0]+affine[5]*world[1]+affine[9]*world[2]+affine[13],
  affine[2]*world[0]+affine[6]*world[1]+affine[10]*world[2]+affine[14]
 ]:world;
}

/** A complete socket pose derived from the SAME bone world matrix used by skinning.
 * Position offsets follow the bone's local axes, not the scene's XYZ axes.
 * Inherited affine shear is orthogonalized into a renderable quaternion.
 */
export function boneSocketTransform3d(parent,boneWorld,geometry,renderBox,quaternion,offset=[0,0,0]){
 const point=boneSocketPoint3d(parent,boneWorld,geometry,renderBox,quaternion,offset);
 const axes=[0,1,2].map(axis=>{
  const moved=[...offset];moved[axis]=(Number(moved[axis])||0)+1;
  const at=boneSocketPoint3d(parent,boneWorld,geometry,renderBox,quaternion,moved);
  return at.map((v,i)=>v-point[i]);
 });
 const normalized=vector=>{const length=Math.hypot(...vector);if(!Number.isFinite(length)||length<1e-10)throw Error('Orientation du socket singulière');return vector.map(n=>n/length)};
 const dot=(a,b)=>a.reduce((t,n,i)=>t+n*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const x=normalized(axes[0]),y=normalized(axes[1].map((v,i)=>v-dot(axes[1],x)*x[i]));
 let z=normalized(cross(x,y));
 if(dot(z,axes[2])<0){z=z.map(n=>-n);y.splice(0,3,...cross(z,x))}
 const [m00,m01,m02,m10,m11,m12,m20,m21,m22]=[x[0],y[0],z[0],x[1],y[1],z[1],x[2],y[2],z[2]];
 const trace=m00+m11+m22;
 let qx,qy,qz,qw;
 if(trace>0){const k=Math.sqrt(trace+1)*2;qw=k/4;qx=(m21-m12)/k;qy=(m02-m20)/k;qz=(m10-m01)/k}
 else if(m00>m11&&m00>m22){const k=Math.sqrt(1+m00-m11-m22)*2;qw=(m21-m12)/k;qx=k/4;qy=(m01+m10)/k;qz=(m02+m20)/k}
 else if(m11>m22){const k=Math.sqrt(1+m11-m00-m22)*2;qw=(m02-m20)/k;qx=(m01+m10)/k;qy=k/4;qz=(m12+m21)/k}
 else{const k=Math.sqrt(1+m22-m00-m11)*2;qw=(m10-m01)/k;qx=(m02+m20)/k;qy=(m12+m21)/k;qz=k/4}
 const len=Math.hypot(qx,qy,qz,qw);
 return {point,quaternion:{x:qx/len,y:qy/len,z:qz/len,w:qw/len}};
}
/** Choose the closest actual GLB vertex or edge inside a world-space snap radius. */
export function snapSurfaceFeature3d(hit,mode='surface',{radius=.15}={}){
 if(!hit||!Array.isArray(hit.point)||!['surface','vertex','edge'].includes(mode))return hit;
 if(mode==='surface'||!Array.isArray(hit.vertices)||hit.vertices.length!==3||!Number.isFinite(radius)||radius<=0)return hit;
 const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 const points=hit.vertices;
 let best=null,bestDistance=radius;
 if(mode==='vertex'){
  for(const p of points){const d=distance(p,hit.point);if(d<bestDistance){bestDistance=d;best=p}}
 }else{
  for(let i=0;i<3;i++){
   const a=points[i],b=points[(i+1)%3],diff=a.map((v,j)=>b[j]-v),length=diff.reduce((t,v)=>t+v*v,0);
   if(length<1e-12)continue;
   const t=Math.max(0,Math.min(1,diff.reduce((sum,v,j)=>sum+v*(hit.point[j]-a[j]),0)/length));
   const p=a.map((v,j)=>v+diff[j]*t),d=distance(p,hit.point);
   if(d<bestDistance){bestDistance=d;best=p}
  }
 }
 return best?{...hit,point:[...best],snapKind:mode,snapDistance:bestDistance}:hit;
}
