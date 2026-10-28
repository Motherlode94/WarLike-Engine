// A bounded execution graph compiled into the shared sequence runtime.
export const variableTypes=['number','boolean','string','vector2','vector3'];
const finite=(n,d=0)=>Number.isFinite(Number(n))?Number(n):d;
export function coerceVariable(type,value){
 if(type==='number')return finite(value);
 if(type==='boolean')return value===true||value==='true'||value===1;
 if(type==='vector2'||type==='vector3'){const count=type==='vector2'?2:3;return Array.from({length:count},(_,i)=>finite(Array.isArray(value)?value[i]:0))}
 return String(value??'').slice(0,512);
}
export const graphPort=edge=>edge.port||'next';
export function createGraph(sequence={}){
 const nodes=[{id:'event',kind:'event',x:48,y:150,event:sequence.event||'interact'}],links=[];
 let serial=0;
 const chain=(steps,from,port='next',x=340,y=150)=>{
  let previous=from,output=port;
  for(const [i,step] of (Array.isArray(steps)?steps:[]).entries()){if(serial>=128)throw Error('128 nœuds maximum par graphe.');if(step.type==='branch'){const id='condition'+(++serial);nodes.push({id,kind:'condition',x,y,conditions:structuredClone(step.conditions||[]),conditionMode:step.conditionMode||'all'});links.push({from:previous,to:id,port:output});const tail=steps.slice(i+1);chain([...(step.thenInstructions||[]),...tail],id,'true',x+280,y);chain([...(step.elseInstructions||[]),...tail],id,'false',x+280,y+230);return}const id='action'+(++serial);nodes.push({id,kind:'action',x,y,action:structuredClone(step)});links.push({from:previous,to:id,port:output});previous=id;output='next';x+=280}
 };
 if(sequence.branches?.length){
  let previous='event',port='next';
  for(const [i,branch] of sequence.branches.entries()){
   const id='condition'+(++serial),x=340+i*280,y=150+i*230;
   nodes.push({id,kind:'condition',x,y,conditions:structuredClone(branch.conditions||[]),conditionMode:branch.conditionMode||'all'});
   links.push({from:previous,to:id,port});chain(branch.instructions,id,'true',x+280,y);previous=id;port='false';
  }
  chain(sequence.elseInstructions,previous,'false',340+sequence.branches.length*280,150+sequence.branches.length*230);
 }else chain(sequence.instructions,'event');
 return {version:2,nodes,links,variables:[]};
}
export function inspectGraph(graph){
 const errors=[];
 if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.links))return ['Graphe invalide'];
 if(graph.nodes.length>128||graph.links.length>256)return ['Graphe trop volumineux (128 nœuds maximum)'];
 const ids=new Set(),byId=new Map();
 for(const node of graph.nodes){
  if(!node||typeof node.id!=='string'||ids.has(node.id)||!['event','action','condition'].includes(node.kind)){errors.push('Nœud invalide ou ID dupliqué');continue}
  ids.add(node.id);byId.set(node.id,node);
 }
 const events=graph.nodes.filter(n=>n?.kind==='event');if(events.length!==1)errors.push('Un seul nœud Event est nécessaire');
 const outputs=new Set(),inbound=new Map(),edges=new Map();
 for(const edge of graph.links){
  const node=byId.get(edge?.from),port=graphPort(edge||{}),key=edge?.from+':'+port;
  if(!ids.has(edge?.from)||!ids.has(edge?.to)||edge.from===edge.to||outputs.has(key)||!(node?.kind==='condition'?['true','false']:['next']).includes(port)){errors.push('Connexion invalide ou sortie déjà utilisée');continue}
  if(byId.get(edge.to)?.kind==='event'){errors.push('Event ne peut pas recevoir de connexion');continue}
  outputs.add(key);inbound.set(edge.to,(inbound.get(edge.to)||0)+1);
  const list=edges.get(edge.from)||[];list.push(edge.to);edges.set(edge.from,list);
 }
 for(const node of graph.nodes)if(node?.kind!=='event'&&!inbound.has(node?.id))errors.push('Graphe déconnecté : relie toutes les actions et conditions à Event');
 const visiting=new Set(),visited=new Set();
 const visit=id=>{if(visiting.has(id)){errors.push('Boucle de connexion détectée');return}if(visited.has(id))return;visiting.add(id);for(const next of edges.get(id)||[])visit(next);visiting.delete(id);visited.add(id)};
 if(events[0])visit(events[0].id);
 if(visited.size!==ids.size)errors.push('Graphe déconnecté : certains nœuds ne sont pas exécutables');
 return [...new Set(errors)];
}
export function compileGraph(graph,{nodeIds=false}={}){
 const errors=inspectGraph(graph);if(errors.length)throw Error(errors.join(' · '));
 const byId=new Map(graph.nodes.map(node=>[node.id,node]));
 const next=(id,port='next')=>graph.links.find(edge=>edge.from===id&&graphPort(edge)===port)?.to;
 let expanded=0;
 const compile=id=>{
  const steps=[];
  while(id){
   if(++expanded>1024)throw Error('Graphe trop complexe après compilation ; sépare les comportements.');
   const node=byId.get(id);
   if(node.kind==='condition'){
    const branch={type:'branch',conditions:structuredClone(node.conditions||[]),conditionMode:node.conditionMode||'all',thenInstructions:compile(next(id,'true')),elseInstructions:compile(next(id,'false'))};
    if(nodeIds)branch._nodeId=id;steps.push(branch);return steps;
   }
   const action=structuredClone(node.action||{type:'message',value:'Action'});if(nodeIds)action._nodeId=id;steps.push(action);id=next(id);
  }
  return steps;
 };
 const event=graph.nodes.find(node=>node.kind==='event');
 return {event:event.event||'interact',instructions:compile(next(event.id))};
}
export function applyGraph(sequence){
 const compiled=compileGraph(sequence.graph,{nodeIds:true});sequence.event=compiled.event;sequence.instructions=compiled.instructions;delete sequence.branches;delete sequence.elseInstructions;return sequence;
}
