// WarLike Editor: native scene creation commands (never run in exported games).
// All scene objects use the existing serialized entity format and Undo/Redo.
import {state,notify} from './state.js';
import {record} from './history.js';
import {workspace} from './workspaces.js';
import {prefab3d} from '../assets/catalog-3d.js';
import {defaultUiCanvas,defaultUiRect,defaultUiElement} from './ui-canvas-layout.js';

export const sceneCreateItems=[
 {group:'Essentiels',items:[['empty','GameObject vide'],['character','Personnage'],['camera','Caméra de jeu']]},
 {group:'Objets 3D',items:[['cube','Cube'],['sphere','Sphère'],['cylinder','Cylindre'],['cone','Cône'],['plane','Plan / Sol'],['ramp','Rampe']]},
 {group:'Éclairage et audio',items:[['point-light','Point Light'],['spot-light','Spot Light'],['audio-source','Audio Source']]},
 {group:'Interface du jeu (uGUI)',items:[['canvas','Canvas'],['ui-panel','Panel'],['ui-text','Text'],['ui-button','Button']]},
 {group:'Physique',items:[['rigidbody-cube','Cube + Rigidbody'],['trigger','Zone Trigger']]},
 {group:'Outils',items:[['blueprint','Ouvrir WarNode / Blueprint']]}
];
const primitiveIds={cube:'primitive-cube',sphere:'primitive-sphere',cylinder:'primitive-cylinder',cone:'primitive-cone',plane:'primitive-platform',ramp:'primitive-ramp'};
export function createSceneItem(kind,{openBlueprint=()=>{}}={}){
 if(kind==='blueprint'){openBlueprint();return true;}
 if(state.playing)return false;
 const id=state.nextId++;
 let o;
 if(primitiveIds[kind]&&workspace.mode==='3d'){
  o=prefab3d(primitiveIds[kind],id,120+(id%10)*25,120+(id%7)*25);
  if(!o){state.nextId--;return false;}
  Object.assign(o,{name:kind==='plane'?'Sol '+id:kind+' '+id,w:kind==='plane'?640:64,h:kind==='plane'?16:64,depth3d:kind==='plane'?640:64,collision3d:true,solid3d:true});
 }else{
  o={id,name:kind+' '+id,type:'object',x:120+(id%10)*25,y:120+(id%7)*25,w:64,h:64,depth3d:64,elevation3d:0,color:'#8195ef',visible:true};
  if(kind==='character'){Object.assign(o,{name:'Character '+id,type:'character',w:64,h:96,skin:'scout',animation:'idle'})}
  if(kind==='camera'){Object.assign(o,{name:'Camera '+id,cameraRig:{mode:'thirdPerson',distance:5,height:.75,collision:true}})}
  if(kind==='point-light'||kind==='spot-light'){Object.assign(o,{name:kind==='spot-light'?'Spot Light':'Point Light',lightType:kind==='spot-light'?'spot':'point',lightEnabled:true,lightColor:'#ffcd8a',lightIntensity:3,lightRange:13,lightAngle:45,elevation3d:2.5})}
  if(kind==='audio-source'){Object.assign(o,{name:'Audio Source',visible:false,collision3d:false,audioEnabled:true,audioClip:'vehicle',audioGain:.55,audioRange:18,audioInterval:3,audioLoop:true,audioSpatial:true})}
  if(kind==='trigger'){Object.assign(o,{name:'Trigger '+id,collision3d:true,solid3d:false,collider3d:{shape:'box',isTrigger:true}})}
  if(kind==='canvas'){Object.assign(o,{name:'Canvas '+id,uiCanvas:defaultUiCanvas(),uiRect:defaultUiRect(),visible:false,collision3d:false})}
  if(['ui-panel','ui-text','ui-button'].includes(kind)){
   const parent=state.entities.find(e=>state.selected.includes(e.id)&&e.uiCanvas)||state.entities.find(e=>e.uiCanvas);
   if(!parent){state.nextId--;return false;} // Explicit prerequisite, no fake unattached UI
   Object.assign(o,{name:kind.replace('ui-','')+' '+id,parentId:parent.id,uiRect:defaultUiRect(),uiElement:{...defaultUiElement(),kind:kind.slice(3),text:kind==='ui-button'?'Button':kind==='ui-text'?'Text':'',color:kind==='ui-panel'?'#283e50':'#ffffff'},visible:false,collision3d:false});
  }
 }
 if(kind==='rigidbody-cube'){
  const p=workspace.mode==='3d'?prefab3d('primitive-cube',id,o.x,o.y):null;
  if(p)o={...p,name:'Rigidbody Cube '+id,w:64,h:64,depth3d:64,collision3d:true,solid3d:true,rigidbody3d:{enabled:true,mass:1,gravityScale:1}};
  else Object.assign(o,{name:'Rigidbody Object '+id,rigidbody2d:{enabled:true}});
 }
 state.entities.push(o);state.selected=[id];record('Créer '+o.name);notify();return true;
}
