import {state} from '../core/state.js';
import {saveProject} from '../core/project-hub.js';
import {element} from './blueprint-controls.js';
export function initStudioPolish(){
 const bar=document.querySelector('.studio-menubar'),primary=document.getElementById('studioPrimaryActions');if(!bar||!primary)return;
 const brand=element('div','studio-identity');brand.append(element('span','studio-mark','W'));
 const name=element('div');name.append(element('strong','','WARLIKE'),element('small','','DE L’IDÉE AU JEU'));brand.append(name);bar.prepend(brand);
 const exportButton=element('button','studio-build-button','↓ Exporter le jeu');exportButton.type='button';exportButton.id='exportGame';exportButton.onclick=()=>document.dispatchEvent(new Event('warlike:open-game-project'));
 const create=document.getElementById('studioQuickCreate'),tools=document.getElementById('warlikeToolLibrary'),toggle=document.getElementById('studioToolbarToggle');
 const group=element('span','studio-action-divider');primary.replaceChildren(...[document.getElementById('play'),document.getElementById('openBlueprint'),exportButton,group,create,tools,document.getElementById('undo'),document.getElementById('redo'),toggle].filter(Boolean));
 const rename=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};
 rename('sceneTab','Scène');rename('gameTab','Jeu');rename('quickCreateCharacter','＋ Personnage');rename('openBlueprint','⬡ Blueprint Studio');rename('hubSave','Enregistrer');
 const labels=[['#hierarchyPanel .panel-title>span','Scène'],['#inspectorPanel .panel-title>span','Inspecteur']];for(const [selector,text] of labels){const el=document.querySelector(selector);if(el)el.textContent=text}
 const heading=document.querySelector('#blueprintDialog .blueprint-heading>strong');if(heading){heading.replaceChildren(element('span','bp-brand-symbol','⬡'),element('span','','Blueprint Studio'))}
 const update=()=>{rename('play',state.playing?'■ Arrêter':'▶ Tester');exportButton.disabled=state.playing;document.body.classList.toggle('studio-is-playing',state.playing)};
 document.addEventListener('warlike:change',update);update();
 const toast=element('div','studio-toast');toast.setAttribute('role','status');toast.hidden=true;document.body.append(toast);let timeout;
 window.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'&&!globalThis.__WARLIKE_BUILD__){event.preventDefault();const ok=saveProject();toast.textContent=ok?'✓ Projet enregistré':'Crée un projet nommé dans le Hub pour l’enregistrer.';toast.hidden=false;clearTimeout(timeout);timeout=setTimeout(()=>toast.hidden=true,2500)}});
}
