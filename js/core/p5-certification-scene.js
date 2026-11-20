import {defaultController,defaultStats,defaultAi} from './gameplay-components.js';
import {freshGameProject} from './game-project.js';
function complete3dRoute(){
 const entities=[];
 const add=(name,x,y,w,h,depth3d,extra={})=>{const o={id:entities.length+1,type:'mesh3d',assetId:'primitive-cube',name,x,y,w,h,depth3d,elevation3d:0,color:'#658294',colorCustomized:true,collision3d:true,solid3d:true,...extra};entities.push(o);return o;};
 add('Sol réel',-320,-500,640,16,1400,{elevation3d:-.25,tags:['ai-walkable']});
 add('Mur gauche',-160,-450,16,220,1350);add('Mur droit',176,-450,16,220,1350);
 for(let i=0;i<4;i++)add('Marche '+(i+1),-144,480-i*48,320,12*(i+1),48,{tags:['ai-walkable']});
 add('Palier',-144,-450,320,48,786,{tags:['ai-walkable']});
 const player=add('Joueur parcours',0,660,32,96,32,{assetId:'free-mini-characters-character-male-a',model3dId:'free-mini-characters-character-male-a',playable3d:true,rotation:180,controller3d:{...defaultController(),walkSpeed:3,sprintSpeed:4},cameraRig:{mode:'firstPerson',collision:true},adventure:{title:'Parcours de validation',combatEnabled:true,items:[],notes:[]},stats:defaultStats(),team:1});
 const door=add('Porte du palier',-144,170,320,180,16,{elevation3d:.75,color:'#ba714b',adventureInteractable:{label:'Ouvrir la porte',radius:130},sequence:{enabled:true,event:'interact',key:'e',radius:130,once:true,conditions:[],instructions:[{type:'setCollision',value:false},{type:'setVisibility',value:false},{type:'setVariable',key:'doorOpen',value:1}]}});
 const enemy=add('Cible de combat',0,-260,32,96,32,{elevation3d:.75,assetId:'free-mini-characters-character-male-b',model3dId:'free-mini-characters-character-male-b',team:2,stats:defaultStats(),ai:{...defaultAi(),speed:0,patrolRadius:0,detection:0,attackDamage:0}});
 add('Sortie du parcours',96,-60,24,64,24,{elevation3d:.75,color:'#6bc98a',collision3d:false,solid3d:false,adventureInteractable:{label:'Terminer',radius:135},sequence:{enabled:true,event:'interact',key:'e',radius:135,once:true,conditions:[],instructions:[{type:'winGame',value:'Parcours 3D terminé.'}]}});
 return {mode:'3d',entities,camera:{x:0,y:0,zoom:1},project:{...freshGameProject(),id:'complete-3d-route',title:'Parcours 3D — validation',genre:'action'},ids:{player:player.id,door:door.id,enemy:enemy.id}};
}


import {defaultNavigationAgent} from './navigation-agent.js';

import {defaultAnimatorGraph} from './animator-graph.js';

export function p5CertificationScene(cameraMode='firstPerson') {
  if (!['firstPerson','thirdPerson'].includes(cameraMode)) throw Error('Unsupported P5 camera mode');
  const scene=complete3dRoute();
  const player=scene.entities.find(o=>o.id===scene.ids.player);
  player.cameraRig={...player.cameraRig,mode:cameraMode,...(cameraMode==='thirdPerson'?{distance:5.5,height:0.7,collision:true}: {})};
  player.animatorGraph=defaultAnimatorGraph();
  player.hierarchyGroup='P5 · Joueur';
  const staticTarget=scene.entities.find(o=>o.id===scene.ids.enemy);
  staticTarget.hierarchyGroup='P5 · Cibles';
  // A genuinely moving native GameObject, controlled by Navigation Agent.
  // Its AI combat controller is omitted to avoid competing movement systems.
  const movingTarget={
    ...structuredClone(staticTarget),
    id:Math.max(...scene.entities.map(o=>o.id))+1,
    name:'P5 · Cible mobile',
    x:68,y:-120,
    ai:undefined,
    // Keep Health/Stats so the mobile target can actually receive FPS/TPS damage.
    // Only the competing combat AI is disabled; Navigation Agent still drives it.
    stats:defaultStats(),
    collision3d:true,
    solid3d:false,
    navigationAgent:{...defaultNavigationAgent(),speed:1.3,loop:true,waypoints:[{x:112,y:-120},{x:68,y:-120}]},
    animatorGraph:defaultAnimatorGraph(),
  };
  delete movingTarget.ai;
  scene.entities.push(movingTarget);
  scene.ids.movingTarget=movingTarget.id;
  scene.project.id='p5-fps-tps-certification-'+(cameraMode==='firstPerson'?'fps':'tps');
  scene.project.title='P5 · Certification FPS/TPS '+(cameraMode==='firstPerson'?'FPS':'TPS');
  return {...scene,selected:[player.id],nextId:Math.max(...scene.entities.map(o=>o.id))+1,guide:'P5 · Certification FPS/TPS native : modifier GameObjects, Camera Rig, collisions et Animator dans Inspector, puis tester Play, sauvegarde et export Web.',genre:'action'};
}