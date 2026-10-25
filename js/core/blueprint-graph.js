// Typed WarLike execution graph. Graphs compile to the existing 2D/3D sequence
// runtime, avoiding a second simulation language or a second scene format.
export const variableTypes=['number','boolean','string','vector2','vector3'];
const finite=(n,d=0)=>Number.isFinite(Number(n))?Number(n):d;
export function coerceVariable(type,value){
 if(type==='number')return finite(value);
 if(type==='boolean')return value===true||value==='true'||value===1;
 if(type==='vector2'||type==='vector3'){const count=type==='vector2'?2:3;return Array.from({length:count},(_,i)=>finite(Array.isArray(value)?value[i]:0))}
 return String(value??'').slice(0,512);
}
export function createGraph(sequence={}){
 const nodes=[{id:'event',kind:'event',x:30,y:120,event:sequence.event||'interact'}];
 let previous='event',i=0;
 for(const step of Array.isArray(sequence.instructions)?sequence.instructions:[]){
  const id='action'+(++i);nodes.push({id,kind:'action',x:260+(i-1)*210,y:120,action:structuredClone(step)});previous=id;
 }
 const links=[];for(let k=1;k<nodes.length;k++)links.push({from:nodes[k-1].id,to:nodes[k].id});
 return {version:1,nodes,links,variables:[]};
}
export function inspectGraph(graph){
 const errors=[];
 if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.links)){errors.push('Graphe invalide');return errors}
 if(graph.nodes.length>128||graph.links.length>128){errors.push('Graphe trop volumineux');return errors}
 const ids=new Set();
 for(const n of graph.nodes){if(!n||typeof n.id!=='string'||ids.has(n.id)||!['event','action'].includes(n.kind)){errors.push('Nœud invalide ou ID dupliqué');continue}ids.add(n.id)}
 if(graph.nodes.filter(n=>n?.kind==='event').length!==1)errors.push('Un seul nœud Event est nécessaire');
 const outputs=new Set();
 for(const e of graph.links){if(!ids.has(e?.from)||!ids.has(e?.to)||e.from===e.to||outputs.has(e.from)){errors.push('Connexion invalide ou sortie déjà utilisée')}outputs.add(e.from)}
 const edges=new Map(graph.links.map(e=>[e.from,e.to]));
 for(const n of graph.nodes){const seen=new Set();let at=n?.id;while(at&&edges.has(at)){if(seen.has(at)){errors.push('Boucle de connexion détectée');break}seen.add(at);at=edges.get(at)}}
 return [...new Set(errors)];
}
export function compileGraph(graph){
 const errors=inspectGraph(graph);if(errors.length)throw Error(errors.join(' · '));
 const byId=new Map(graph.nodes.map(n=>[n.id,n])),edges=new Map(graph.links.map(e=>[e.from,e.to]));
 const event=graph.nodes.find(n=>n.kind==='event');
 const instructions=[],visited=new Set([event.id]);let at=edges.get(event.id);
 while(at){if(visited.has(at))throw Error('Cycle de Blueprint');visited.add(at);const n=byId.get(at);if(n.kind!=='action')throw Error('Connexion non exécutable');instructions.push(structuredClone(n.action||{type:'message',value:'Action'}));at=edges.get(at)}
 return {event:event.event||'interact',instructions};
}
export function applyGraph(sequence){
 const compiled=compileGraph(sequence.graph);sequence.event=compiled.event;sequence.instructions=compiled.instructions;delete sequence.branches;delete sequence.elseInstructions;return sequence;
}
