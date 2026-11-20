// Authoring readiness audit. No fake model, animation or gameplay is generated.
// The report is diagnostic: exported and runtime claims must be verified separately.
import {getModelGeometry,model3dById} from '../assets/real-models-3d.js';
import {createHumanoidAvatar,inspectHumanoidAvatar,requiredHumanoidBones} from './humanoid-avatar.js';
import {componentDependencies,componentChoices} from './component-definitions.js';
import {inspectRuntimeCompatibility} from './runtime-capabilities.js';

const note=(severity,category,message)=>({severity,category,message});
export function analyzeModelReadiness(geometry,{humanoid=true,avatar=null}={}){
 const issues=[],rig=geometry?.rig||null;
 if(!geometry?.parts?.length)issues.push(note('error','GLB','Le modèle ne contient aucune surface rendue.'));
 else if(!(geometry.triangleCount>0))issues.push(note('error','GLB','Le modèle ne contient aucun triangle exploitable.'));
 if(!geometry?.normalizationScale||!Number.isFinite(geometry.normalizationScale))
  issues.push(note('error','GLB','Dimensions du modèle invalides.'));
 for(const message of geometry?.materialWarnings||[])issues.push(note('warning','Matériaux',message));
 const clips=rig?.animations?.map(a=>({name:a.name,duration:a.duration,channels:a.channels?.length||0}))||[];
 if(!rig?.skins?.length)issues.push(note('info','Rig','Aucun skin GLB : pas de déformation squelettique garantie.'));
 if(!clips.length)issues.push(note('info','Animation','Aucune animation GLB embarquée.'));
 else for(const clip of clips)if(!(clip.duration>0)||clip.channels===0)
  issues.push(note('warning','Animation','Clip sans durée ou canal actif : '+clip.name));
 let mapping=null;
 if(humanoid&&rig?.skins?.length){
  mapping=avatar||createHumanoidAvatar(rig);
  const errors=inspectHumanoidAvatar(mapping,rig);
  for(const message of errors)issues.push(note('warning','Avatar humanoïde',message));
 }
 return {
  triangles:geometry?.triangleCount||0,meshes:geometry?.parts?.length||0,
  dimensions:geometry?.normalizedSize||null,materials:geometry?.parts?.length||0,
  rigNodes:rig?.nodes?.length||0,skins:rig?.skins?.length||0,clips,
  humanoidMapped:requiredHumanoidBones.filter(b=>Boolean(mapping?.bones?.[b])).length,
  humanoidRequired:requiredHumanoidBones.length,
  issues,usableMesh:!!geometry?.parts?.length&&geometry.triangleCount>0,
  validHumanoid:!!mapping&&inspectHumanoidAvatar(mapping,rig).length===0
 };
}
export function analyzeComponentReadiness(object,mode='3d'){
 const issues=[],supported=new Set(componentChoices(mode).map(x=>x.id));
 for(const [required,dependents] of Object.entries(componentDependencies)){
  if(object?.[required]!=null)continue;
  for(const dependent of dependents)if(object?.[dependent]!=null)
   issues.push(note('warning','Composants',dependent+' dépend de '+required+' qui est absent.'));
 }
 for(const kind of ['controller3d','controller2d','animatorGraph','navigationAgent','animalController','vehicleController','inputActions']){
  if(object?.[kind]!=null&&!supported.has(kind))issues.push(note('warning','Composants',kind+' n’est pas disponible dans cet espace '+mode.toUpperCase()+'.'));
 }
 if(object?.animatorGraph&&!object?.animationRig&&!object?.model3dId)
  issues.push(note('info','Animation','Animator présent, mais aucun modèle GLB ou rig n’est configuré.'));
 const portability=inspectRuntimeCompatibility([object]);
 for(const issue of portability)issues.push(note('warning','Runtime / Export',issue.message||String(issue)));
 return {components:Object.keys(object||{}).filter(k=>supported.has(k)&&object[k]!=null),issues};
}
export async function inspectGameObjectAuthoring(object,{mode='3d'}={}){
 const issues=[],componentReport=analyzeComponentReadiness(object,mode);
 issues.push(...componentReport.issues);
 let model=null;
 if(object?.model3dId){
  const entry=model3dById(object.model3dId);
  if(!entry)issues.push(note('error','GLB','Référence de modèle introuvable : '+object.model3dId));
  else{
   try{
    const geometry=await getModelGeometry(object.model3dId);
    model=analyzeModelReadiness(geometry,{avatar:object.animationRig?.avatar||null});
    issues.push(...model.issues);
   }catch(error){issues.push(note('error','GLB','Impossible de charger le modèle : '+error.message))}
  }
 }else if(mode==='3d'&&object?.type==='mesh3d'&&object?.shape==='glb')
  issues.push(note('warning','GLB','Le GameObject n’a pas de modèle GLB assigné.'));
 return {name:object?.name||'GameObject',mode,model,components:componentReport.components,
  issues,errors:issues.filter(x=>x.severity==='error').length,
  warnings:issues.filter(x=>x.severity==='warning').length};
}
