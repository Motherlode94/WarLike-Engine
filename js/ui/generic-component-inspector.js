// Fallback Inspector for registered data-driven Web components without a
// dedicated editor. Never replace a custom inspector and never mutate in Play.
import {componentChoices,resetObjectComponent,removeObjectComponent,componentRemovalBlockers} from '../core/component-definitions.js';
import {commonInspectorFields,inspectValue,setInspectorValue,inspectorNumber} from '../core/inspector-model.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
import {workspace} from '../core/workspaces.js';
import {defaultGroundVehiclePhysics,validateGroundVehiclePhysics} from '../core/ground-vehicle-rapier.js';

const dedicated=new Set([
 'webScripts','warScripts','sequence','animatorGraph',
 'collider2d','rigidbody2d','joint2d','effector2d','controller2d','collider3d','rigidbody3d','joint3d',
 'controller3d','cameraRig','sceneCamera3d','uiCanvas','uiRect','uiElement','stats','inventory','ai',
 'adventure','adventureInteractable','survival','survivalNode','survivalWorld',
 'superhero','rpgProgression','fxEmitter','simulationNode','tacticalUnit'
]);
const text=(tag,value,cls='')=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e};
export function genericComponentDefinitions(entity,mode,rendered=[]){
 const present=new Set(rendered);
 return componentChoices(mode).filter(d=>!dedicated.has(d.id)&&
   entity?.[d.id]!=null&&!present.has(d.id)&&
   entity[d.id]&&typeof entity[d.id]==='object'&&!Array.isArray(entity[d.id]));
}
export function renderGenericComponents(root,entity){
 const shown=[...root.querySelectorAll(':scope>.inspector-component')]
  .map(card=>card.dataset.componentKey).filter(Boolean);
 for(const definition of genericComponentDefinitions(entity,workspace.mode,shown)){
  const card=document.createElement('details');
  card.className='inspector-component';
  card.dataset.componentKey=definition.id;
  card.dataset.componentTitle=definition.name;
  const summary=text('summary',definition.name);
  const body=document.createElement('div');body.className='component-content';
  const fields=commonInspectorFields([entity[definition.id]]);
  for(const path of fields){
   const value=inspectValue(entity[definition.id],path);
   if(!['boolean','string','number'].includes(typeof value))continue;
   const row=document.createElement('div');row.className='property-row';
   const name=text('label',path.join(' · '));
   const cameraMode=['sceneCamera3d','camera2d'].includes(definition.id)&&path.length===1&&path[0]==='mode';
   const input=document.createElement(cameraMode?'select':'input');
   if(cameraMode){
    const modes=definition.id==='camera2d'?[['fixed','Fixed · position dans la scène'],['follow','Follow · suivre la cible']]:[['fixed','Fixed · caméra libre'],['thirdPerson','Third Person · orbite / souris'],['follow','Follow (ancien mode)'],['firstPerson','First Person · joueur']];
    for(const [kind,label] of modes){
     const option=document.createElement('option');option.value=kind;option.textContent=label;input.append(option);
    }
   }else input.type=typeof value==='boolean'?'checkbox':'text';
   if(!cameraMode&&typeof value==='number')input.inputMode='decimal';
   if(typeof value==='boolean')input.checked=value;else input.value=String(value);
   input.disabled=state.playing;
   input.onchange=()=>{
    try{
     const next=typeof value==='boolean'?input.checked:
       typeof value==='number'?inspectorNumber(input.value):input.value;
     if(!setInspectorValue([entity[definition.id]],path,next))throw Error('Propriété non modifiable');
     record('Inspector : '+definition.name+' · '+path.join('.'));notify();
    }catch(error){if(input.setCustomValidity){input.setCustomValidity(error.message);input.reportValidity?.()}}
   };
   input.oninput=()=>input.setCustomValidity?.('');
   row.append(name,input);body.append(row);
  }
  if(definition.id==='groundVehiclePhysics'){
   const config=entity.groundVehiclePhysics,group=document.createElement('section');
   group.className='ground-vehicle-physics-inspector';
   const heading=text('h4','Ground Vehicle Physics · Rapier 3D');group.append(heading);
   const kindRow=document.createElement('div');kindRow.className='property-row';
   const kindLabel=text('label','Profil du véhicule');const kind=document.createElement('select');
   for(const [value,label] of [['car','Voiture · 4 roues'],['truck','Camion · 6 roues'],['tracked','Blindé · chenilles']]){
    const option=document.createElement('option');option.value=value;option.textContent=label;kind.append(option);
   }
   kind.value=config.kind;kind.disabled=state.playing;
   kind.onchange=()=>{
    if(state.playing||!['car','truck','tracked'].includes(kind.value))return;
    entity.groundVehiclePhysics=defaultGroundVehiclePhysics(kind.value);
    // Keep Rigidbody mass and chassis profile in sync on explicit profile change.
    if(entity.rigidbody3d)entity.rigidbody3d.mass=entity.groundVehiclePhysics.mass;
    record('Véhicule : choisir profil '+kind.value);notify();
   };
   kindRow.append(kindLabel,kind);group.append(kindRow);
   group.append(text('p','Le moteur de la scène doit utiliser Rapier. Suspension et roues utilisent des mètres, kg et newtons.'));
   const columns=[['radius','Rayon (m)',.1,2],['restLength','Longueur ressort (m)',.05,3],
    ['travel','Course (m)',0,2],['spring','Ressort (N/m)',1,200000],
    ['damper','Amortissement',0,50000],['grip','Adhérence',0,5]];
   const wheels=config.wheels||[];
   wheels.forEach((mount,index)=>{
    const details=document.createElement('details');details.className='vehicle-wheel-editor';
    details.append(text('summary','Roue '+(index+1)+' · '+(mount.side<0?'gauche':'droite')));
    const inner=document.createElement('div');inner.className='component-content';
    for(const [key,label,min,max] of columns){
     const row=document.createElement('div');row.className='property-row';
     const caption=document.createElement('label');caption.textContent=label;
     const input=document.createElement('input');input.type='number';input.step='any';input.min=String(min);input.max=String(max);
     input.value=String(mount.wheel[key]);input.disabled=state.playing;
     input.setAttribute('aria-label','Roue '+(index+1)+' · '+label);
     input.onchange=()=>{
      if(state.playing)return;
      const value=Number(input.value);
      if(!Number.isFinite(value)||value<min||value>max){input.setCustomValidity('Valeur hors limites');input.reportValidity();return}
      const previous=mount.wheel[key];mount.wheel[key]=value;
      const errors=validateGroundVehiclePhysics(config);
      if(errors.length){mount.wheel[key]=previous;input.setCustomValidity(errors.join('; '));input.reportValidity();return}
      input.setCustomValidity('');record('Roue '+(index+1)+' : '+key);notify();
     };
     row.append(caption,input);inner.append(row);
    }
    details.append(inner);group.append(details);
   });
   const errors=validateGroundVehiclePhysics(config);
   if(errors.length)group.append(text('p','Configuration invalide : '+errors.join('; ')));
   body.append(group);
  }
  // Navigation waypoints are structured data: offer proper Inspector controls
  // instead of pretending the generic scalar field editor can edit arrays.
  if(definition.id==='navigationAgent'){
   const group=document.createElement('div');group.className='navigation-waypoint-editor';
   group.append(text('strong','Points de passage · unités de scène'));
   const points=entity.navigationAgent?.waypoints||[];
   points.forEach((point,index)=>{
    const row=document.createElement('div');row.className='property-row';
    row.append(text('span','Point '+(index+1)));
    for(const axis of ['x','y']){
     const field=document.createElement('input');field.type='number';field.step='any';
     field.value=String(point[axis]);field.disabled=state.playing;
     field.setAttribute('aria-label','Point '+(index+1)+' · '+axis.toUpperCase());
     field.onchange=()=>{
      const value=Number(field.value);
      if(!Number.isFinite(value))return;
      if(state.playing)return;
      point[axis]=value;record('Navigation : modifier point '+(index+1));notify();
     };row.append(field);
    }
    const removePoint=text('button','−');removePoint.type='button';removePoint.title='Supprimer ce point';
    removePoint.disabled=state.playing;removePoint.onclick=()=>{
     if(state.playing)return;points.splice(index,1);record('Navigation : supprimer point');notify();
    };
    row.append(removePoint);group.append(row);
   });
   const addPoint=text('button','Ajouter point de passage');addPoint.type='button';
   addPoint.disabled=state.playing||points.length>=64;addPoint.onclick=()=>{
    if(state.playing||points.length>=64)return;
    points.push({x:Number(entity.x)||0,y:Number(entity.y)||0});
    record('Navigation : ajouter point');notify();
   };
   group.append(addPoint);body.append(group);
  }
  if(!fields.length&&definition.id!=='navigationAgent')body.append(text('p','Ce composant contient des données complexes. Utilise son éditeur spécialisé ou la configuration de son extension.'));
  const actions=document.createElement('div');actions.className='warlike-component-actions';
  const reset=text('button','Réinitialiser'),remove=text('button','Supprimer');
  reset.type=remove.type='button';
  reset.disabled=state.playing;
  const blockers=componentRemovalBlockers(entity,definition.id);
  remove.disabled=state.playing||blockers.length>0;
  if(blockers.length)remove.title='Requis par : '+blockers.join(', ');
  reset.onclick=()=>{if(state.playing)return;if(resetObjectComponent(entity,definition.id)){record('Réinitialiser '+definition.name);notify()}};
  remove.onclick=()=>{if(state.playing)return;if(removeObjectComponent(entity,definition.id)){record('Supprimer '+definition.name);notify()}};
  actions.append(reset,remove);body.append(actions);card.append(summary,body);root.append(card);
 }
}
