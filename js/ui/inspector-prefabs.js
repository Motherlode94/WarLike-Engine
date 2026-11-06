import {readPrefabs} from '../core/prefab-library.js';
import {prefabPropertyOverrides,revertInspectorPrefab} from '../core/inspector-prefabs.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
export function renderInspectorPrefab(root,owner){
 if(!owner.prefabSourceId)return;
 const prefab=readPrefabs().find(prefab=>prefab.id===owner.prefabSourceId),panel=document.createElement('details');panel.className='inspector-prefab';
 const title=document.createElement('summary');title.textContent='◇ Prefab · '+(prefab?.name||'Source absente');panel.append(title);
 if(!prefab){const note=document.createElement('p');note.textContent='La source de ce prefab n’est plus dans les prefabs enregistrés de ce navigateur.';panel.append(note);root.append(panel);return}
 const overrides=prefabPropertyOverrides(prefab,owner),info=document.createElement('p');info.textContent=overrides.length?overrides.length+' propriétés différentes : '+overrides.join(', '):'Cette instance utilise les propriétés du prefab source.';
 const revert=document.createElement('button');revert.type='button';revert.textContent='Rétablir les propriétés du prefab';revert.disabled=state.playing||!overrides.length;revert.onclick=()=>{if(revertInspectorPrefab(prefab,owner)){record('Rétablir le prefab '+prefab.name);notify()}};
 panel.append(info,revert);root.append(panel);
}
