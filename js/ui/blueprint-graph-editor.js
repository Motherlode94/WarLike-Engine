import {createGraph,applyGraph,inspectGraph,coerceVariable,variableTypes} from '../core/blueprint-graph.js';
import {sequenceEvents,sequenceInstructions} from '../core/logic-sequences.js';
import {state} from '../core/state.js';
const nodeWidth=176,nodeHeight=100;
export function renderBlueprintGraph(host,sequence,save){
 const section=document.createElement('details');section.className='sequence-branch';section.open=true;
 const summary=document.createElement('summary');summary.textContent='⬡ Graphe nodal · connexions et variables';section.append(summary);
 const panel=document.createElement('div');panel.className='bp-toolbar';
 const addButton=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=state.playing;b.onclick=fn;panel.append(b);return b};
 const graph=sequence.graph;
 addButton(graph?'Réinitialiser le graphe':'Créer le graphe',()=>{
  if(sequence.graph&&!confirm('Recréer le graphe depuis les actions actuelles ?'))return;
  sequence.graph=createGraph(sequence);save('Créer graphe');
 });
 if(!graph){const hint=document.createElement('p');hint.textContent='Crée un graphe pour modifier des nœuds et leurs connexions. Les anciennes séquences restent compatibles.';section.append(panel,hint);host.append(section);return}
 const update=label=>{try{applyGraph(sequence);save(label)}catch(error){warning.textContent=error.message;renderLinks()}};
 addButton('＋ Action',()=>{const id='n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);graph.nodes.push({id,kind:'action',x:220+graph.nodes.length*24,y:75+graph.nodes.length*30,action:{type:'message',value:'Nouvelle action'}});save('Ajouter nœud')});
 addButton('Déconnecter tout',()=>{graph.links=[];update('Déconnecter graphe')});
 const warning=document.createElement('p');warning.className='bp-validation';warning.textContent=inspectGraph(graph).join(' · ')||'Graphe valide · connexions exécutables';
 const board=document.createElement('div');board.className='bp-board';board.setAttribute('aria-label','Éditeur nodal WarLike');
 const wires=document.createElementNS('http://www.w3.org/2000/svg','svg');wires.classList.add('bp-wires');wires.setAttribute('width','1600');wires.setAttribute('height','900');board.append(wires);
 const elements=new Map();let pending=null;
 function renderLinks(){
  wires.replaceChildren();
  for(const edge of graph.links){
   const a=graph.nodes.find(n=>n.id===edge.from),b=graph.nodes.find(n=>n.id===edge.to);if(!a||!b)continue;
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');
   const x=a.x+nodeWidth,y=a.y+45,xx=b.x,yy=b.y+45;
   path.setAttribute('d',`M${x} ${y} C${x+70} ${y} ${xx-70} ${yy} ${xx} ${yy}`);
   path.setAttribute('fill','none');path.setAttribute('stroke','#95ccb9');path.setAttribute('stroke-width','3');
   wires.append(path);
  }
 }
 for(const n of graph.nodes){
  const box=document.createElement('div');box.className='bp-node';box.style.left=n.x+'px';box.style.top=n.y+'px';box.dataset.kind=n.kind;
  const heading=document.createElement('div');heading.className='bp-node-title';heading.textContent=n.kind==='event'?'▶ EVENT':'▣ ACTION';box.append(heading);
  const input=document.createElement('select');input.disabled=state.playing;
  for(const name of n.kind==='event'?sequenceEvents:sequenceInstructions){const option=document.createElement('option');option.value=name;option.textContent=name;input.append(option)}
  input.value=n.kind==='event'?n.event:n.action?.type||'message';
  input.onchange=()=>{if(n.kind==='event')n.event=input.value;else n.action={type:input.value,value:n.action?.value??''};update('Modifier nœud')};
  box.append(input);
  if(n.kind==='action'){const value=document.createElement('input');value.placeholder='Valeur';value.value=String(n.action?.value??'');value.disabled=state.playing;value.onchange=()=>{n.action.value=value.value;update('Valeur nœud')};box.append(value)}
  const inPort=document.createElement('button');inPort.type='button';inPort.className='bp-port bp-in';inPort.title='Connecter une sortie ici';inPort.disabled=state.playing||n.kind==='event';inPort.textContent='●';
  inPort.onclick=()=>{if(!pending)return;graph.links=graph.links.filter(e=>e.from!==pending);graph.links.push({from:pending,to:n.id});pending=null;update('Connecter les nœuds')};
  const outPort=document.createElement('button');outPort.type='button';outPort.className='bp-port bp-out';outPort.title='Sélectionner une sortie puis une entrée';outPort.textContent='●';outPort.disabled=state.playing;
  outPort.onclick=()=>{pending=n.id;warning.textContent='Sortie sélectionnée : clique sur l’entrée ● du nœud cible.'};
  box.append(inPort,outPort);
  if(n.kind==='action'){const remove=document.createElement('button');remove.type='button';remove.className='bp-remove';remove.textContent='×';remove.title='Supprimer nœud';remove.disabled=state.playing;remove.onclick=()=>{graph.nodes=graph.nodes.filter(v=>v!==n);graph.links=graph.links.filter(e=>e.from!==n.id&&e.to!==n.id);update('Supprimer nœud')};box.append(remove)}
  heading.addEventListener('pointerdown',e=>{if(state.playing||e.button!==0)return;e.preventDefault();const sx=e.clientX,sy=e.clientY,ox=n.x,oy=n.y;heading.setPointerCapture(e.pointerId);
   const move=ev=>{n.x=Math.max(0,Math.min(1420,ox+ev.clientX-sx));n.y=Math.max(0,Math.min(770,oy+ev.clientY-sy));box.style.left=n.x+'px';box.style.top=n.y+'px';renderLinks()};
   const done=()=>{heading.removeEventListener('pointermove',move);heading.removeEventListener('pointerup',done);heading.removeEventListener('pointercancel',done);save('Déplacer nœud')};
   heading.addEventListener('pointermove',move);heading.addEventListener('pointerup',done);heading.addEventListener('pointercancel',done);
  });
  board.append(box);elements.set(n.id,box);
 }
 const variables=document.createElement('div');variables.className='bp-variables';const label=document.createElement('strong');label.textContent='Variables typées';variables.append(label);
 graph.variables??=[];
 for(const v of graph.variables){
  const row=document.createElement('div');row.className='bp-variable';
  const name=document.createElement('input');name.value=v.name;name.placeholder='Nom';name.disabled=state.playing;
  name.onchange=()=>{v.name=name.value.trim().slice(0,48);save('Nom variable')};
  const type=document.createElement('select');type.disabled=state.playing;for(const t of variableTypes){const o=document.createElement('option');o.value=t;o.textContent=t;type.append(o)}type.value=v.type;
  type.onchange=()=>{v.type=type.value;v.value=coerceVariable(v.type,v.value);save('Type variable')};
  const value=document.createElement('input');value.value=Array.isArray(v.value)?v.value.join(','):String(v.value);value.disabled=state.playing;
  value.onchange=()=>{v.value=coerceVariable(v.type,v.type.startsWith('vector')?value.value.split(','):value.value);save('Valeur variable')};
  row.append(name,type,value);variables.append(row);
 }
 addButton('＋ Variable',()=>{graph.variables.push({name:'variable'+(graph.variables.length+1),type:'number',value:0});save('Ajouter variable')});
 section.append(panel,warning,board,variables);host.append(section);renderLinks();
}
