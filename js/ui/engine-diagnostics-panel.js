// Diagnostics panel is deliberately separate from the editor theme and game rules.
// Open/close with F8 during Play. Export reports without modifying scene objects.
import {engineDiagnostics,engineDiagnosticReport} from '../core/engine-diagnostics.js';
import {sequenceRuntime} from '../core/logic-sequences.js';
import {hub} from '../core/project-hub.js';
let panel,readout,save,visible=false,frame=0;
const format=n=>Number(n||0).toLocaleString('fr-FR',{maximumFractionDigits:1});
function reportFor(state){
 return engineDiagnosticReport({genre:hub.genre,entityCount:state.entities.length,blueprintGlobals:sequenceRuntime.globals});
}
export function initEngineDiagnosticsPanel(){
 if(panel)return;
 const viewport=document.getElementById('viewport');
 if(!viewport)return;
 panel=document.createElement('section');panel.id='warlikeDiagnosticsPanel';
 panel.hidden=true;panel.setAttribute('aria-label','Diagnostics du moteur');
 const title=document.createElement('div');title.className='warlike-diagnostics-title';
 const heading=document.createElement('strong');heading.textContent='WarLike · Engine Diagnostics';
 const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Fermer les diagnostics');close.onclick=()=>{visible=false;panel.hidden=true};
 title.append(heading,close);
 readout=document.createElement('pre');readout.className='warlike-diagnostics-readout';
 save=document.createElement('button');save.type='button';save.textContent='Exporter le rapport JSON';
 save.onclick=()=>{
  const stateRef=panel._stateRef;if(!stateRef)return;
  const data=reportFor(stateRef);
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='warlike-diagnostics-'+Date.now()+'.json';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 panel.append(title,readout,save);viewport.append(panel);
 window.addEventListener('keydown',event=>{
  if(event.key!=='F8'||event.repeat)return;
  const target=event.target;
  if(target?.matches?.('input,textarea,select,[contenteditable="true"]'))return;
  event.preventDefault();
  if(!engineDiagnostics.active)return;
  visible=!visible;panel.hidden=!visible;
 });
}
export function updateEngineDiagnosticsPanel(state){
 initEngineDiagnosticsPanel();
 if(!panel)return;
 panel._stateRef=state;
 if(!state.playing){panel.hidden=true;visible=false;return}
 panel.hidden=!visible;
 if(!visible||(++frame%12!==0))return;
 const report=reportFor(state);
 readout.textContent=[
  'Mode : '+report.mode.toUpperCase()+' · '+report.genre,
  'FPS moyen observé : '+format(report.averageFps),
  'Temps Play : '+format(report.durationSeconds)+' s · frames : '+report.frames,
  'Objets : '+report.entities+' · frames lentes : '+report.slowFrames,
  'Collisions détectées (conduite) : '+report.collisions,
  'Véhicule · entrées : '+report.vehicleEntries+' · sorties : '+report.vehicleExits,
  'Actions Blueprint : '+report.blueprintActions,
  ...(report.fieldLab?['Field Lab : '+[report.fieldLab.walk,report.fieldLab.interaction,report.fieldLab.driving].filter(Boolean).length+'/3',
   'Collisions physiques : contrôle manuel requis']:[]),
  '',
  'Derniers événements :',
  ...report.events.slice(-5).map(e=>'['+format(e.time)+'s] '+e.type+' '+e.detail)
 ].join('\n');
}
