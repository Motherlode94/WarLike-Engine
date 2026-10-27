import {hub} from '../core/project-hub.js';
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
 const genre=hub.genre||'sandbox';
 if(!racing&&!units&&!['rp','simulation','rpg','fourx'].includes(genre)){hud.hidden=true;return}
 const pieces=[];
 if(racing)pieces.push('🏁 '+(Number(globals.raceFinished)===1?'Arrivée':'Course')+' · '+clock(globals.raceElapsed)+' · CP '+(Number(globals.raceCheckpoint)||0));
 if(units)pieces.push('RTS · '+units+' unité'+(units>1?'s':'')+' · Clic droit : déplacer');
 const stat=(key,fallback=0)=>Number.isFinite(Number(globals[key]))?Number(globals[key]):fallback;
 if(genre==='rp')pieces.push('RP · '+stat('money')+' crédits · réputation '+stat('reputation')+' · E interagir');
 if(genre==='simulation')pieces.push('SIM · '+stat('money')+' crédits · '+stat('materials')+' matériaux · maintenance '+stat('maintenance'));
 if(genre==='rpg')pieces.push('RPG · '+stat('gold')+' or · '+stat('experience')+' XP · quête '+(stat('questCompleted')?'terminée':stat('questActive')?'active':'à découvrir'));
 if(genre==='fourx')pieces.push('4X · tour '+stat('turn',1)+' · nourriture '+stat('food')+' · industrie '+stat('industry')+' · science '+stat('science')+' · territoires '+stat('territory')+' · armées '+stat('army'));
 hud.textContent=pieces.join('     |     ');
 hud.hidden=false;
}
