import {createPhysicsValidationScene} from './physics-validation-scene.js';
import {defaultAnimationRig} from './skeletal-animation.js';
import {defaultSceneCamera} from './scene-camera-3d.js';
export function createProductionValidationScene(mode='3d'){
 if(mode!=='3d')throw Error('Le laboratoire de production utilise un projet 3D.');
 const demo=createPhysicsValidationScene(),entities=demo.entities;
 const add=object=>{object.id=entities.length+1;entities.push(object);return object};
 for(let i=0;i<6;i++)add({name:'GGX · rugosité '+(i/5).toFixed(1),type:'mesh3d',assetId:'primitive-sphere',meshShape:'sphere',x:i*144,y:600,elevation3d:.15,w:90,h:90,depth3d:90,color:'#e3b45f',materialMetallic:1,materialRoughness:Math.max(.04,i/5),collision3d:false,hierarchyGroup:'Reflets GGX'});
 const avatar=add({name:'Avatar UAL · marche et haut du corps',type:'mesh3d',assetId:'quaternius-ual1-mannequin',model3dId:'quaternius-ual1-mannequin',meshShape:'glb',x:920,y:580,elevation3d:0,w:64,h:128,depth3d:64,color:'#ffffff',collision3d:false,hierarchyGroup:'Animation humanoïde',animationAuto:false,
  animationRig:{...defaultAnimationRig(),avatar:{schema:'warlike.avatar.v1',enabled:true,bones:{hips:'pelvis',spine:'spine_01',chest:'spine_02',upperChest:'spine_03',neck:'neck_01',head:'Head',leftShoulder:'clavicle_l',leftUpperArm:'upperarm_l',leftLowerArm:'lowerarm_l',leftHand:'hand_l',rightShoulder:'clavicle_r',rightUpperArm:'upperarm_r',rightLowerArm:'lowerarm_r',rightHand:'hand_r',leftUpperLeg:'thigh_l',leftLowerLeg:'calf_l',leftFoot:'foot_l',rightUpperLeg:'thigh_r',rightLowerLeg:'calf_r',rightFoot:'foot_r'}}},
  animatorGraph:{enabled:true,entry:'walk',states:[{id:'walk',name:'Marche UAL',clip:'Walk_Formal_Loop',duration:4/3,loop:true}],transitions:[],layers:[{clip:'Idle_Talking_Loop',enabled:true,weight:1,mode:'override',avatarMask:'upperBody',loop:true,speed:1}],parameters:[]}
 });
 add({name:'Camera · Laboratoire',type:'object',x:570,y:1280,elevation3d:8,w:24,h:24,depth3d:24,rotation:0,rotationX3d:25,collision3d:false,color:'#90c8ef',sceneCamera3d:{...defaultSceneCamera(),mode:'fixed',fieldOfView:70,farClip:100}});
 return {...demo,selected:[avatar.id],nextId:entities.length+1,guide:'Laboratoire 3D · 108 Rigidbody, six rugosités GGX et Avatar UAL. Les jambes marchent ; la couche haut du corps parle. Modifier les objets dans l’Inspector puis tester l’export. Cette scène est un outil de validation.'};
}
