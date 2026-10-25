// WarLike Core V2 — undoable scene editing, independent from UI and storage.
import {validateScene} from './scene-graph-v2.js';
const clone=value=>structuredClone(value);
export function createSceneHistory(scene,{limit=100}={}){
 if(validateScene(scene).length)throw Error('Scène initiale invalide');
 if(!Number.isInteger(limit)||limit<2)throw Error('Limite historique invalide');
 let snapshots=[clone(scene)],cursor=0;
 const current=()=>clone(snapshots[cursor]);
 return {
  get scene(){return current()},
  get canUndo(){return cursor>0},
  get canRedo(){return cursor<snapshots.length-1},
  get length(){return snapshots.length},
  get index(){return cursor},
  commit(label,mutate){
   if(typeof mutate!=='function')throw Error('Commande invalide');
   const next=current();mutate(next);
   const errors=validateScene(next);if(errors.length)throw Error('Commande annulée : '+errors.join('; '));
   if(JSON.stringify(next)===JSON.stringify(snapshots[cursor]))return false;
   snapshots=snapshots.slice(0,cursor+1);
   snapshots.push(clone(next));if(snapshots.length>limit)snapshots.shift();
   cursor=snapshots.length-1;return true;
  },
  undo(){if(cursor>0)cursor--;return current()},
  redo(){if(cursor<snapshots.length-1)cursor++;return current()},
  reset(next){const errors=validateScene(next);if(errors.length)throw Error(errors.join('; '));snapshots=[clone(next)];cursor=0;return current()}
 };
}
export function setComponentProperty(scene,objectId,type,property,value){
 const object=scene.objects.find(o=>o.id===objectId);
 if(!object)throw Error('GameObject absent');
 const component=object.components.find(c=>c.type===type);
 if(!component)throw Error('Composant absent');
 if(property==='type'||property==='__proto__'||property==='constructor'||property==='prototype')throw Error('Propriété protégée');
 component[property]=structuredClone(value);
}
export function renameGameObject(scene,id,name){
 const object=scene.objects.find(o=>o.id===id);
 if(!object)throw Error('GameObject absent');
 if(typeof name!=='string'||!name.trim())throw Error('Nom invalide');
 object.name=name.trim();
}
