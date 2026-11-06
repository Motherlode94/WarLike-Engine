import {compileWarScript,createWarScriptInstance,warScriptBuiltin,warScriptValue} from '../../script-editor/warscript.js';
import {warScriptSource} from '../core/war-script-runtime.js';
import {gameProject} from '../core/game-project.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
export function renderWarScriptInspector(root,entity,{component}){
 for(const [index,script] of (entity.warScripts||[]).entries()){
  component(root,'WarScript · '+script.name,body=>{
   const info=document.createElement('p');info.textContent='.wls · Play Web / C# local · export Web';body.append(info);
   const open=document.createElement('button');open.type='button';open.textContent='Modifier le WarScript';open.disabled=state.playing;open.onclick=()=>document.dispatchEvent(new CustomEvent('warlike:script-open',{detail:{language:'warscript',entityId:entity.id,scriptId:script.scriptId}}));body.append(open);
   const program=compileWarScript(warScriptSource(script,gameProject));
   if(!program.ok){const error=document.createElement('p');error.textContent=program.diagnostics.map(d=>d.line+':'+d.column+' · '+d.message).join('\n');error.className='inspector-script-error';body.append(error);return}
   let defaults;try{defaults=createWarScriptInstance(program,{call:warScriptBuiltin,read(){throw Error('Valeur initiale inconnue.')}}).fields}catch(error){const p=document.createElement('p');p.textContent=error.message;body.append(p);return}
   for(const field of program.fields.filter(f=>f.public)){
    const value=state.playing?script.runtime?.fields?.[field.name]??script.values?.[field.name]??defaults[field.name]:script.values?.[field.name]??defaults[field.name];
    const row=document.createElement('label');row.className='warlike-component-field';const label=document.createElement('span');label.textContent=field.name;row.append(label);
    const axes=field.type==='Vector3'?['x','y','z']:[null];for(const axis of axes){const input=document.createElement('input'),v=axis?value[axis]:value;input.type=typeof v==='boolean'?'checkbox':typeof v==='number'?'number':'text';input.step=field.type==='int'?'1':'any';if(input.type==='checkbox')input.checked=v;else input.value=String(v);input.disabled=state.playing;input.setAttribute('aria-label','WarScript '+field.name+(axis?' '+axis:''));input.onchange=()=>{try{const next=input.type==='checkbox'?input.checked:input.type==='number'?(input.value.trim()?Number(input.value):NaN):input.value;const assigned=axis?{...value,[axis]:next}:next;warScriptValue(field.type,assigned);script.values??={};script.values[field.name]=assigned;delete script.runtime;record('WarScript : '+field.name);notify()}catch(error){input.setCustomValidity(error.message);input.reportValidity()}};row.append(input)}body.append(row);
   }
   const status=document.createElement('small');status.textContent=script.runtime?.error||('✓ Script valide · '+Object.keys(program.methods).join(', '));body.append(status);
  });const card=root.lastElementChild;card.dataset.warScriptIndex=String(index);card.dataset.componentKey='warScripts';
 }
}
