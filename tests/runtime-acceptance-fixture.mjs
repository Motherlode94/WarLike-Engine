import {freshGameProject} from '../js/core/game-project.js';
import {createGraph,applyGraph} from '../js/core/blueprint-graph.js';
import {prefab3d} from '../js/assets/catalog-3d.js';

export const nativeSource=`using WarLike.Runtime;
public sealed class AcceptanceSpinner : MonoBehaviour {
 public float Speed = 90f;
 void Update() { transform.Rotate(0, Speed * Time.deltaTime, 0); }
}`;

// The same authored graph is exercised in the editor and in a real exported ZIP.
export function runtimeFixture(mode,native=false){
 const project={...freshGameProject(),id:'acceptance-'+mode,title:'Runtime QA '+mode,physics3d:'builtin',runtimeBackend:native?'native':'web',variables:[{name:'score',type:'number',value:0}],functions:[{
  id:'award',name:'Attribuer des points',parameters:[{name:'points',type:'number',value:2}],returnType:'void',
  instructions:[{type:'addVariable',key:'score',value:{$ref:'parameter',name:'points',type:'number'},breakpoint:true}]
 }]};
 const actor=mode==='3d'?{...prefab3d('character-hero',1,128,128),playable3d:true}:{id:1,type:'player',x:128,y:128,w:40,h:64,color:'#68baaf',hp:100};
 Object.assign(actor,{name:'Acteur QA',rotation:0,legacyExtension:{preserved:true},sequence:{event:'start',instructions:[
  {type:'setVariable',key:'score',value:1},
  {type:'callFunction',functionId:'award',arguments:{points:2}},
  {type:'wait',value:.05},
  {type:'addVariable',key:'score',value:4}
 ]}});
 actor.sequence.graph=createGraph(actor.sequence);actor.sequence.graph.nodes[1].breakpoint=true;applyGraph(actor.sequence);
 if(native){actor.csharpScript={name:'AcceptanceSpinner',source:nativeSource,values:{Speed:90}};actor.warScripts=[{scriptId:'native-observer',name:'Observer.wls',source:'Update(){Set("nativeRotation",transform.rotation.'+(mode==='3d'?'y':'z')+');}',values:{}}];}
 const floor={...prefab3d('primitive-platform',2,128,128),name:'Sol QA',w:640,depth3d:640,h:32,elevation3d:-.5,collision3d:true,solid3d:true};
 return {mode,entities:mode==='3d'?[actor,floor]:[actor],camera:{x:0,y:0,zoom:1},project};
}
