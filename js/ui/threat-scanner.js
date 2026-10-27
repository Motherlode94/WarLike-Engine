// Enemy scanner reads living in-scene AI only. This UI never changes AI behaviour.
import {scanThreats} from '../core/threat-intelligence.js';
let panel,rows,toggle,enabled=false,refresh=0;
const playable=entities=>entities.find(o=>o.playable3d===true||o.type==='player'||o.type==='character'||o.tags?.includes('player'));
export function initThreatScanner(){
 if(panel)return;
 const host=document.getElementById('viewport');if(!host)return;
 panel=document.createElement('aside');panel.id='warlikeThreatScanner';panel.hidden=true;
 panel.setAttribute('aria-label','Scanner de menaces');
 const header=document.createElement('div');header.className='warlike-threat-header';
 const title=document.createElement('strong');title.textContent='WARLIKE · THREAT SCANNER';
 toggle=document.createElement('button');toggle.type='button';toggle.textContent='×';toggle.setAttribute('aria-label','Fermer le scanner');
 toggle.onclick=()=>{enabled=false;panel.hidden=true};
 header.append(title,toggle);
 const help=document.createElement('p');help.textContent='Identités et comportement des PNJ IA proches · T pour ouvrir/fermer';
 rows=document.createElement('div');rows.className='warlike-threat-results';rows.setAttribute('aria-live','off');
 panel.append(header,help,rows);host.append(panel);
 window.addEventListener('keydown',event=>{
  if(event.key.toLowerCase()!=='t'||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
  if(event.target?.matches?.('input,textarea,select,[contenteditable="true"]'))return;
  if(!panel._playing)return;
  event.preventDefault();enabled=!enabled;panel.hidden=!enabled;
 });
}
export function updateThreatScanner(state){
 initThreatScanner();if(!panel)return;
 panel._playing=!!state.playing;
 if(!state.playing){enabled=false;panel.hidden=true;return}
 panel.hidden=!enabled;
 if(!enabled||++refresh%10!==0)return;
 const player=playable(state.entities);
 if(!player){rows.textContent='Aucun joueur détecté dans cette scène.';return}
 const results=scanThreats(state.entities,player,{radius:900});
 rows.replaceChildren();
 if(!results.length){rows.textContent='Aucun PNJ IA dans le périmètre.';return}
 for(const enemy of results.slice(0,12)){
  const item=document.createElement('div');item.className='warlike-threat-item';
  const name=document.createElement('strong');name.textContent=enemy.name+' · '+enemy.className+' · Niv. '+enemy.level;
  const status=document.createElement('span');status.className='warlike-threat-relation';
  status.dataset.relation=enemy.relation;
  status.textContent=enemy.relation==='hostile'?'HOSTILE':enemy.relation==='suspicious'?'SUSPECT':enemy.relation==='friendly'?'ALLIÉ':'NEUTRE';
  const description=document.createElement('small');
  description.textContent='Faction '+enemy.faction+' · '+enemy.distance+' u. · '+enemy.state+
   ' · vie '+enemy.health+'/'+enemy.maxHealth+' · menace '+enemy.severity+'/100';
  const perception=document.createElement('small');
  perception.textContent='Détection '+(enemy.detected?'active':'inactive')+' · Vision '+(enemy.visible?'confirmée':'non confirmée')+
   ' · faiblesse : '+enemy.weakness;
  item.append(name,status,description,perception);rows.append(item);
 }
}
