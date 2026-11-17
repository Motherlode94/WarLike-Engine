import {encodeGlb} from './material-probe-fixture.mjs';
import {registerLocalModel} from '../js/assets/real-models-3d.js';
import {freshGameProject} from '../js/core/game-project.js';
// Flat unlit layers remove lighting and triangle-order ambiguity: this tests
// the production viewport's inter-entity alpha pass and opaque occlusion.
export function transparentSceneFixture(){
 const data=new Float32Array([-1,-1,0, 1,-1,0, 1,1,0, -1,-1,0, 1,1,0, -1,1,0]);
 const mesh=color=>{
  const model={asset:{version:'2.0'},extensionsUsed:['KHR_materials_unlit'],buffers:[{byteLength:data.byteLength}],bufferViews:[{buffer:0,byteLength:data.byteLength}],accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:6}],materials:[{pbrMetallicRoughness:{baseColorFactor:color},alphaMode:color[3]===1?'OPAQUE':'BLEND',doubleSided:true,extensions:{KHR_materials_unlit:{}}}],meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0};
  return registerLocalModel(new File([encodeGlb(model,Buffer.from(data.buffer))],'alpha-layer-'+color.join('-')+'.glb'));
 };
 const layer=(id,name,y,color)=>{const model=mesh(color);return {id,name,type:'mesh3d',assetId:model.id,model3dId:model.id,x:-120,y,w:240,h:240,depth3d:1,elevation3d:0,collision3d:false}};
 const near=layer(1,'Front red',240,[1,0,0,.5]),far=layer(2,'Rear blue',120,[0,0,1,.5]),background=layer(3,'Opaque green',0,[0,1,0,1]);
 const observer={id:4,name:'Observer',type:'player',playable3d:true,x:-16,y:620,w:32,h:96,depth3d:32,elevation3d:0,rotation:180,controller3d:{walkSpeed:0,gravity:0},cameraRig:{mode:'firstPerson'}};
 const project={...freshGameProject(),id:'alpha-order',title:'Alpha order regression',genre:'sandbox'};
 return {mode:'3d',entities:[near,far,background,observer],camera:{x:0,y:0,zoom:1},project};
}
