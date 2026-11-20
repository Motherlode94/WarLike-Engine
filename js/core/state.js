import {createCleanStarterScene3d} from './clean-starter-scene.js';
export const state={entities:createCleanStarterScene3d(),selected:[],nextId:4,playing:false,playBackup:null,keys:new Set(),keyPresses:new Set(),camera:{x:0,y:0,zoom:1}};
export const active=()=>state.entities.find(o=>o.id===state.selected.at(-1));
export function select(ids){state.selected=ids.filter(id=>state.entities.some(o=>o.id===id));document.dispatchEvent(new Event('warlike:change'))}
export const notify=()=>document.dispatchEvent(new Event('warlike:change'));
