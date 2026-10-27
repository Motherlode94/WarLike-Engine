// Lightweight status overlay for genre-specific playable prototypes.
import {sequenceRuntime} from '../core/logic-sequences.js';
import {isRtsUnit} from '../core/rts-orders.js';
let hud;
const clock=seconds=>{
 const s=Math.max(0,Number(seconds)||0),m=Math.floor(s/60);
 return String(m).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0')+'.'+String(Math.floor(s*10)%10);
};
export function updateGenreHud(state){
 if(!hud){const host=document.getElementById('viewport');if(!host)return;hud=document.createElement('div');hud.className='warlike-genre-hud';hud.setAttribute('aria-live','off');host.append(hud)}
 if(!state.playing){hud.hidden=true;return}
 const globals=sequenceRuntime.globals;
 const racing=Number(globals.raceStarted)===1;
 const units=state.entities.filter(o=>state.selected.includes(o.id)&&isRtsUnit(o)).length;
 if(!racing&&!units){hud.hidden=true;return}
 const pieces=[];
 if(racing)pieces.push('🏁 '+(Number(globals.raceFinished)===1?'Arrivée':'Course')+' · '+clock(globals.raceElapsed)+' · CP '+(Number(globals.raceCheckpoint)||0));
 if(units)pieces.push('RTS · '+units+' unité'+(units>1?'s':'')+' · Clic droit : déplacer');
 hud.textContent=pieces.join('     |     ');
 hud.hidden=false;
}
