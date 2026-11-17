// WarLike Editor: native scene creation commands (never run in exported games).
// All scene objects use the existing serialized entity format and Undo/Redo.
import {state,notify} from './state.js';
import {record} from './history.js';
import {workspace} from './workspaces.js';
import {prefab3d} from '../assets/catalog-3d.js';
import {defaultUiCanvas,defaultUiRect,defaultUiElement} from './ui-canvas-layout.js';
import {defaultSceneCamera} from './scene-camera-3d.js';
import {defaultSceneCamera2d} from './scene-camera-2d.js';
import {defaultTilemap2d} from './tilemap-2d.js';
import {defaultCollider2d,defaultRigidbody2d,defaultController2d} from './physics-2d.js';

export const sceneCreateItems=[
 {group:'Essentiels',items:[['empty','GameObject vide'],['character','Personnage'],['main-camera','Main Camera'],['camera','Rig de caméra (pour joueur)']]},
 {group:'Objets 2D',items:[['camera-2d','Main Camera 2D'],['player-2d','Joueur 2D'],['sprite-2d','Sprite / Rectangle'],['platform-2d','Plateforme solide'],['trigger-2d','Zone Trigger 2D'],['physics-2d','Corps physique 2D'],['tilemap-2d','Tilemap 2D']]},
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
 if(primitiveIds[kind]&&workspace.mode!=='3d')return false;
 if(['camera-2d','player-2d','sprite-2d','platform-2d','trigger-2d','physics-2d','tilemap-2d'].includes(kind)&&workspace.mode!=='2d')return false;
 const id=state.nextId++;
 let o;
 if(primitiveIds[kind]){
  o=prefab3d(primitiveIds[kind],id,120+(id%10)*25,120+(id%7)*25);
  if(!o){state.nextId--;return false;}
  Object.assign(o,{name:kind==='plane'?'Sol '+id:kind+' '+id,w:kind==='plane'?640:64,h:kind==='plane'?16:64,depth3d:kind==='plane'?640:64,collision3d:true,solid3d:true});
 }else{
  o={id,name:kind+' '+id,type:'object',x:120+(id%10)*25,y:120+(id%7)*25,w:64,h:64,depth3d:64,elevation3d:0,color:'#8195ef',visible:true};
  if(kind==='tilemap-2d'){const tilemap2d=defaultTilemap2d();Object.assign(o,{name:'Tilemap 2D '+id,type:'tilemap',x:0,y:0,w:tilemap2d.columns*tilemap2d.tileSize,h:tilemap2d.rows*tilemap2d.tileSize,solid2d:false,collision3d:false,tilemap2d})}
  if(kind==='camera-2d'){Object.assign(o,{name:'Main Camera 2D '+id,x:120,y:120,w:32,h:24,visible:false,collision3d:false,camera2d:defaultSceneCamera2d()})}
  if(kind==='player-2d'){Object.assign(o,{name:'Player 2D '+id,type:'player',w:38,h:38,color:'#41cdb5',controller2d:{...defaultController2d(),mode:'topDown'},collider2d:defaultCollider2d(),solid2d:false})}
  if(kind==='sprite-2d'){Object.assign(o,{name:'Sprite 2D '+id,type:'object',color:'#85a9ea',solid2d:false,collision3d:false,spriteRenderer2d:{enabled:true,sortingOrder:0,opacity:1}})}
  if(kind==='platform-2d'){Object.assign(o,{name:'Platform 2D '+id,w:256,h:28,color:'#657486',solid2d:true,collider2d:defaultCollider2d()})}
  if(kind==='trigger-2d'){Object.assign(o,{name:'Trigger 2D '+id,w:128,h:128,color:'#ad8be1',solid2d:false,collider2d:{...defaultCollider2d(),isTrigger:true}})}
  if(kind==='physics-2d'){Object.assign(o,{name:'Physics Body 2D '+id,collider2d:defaultCollider2d(),rigidbody2d:defaultRigidbody2d(),color:'#e5ab68'})}
  if(kind==='empty'){Object.assign(o,{name:'GameObject '+id,visible:false,collision3d:false})}
  if(kind==='character'){Object.assign(o,{name:'Character '+id,type:'character',w:64,h:96,skin:'scout',animation:'idle'})}
  if(kind==='main-camera'){Object.assign(o,{name:'Main Camera '+id,x:0,y:320,elevation3d:2,rotation:0,rotationX3d:0,visible:false,collision3d:false,sceneCamera3d:defaultSceneCamera()})}
  if(kind==='camera'){Object.assign(o,{name:'Camera Rig '+id,visible:false,collision3d:false,cameraRig:{mode:'thirdPerson',distance:5,height:.75,collision:true}})}
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
