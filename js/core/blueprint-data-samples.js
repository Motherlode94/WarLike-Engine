import {applyGraph} from './blueprint-graph.js';
export function healthDataSequence(){
 const sequence={enabled:true,name:'Santé − dégâts · ports typés',event:'interact',key:'e',radius:110,once:false,graph:{version:3,variables:[],nodes:[
  {id:'event',kind:'event',event:'interact',x:40,y:40},
  {id:'self',kind:'data',op:'entity',role:'self',x:40,y:290},
  {id:'hp',kind:'data',op:'property',property:'hp',valueType:'number',x:350,y:290},
  {id:'damage',kind:'data',op:'constant',valueType:'number',value:25,x:350,y:620},
  {id:'subtract',kind:'data',op:'subtract',valueType:'number',x:660,y:290},
  {id:'apply',kind:'action',action:{type:'setHealth'},x:970,y:40}
 ],links:[{from:'event',to:'apply'},
  {kind:'data',from:'self',fromPort:'value',to:'hp',toPort:'source'},
  {kind:'data',from:'hp',fromPort:'value',to:'subtract',toPort:'a'},
  {kind:'data',from:'damage',fromPort:'value',to:'subtract',toPort:'b'},
  {kind:'data',from:'subtract',fromPort:'value',to:'apply',toPort:'value'}]}};
 return applyGraph(sequence);
}
