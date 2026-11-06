import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
export function renderWebScriptInspector(root,entity,{component}){
 for(const [index,script] of (entity.webScripts||[]).entries()){
  component(root,(script.language==='typescript'?'TypeScript':'JavaScript')+' · '+script.name,body=>{
   const open=document.createElement('button');open.type='button';open.textContent='Modifier le script JS/TS';open.disabled=state.playing;open.onclick=()=>document.dispatchEvent(new CustomEvent('warlike:script-open',{detail:{scriptId:script.scriptId,entityId:entity.id,language:script.language}}));body.append(open);
   const label=document.createElement('label');label.textContent=state.playing?'Champs de l’instance (JSON)':'Remplacements des champs (JSON)';const input=document.createElement('textarea');input.setAttribute('aria-label','Paramètres '+script.name);input.value=JSON.stringify(state.playing?script.runtime?.fields||script.values||{}:script.values||{},null,2);input.disabled=state.playing;input.rows=4;input.onchange=()=>{try{if(input.value.length>16384)throw Error('Paramètres limités à 16 Ko.');const value=JSON.parse(input.value);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Objet JSON attendu.');script.values=value;delete script.runtime;record('Paramètres '+script.name);notify()}catch(error){input.setCustomValidity(error.message);input.reportValidity()}};label.append(input);body.append(label);
   const help=document.createElement('small');help.textContent=script.runtime?.error||(script.language==='typescript'?'TypeScript compilé en JavaScript · Play Web et export.':'JavaScript natif · Play Web et export.');body.append(help);
  });root.lastElementChild.dataset.webScriptIndex=String(index);root.lastElementChild.dataset.componentKey='webScripts';
 }
}
