import {parseCsharpValue,parseSquadMembers,persistCsharpProperty} from '../core/csharp-inspector.js';

// Dependency-injected UI shared by native component inspection and tactical orders.
export function mountCsharpInspector({host,selected,entities,ready,request,changed,announce}) {
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};
 const root=el('fieldset');root.id='csharpNativeInspector';root.className='csharp-native-inspector';
 root.append(el('legend','Inspector C# · composants & escouades'));
 const help=el('p','Connecte le bridge et envoie la scène, puis inspecte un objet sélectionné.');
 const refreshButton=el('button','↻ Inspecter la sélection');refreshButton.type='button';
 const content=el('div');content.className='csharp-native-components';
 root.append(help,refreshButton,content);host.querySelector('#csharpRuntimeStatus').after(root);
 let generation=0,renderedId=null;
 const clear=(message='Sélection modifiée : clique sur Inspecter la sélection.')=>{generation++;renderedId=null;content.replaceChildren();help.textContent=message};
 function render(actor) {
  if(selected()?.id!==actor.id)return;
  renderedId=actor.id;content.replaceChildren();help.textContent=actor.name+' · ID '+actor.id+' · '+actor.components.length+' composant(s) .NET';
  if(!actor.components.length){content.append(el('p','Ajoute un composant C# depuis l’Inspector, puis renvoie la scène.'));return}
  for(const component of actor.components) {
   const card=el('details');card.open=true;
   card.append(el('summary',component.type+' · '+(component.active?'actif':'inactif')+' · '+(component.started?'démarré':'en attente de Start')));
   for(const property of component.properties) {
    if(property.readOnly){const row=el('p',property.label+' : '+String(property.value));row.className='csharp-native-readonly';card.append(row);continue}
    const form=el('form');form.className='csharp-native-field';
    const group=el('label');group.append(el('span',property.label));
    const inputs={};
    for(const axis of property.type==='vector3'?['x','y','z']:['value']) {
     const input=el('input');input.type=property.type==='bool'?'checkbox':'number';
     input.setAttribute('aria-label',property.label+(axis==='value'?'':' '+axis.toUpperCase()));
     if(property.type==='bool')input.checked=property.value;
     else {input.value=String(axis==='value'?property.value:property.value[axis]);input.min=property.min;input.max=property.max;input.step='any';input.required=true}
     inputs[axis]=input;group.append(input);
    }
    const apply=el('button','Appliquer');apply.type='submit';form.append(group,apply);
    form.addEventListener('submit',async event=>{
     event.preventDefault();if(!ready())return;
     const token=++generation;
     try {
      const raw=property.type==='bool'?inputs.value.checked:property.type==='vector3'?Object.fromEntries(Object.entries(inputs).map(([axis,input])=>[axis,input.value])):inputs.value.value;
      const value=parseCsharpValue(property.type,raw);
      const result=await request('/components/set',{id:actor.id,index:component.index,property:property.name,value});
      if(!result)return;
      const updated=result.actor.components.find(c=>c.index===component.index);
      const canonical=updated?.properties.find(p=>p.name===property.name);
      const saved=canonical&&persistCsharpProperty(entities(),actor.id,updated,canonical);
      if(saved)changed('C# : '+property.label);
      announce(saved?'Paramètre appliqué dans .NET et enregistré dans la scène.':'Paramètre appliqué dans la session .NET uniquement.',true);
      if(token===generation)render(result.actor);
     }catch(error){announce('Inspector C# : '+error.message)}
    });card.append(form);
   }
   if(component.type==='TacticalSquadComponent')card.append(squadControls(actor,component));
   content.append(card);
  }
 }
 function squadControls(actor,component) {
  const box=el('div');box.className='csharp-squad-controls';
  box.append(el('strong','Ordres tactiques · .NET'));
  box.append(el('small','Déplacement direct en formation sur le plan X/Y de la scène. Les obstacles nécessitent encore une navigation adaptée.'));
  const members=el('input');members.type='text';members.setAttribute('aria-label','ID des membres de l’escouade');members.placeholder='ID des membres : 2, 3, 4';
  members.value=(entities().find(a=>a.id===actor.id)?.csharpComponents?.[component.sourceIndex]?.memberIds||[]).join(', ');
  const assign=el('button','Affecter les membres');assign.type='button';
  assign.onclick=async()=>{try{const memberIds=parseSquadMembers(members.value);await command('members',{memberIds});}catch(error){announce(error.message)}};
  const x=el('input'),y=el('input');for(const [input,axis] of [[x,'X'],[y,'Y']]){input.type='number';input.step='any';input.setAttribute('aria-label','Destination '+axis+' en unités de scène');input.placeholder='Destination '+axis}
  x.value=actor.id===selected()?.id?String(selected().x):'0';y.value=actor.id===selected()?.id?String(selected().y):'0';
  const move=el('button','→ Déplacer'),hold=el('button','■ Maintenir'),follow=el('button','↪ Suivre');
  const target=el('input');target.type='number';target.min='1';target.step='1';target.placeholder='ID de la cible';target.setAttribute('aria-label','ID de la cible à suivre');
  for(const button of [move,hold,follow])button.type='button';
  move.onclick=()=>{try{return command('move',{x:parseCsharpValue('float',x.value),y:parseCsharpValue('float',y.value)})}catch(error){announce(error.message)}};
  hold.onclick=()=>command('hold');
  follow.onclick=()=>{try{return command('follow',{targetId:parseCsharpValue('int',target.value)})}catch(error){announce(error.message)}};
  async function command(action,data={}) {
   if(!ready())return;
   try {
    const result=await request('/squad/command',{id:actor.id,action,...data});if(!result)return;
    if(action==='members') {
     const definition=entities().find(a=>a.id===actor.id)?.csharpComponents?.[component.sourceIndex];
     if(definition?.kind==='TacticalSquad'){definition.memberIds=result.memberIds;changed('C# : membres de l’escouade')}
    }
    announce('Escouade : '+({Move:'déplacement',Hold:'maintien',Follow:'suivi'}[result.order]||result.order)+' · '+result.memberIds.length+' membres. Lance une étape ou l’aperçu C#.',true);
    render(result.actor);
   }catch(error){announce('Ordre C# : '+error.message)}
  }
  box.append(members,assign,x,y,move,hold,target,follow);return box;
 }
 const refresh=async()=>{
  const actor=selected();if(!actor||!ready())return;
  const token=++generation;
  try{const result=await request('/components/inspect',{id:actor.id});if(result&&token===generation)render(result.actor)}catch(error){announce('Inspector C# : '+error.message)}
 };
 refreshButton.onclick=refresh;
 return {refresh,clear,update(){refreshButton.disabled=!ready();if(renderedId!==null&&selected()?.id!==renderedId)clear();for(const field of content.querySelectorAll('input,button'))field.disabled=!ready()}};
}
