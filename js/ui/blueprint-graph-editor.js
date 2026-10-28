import {createGraph,applyGraph,inspectGraph,inspectGraphDetailed,graphPort} from '../core/blueprint-graph.js';
import {sequenceEvents,sequenceRuntime} from '../core/logic-sequences.js';
import {labelFor,eventFields} from '../core/blueprint-catalog.js';
import {state} from '../core/state.js';
import {element,button,select,field,editAction,editConditions} from './blueprint-controls.js';
const width=240,height=136;
export function renderBlueprintGraph(host,sequence,save,options={}){
 const root=element('section','bp-graph-editor'),toolbar=element('div','bp-graph-toolbar');
 if(!sequence.graph){
  const empty=element('div','bp-empty-state');empty.append(element('span','bp-empty-icon','⬡'),element('h2','','Donne une forme à ta logique'),element('p','','Transforme les instructions de ce comportement en nœuds reliés. Les conditions deviennent des chemins Oui / Non.'));
  button(empty,'Créer le graphe',()=>{sequence.graph=createGraph(sequence);save('Créer le graphe')},'bp-primary');root.append(empty);host.append(root);return;
 }
 const graph=sequence.graph;let selected=options.selectedNodeId||graph.nodes[0]?.id,pending=null,zoom=options.zoom||1;
 const validation=element('span','bp-graph-validation'),layout=element('div','bp-graph-layout'),board=element('div','bp-canvas'),world=element('div','bp-world'),inspector=element('aside','bp-node-inspector');
 board.tabIndex=0;board.setAttribute('aria-label','Graphe Blueprint : sélectionner, déplacer et connecter les nœuds');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('bp-connections');world.append(svg);board.append(world);layout.append(board,inspector);
 const update=label=>{const errors=inspectGraph(graph);if(!errors.length)applyGraph(sequence);save(label)};
 const node=id=>graph.nodes.find(n=>n.id===id);
 const add=kind=>{
  const source=node(pending?.from||selected)||graph.nodes.at(-1),port=pending?.port||(source.kind==='condition'?'true':'next');
  const id='node-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),next={id,kind,x:source.x+310,y:source.y+(port==='false'?220:0)};
  if(kind==='action')next.action={type:'message',value:'Nouvelle action'};else next.conditions=[{type:'variable',key:'score',operator:'>=',value:1}];
  const old=graph.links.find(edge=>edge.from===source.id&&graphPort(edge)===port);
  graph.links=graph.links.filter(edge=>edge!==old);graph.nodes.push(next);graph.links.push({from:source.id,to:id,port});
  if(old)graph.links.push({from:id,to:old.to,port:kind==='condition'?'true':'next'});
  options.onSelect?.(id);selected=id;update('Ajouter un nœud');
 };
 button(toolbar,'＋ Action',()=>add('action'),'bp-secondary');button(toolbar,'◇ Condition',()=>add('condition'),'bp-secondary');
 button(toolbar,'Réorganiser',()=>{const visited=new Set();let row=0;const place=(id,column)=>{if(visited.has(id))return;visited.add(id);const n=node(id);n.x=56+column*310;n.y=70+row*205;const edges=graph.links.filter(e=>e.from===id).sort((a,b)=>graphPort(a)==='false'?1:-1);for(const [i,edge] of edges.entries()){if(i)row++;place(edge.to,column+1)}};place(graph.nodes.find(n=>n.kind==='event').id,0);update('Réorganiser le graphe')},'bp-text-button');
 const zoomLabel=element('label','bp-zoom'),slider=element('input');slider.type='range';slider.min='40';slider.max='150';slider.value=String(zoom*100);slider.setAttribute('aria-label','Zoom du graphe');const zoomValue=element('span','',Math.round(zoom*100)+' %');zoomLabel.append(slider,zoomValue);toolbar.append(zoomLabel,validation);
 const boxes=new Map();
 function size(){const x=Math.max(1400,...graph.nodes.map(n=>n.x+width+100)),y=Math.max(800,...graph.nodes.map(n=>n.y+height+100));world.style.width=x+'px';world.style.height=y+'px';world.style.zoom=String(zoom);svg.setAttribute('width',String(x));svg.setAttribute('height',String(y));zoomValue.textContent=Math.round(zoom*100)+' %'}
 slider.oninput=()=>{zoom=Number(slider.value)/100;options.onZoom?.(zoom);size()};
 function wires(){svg.replaceChildren();for(const edge of graph.links){const a=node(edge.from),b=node(edge.to);if(!a||!b)continue;const port=graphPort(edge),x=a.x+width,y=a.y+(port==='false'?107:port==='true'?72:87),xx=b.x,yy=b.y+72;const path=document.createElementNS(svg.namespaceURI,'path');const bend=Math.max(20,Math.min(105,Math.abs(xx-x)*.45));path.setAttribute('d',`M${x} ${y} C${x+bend} ${y}, ${xx-bend} ${yy}, ${xx} ${yy}`);path.setAttribute('class','bp-wire '+(port==='false'?'is-false':port==='true'?'is-true':''));path.addEventListener('dblclick',()=>{if(state.playing)return;graph.links=graph.links.filter(e=>e!==edge);update('Retirer une connexion')});svg.append(path)}}
 function details(){
  inspector.replaceChildren();const n=node(selected);if(!n)return;
  inspector.append(element('span','bp-eyebrow',n.kind==='condition'?'CONDITION':n.kind==='event'?'DÉCLENCHEUR':'INSTRUCTION'),element('h2','',n.kind==='condition'?'Si / Sinon':labelFor(n.kind==='event'?n.event:n.action?.type,n.kind)));
  const change=()=>update('Modifier le nœud');
  if(n.kind==='event'){
   select(inspector,'Événement',n.event,sequenceEvents,v=>{n.event=v;sequence.event=v;change()},{kind:'event'});
   for(const schema of eventFields(n.event))field(inspector,schema,sequence,change);
   field(inspector,{key:'once',label:'Une seule fois',type:'boolean',default:false},sequence,change);
   field(inspector,{key:'runWhenPaused',label:'Actif pendant la pause / fin',type:'boolean',default:false},sequence,change);
  }else if(n.kind==='condition'){
   select(inspector,'Combinaison',n.conditionMode||'all',[{value:'all',label:'Toutes les conditions (ET)'},{value:'any',label:'Au moins une (OU)'}],v=>{n.conditionMode=v;change()});
   n.conditions??=[];editConditions(inspector,n.conditions,change);
   inspector.append(element('p','bp-hint','Oui : les conditions sont remplies. Non : elles ne le sont pas. Une sortie vide termine ce chemin.'));
  }else editAction(inspector,n.action,change);
  if(n.kind!=='event')button(inspector,'Supprimer le nœud',removeSelected,'bp-text-button bp-danger');
  inspector.append(element('small','bp-node-id','Nœud '+n.id));
 }
 function selectNode(id){selected=id;options.onSelect?.(id);for(const [key,box] of boxes)box.classList.toggle('is-selected',id===key);details()}
 function removeSelected(){const n=node(selected);if(!n||n.kind==='event'||state.playing)return;graph.nodes=graph.nodes.filter(v=>v!==n);graph.links=graph.links.filter(e=>e.from!==n.id&&e.to!==n.id);options.onSelect?.(graph.nodes[0]?.id);update('Supprimer le nœud')}
 for(const n of graph.nodes){
  const box=element('article','bp-node-v2'),header=element('div','bp-node-drag'),kind=element('span','bp-node-kind',n.kind==='event'?'ÉVÉNEMENT':n.kind==='condition'?'CONDITION':'ACTION');box.dataset.nodeId=n.id;box.dataset.kind=n.kind;box.style.left=n.x+'px';box.style.top=n.y+'px';header.append(kind,element('span','bp-node-menu','⠿'));box.append(header);
  box.append(element('strong','bp-node-label',n.kind==='condition'?'Si / Sinon':labelFor(n.kind==='event'?n.event:n.action?.type,n.kind)),element('span','bp-node-description',n.kind==='condition'?(n.conditions?.length||0)+' condition(s)':n.kind==='event'?(sequence.signal||sequence.key||'Début du comportement'):String(n.action?.key||n.action?.value||'Configurer les paramètres').slice(0,60)));
  box.classList.toggle('is-selected',n.id===selected);box.onclick=e=>{if(!e.target.closest('button'))selectNode(n.id)};
  if(n.kind!=='event'){
   const input=button(box,'●',()=>{if(!pending){selectNode(n.id);return}if(pending.from===n.id)return;graph.links=graph.links.filter(e=>!(e.from===pending.from&&graphPort(e)===pending.port));graph.links.push({from:pending.from,to:n.id,port:pending.port});pending=null;update('Connecter les nœuds')},'bp-node-port bp-input-port');input.title='Entrée : cliquer après une sortie';input.setAttribute('aria-label','Entrée du nœud '+n.id);
  }
  for(const port of n.kind==='condition'?['true','false']:['next']){
   const output=button(box,port==='true'?'Oui ●':port==='false'?'Non ●':'●',()=>{pending={from:n.id,port};selectNode(n.id);validation.textContent='Choisis une entrée ● ou ajoute une action.'},'bp-node-port bp-output-port port-'+port);output.title='Connecter cette sortie à une entrée';output.setAttribute('aria-label','Sortie '+(port==='true'?'Oui':port==='false'?'Non':'suivante')+' du nœud '+n.id);
  }
  header.addEventListener('pointerdown',event=>{if(state.playing||event.button!==0)return;event.preventDefault();selectNode(n.id);const sx=event.clientX,sy=event.clientY,x=n.x,y=n.y;header.setPointerCapture(event.pointerId);const move=e=>{n.x=Math.max(20,x+(e.clientX-sx)/zoom);n.y=Math.max(20,y+(e.clientY-sy)/zoom);box.style.left=n.x+'px';box.style.top=n.y+'px';wires();size()};const done=()=>{header.removeEventListener('pointermove',move);header.removeEventListener('pointerup',done);header.removeEventListener('pointercancel',done);update('Déplacer le nœud')};header.addEventListener('pointermove',move);header.addEventListener('pointerup',done);header.addEventListener('pointercancel',done)});
  world.append(box);boxes.set(n.id,box);
 }
 board.addEventListener('keydown',event=>{if(event.key==='Delete'&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)){event.preventDefault();removeSelected()}});
 const issues=inspectGraphDetailed(graph);validation.textContent=issues[0]?issues[0].message+(issues.length>1?' (+'+(issues.length-1)+')':''):'✓ Graphe valide';validation.classList.toggle('has-error',!!issues.length);
 for(const issue of issues)boxes.get(issue.nodeId)?.classList.add('has-graph-error');
 const firstBad=issues.find(issue=>boxes.has(issue.nodeId));if(firstBad){const focusIssue=()=>{selectNode(firstBad.nodeId);boxes.get(firstBad.nodeId)?.scrollIntoView({block:'nearest',inline:'center'})};validation.style.cursor='pointer';validation.title='Sélectionner le nœud concerné';validation.setAttribute('role','button');validation.tabIndex=0;validation.onclick=focusIssue;validation.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focusIssue()}}}
 const last=sequenceRuntime.trace.at(-1);if(last?.nodeId)boxes.get(last.nodeId)?.classList.add(last.status==='error'?'has-runtime-error':'was-executed');
 root.append(toolbar,layout);host.append(root);size();wires();details();
}
