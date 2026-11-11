import {readPrefabs,savePrefabHierarchy,instantiatePrefabHierarchy} from '../core/prefab-library.js';
import {prefabPropertyOverrides,revertInspectorPrefab} from '../core/inspector-prefabs.js';
import {state,notify} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {record} from '../core/history.js';

const button=(label,action)=>{const node=document.createElement('button');node.type='button';node.textContent=label;node.disabled=state.playing;node.onclick=action;return node};
export function renderInspectorPrefab(root,owner){
 const children=state.entities.some(o=>o.parentId===owner.id);
 if(!owner.prefabSourceId){
  // Only display the authoring action on objects with an actual child tree.
  if(!children)return;
  const panel=document.createElement('details');panel.className='inspector-prefab';
  const title=document.createElement('summary');title.textContent='◇ Prefab hiérarchique';panel.append(title);
  const note=document.createElement('p');note.textContent='Enregistrer cet objet et tous ses enfants dans un prefab réutilisable.';panel.append(note);
  panel.append(button('Créer un prefab avec ses enfants',()=>{
   if(state.playing)return;
   try{
    const prefab=savePrefabHierarchy(owner,state.entities,globalThis.localStorage,{mode:workspace.mode});
    const keys=new Set(prefab.nodes.map(node=>node.key));
    for(const entity of state.entities)if(keys.has('node-'+entity.id)){
     entity.prefabSourceId=prefab.id;entity.prefabNodeKey='node-'+entity.id;entity.prefabOverrides=[];
    }
    record('Créer le prefab hiérarchique '+prefab.name);notify();
   }catch(error){console.error('[WarLike prefab]',error);globalThis.alert?.('Prefab impossible : '+error.message)}
  }));
  root.append(panel);return;
 }
 const prefab=readPrefabs().find(p=>p.id===owner.prefabSourceId);
 const panel=document.createElement('details');panel.className='inspector-prefab';
 const title=document.createElement('summary');title.textContent='◇ Prefab · '+(prefab?.name||'Source absente');panel.append(title);
 if(!prefab){
  const note=document.createElement('p');note.textContent='La source de ce prefab n’est plus dans les prefabs enregistrés de ce navigateur.';panel.append(note);root.append(panel);return;
 }
 const overrides=prefabPropertyOverrides(prefab,owner,state.entities),info=document.createElement('p');
 info.textContent=overrides.length?overrides.length+' propriétés différentes : '+overrides.join(', '):'Cette instance utilise les propriétés du prefab source.';
 const revert=button('Rétablir les propriétés du prefab',()=>{
  if(state.playing)return;
  if(revertInspectorPrefab(prefab,owner,state.entities)){record('Rétablir le prefab '+prefab.name);notify()}
 });
 revert.disabled=state.playing||!overrides.length;
 panel.append(info,revert);
 panel.append(button('Ajouter une instance du prefab',()=>{
  if(state.playing)return;
  try{
   const result=instantiatePrefabHierarchy(prefab,state.nextId,(owner.x||0)+80,(owner.y||0)+80);
   state.entities.push(...result.entities);state.nextId=result.nextId;state.selected=[result.rootId];
   record('Instancier le prefab '+prefab.name);notify();
  }catch(error){console.error('[WarLike prefab]',error);globalThis.alert?.('Prefab impossible : '+error.message)}
 }));
 root.append(panel);
}
