import {freshGameProject} from './game-project.js';
import {defaultGroundVehiclePhysics} from './ground-vehicle-rapier.js';
import {defaultRigidbody3d} from './physics-3d.js';
import {defaultCollider3d} from './collider-3d.js';
import {defaultVehicleController} from './vehicle-controller.js';
// A native, editable scene fixture. All coordinates follow the Engine's
// 64 scene units/m and elevation3d in metres. No fake visual-only vehicles.
export function groundVehicleCertificationScene(){
 const entities=[];
 const add=(name,x,y,w,h,depth3d,properties={})=>{
  const object={id:entities.length+1,name,type:'mesh3d',assetId:'primitive-cube',
   x,y,w,h,depth3d,elevation3d:0,color:'#677e93',collision3d:true,solid3d:true,...properties};
  entities.push(object);return object;
 };
 // 0 m contact plane; thin obstacles at the far end of each driving lane.
 add('V4 · route principale',-850,-1300,5400,32,3000,{elevation3d:-.5,color:'#4c6353',tags:['ai-walkable']});
 const ids={};
 for(const [kind,x,colour] of [['car',0,'#4f90c8'],['truck',1350,'#d0a354'],['tracked',2800,'#87928b']]){
  const config=defaultGroundVehiclePhysics(kind),width=kind==='car'?192:kind==='truck'?256:320,
   depth=kind==='car'?320:kind==='truck'?480:480;
  const vehicle=add('V4 · '+kind,x,200,width,64,depth,{
   elevation3d:.08,color:colour,groundVehiclePhysics:config,
   vehicleController:defaultVehicleController(),
   collider3d:defaultCollider3d(),
   rigidbody3d:{...defaultRigidbody3d(),mass:config.mass,lockRotations:false},
   collision3d:true
  });
  ids[kind]=vehicle.id;
  add('V4 · obstacle '+kind,x, -500,width,100,55,{elevation3d:0,color:'#915c51'});
 }
 // A playable actor is required by the standalone game contract. Keep the
 // starting observer outside driving lanes; vehicle selection remains independent.
 add('V4 · conducteur et observateur',-550,850,32,96,32,{
  elevation3d:0,playable3d:true,collision3d:true,solid3d:true,
  cameraRig:{mode:'thirdPerson',distance:6,height:1.2,collision:true}
 });
 // Testing ramp is intentionally off the driving axis until steering is enabled.
 add('V4 · rampe inclinee',500,-700,550,35,650,{elevation3d:.1,rotationZ3d:10,color:'#998970'});
 return {mode:'3d',entities,camera:{x:0,y:0,zoom:1},ids,selected:[ids.car],
  project:{...freshGameProject(),id:'ground-vehicle-v4',title:'V4 · Parcours de validation véhicules terrestres',
   genre:'sandbox',physics3d:'rapier'},
  guide:'Scène V4 : conduire les véhicules avec les commandes standard. Contrôler châssis, roues, collisions et comportement après export.'};
}
