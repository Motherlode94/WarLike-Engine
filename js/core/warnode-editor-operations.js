// WarNode editing helpers operate only on project-owned graph data.
// They never compile/execute a graph and never mutate the runtime directly.
export const WARNODE_NODE_LIMIT=128;
export function duplicateWarNode(graph,nodeId,{offsetX=48,offsetY=48}={}){
 if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.links))return {ok:false,error:'Graphe invalide.'};
 if(graph.nodes.length>=WARNODE_NODE_LIMIT)return {ok:false,error:'Limite de 128 nœuds atteinte.'};
 const original=graph.nodes.find(node=>node.id===nodeId);
 if(!original)return {ok:false,error:'Sélectionne un nœud existant.'};
 if(original.kind==='event')return {ok:false,error:'Le déclencheur Event ne peut pas être dupliqué.'};
 const names=new Set(graph.nodes.map(node=>node.id)),base=String(original.id).slice(0,70)+'-copy';
 let id=base;
 for(let suffix=2;names.has(id);suffix++){if(suffix>10000)return {ok:false,error:'Impossible de générer un identifiant unique.'};id=base+'-'+suffix}
 const copy=structuredClone(original);
 copy.id=id;copy.x=Math.max(20,Number.isFinite(original.x)?original.x+offsetX:120);
 copy.y=Math.max(20,Number.isFinite(original.y)?original.y+offsetY:120);
 delete copy.breakpoint;
 // New copies deliberately start disconnected: user must choose their control
 // and typed data wires explicitly; no implicit duplicate runtime behaviour.
 graph.nodes.push(copy);
 return {ok:true,id,node:copy};
}
export function removeWarNode(graph,nodeId){
 if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.links))return {ok:false,error:'Graphe invalide.'};
 const index=graph.nodes.findIndex(node=>node.id===nodeId);
 if(index<0)return {ok:false,error:'Nœud introuvable.'};
 if(graph.nodes[index].kind==='event')return {ok:false,error:'Le déclencheur Event est obligatoire.'};
 graph.nodes.splice(index,1);
 graph.links=graph.links.filter(link=>link.from!==nodeId&&link.to!==nodeId);
 return {ok:true};
}
export function summarizeWarNodeGraph(graph){
 if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.links))return {nodes:0,exec:0,data:0,disconnected:0};
 const ids=new Set(graph.nodes.map(node=>node.id)),adjacent=new Map();
 for(const link of graph.links){
  if(link.kind==='data'||!ids.has(link.from)||!ids.has(link.to))continue;
  const edges=adjacent.get(link.from)||[];edges.push(link.to);adjacent.set(link.from,edges);
 }
 const event=graph.nodes.find(node=>node.kind==='event'),seen=new Set(),queue=event?[event.id]:[];
 for(let i=0;i<queue.length&&i<256;i++){
  const id=queue[i];if(seen.has(id))continue;seen.add(id);
  for(const next of adjacent.get(id)||[])if(!seen.has(next))queue.push(next);
 }
 return {nodes:graph.nodes.length,
  exec:graph.links.filter(link=>link.kind!=='data').length,
  data:graph.links.filter(link=>link.kind==='data').length,
  disconnected:graph.nodes.filter(node=>node.kind!=='data'&&!seen.has(node.id)).length};
}
