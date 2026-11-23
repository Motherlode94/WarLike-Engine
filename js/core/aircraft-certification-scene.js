// Native, editable Rapier flight certification ranges. Not visual-only demos.
// 64 scene units = 1 metre; x/y ground plane, elevation3d = vertical metres.
import {freshGameProject} from './game-project.js';
import {defaultAirplanePhysics,defaultHelicopterPhysics} from './aircraft-flight-physics.js';
import {defaultAircraftCamera} from './aircraft-camera.js';
import {defaultRigidbody3d} from './physics-3d.js';
import {defaultCollider3d} from './collider-3d.js';

export function aircraftCertificationScene(kind='airplane'){
 if(!['airplane','helicopter'].includes(kind))throw Error('Unknown aircraft certification scene');
 const entities=[];
 const add=(name,x,y,w,h,depth3d,extra={})=>{
  const e={id:entities.length+1,type:'mesh3d',name,assetId:'primitive-cube',
   x,y,w,h,depth3d,elevation3d:0,collision3d:true,solid3d:true,
   color:'#64748b',...extra};
  entities.push(e);return e;
 };
 const isHeli=kind==='helicopter';
 // Both ranges use physical Rapier colliders: a runway or heliport deck.
 add(isHeli?'V5 · héliport':'V5 · piste',-3000,-5000,6000,32,10000,
  {elevation3d:-.5,color:'#394957',tags:['ai-walkable']});
 if(!isHeli){
  for(let z=-4000;z<4900;z+=650)
   add('V5 · marquage piste '+z,-24,z,48,2,220,{elevation3d:.02,color:'#e9e7dc',collision3d:false,solid3d:false});
 }else{
  add('V5 · hélisurface',-500,-500,1000,16,1000,{elevation3d:-.1,color:'#68747b'});
 }
 const physics=isHeli?defaultHelicopterPhysics():defaultAirplanePhysics();
 const craft=add(isHeli?'V5 · hélicoptère':'V5 · avion',-128,150,256,isHeli?160:128,384,{
  elevation3d:isHeli?2:1.5,color:isHeli?'#57a4a2':'#6e9ed1',
  aircraftPhysics:{...physics,enabled:true},aircraftInput:{throttle:0,collective:0,pitch:0,roll:0,yaw:0},
  aircraftCamera:defaultAircraftCamera(),aircraftWind:{x:0,y:0,z:0},
  collider3d:defaultCollider3d(),
  rigidbody3d:{...defaultRigidbody3d(),enabled:true,kinematic:false,lockRotations:false,mass:physics.mass},
  collision3d:true
 });
 const pilot=add('V5 · pilote',200,650,32,96,32,{
  playable3d:true,elevation3d:0,color:'#d9b48b',
  cameraRig:{mode:'thirdPerson',distance:7,height:.7,collision:true}
 });
 const project={...freshGameProject(),id:'aircraft-v5-'+kind,
  title:isHeli?'Aircraft V5 · Certification hélicoptère':'Aircraft V5 · Certification avion',
  genre:'sandbox',physics3d:'rapier'};
 return {mode:'3d',entities,camera:{x:0,y:0,zoom:1},project,
  ids:{craft:craft.id,pilot:pilot.id,ground:1},selected:[craft.id],
  guide:isHeli?'Entrer E, augmenter le collectif avec Z/W, stabiliser le vol, réduire avec S, atterrir et tester V.'
   :'Entrer E, augmenter les gaz avec Z/W, commander le tangage, tester le décollage, l’atterrissage et la caméra V.'};
}
