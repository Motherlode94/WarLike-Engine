import {defaultCollider2d,defaultController2d,actor2d,solidCollider2d,controllerMode2d} from '../core/physics-2d.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
export function renderPhysics2d(root,o,{component,field,selectField}){
 if(o.lightType||o.audioEnabled)return;
 const flag=(parent,data,key,label,attach)=>{const row=document.createElement('label'),input=document.createElement('input');row.className='logic-flag';input.type='checkbox';input.checked=!!data[key];input.disabled=state.playing;input.onchange=()=>{attach?.();data[key]=input.checked;record('Physique 2D : '+label);notify()};row.append(input,document.createTextNode(label));parent.append(row)};
 const numbers=(parent,data,fields,attach)=>{for(const [key,label] of fields){field(parent,data,key,label);parent.lastElementChild.querySelector('input')?.addEventListener('change',()=>attach?.(),{capture:true})}};
 component(root,'Box Collider 2D',body=>{
  const c=o.collider2d||{...defaultCollider2d(),enabled:solidCollider2d(o)||actor2d(o)&&o.collision3d!==false},attach=()=>o.collider2d=c;
  flag(body,c,'enabled','Collider actif',attach);flag(body,c,'isTrigger','Trigger · laisser traverser',attach);
  numbers(body,c,[['offsetX','Décalage X'],['offsetY','Décalage Y'],['width','Largeur · 0 = sprite'],['height','Hauteur · 0 = sprite']],attach);
  const note=document.createElement('small');note.textContent='Rectangle aligné aux axes. Un collider solide bloque ; un trigger laisse traverser. Le bouton Colliders montre le volume utilisé.';body.append(note);
 });
 if(o.rigidbody2d)component(root,'Rigidbody 2D',body=>{
  const rb=o.rigidbody2d;flag(body,rb,'enabled','Simulation active');selectField(body,rb,'bodyType','Type de corps',[{value:'dynamic',label:'Dynamique · gravité'},{value:'kinematic',label:'Cinématique · vitesse'},{value:'static',label:'Statique · obstacle'}]);
  numbers(body,rb,[['mass','Masse'],['gravity','Gravité · px/s²'],['gravityScale','Multiplicateur gravité'],['restitution','Rebond · 0 à 1'],['friction','Friction · 0 à 1'],['vx','Vitesse X · px/s'],['vy','Vitesse Y · px/s']]);
 });
 if(actor2d(o)||o.controller2d)component(root,'Contrôleur de personnage 2D',body=>{
  const cfg=o.controller2d||defaultController2d(),attach=()=>o.controller2d=cfg;
  selectField(body,cfg,'mode','Déplacement',[{value:'auto',label:'Automatique'},{value:'topDown',label:'Vue du dessus'},{value:'platformer',label:'Plateforme · gravité et saut'}]);body.lastElementChild.querySelector('select')?.addEventListener('change',attach,{capture:true});
  numbers(body,cfg,[['walkSpeed','Marche · px/s'],['sprintSpeed','Sprint · px/s'],['jumpSpeed','Saut · px/s']],attach);
  const note=document.createElement('small');note.textContent='Mode actuel : '+(controllerMode2d(o,state.entities)==='platformer'?'plateforme · espace / Z / W / ↑ pour sauter.':'vue du dessus · mouvement sur les deux axes.')+' Automatique reconnaît les personnages et terrains Kenney Platformer.';body.append(note);
 });
}
