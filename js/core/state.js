export const state={entities:[{id:1,name:'Player',type:'player',x:100,y:110,w:38,h:38,color:'#41cdb5'},{id:2,name:'Obstacle',type:'object',x:330,y:180,w:90,h:70,color:'#e2a45f'}],selected:[1],nextId:3,playing:false,playBackup:null,keys:new Set(),keyPresses:new Set(),camera:{x:0,y:0,zoom:1}};
export const active=()=>state.entities.find(o=>o.id===state.selected.at(-1));
export function select(ids){state.selected=ids.filter(id=>state.entities.some(o=>o.id===id));document.dispatchEvent(new Event('warlike:change'))}
export const notify=()=>document.dispatchEvent(new Event('warlike:change'));
