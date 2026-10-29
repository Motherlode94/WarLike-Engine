import {variableTypes,coerceVariable} from '../core/blueprint-graph.js';
import {valueType} from '../core/blueprint-data.js';
import {gameProject} from '../core/game-project.js';
import {objectBlueprintVariables} from '../core/blueprint-variables.js';
import {state,active} from '../core/state.js';
import {labelFor,actionGroup,actionFields,conditionFields,targetable} from '../core/blueprint-catalog.js';
import {sequenceInstructions,sequenceConditions} from '../core/logic-sequences.js';
export function element(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el}
export function button(parent,text,handler,className=''){const el=element('button',className,text);el.type='button';el.disabled=state.playing;el.onclick=handler;parent.append(el);return el}
export function select(parent,label,value,choices,onChange,{kind=null}={}){
 const row=element('label','bp-field'),caption=element('span','',label),input=element('select');input.setAttribute('aria-label',label);input.disabled=state.playing;
 const grouped=new Map();
 for(const choice of choices){const key=typeof choice==='string'?choice:choice.value,group=kind==='action'?actionGroup(key):'';
  let target=input;if(group){if(!grouped.has(group)){const opt=element('optgroup');opt.label=group;grouped.set(group,opt);input.append(opt)}target=grouped.get(group)}
  const option=element('option','',typeof choice==='string'?(kind?labelFor(key,kind):key):choice.label);option.value=key;target.append(option);
 }
 input.value=value??(typeof choices[0]==='string'?choices[0]:choices[0].value);input.onchange=()=>onChange(input.value);row.append(caption,input);parent.append(row);return input;
}
export function field(parent,schema,data,onChange){
 if(schema.type==='dialogueChoices'){const group=element('section','bp-dialogue-choices');group.append(element('strong','',schema.label));const choices=Array.isArray(data.choices)?data.choices:[];for(const [i,choice] of choices.entries()){const row=element('div','bp-choice-card');field(row,{key:'label',label:'Réponse '+(i+1),type:'text'},choice,onChange);field(row,{key:'signal',label:'Signal de la réponse '+(i+1),type:'text'},choice,onChange);button(row,'Retirer cette réponse',()=>{choices.splice(i,1);data.choices=choices;onChange()},'bp-text-button');group.append(row)}if(choices.length<6)button(group,'＋ Ajouter une réponse',()=>{data.choices=[...choices,{label:'Nouvelle réponse',signal:'dialogue:choice'+(choices.length+1)}];onChange()},'bp-secondary');parent.append(group);return group}
 if(schema.type==='select'||schema.type==='boolean')return select(parent,schema.label,String(data[schema.key]??schema.default??(schema.type==='boolean'?true:schema.choices[0])),schema.type==='boolean'?[{value:'true',label:'Oui'},{value:'false',label:'Non'}]:schema.choices,v=>{data[schema.key]=schema.type==='boolean'?v==='true':v;onChange()});
 const row=element('label','bp-field'),caption=element('span','',schema.label),input=element(schema.type==='text'&&['message','showDialogue'].includes(data.type)?'textarea':'input');
 if(input.tagName==='INPUT')input.type=schema.type==='number'?'number':'text';
 input.setAttribute('aria-label',schema.label);input.disabled=state.playing;input.value=data[schema.key]??schema.default??'';
 input.onchange=()=>{const value=schema.type==='number'?Number(input.value):input.value;if(schema.type==='number'&&!Number.isFinite(value))return;data[schema.key]=value;onChange()};row.append(caption,input);parent.append(row);return input;
}
export function targetFields(parent,data,onChange,{defaultRole='self'}={}){
 select(parent,'Objet cible',data.targetRole||defaultRole,[{value:'self',label:'Cet objet / ID précis'},{value:'player',label:'Le joueur'}],v=>{data.targetRole=v;delete data.targetId;onChange()});
 if((data.targetRole||defaultRole)!=='player')select(parent,'Objet de la scène',String(data.targetId||0),[{value:'0',label:'Cet objet'},...state.entities.map(o=>({value:String(o.id),label:o.name+' (#'+o.id+')'}))],v=>{data.targetId=Number(v);onChange()});
}
export function editConditions(parent,conditions,onChange,{parameters=[]}={}){
 for(const [i,condition] of conditions.entries()){
  const card=element('div','bp-condition-card');
  select(card,'Condition',condition.type,sequenceConditions,v=>{condition.type=v;onChange()},{kind:'condition'});
  for(const schema of conditionFields(condition.type)){if(schema.key==='value'||schema.type==='number')editTypedValue(card,schema.label,condition,schema.key,schema.type==='number'?'number':(condition.type==='localVariable'?objectBlueprintVariables(active()):gameProject.variables).find(v=>v.name===condition.key)?.type||'string',onChange,{parameters});else field(card,schema,condition,onChange)}
  if(['heroEnergyAbove','heroPowerReady','heroFlightActive','rpgLevelAtLeast','heroReputationAtLeast','simulationPowered','simulationRescued','healthBelow','healthAbove','inventoryHas','inventoryMissing','inventoryHasRoom','aiStateIs','aiCanSeeTarget','aiHasTarget'].includes(condition.type))targetFields(card,condition,onChange,{defaultRole:/inventory/.test(condition.type)?'player':'self'});
  field(card,{key:'negate',label:'Inverser le résultat',type:'boolean',default:false},condition,onChange);
  button(card,'Retirer la condition',()=>{conditions.splice(i,1);onChange()},'bp-text-button bp-danger');parent.append(card);
 }
 button(parent,'＋ Ajouter une condition',()=>{conditions.push({type:'variable',key:'score',operator:'>=',value:1});onChange()},'bp-secondary');
}
export function editTypedValue(parent,label,data,key,type,onChange,{parameters=[],literalOnly=false}={}){
 const current=data[key],source=current?.$ref||'literal';
 if(!literalOnly)select(parent,label+' · source',source,[{value:'literal',label:'Valeur '+type},{value:'global',label:'Variable globale'},{value:'local',label:'Variable locale'},{value:'parameter',label:'Paramètre de fonction'}],v=>{data[key]=v==='literal'?coerceVariable(type,0):{$ref:v,name:'',type};onChange()});
 if(source!=='literal'){
  const choices=source==='global'?gameProject.variables.filter(v=>v.type===type):source==='parameter'?parameters.filter(v=>v.type===type):[];
  if(source==='local'){const variables=objectBlueprintVariables(active()).filter(v=>v.type===type);if(variables.length)select(parent,label+' · variable de l’objet',current.name,[{value:current.name||'',label:current.name||'Choisir une variable'},...variables.filter(v=>v.name!==current.name).map(v=>({value:v.name,label:v.name}))],v=>{current.name=v;onChange()});field(parent,{key:'name',label:label+' · nom local',type:'text'},current,onChange);}
  else select(parent,label+' · donnée',current.name,[{value:'',label:'Choisir une donnée '+type},...choices.map(p=>({value:p.name,label:p.name+' : '+p.type}))],v=>{current.name=v;onChange()});
 }else if(type==='boolean')field(parent,{key,label,type:'boolean',default:false},data,onChange);
 else if(type.startsWith('vector')){
  const row={text:Array.isArray(current)?current.join(', '):''};field(parent,{key:'text',label:label+' · '+(type==='vector2'?'X, Y':'X, Y, Z'),type:'text'},row,()=>{const values=row.text.split(',').map(Number);if(values.length!==Number(type.slice(-1))||!values.every(Number.isFinite))return;data[key]=values;onChange()});
 }else field(parent,{key,label,type:type==='number'?'number':'text'},data,onChange);
}
export function editAction(parent,action,onChange,{typeField=true,depth=0,parameters=[],returnType='void'}={}){
 if(typeField)select(parent,'Instruction',action.type,sequenceInstructions,v=>{action.type=v;onChange()},{kind:'action'});
 if(action.type==='callFunction'){
  select(parent,'Fonction',action.functionId,[{value:'',label:'Choisir une fonction'},...(gameProject.functions||[]).map(f=>({value:f.id,label:f.name||f.id}))],v=>{action.functionId=v;action.arguments={};onChange()});
  const f=gameProject.functions?.find(f=>f.id===action.functionId);action.arguments??={};
  for(const p of f?.parameters||[])editTypedValue(parent,p.name,action.arguments,p.name,p.type,onChange,{parameters});
  if(f?.returnType&&f.returnType!=='void')field(parent,{key:'resultKey',label:'Résultat → variable locale ('+f.returnType+')',type:'text'},action,onChange);
  return;
 }
 if(action.type==='returnFunction'){if(returnType!=='void')editTypedValue(parent,'Valeur retournée',action,'value',returnType,onChange,{parameters});else parent.append(element('p','bp-hint','Termine la fonction actuelle.'));return}
 for(const schema of actionFields(action.type)){
  if(schema.key==='value'&&['setVariable','addVariable','setLocal','addLocal'].includes(action.type)){
   const declared=(['setLocal','addLocal'].includes(action.type)?objectBlueprintVariables(active()):gameProject.variables).find(v=>v.name===action.key)?.type;
   if(action.type==='setLocal'&&!declared)select(parent,'Type de la donnée',action.valueType||(variableTypes.includes(valueType(action.value))?valueType(action.value):'number'),variableTypes,v=>{action.valueType=v;action.value=coerceVariable(v,action.value);onChange()});
   const type=declared||(action.type==='setLocal'?action.valueType||'number':null)||(action.type==='setVariable'?valueType(action.value)==='number'?'number':'string':'number');
   editTypedValue(parent,schema.label,action,'value',type,onChange,{parameters});continue;
  }
  if(schema.key==='value'&&schema.type==='text'){editTypedValue(parent,schema.label,action,schema.key,'string',onChange,{parameters});continue}
  if(schema.type==='number'){editTypedValue(parent,schema.label,action,schema.key,'number',onChange,{parameters});continue}

  if(action.type==='loadScene'&&schema.key==='value'){const scenes=[{value:gameProject.activeSceneId,label:'Scène actuelle'},...gameProject.scenes.filter(s=>s.id!==gameProject.activeSceneId).map(s=>({value:s.id,label:s.name}))];select(parent,'Scène de destination',action.value||gameProject.activeSceneId,scenes,v=>{action.value=v;onChange()})}
  else if(action.type==='spawnObject'&&schema.key==='value')select(parent,'Objet modèle',String(action.value||state.entities[0]?.id),state.entities.map(o=>({value:String(o.id),label:o.name})),v=>{action.value=Number(v);onChange()});
  else field(parent,schema,action,onChange);
 }
 if(targetable(action.type))targetFields(parent,action,onChange);
 if(action.type==='branch'&&depth<4){action.conditions??=[];editConditions(parent,action.conditions,onChange,{parameters});
  for(const [key,title] of [['thenInstructions','Si oui'],['elseInstructions','Sinon']]){action[key]??=[];const group=element('details','bp-inline-branch'),summary=element('summary','',title);group.append(summary);editActions(group,action[key],onChange,depth+1,{parameters,returnType});parent.append(group)}
 }
}
export function editActions(parent,actions,onChange,depth=0,context={}){
 for(const [i,action] of actions.entries()){
  const card=element('article','bp-action-card'),header=element('div','bp-action-heading');header.append(element('span','bp-step-index',String(i+1).padStart(2,'0')),element('strong','',labelFor(action.type)));
  const tools=element('div','bp-card-tools');if(i>0)button(tools,'↑',()=>{[actions[i-1],actions[i]]=[actions[i],actions[i-1]];onChange()});if(i<actions.length-1)button(tools,'↓',()=>{[actions[i+1],actions[i]]=[actions[i],actions[i+1]];onChange()});button(tools,'×',()=>{actions.splice(i,1);onChange()},'bp-danger');header.append(tools);card.append(header);editAction(card,action,onChange,{depth,...context});parent.append(card);
 }
 button(parent,'＋ Ajouter une instruction',()=>{actions.push({type:'message',value:'Nouvelle action'});onChange()},'bp-secondary');
}
