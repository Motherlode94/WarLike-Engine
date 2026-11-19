import {defaultRigidbody3d} from './physics-3d.js';
import {defaultCollider3d} from './collider-3d.js';
export function createPhysicsValidationScene({bodies=108}={}){
 if(!Number.isInteger(bodies)||bodies<1||bodies>512)throw Error('Physics lab supports 1–512 bodies');
 const entities=[];
 const box=(name,x,y,elevation,w,h,depth,extra={})=>{const o={id:entities.length+1,name,type:'mesh3d',assetId:'primitive-cube',meshShape:'cube',x,y,elevation3d:elevation,w,h,depth3d:depth,color:'#6887a8',collision3d:true,solid3d:true,collider3d:defaultCollider3d(),...extra};entities.push(o);return o};
 box('Physics Lab · Floor',-128,-128,-.25,2048,16,2048);
 box('Physics Lab · North wall',-128,-128,0,2048,256,16);
 box('Physics Lab · South wall',-128,1904,0,2048,256,16);
 box('Physics Lab · West wall',-128,-128,0,16,256,2048);
 box('Physics Lab · East wall',1904,-128,0,16,256,2048);
 for(let i=0;i<bodies;i++){
  const column=i%36,row=Math.floor(column/12),layer=Math.floor(i/36),shape=['box','sphere','capsule'][column%3];
  box('Physics Lab · Body '+(i+1),column%12*96,row*192,1+layer*.85,32,32,32,{
   hierarchyGroup:'Physics Lab · '+shape,
   rigidbody3d:{...defaultRigidbody3d(),mass:1+i%5,friction:.8,restitution:.02,ccd:true},
   collider3d:{...defaultCollider3d(),shape},color:['#78b9db','#f1c46b','#b5d99c'][column%3]
  });
 }
 box('Physics Lab · Test player',-80,1500,0,32,96,32,{playable3d:true,collision3d:false,solid3d:false,collider3d:{...defaultCollider3d(),enabled:false}});
 return {entities,selected:[6],nextId:entities.length+1,camera:{x:0,y:0,zoom:1},genre:'sandbox'};
}
