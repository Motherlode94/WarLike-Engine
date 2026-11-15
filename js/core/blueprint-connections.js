import {canConnectData} from './blueprint-ports.js';
import {graphPort} from './blueprint-graph.js';
// Validate before replacing a wire. Execution and data wires are independent.
export function connectBlueprintPorts(graph,from,to){
 const a=graph.nodes.find(n=>n.id===from.nodeId),b=graph.nodes.find(n=>n.id===to.nodeId);
 if(!a||!b||a===b||from.kind!==to.kind)return {ok:false,error:'Choisis une entrée du même type sur un autre nœud.'};
 if(from.kind==='data'){
  const edge={kind:'data',from:a.id,fromPort:from.port,to:b.id,toPort:to.port};
  if(!canConnectData(graph,edge))return {ok:false,error:'Types incompatibles ou boucle de données.'};
  graph.links=graph.links.filter(e=>!(e.kind==='data'&&e.to===b.id&&e.toPort===to.port));graph.links.push(edge);return {ok:true};
 }
 if(a.kind==='data'||b.kind==='event'||b.kind==='data'||!(a.kind==='condition'?['true','false']:['next']).includes(from.port))return {ok:false,error:'Connexion d’exécution invalide.'};
 const links=graph.links.filter(e=>!(e.kind!=='data'&&e.from===a.id&&graphPort(e)===from.port)),seen=new Set();
 const reaches=id=>{if(id===a.id)return true;if(seen.has(id))return false;seen.add(id);return links.some(e=>e.kind!=='data'&&e.from===id&&reaches(e.to));};
 if(reaches(b.id))return {ok:false,error:'Cette connexion créerait une boucle d’exécution.'};
 graph.links=[...links,{from:a.id,to:b.id,port:from.port}];return {ok:true};
}
