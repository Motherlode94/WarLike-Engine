// Native WarLike 3D entities and game project; no parallel rendering or gameplay engine.
import {complete3dRoute} from './complete-3d-route-fixture.mjs';
import {defaultNavigationAgent} from '../js/core/navigation-agent.js';
import {defaultAnimatorGraph} from '../js/core/animator-graph.js';

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
    stats:undefined,
    collision3d:true,
    solid3d:false,
    navigationAgent:{...defaultNavigationAgent(),speed:1.3,loop:true,waypoints:[{x:112,y:-120},{x:68,y:-120}]},
    animatorGraph:defaultAnimatorGraph(),
  };
  delete movingTarget.ai;
  delete movingTarget.stats;
  scene.entities.push(movingTarget);
  scene.ids.movingTarget=movingTarget.id;
  scene.project.id='p5-fps-tps-certification-'+(cameraMode==='firstPerson'?'fps':'tps');
  scene.project.title='P5 · Certification FPS/TPS '+(cameraMode==='firstPerson'?'FPS':'TPS');
  return scene;
}
