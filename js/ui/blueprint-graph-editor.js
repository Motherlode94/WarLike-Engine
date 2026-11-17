import {connectBlueprintPorts} from '../core/blueprint-connections.js';
import {duplicateWarNode,removeWarNode,summarizeWarNodeGraph} from '../core/warnode-editor-operations.js';
import {dataOperations,dataNodePorts,canConnectData} from '../core/blueprint-ports.js';
import {editDataNode} from './blueprint-data-editor.js';
import {installBlueprintGraphMenu} from './blueprint-graph-menu.js';
import {gameProject} from '../core/game-project.js';
import {createGraph,applyGraph,inspectGraph,inspectGraphDetailed,graphPort} from '../core/blueprint-graph.js';
import {sequenceEvents,sequenceRuntime} from '../core/logic-sequences.js';
import {labelFor,eventFields} from '../core/blueprint-catalog.js';
import {state} from '../core/state.js';
import {element,button,select,field,editAction,editConditions} from './blueprint-controls.js';
const width=240,height=136;
const summaryValue=v=>v?.$ref?v.$ref+'.'+v.name+(v.type?' : '+v.type:''):Array.isArray(v)?v.join(', '):String(v??'Configurer les paramètres');
export function renderBlueprintGraph(host,sequence,save,options={}){
 const root=element('section','bp-graph-editor'),toolbar=element('div','bp-graph-toolbar');
 if(!sequence.graph){
  const empty=element('div','bp-empty-state');empty.append(element('span','bp-empty-icon','⬡'),element('h2','','Donne une forme à ta logique'),element('p','','Transforme les instructions de ce comportement en nœuds reliés. Les conditions deviennent des chemins Oui / Non.'));
  button(empty,'Créer le graphe',()=>{sequence.graph=createGraph(sequence);save('Créer le graphe')},'bp-primary');root.append(empty);host.append(root);return;
 }
 const graph=sequence.graph;let selected=graph.nodes.some(n=>n.id===options.selectedNodeId)?options.selectedNodeId:graph.nodes[0]?.id,pending=null,zoom=options.zoom||1;
 const portElements=new Map(),portKey=p=>JSON.stringify([p.nodeId,p.kind,p.port,p.direction]);
 const tagPort=(el,nodeId,kind,port,direction)=>{const info={nodeId,kind,port,direction};el.dataset.bpDirection=direction;el._blueprintPort=info;portElements.set(portKey(info),el);return el;};
 const validation=element('span','bp-graph-validation'),layout=element('div','bp-graph-layout'),board=element('div','bp-canvas'),world=element('div','bp-world'),inspector=element('aside','bp-node-inspector');
 board.tabIndex=0;board.setAttribute('aria-label','Graphe Blueprint : sélectionner, déplacer et connecter les nœuds');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('bp-connections');world.append(svg);board.append(world);layout.append(board,inspector);
 const update=label=>{const errors=inspectGraph(graph);if(!errors.length)applyGraph(sequence);refreshTopology();save(label)};
 const node=id=>graph.nodes.find(n=>n.id===id);
 const add=(kind,actionType='message',position=null)=>{
  const chosen=node(pending?.from||selected),source=chosen?.kind!=='data'&&chosen||graph.nodes.findLast(n=>n.kind==='action')||graph.nodes.find(n=>n.kind==='event'),port=pending?.port||(source?.kind==='condition'?'true':'next');
  if(!source)return;
  const id='node-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),next={id,kind,x:source.x+310,y:source.y+(port==='false'?220:0)};
  if(kind==='action')next.action={type:actionType,...(actionType==='message'?{value:'Nouvelle action'}:{})};else next.conditions=[{type:'variable',key:'score',operator:'>=',value:1}];
  if(position){next.x=Math.max(20,position.x);next.y=Math.max(20,position.y);}
  const connect=!position||!!pending&&pending.kind!=='data';
  const old=connect&&graph.links.find(edge=>edge.kind!=='data'&&edge.from===source.id&&graphPort(edge)===port);
  graph.nodes.push(next);if(connect){graph.links=graph.links.filter(edge=>edge!==old);graph.links.push({from:source.id,to:id,port});if(old)graph.links.push({from:id,to:old.to,port:kind==='condition'?'true':'next'});}pending=null;
  options.onSelect?.(id);selected=id;update('Ajouter un nœud');
 };
 button(toolbar,'＋ Donnée',()=>{const anchor=node(selected)||graph.nodes[0],id='data-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);graph.version=3;graph.nodes.push({id,kind:'data',op:'constant',valueType:'number',value:0,x:anchor.x,y:anchor.y+260,inputs:{}});selected=id;options.onSelect?.(id);update('Ajouter un nœud de données')},'bp-secondary');
 const palette=installBlueprintGraphMenu(board,(type,position)=>{if(!state.playing)add('action',type,position)},{getZoom:()=>zoom});button(toolbar,'＋ Ajouter un nœud',()=>palette.show(),'bp-secondary');button(toolbar,'＋ Action',()=>add('action'),'bp-text-button');button(toolbar,'◇ Condition',()=>add('condition'),'bp-secondary');
 const duplicateSelected=()=>{
  if(state.playing)return;
  const result=duplicateWarNode(graph,selected);
  if(!result.ok){validation.textContent=result.error;return}
  selected=result.id;options.onSelect?.(selected);update('Dupliquer le nœud sans connexion implicite');
 };
 button(toolbar,'⧉ Dupliquer',duplicateSelected,'bp-text-button').disabled=state.playing;
 button(toolbar,'＋ Rechercher',()=>palette.show(),'bp-secondary').disabled=state.playing;
 const topology=element('span','bp-graph-stats'),refreshTopology=()=>{
  const summary=summarizeWarNodeGraph(graph);
  topology.textContent=summary.nodes+' nœuds · '+summary.exec+' liens logiques · '+summary.data+' liens typés'+(summary.disconnected?' · '+summary.disconnected+' hors flux':'');
 };
 toolbar.append(topology);
 button(toolbar,'Réorganiser',()=>{const visited=new Set();let row=0;const place=(id,column)=>{if(visited.has(id))return;visited.add(id);const n=node(id);n.x=56+column*310;n.y=70+row*205;const edges=graph.links.filter(e=>e.kind!=='data'&&e.from===id).sort((a,b)=>graphPort(a)==='false'?1:-1);for(const [i,edge] of edges.entries()){if(i)row++;place(edge.to,column+1)}};place(graph.nodes.find(n=>n.kind==='event').id,0);update('Réorganiser le graphe')},'bp-text-button');
 const zoomLabel=element('label','bp-zoom'),slider=element('input');slider.type='range';slider.min='40';slider.max='150';slider.value=String(zoom*100);slider.setAttribute('aria-label','Zoom du graphe');const zoomValue=element('span','',Math.round(zoom*100)+' %');zoomLabel.append(slider,zoomValue);toolbar.append(zoomLabel,validation);
 const boxes=new Map();
 function size(){const x=Math.max(1400,...graph.nodes.map(n=>n.x+width+100)),y=Math.max(800,...graph.nodes.map(n=>n.y+Math.max(height,180+dataNodePorts(n).inputs.length*28)+100));world.style.width=x+'px';world.style.height=y+'px';world.style.zoom=String(zoom);svg.setAttribute('width',String(x));svg.setAttribute('height',String(y));zoomValue.textContent=Math.round(zoom*100)+' %'}
 slider.oninput=()=>{zoom=Number(slider.value)/100;options.onZoom?.(zoom);size();wires()};
 function point(el){const r=el.getBoundingClientRect(),w=world.getBoundingClientRect(),scale=w.width/Math.max(1,world.offsetWidth)||1;return {x:(r.left+r.width/2-w.left)/scale,y:(r.top+r.height/2-w.top)/scale};}
 function wirePath(path,a,b){const bend=Math.max(35,Math.min(130,Math.abs(b.x-a.x)*.45));path.setAttribute('d',`M${a.x} ${a.y} C${a.x+bend} ${a.y}, ${b.x-bend} ${b.y}, ${b.x} ${b.y}`);}
 function wires(){svg.replaceChildren();for(const edge of graph.links){const isData=edge.kind==='data',kind=isData?'data':'exec',port=graphPort(edge),from=portElements.get(portKey({nodeId:edge.from,kind,port:isData?edge.fromPort:port,direction:'output'})),to=portElements.get(portKey({nodeId:edge.to,kind,port:isData?edge.toPort:'in',direction:'input'}));if(!from||!to)continue;const a=node(edge.from),out=dataNodePorts(a).outputs.find(p=>p.name===edge.fromPort),path=document.createElementNS(svg.namespaceURI,'path');wirePath(path,point(from),point(to));path.setAttribute('class','bp-wire '+(isData?'is-data data-'+(out?.type||'any'):port==='false'?'is-false':port==='true'?'is-true':''));path.addEventListener('dblclick',()=>{if(state.playing)return;graph.links=graph.links.filter(e=>e!==edge);update('Retirer une connexion')});svg.append(path);}}
 const connect=(from,to)=>{const result=connectBlueprintPorts(graph,from,to);if(!result.ok){validation.textContent=result.error;return;}pending=null;update('Connecter les nœuds');};
 let cable=null;
 board.addEventListener('pointerdown',e=>{const port=e.target.closest('[data-bp-direction="output"]');if(state.playing||e.button!==0||!port)return;e.preventDefault();e.stopPropagation();const info=port._blueprintPort;pending=info.kind==='data'?{kind:'data',from:info.nodeId,fromPort:info.port}:{from:info.nodeId,port:info.port};selectNode(info.nodeId);const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('class','bp-wire is-preview');svg.append(path);cable={id:e.pointerId,from:info,element:port,path,moved:false,x:e.clientX,y:e.clientY};board.classList.add('is-connecting');board.setPointerCapture(e.pointerId);});
 board.addEventListener('pointermove',e=>{if(cable?.id!==e.pointerId)return;const r=world.getBoundingClientRect(),scale=r.width/Math.max(1,world.offsetWidth)||1;if(Math.hypot(e.clientX-cable.x,e.clientY-cable.y)>4)cable.moved=true;wirePath(cable.path,point(cable.element),{x:(e.clientX-r.left)/scale,y:(e.clientY-r.top)/scale});});
 const releaseCable=(e,cancel=false)=>{if(cable?.id!==e.pointerId)return;const drag=cable;cable=null;drag.path.remove();board.classList.remove('is-connecting');if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);if(cancel){pending=null;return;}if(drag.moved){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-bp-direction="input"]');if(target&&board.contains(target))connect(drag.from,target._blueprintPort);else validation.textContent='Choisis une entrée compatible ou appuie sur Échap.';}};
 board.addEventListener('pointerup',releaseCable);board.addEventListener('pointercancel',e=>releaseCable(e,true));
 board.addEventListener('scroll',()=>options.onView?.({left:board.scrollLeft,top:board.scrollTop}));

 function details(){
  inspector.replaceChildren();const n=node(selected);if(!n)return;
  inspector.append(element('div','bp-details-heading','Détails'));inspector.append(element('span','bp-eyebrow',n.kind==='data'?'DONNÉE':n.kind==='condition'?'CONDITION':n.kind==='event'?'DÉCLENCHEUR':'INSTRUCTION'),element('h2','',n.kind==='data'?dataOperations[n.op]:n.kind==='condition'?'Si / Sinon':labelFor(n.kind==='event'?n.event:n.action?.type,n.kind)));
  const search=element('input','bp-details-search');search.type='search';search.placeholder='Rechercher une propriété…';search.setAttribute('aria-label','Rechercher dans les détails du nœud');inspector.append(search);search.oninput=()=>{for(const row of inspector.querySelectorAll('.bp-field'))row.hidden=!row.textContent.toLocaleLowerCase('fr').includes(search.value.toLocaleLowerCase('fr'))};const change=()=>update('Modifier le nœud');
  if(n.kind==='data'){editDataNode(inspector,n,change,{parameters:options.parameters||[]})}
  else if(n.kind==='event'){
   select(inspector,'Événement',n.event,sequenceEvents,v=>{n.event=v;sequence.event=v;change()},{kind:'event'});
   for(const schema of eventFields(n.event))field(inspector,schema,sequence,change);
   field(inspector,{key:'once',label:'Une seule fois',type:'boolean',default:false},sequence,change);
   field(inspector,{key:'runWhenPaused',label:'Actif pendant la pause / fin',type:'boolean',default:false},sequence,change);
  }else if(n.kind==='condition'){
   select(inspector,'Combinaison',n.conditionMode||'all',[{value:'all',label:'Toutes les conditions (ET)'},{value:'any',label:'Au moins une (OU)'}],v=>{n.conditionMode=v;change()});
   n.conditions??=[];editConditions(inspector,n.conditions,change,{parameters:options.parameters||[]});
   inspector.append(element('p','bp-hint','Oui : les conditions sont remplies. Non : elles ne le sont pas. Une sortie vide termine ce chemin.'));
  }else editAction(inspector,n.action,change,{parameters:options.parameters||[],returnType:options.returnType||'void'});
  if(n.kind!=='event'&&n.kind!=='data'){const bp=button(inspector,n.breakpoint?'● Retirer le point d’arrêt':'○ Ajouter un point d’arrêt',()=>{n.breakpoint=!n.breakpoint;if(state.playing){const compiled=sequence.instructions;const mark=steps=>{for(const a of steps||[]){if(a._nodeId===n.id)a.breakpoint=n.breakpoint;mark(a.thenInstructions);mark(a.elseInstructions)}};mark(compiled);boxForBreakpoint()}else change()},'bp-breakpoint-button');bp.disabled=false;function boxForBreakpoint(){boxes.get(n.id)?.classList.toggle('has-breakpoint',n.breakpoint);details()}}
  if(n.kind!=='event')button(inspector,'Supprimer le nœud',removeSelected,'bp-text-button bp-danger');
  field(inspector,{key:'comment',label:'Commentaire du nœud',type:'text'},n,change);inspector.append(element('small','bp-node-id','Nœud '+n.id));
 }
 function selectNode(id){selected=id;options.onSelect?.(id);for(const [key,box] of boxes)box.classList.toggle('is-selected',id===key);details()}
 function removeSelected(){if(state.playing)return;const result=removeWarNode(graph,selected);if(!result.ok){validation.textContent=result.error;return}selected=graph.nodes[0]?.id;options.onSelect?.(selected);update('Supprimer le nœud')}
 for(const n of graph.nodes){
  const box=element('article','bp-node-v2'),header=element('div','bp-node-drag'),kind=element('span','bp-node-kind',n.kind==='data'?'DONNÉE':n.kind==='event'?'ÉVÉNEMENT':n.kind==='condition'?'CONDITION':'ACTION');box.classList.toggle('has-breakpoint',!!n.breakpoint);box.dataset.nodeId=n.id;box.dataset.kind=n.kind;box.style.left=n.x+'px';box.style.top=n.y+'px';header.append(kind,element('span','bp-node-menu','⠿'));box.append(header);
  box.append(element('strong','bp-node-label',n.kind==='data'?dataOperations[n.op]:n.kind==='condition'?'Si / Sinon':labelFor(n.kind==='event'?n.event:n.action?.type,n.kind)),element('span','bp-node-description',n.kind==='data'?dataNodePorts(n).outputs[0]?.type:n.kind==='condition'?(n.conditions?.length||0)+' condition(s)':n.kind==='event'?(sequence.signal||sequence.key||'Début du comportement'):summaryValue((n.action?.functionId?gameProject.functions?.find(f=>f.id===n.action.functionId)?.name||n.action.functionId:null)||n.action?.key||n.action?.value).slice(0,60)));
  box.classList.toggle('is-selected',n.id===selected);box.onclick=e=>{if(!e.target.closest('button'))selectNode(n.id)};
  if(n.kind!=='event'&&n.kind!=='data'){
   const input=button(box,'●',()=>{if(!pending){selectNode(n.id);return}if(pending.kind==='data'){validation.textContent='Choisis une entrée de données colorée.';return}if(pending.from===n.id)return;connect({nodeId:pending.from,kind:'exec',port:pending.port},{nodeId:n.id,kind:'exec',port:'in'})},'bp-node-port bp-input-port');tagPort(input,n.id,'exec','in','input');input.title='Entrée : glisser depuis une sortie ou cliquer après une sortie';input.setAttribute('aria-label','Entrée du nœud '+n.id);
  }
  for(const port of n.kind==='data'?[]:n.kind==='condition'?['true','false']:['next']){
   const output=button(box,port==='true'?'Oui ●':port==='false'?'Non ●':'●',()=>{pending={from:n.id,port};selectNode(n.id);validation.textContent='Choisis une entrée ● ou ajoute une action.'},'bp-node-port bp-output-port port-'+port);tagPort(output,n.id,'exec',port,'output');output.title='Glisser vers une entrée ou cliquer pour connecter';output.setAttribute('aria-label','Sortie '+(port==='true'?'Oui':port==='false'?'Non':'suivante')+' du nœud '+n.id);
  }
  const ports=dataNodePorts(n);if(ports.inputs.length)box.style.minHeight=(170+ports.inputs.length*28)+'px';
  for(const [i,p] of ports.inputs.entries()){
   const input=button(box,'● '+p.name+' : '+p.type,()=>{if(!pending||pending.kind!=='data'){validation.textContent='Choisis une sortie de données colorée.';return}connect({nodeId:pending.from,kind:'data',port:pending.fromPort},{nodeId:n.id,kind:'data',port:p.name})},'bp-data-port is-input data-'+p.type);tagPort(input,n.id,'data',p.name,'input');input.style.top=(138+i*28)+'px';input.title='Entrée de données '+p.name+' ('+p.type+')';input.setAttribute('aria-label',input.title);
  }
  for(const p of ports.outputs){const output=button(box,p.type+' ●',()=>{pending={kind:'data',from:n.id,fromPort:p.name};selectNode(n.id);validation.textContent='Choisis une entrée compatible : '+p.type},'bp-data-port is-output data-'+p.type);tagPort(output,n.id,'data',p.name,'output');output.title='Sortie de données '+p.type;output.setAttribute('aria-label',output.title)}
  header.addEventListener('pointerdown',event=>{if(state.playing||event.button!==0)return;event.preventDefault();selectNode(n.id);const sx=event.clientX,sy=event.clientY,x=n.x,y=n.y,displayScale=zoom*board.getBoundingClientRect().width/Math.max(1,board.offsetWidth);header.setPointerCapture(event.pointerId);const move=e=>{n.x=Math.max(20,x+(e.clientX-sx)/displayScale);n.y=Math.max(20,y+(e.clientY-sy)/displayScale);box.style.left=n.x+'px';box.style.top=n.y+'px';wires();size()};const done=()=>{header.removeEventListener('pointermove',move);header.removeEventListener('pointerup',done);header.removeEventListener('pointercancel',done);update('Déplacer le nœud')};header.addEventListener('pointermove',move);header.addEventListener('pointerup',done);header.addEventListener('pointercancel',done)});
  world.append(box);boxes.set(n.id,box);
 }
 const frameSelection=()=>{const n=node(selected);if(n){board.scrollLeft=Math.max(0,(n.x+width/2)*zoom-board.clientWidth/2);board.scrollTop=Math.max(0,(n.y+height/2)*zoom-board.clientHeight/2)}};button(toolbar,'Cadrer · F',frameSelection,'bp-text-button').disabled=false;board.addEventListener('keydown',event=>{if(event.key.toLowerCase()==='f'&&!event.target.closest('input,textarea,select')){event.preventDefault();frameSelection()}if(event.key==='Escape'){pending=null;cable?.path.remove();cable=null;board.classList.remove('is-connecting');validation.textContent='Connexion annulée.';event.stopPropagation();}if(event.key==='Delete'&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)){event.preventDefault();removeSelected()}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='d'&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)){event.preventDefault();duplicateSelected()}});
 const issues=inspectGraphDetailed(graph);validation.textContent=issues[0]?issues[0].message+(issues.length>1?' (+'+(issues.length-1)+')':''):'✓ Graphe valide';validation.classList.toggle('has-error',!!issues.length);
 for(const issue of issues)boxes.get(issue.nodeId)?.classList.add('has-graph-error');
 const firstBad=issues.find(issue=>boxes.has(issue.nodeId));if(firstBad){const focusIssue=()=>{selectNode(firstBad.nodeId);boxes.get(firstBad.nodeId)?.scrollIntoView({block:'nearest',inline:'center'})};validation.style.cursor='pointer';validation.title='Sélectionner le nœud concerné';validation.setAttribute('role','button');validation.tabIndex=0;validation.onclick=focusIssue;validation.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focusIssue()}}}
 const last=sequenceRuntime.trace.at(-1);if(last?.nodeId)boxes.get(last.nodeId)?.classList.add(last.status==='error'?'has-runtime-error':'was-executed');
 root.append(toolbar,layout);host.append(root);refreshTopology();size();details();requestAnimationFrame(()=>{if(!board.isConnected)return;board.scrollLeft=options.view?.left||0;board.scrollTop=options.view?.top||0;wires();});
}
