import {newSequence,sequenceEvents,sequenceConditions,sequenceInstructions} from '../core/logic-sequences.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';

export function renderSequenceEditor(root,o){
 const details=document.createElement('details');details.className='inspector-component sequence-editor';details.open=!!o.sequence;
 const title=document.createElement('summary');title.textContent='⚡ Logic Sequences • Game Creator-inspired';
 const body=document.createElement('div');body.className='component-content';details.append(title,body);root.append(details);
 const save=label=>{record('Logic Sequence : '+label);notify()};
 const button=(parent,label,handler)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=state.playing;b.onclick=handler;parent.append(b);return b};
 const text=(parent,label,value,handler,type='text')=>{
  const row=document.createElement('label');row.className='sequence-field';row.textContent=label;
  const input=document.createElement('input');input.type=type;input.disabled=state.playing;input.value=value??'';input.onchange=()=>handler(type==='number'?Number(input.value):input.value);row.append(input);parent.append(row);return input;
 };
 const select=(parent,label,value,choices,handler)=>{
  const row=document.createElement('label');row.className='sequence-field';row.textContent=label;
  const field=document.createElement('select');field.disabled=state.playing;
  for(const choice of choices){const option=document.createElement('option');option.value=choice;option.textContent=choice;field.append(option)}
  field.value=value||choices[0];field.onchange=()=>handler(field.value);row.append(field);parent.append(row);
 };
 const toggle=(parent,label,checked,handler)=>{
  const row=document.createElement('label');row.className='sequence-toggle';const input=document.createElement('input');input.type='checkbox';input.checked=!!checked;input.disabled=state.playing;input.onchange=()=>handler(input.checked);row.append(input,document.createTextNode(label));parent.append(row);
 };
 if(!o.sequence){
  button(body,'＋ Add Logic Sequence',()=>{o.sequence=newSequence();save('Ajouter')});
  button(body,'Exemple : porte à clé',()=>{o.sequence={...newSequence(),once:true,conditions:[],branches:[{conditions:[{type:'variable',key:'hasKey',operator:'==',value:1}],instructions:[{type:'message',value:'Porte ouverte !'},{type:'setColor',value:'#65ceab'}]}],elseInstructions:[{type:'message',value:'Porte verrouillée : trouve la clé.'}]};save('Modèle porte à clé')});
  button(body,'Exemple : interrupteur',()=>{o.sequence={...newSequence(),event:'interact',once:false,instructions:[{type:'addVariable',key:'switchCount',value:1},{type:'message',value:'Interrupteur activé'}]};save('Modèle interrupteur')});
  button(body,'Exemple : événement temporisé',()=>{o.sequence={...newSequence(),event:'start',once:true,instructions:[{type:'message',value:'Début de l’événement'},{type:'wait',value:2},{type:'setColor',value:'#4f9ce9'},{type:'message',value:'Événement terminé'}]};save('Modèle temporisé')});
  return
 }
 const s=o.sequence;
 button(body,'Supprimer la séquence',()=>{delete o.sequence;save('Supprimer')});
 toggle(body,'Activée',s.enabled!==false,v=>{s.enabled=v;save('Activation')});
 select(body,'Trigger (événement)',s.event,sequenceEvents,v=>{s.event=v;save('Trigger')});
 if(['interact','enter','exit'].includes(s.event))text(body,'Rayon (unités)',s.radius??96,v=>{s.radius=Math.max(1,v);save('Rayon')},'number');
 if(['interact','keyDown'].includes(s.event))text(body,'Touche (e, f, g...)',s.key||'e',v=>{s.key=v.toLowerCase().slice(0,24);save('Touche')});
 if(s.event==='interval')text(body,'Intervalle (secondes)',s.interval??2,v=>{s.interval=Math.max(.1,v);save('Intervalle')},'number');
 if(s.event==='signal')text(body,'Signal reçu',s.signal||'',v=>{s.signal=v.slice(0,60);save('Signal')});
 toggle(body,'Une seule fois',s.once===true,v=>{s.once=v;save('Once')});
 function editConditions(parent,conditions){
  const heading=document.createElement('strong');heading.textContent='Conditions (AND)';parent.append(heading);
  conditions.forEach((c,i)=>{
   const block=document.createElement('div');block.className='sequence-step';
   select(block,'Condition',c.type,sequenceConditions,v=>{c.type=v;save('Condition')});
   if(['variable','localVariable'].includes(c.type)){
    text(block,'Nom',c.key||'',v=>{c.key=v;save('Nom variable')});
    select(block,'Comparaison',c.operator||'==',['==','!=','>','<','>=','<='],v=>{c.operator=v;save('Opérateur')});
   }
   if(['variable','localVariable','distanceLess','distanceGreater','healthBelow','healthAbove','hasTag','randomChance'].includes(c.type))text(block,'Valeur',c.value??0,v=>{c.value=v;save('Valeur')});
   toggle(block,'Inverser (NOT)',c.negate===true,v=>{c.negate=v;save('NOT')});
   button(block,'− Condition',()=>{conditions.splice(i,1);save('Retirer condition')});parent.append(block);
  });
  button(parent,'＋ Condition',()=>{conditions.push({type:'variable',key:'score',operator:'>=',value:1});save('Ajouter condition')});
 }
 function editInstructions(parent,list){
  const heading=document.createElement('strong');heading.textContent='Instructions (séquence)';parent.append(heading);
  list.forEach((step,i)=>{
   const block=document.createElement('div');block.className='sequence-step';
   const caption=document.createElement('small');caption.textContent='#'+(i+1);block.append(caption);
   select(block,'Instruction',step.type,sequenceInstructions,v=>{step.type=v;save('Instruction')});
   if(['setVariable','addVariable','setLocal','addLocal','emitSignal','giveItem','removeItem','equipItem'].includes(step.type))text(block,'Variable / Signal',step.key||'',v=>{step.key=v;save('Nom')});
   if(!['destroyObject'].includes(step.type))text(block,'Valeur',step.value??'',v=>{step.value=v;save('Valeur')});
   if(['moveObject','teleportObject'].includes(step.type)){text(block,'Delta X',step.x??0,v=>{step.x=v;save('X')},'number');text(block,'Delta Z/Y',step.y??0,v=>{step.y=v;save('Y')},'number')}
   if(['enableObject','moveObject','teleportObject','setHealth','addHealth','setAnimation','setBehavior','giveItem','removeItem','equipItem','damageObject','healObject'].includes(step.type))text(block,'ID cible (optionnel)',step.targetId??'',v=>{step.targetId=v;save('Cible')},'number');
   if(step.type==='equipItem')select(block,'Slot',step.slot||'weapon',['weapon','armor'],v=>{step.slot=v;save('Slot')});
   toggle(block,'Désactiver instruction',step.disabled===true,v=>{step.disabled=v;save('Désactiver')});
   const tools=document.createElement('div');tools.className='sequence-buttons';
   if(i>0)button(tools,'↑',()=>{[list[i-1],list[i]]=[list[i],list[i-1]];save('Remonter')});
   if(i<list.length-1)button(tools,'↓',()=>{[list[i+1],list[i]]=[list[i],list[i+1]];save('Descendre')});
   button(tools,'−',()=>{list.splice(i,1);save('Retirer instruction')});block.append(tools);parent.append(block);
  });
  button(parent,'＋ Instruction',()=>{list.push({type:'message',value:'Hello !'});save('Ajouter instruction')});
 }
 s.conditions??=[];s.instructions??=[];
 if(!s.branches?.length){
  editConditions(body,s.conditions);editInstructions(body,s.instructions);
  button(body,'＋ Branches IF / ELSE',()=>{s.branches=[{conditions:structuredClone(s.conditions),instructions:structuredClone(s.instructions)}];s.elseInstructions=[];save('Créer branches')});
 }else{
  const base=document.createElement('details');base.className='sequence-branch';const baseTitle=document.createElement('summary');baseTitle.textContent='Conditions globales (avant IF / ELSE)';base.append(baseTitle);editConditions(base,s.conditions);body.append(base);
  for(const [i,branch] of s.branches.entries()){
   const group=document.createElement('details');group.open=true;group.className='sequence-branch';
   const label=document.createElement('summary');label.textContent='IF / ELSE IF • Branche '+(i+1);group.append(label);
   branch.conditions??=[];branch.instructions??=[];
   editConditions(group,branch.conditions);editInstructions(group,branch.instructions);
   button(group,'Retirer branche',()=>{s.branches.splice(i,1);if(!s.branches.length)delete s.branches;save('Retirer branche')});
   body.append(group);
  }
  button(body,'＋ ELSE IF',()=>{s.branches.push({conditions:[],instructions:[{type:'message',value:'Nouvelle branche'}]});save('Branche')});
  const fallback=document.createElement('details');fallback.open=true;const label=document.createElement('summary');label.textContent='ELSE • Si aucune condition';fallback.append(label);
  s.elseInstructions??=[];editInstructions(fallback,s.elseInstructions);body.append(fallback);
 }
 const graph=document.createElement('details');graph.open=false;graph.className='sequence-branch';const graphTitle=document.createElement('summary');graphTitle.textContent='◇ Graphique des comportements';graph.append(graphTitle);
 const graphFlow=document.createElement('div');graphFlow.className='sequence-graph';graphFlow.style.cssText='display:flex;flex-direction:column;gap:5px;padding:12px;border-radius:9px;background:rgba(64,120,150,.10)';
 const node=(label,kind)=>{const box=document.createElement('div');box.textContent=label;box.style.cssText='padding:9px 12px;border:1px solid rgba(120,170,190,.55);border-radius:7px;background:rgba(23,39,52,.9);color:#e8f6ff;font:12px system-ui';box.dataset.kind=kind;graphFlow.append(box)};
 const arrow=()=>{const a=document.createElement('div');a.textContent='↓';a.style.cssText='text-align:center;color:#80d6c7';graphFlow.append(a)};
 node('TRIGGER • '+s.event,'trigger');arrow();
 for(const cond of s.conditions||[]){node('AND • '+cond.type+' '+(cond.key||'')+' '+(cond.value??''),'condition');arrow()}
 if(s.branches?.length){
  s.branches.forEach((branch,i)=>{node('IF '+(i+1)+' • '+(branch.conditions||[]).map(c=>c.type+' '+(c.key||'')).join(' && '),'branch');arrow();for(const action of branch.instructions||[]){node(action.type+' • '+(action.value??action.key??''),'action');arrow()}});
  if(s.elseInstructions?.length){node('ELSE','branch');arrow();for(const action of s.elseInstructions){node(action.type+' • '+(action.value??''),'action');arrow()}}
 }else{for(const action of s.instructions||[]){node(action.type+' • '+(action.value??action.key??''),'action');arrow()}}
 node('END','end');graph.append(graphFlow);body.append(graph);
 const help=document.createElement('p');help.textContent='Pendant Play, les séquences exécutent les instructions dans l’ordre. Wait suspend l’exécution, Emit Signal déclenche d’autres objets.';body.append(help);
}
