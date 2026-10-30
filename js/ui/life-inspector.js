import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
import {lifeNeeds} from '../core/life-simulation.js';
export function renderLifeInspector(root,o,{component,field,selectField}){
 const note=(body,text)=>{const p=document.createElement('small');p.textContent=text;body.append(p)};
 if(o.lifeSim)component(root,'Liens de vie · Personnage',body=>{
  note(body,'Simulation solo 2D : marche, activités, cinq besoins, travail, amitié et affection. La progression est enregistrée avec la partie.');
  if(o.lifeState){field(body,o.lifeState,'money','Argent');for(const [key,label] of Object.entries(lifeNeeds))field(body,o.lifeState.needs,key,label);field(body,o.lifeState,'minutes','Minutes depuis minuit');}
 });
 if(o.lifeNpc)component(root,'Liens de vie · Voisin',body=>{
  const cfg=o.lifeNpc;selectField(body,cfg,'likes','Sujet préféré',['art','music','nature','food']);
  const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=!!cfg.romance;check.disabled=state.playing;
  check.onchange=()=>{cfg.romance=check.checked;record('Préférence relationnelle du voisin');notify()};label.append(check,document.createTextNode('Peut envisager une relation amoureuse'));body.append(label);
  note(body,'Les relations se construisent par les échanges. Activer cette préférence ne garantit pas une réponse positive : amitié et confiance restent nécessaires.');
 });
 if(o.lifePlace)component(root,'Liens de vie · Lieu',body=>{selectField(body,o.lifePlace,'kind','Fonction',['home','cafe','work','garden']);field(body,o.lifePlace.entry,'x','Point d’arrivée X');field(body,o.lifePlace.entry,'y','Point d’arrivée Y');note(body,'Le point d’arrivée doit être accessible devant le bâtiment, à l’extérieur de son collider.');});
}
