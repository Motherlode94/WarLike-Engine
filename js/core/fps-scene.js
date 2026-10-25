import {prefab3d} from '../assets/catalog-3d.js';
import {switchWorkspace,workspace} from './workspaces.js';
import {state,notify} from './state.js';
import {record} from './history.js';
// A self-contained training range, generated in the original 3D scene format.
export function createFpsScene(){
 if(state.playing)throw Error('Arrête Play avant de créer la scène FPS.');
 if(!switchWorkspace('3d'))throw Error('Mode 3D indisponible.');
 const objects=[];let id=1;
 const place=(asset,x,y,name,props={})=>{const obj=prefab3d(asset,id++,x,y);if(!obj)throw Error('Asset 3D manquant : '+asset);Object.assign(obj,{name,...props});objects.push(obj);return obj};
 const player=place('character-hero',120,280,'FPS Player',{fpsController:true,playable3d:true});
 for(const [x,y] of [[0,0],[520,0],[0,500],[520,500]])place('building-tower',x,y,'Tour de garde');
 for(let k=0;k<7;k++)place('prop-crate',170+k*43,160+(k%2)*115,'Couverture '+(k+1));
 for(let k=0;k<5;k++)place('character-robot',180+k*68,35+(k%2)*35,'Cible '+(k+1),{playable3d:false,behavior:'guard',hp:100});
 state.entities=objects;state.selected=[player.id];state.nextId=id;
 workspace.scenes['3d']={entities:structuredClone(objects),selected:[player.id],nextId:id,camera:{x:0,y:0,zoom:1}};
 record('Créer scène FPS');notify();
 return objects.length;
}
