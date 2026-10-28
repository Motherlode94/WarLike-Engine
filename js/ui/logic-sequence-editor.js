import {renderBlueprintGraph} from './blueprint-graph-editor.js';
import {newSequence,sequenceEvents} from '../core/logic-sequences.js';
import {eventFields} from '../core/blueprint-catalog.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
import {element,button,select,field,editConditions,editActions} from './blueprint-controls.js';
export function renderSequenceEditor(root,owner,options={}){
 const o=options.sequence?{...owner,sequence:options.sequence}:owner;
 const details=element('details','inspector-component sequence-editor');details.open=options.expanded??!!o.sequence;
 details.append(element('summary','','⚡ Logic Sequences · événements & actions'));
 const body=element('div','component-content bp-instructions');details.append(body);root.append(details);
 const save=label=>{if(options.onChange)options.onChange(o.sequence,label);else{record('Blueprint : '+label);notify()}};
 if(!o.sequence){button(body,'＋ Ajouter un comportement',()=>{o.sequence=newSequence();save('Ajouter')},'bp-primary');return}
 const s=o.sequence;
 if(s.graph){body.append(element('p','bp-info-banner','Ce comportement utilise un graphe. Ses instructions sont générées à partir des connexions.'));
  button(body,'Convertir en liste modifiable',()=>{delete s.graph;save('Convertir le graphe en liste')},'bp-secondary');
  const list=element('ol','bp-readonly-steps');const describe=steps=>{for(const a of steps||[]){const row=element('li','',a.type+(a.key?' · '+a.key:'')+(a.value!=null?' : '+String(a.value):''));list.append(row);if(a.type==='branch'){describe(a.thenInstructions);describe(a.elseInstructions)}}};describe(s.instructions);body.append(list);return;
 }
 const config=element('section','bp-form-section');config.append(element('h3','','Déclencheur'));
 select(config,'Événement',s.event,sequenceEvents,v=>{s.event=v;save('Événement')},{kind:'event'});
 for(const schema of eventFields(s.event))field(config,schema,s,()=>save('Paramètre événement'));
 field(config,{key:'once',label:'Une seule fois',type:'boolean',default:false},s,()=>save('Répétition'));
 field(config,{key:'runWhenPaused',label:'Actif pendant la pause / fin',type:'boolean',default:false},s,()=>save('Pause'));
 body.append(config);
 const conditions=element('details','bp-form-section');conditions.append(element('summary','','Conditions de déclenchement'));s.conditions??=[];
 select(conditions,'Combinaison',s.conditionMode||'all',[{value:'all',label:'Toutes (ET)'},{value:'any',label:'Au moins une (OU)'}],v=>{s.conditionMode=v;save('Combinaison')});editConditions(conditions,s.conditions,()=>save('Condition'));body.append(conditions);
 const actions=element('section','bp-form-section');actions.append(element('h3','','Instructions'));s.instructions??=[];editActions(actions,s.instructions,()=>save('Instruction'));
 body.append(actions);
 if(s.branches?.length){for(const [i,branch] of s.branches.entries()){const group=element('details','bp-form-section');group.append(element('summary','','Branche '+(i+1)));branch.conditions??=[];branch.instructions??=[];editConditions(group,branch.conditions,()=>save('Branche'));editActions(group,branch.instructions,()=>save('Branche'));body.append(group)}s.elseInstructions??=[];const fallback=element('details','bp-form-section');fallback.append(element('summary','','Sinon'));editActions(fallback,s.elseInstructions,()=>save('Sinon'));body.append(fallback)}
 if(options.showGraph)renderBlueprintGraph(body,s,save);
 button(body,'Supprimer ce comportement',()=>{delete o.sequence;save('Supprimer')},'bp-text-button bp-danger');
}
