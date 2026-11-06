import {state,notify} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {componentChoices,addObjectComponent,resetObjectComponent,removeObjectComponent} from '../core/component-definitions.js';
import {record} from '../core/history.js';
import {commonInspectorFields,mixedInspectorValue,setInspectorValue,inspectorNumber} from '../core/inspector-model.js';
import {inspectorSelection} from './inspector-context.js';
import {enhanceInspectorDetails} from './inspector-details.js';
let debug=false;
export const inspectorDebug=()=>debug;
const make=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text)node.textContent=text;return node};
export function inspectorWindowHeader(root,objects,{locked=inspectorSelection.locked,toggle=()=>inspectorSelection.toggle()}={}){
 const bar=make('div','inspector-window-toolbar'),title=make('strong','','Inspector');
 const mode=make('select','inspector-view-mode');mode.setAttribute('aria-label','Mode de l’Inspector');
 for(const [value,label] of [['normal','Normal'],['debug','Debug']]){const option=make('option','',label);option.value=value;mode.append(option)}mode.value=debug?'debug':'normal';mode.onchange=()=>{debug=mode.value==='debug';notify()};
 const lock=make('button','inspector-lock',locked?'Verrouillé':'Verrouiller');lock.type='button';lock.disabled=!objects.length;lock.setAttribute('aria-pressed',String(locked));lock.setAttribute('aria-label','Verrouiller l’Inspector sur la sélection');lock.onclick=()=>{toggle();notify()};bar.append(title,mode,lock);root.append(bar);
 if(locked)root.append(make('p','inspector-lock-note','Sélection verrouillée · '+objects.map(object=>object.name).join(', ')));
 if(state.playing)root.append(make('p','inspector-play-note','Play · activation des scripts Web modifiable. Les changements de simulation sont rétablis à Stop.'));
}
export function renderInspectorDebug(root,objects){
 const note=make('p','inspector-debug-note','Données sérialisées · lecture seule'),code=make('pre','inspector-debug-data');code.textContent=JSON.stringify(objects.length===1?objects[0]:objects,null,2);root.append(note,code);
}
const enumFields={'rigidbody2d.bodyType':['dynamic','kinematic','static'],'controller2d.mode':['auto','topDown','platformer'],'collider3d.shape':['box','capsule','sphere'],'joint3d.kind':['hinge','ball','fixed'],'joint3d.limitMode':['off','on'],'ai.state':['idle','patrol','chase','attack','investigate','search','return','dead']};
const fieldLabels={bodyType:'Type de corps',mode:'Mode',shape:'Forme',gravityScale:'Multiplicateur de gravité',restitution:'Rebond',friction:'Friction',vx:'Vitesse X',vy:'Vitesse Y',vz:'Vitesse Z',x:'Position X',y:'Position Y',elevation3d:'Position Y',rotation:'Rotation (°)',rotationX3d:'Rotation X (°)',rotationZ3d:'Rotation Z (°)',w:'Largeur',h:'Hauteur',depth3d:'Profondeur',enabled:'Actif',speed:'Vitesse',mass:'Masse',gravity:'Gravité',hp:'Santé',maxHp:'Santé maximale',walkSpeed:'Marche',sprintSpeed:'Sprint',jumpForce:'Saut',name:'Nom',color:'Couleur'};
function multiField(parent,objects,path,{label=fieldLabels[path.at(-1)]||path.slice(1).join(' / ')||path[0],divisor=1,positive=false,fallback=null}={}){
 const views=fallback?objects.map(object=>Object.hasOwn(object,path[0])?object:{...object,[path[0]]:fallback(object)}):objects,apply=next=>{if(fallback&&path.length===1){objects.forEach(object=>object[path[0]]=next);return true}return setInspectorValue(objects,path,next)};
 const {value,mixed}=mixedInspectorValue(views,path),choices=enumFields[path.join('.')],row=make('label','property-row inspector-multi-field'),title=make('span','',label),reference=/^(targetId|ownerId|actorId|entityId)$/.test(path.at(-1)),input=make(reference||choices?'select':'input','');
 input.setAttribute('aria-label',label);input.dataset.propertyPath=path.join('.');input.disabled=state.playing;
 if(choices){for(const entry of choices){const option=make('option','',entry);option.value=entry;input.append(option)}if(mixed||!choices.includes(value)){const option=make('option','',mixed?'— Valeurs différentes':'Valeur inconnue : '+value);option.value='';input.prepend(option)}input.value=mixed||!choices.includes(value)?'':value}
 else if(reference){for(const entity of [{id:0,name:'Aucun'},...state.entities]){const option=make('option','',entity.name+' · #'+entity.id);option.value=String(entity.id);input.append(option)}if(mixed){const option=make('option','','— Valeurs différentes');option.value='';input.prepend(option)}input.value=mixed?'':String(value)}
 else if(typeof value==='boolean'){input.type='checkbox';input.checked=value;input.indeterminate=mixed;input.setAttribute('aria-checked',mixed?'mixed':String(value))}
 else {input.type='text';if(typeof value==='number')input.inputMode='decimal';input.value=mixed?'':String(typeof value==='number'?Number((value/divisor).toFixed(4)):value);if(mixed)input.placeholder='— Valeurs différentes'}
 if(mixed)row.classList.add('inspector-mixed');
 input.onchange=()=>{try{const next=typeof value==='boolean'?input.checked:typeof value==='number'?inspectorNumber(input.value)*divisor:input.value;if(positive&&next<=0)throw Error('La dimension doit être positive.');if(choices&&!choices.includes(next))throw Error('Choisis une valeur dans la liste.');if(!apply(next))throw Error('Propriété incompatible avec la sélection.');record('Inspector multiple : '+label);notify()}catch(error){input.setCustomValidity(error.message);input.reportValidity()}};
 input.oninput=()=>input.setCustomValidity('');
 const values=make('select','inspector-value-source');values.setAttribute('aria-label','Utiliser la valeur de : '+label);values.disabled=state.playing;
 const placeholder=make('option','','Valeur de…');placeholder.value='';values.append(placeholder);
 for(const object of objects){const option=make('option','',object.name);option.value=String(object.id);values.append(option)}
 values.onchange=()=>{const source=views.find(object=>String(object.id)===values.value);if(!source)return;const next=mixedInspectorValue([source],path).value;if(apply(next)){record('Copier la propriété : '+label);notify()}};
 row.append(title,input);if(mixed)row.append(values);parent.append(row);
}
export function renderMultipleInspector(root,objects){
 const header=make('div','inspector-object'),heading=make('strong','',objects.length+' GameObjects sélectionnés'),meta=make('small','',objects.map(object=>object.name).join(', '));header.append(heading,meta);root.append(header);
 multiField(header,objects,['name'],{label:'Nom des GameObjects'});
 const card=(title,key)=>{const node=make('details','inspector-component');node.open=key==='transform';node.dataset.componentTitle=title;node.dataset.componentKey=key;const summary=make('summary','',title),body=make('div','component-content');node.append(summary,body);root.append(node);return body};
 const transform=card('Transform','transform');
 for(const key of workspace.mode==='3d'?['x','elevation3d','y','rotation','rotationX3d','rotationZ3d','w','h','depth3d']:['x','y','rotation','w','h']){
  if(objects.every(object=>object[key]===undefined||typeof object[key]==='number'))multiField(transform,objects,[key],{label:key==='y'&&workspace.mode==='3d'?'Position Z':fieldLabels[key],divisor:workspace.mode==='3d'&&['x','y','w','h','depth3d'].includes(key)?64:1,positive:['w','h','depth3d'].includes(key),fallback:object=>key==='depth3d'?object.w:0});
 }
 const definitions=componentChoices(workspace.mode).filter(definition=>!definition.multiple),common=definitions.filter(definition=>objects.every(object=>object[definition.id]!=null));
 for(const definition of common){const body=card(definition.name,definition.id),fields=commonInspectorFields(objects,[definition.id]);for(const path of fields)multiField(body,objects,path);body.append(make('small','inspector-multi-note','Les listes, graphes et structures propres à un objet se modifient en sélection individuelle.'));const actions=make('div','inspector-bulk-actions');for(const [label,operation] of [['Réinitialiser la sélection',resetObjectComponent],['Retirer de la sélection',removeObjectComponent]]){const button=make('button','',label);button.type='button';button.disabled=state.playing;button.onclick=()=>{objects.forEach(object=>operation(object,definition.id));record(label+' : '+definition.name);notify()};actions.append(button)}body.append(actions)}
 const union=definitions.filter(definition=>objects.some(object=>object[definition.id]!=null));
 root.append(make('p','inspector-multi-note','Seuls les composants et champs communs sont affichés. '+(union.length-common.length)+' composants non partagés masqués. Scripts, graphes et composants C# : sélection individuelle.'));
 const add=make('details','inspector-add-component');add.append(make('summary','','＋ Ajouter aux objets sélectionnés'));const search=make('input','');search.type='search';search.placeholder='Rechercher un composant…';search.setAttribute('aria-label','Rechercher un composant pour la sélection');const list=make('div','component-browser-results');
 const render=()=>{list.replaceChildren();for(const definition of componentChoices(workspace.mode).filter(definition=>!definition.multiple&&(definition.name+' '+definition.category).toLocaleLowerCase('fr').includes(search.value.toLocaleLowerCase('fr')))){const missing=objects.filter(object=>object[definition.id]==null),button=make('button','component-browser-option',definition.name+' · '+missing.length+' à ajouter');button.type='button';button.disabled=state.playing||!missing.length;button.onclick=()=>{missing.forEach(object=>addObjectComponent(object,definition.id,workspace.mode));record('Ajouter '+definition.name+' à la sélection');notify()};list.append(button)}};search.oninput=render;add.append(search,list);root.append(add);render();enhanceInspectorDetails(root,{id:objects.map(object=>object.id).join(',')});
}
