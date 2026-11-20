import {defaultSceneCamera} from './scene-camera-3d.js';
import {prefab3d} from '../assets/catalog-3d.js';

// Minimal, editable 3D scene. Does not affect imported or saved projects.
export function createCleanStarterScene3d(){
 const camera={
  id:1,name:'Main Camera',type:'object',x:0,y:350,w:32,h:32,depth3d:32,
  elevation3d:5,rotation:0,color:'#8db4ce',visible:false,collision3d:false,
  sceneCamera3d:{...defaultSceneCamera(),mode:'free',targetId:0}
 };
 const ground=prefab3d('primitive-platform',2,0,0);
 if(!ground)throw Error('Primitive terrain unavailable');
 Object.assign(ground,{id:2,name:'Terrain',x:-320,y:-320,w:640,h:16,depth3d:640,
  elevation3d:0,color:'#87a67c',collision3d:true,solid3d:true});
 // Existing renderer uses the global sun for directional light; this entity
 // exposes it in Hierarchy without adding a second point/spot emitter.
 const light={id:3,name:'Directional Light',type:'object',x:0,y:0,w:32,h:32,depth3d:32,
  elevation3d:9,rotation:35,color:'#fff2c4',visible:false,collision3d:false,
  lightType:'directional',lightEnabled:true,lightIntensity:1.25,lightColor:'#fff2c4'};
 return [camera,ground,light];
}
