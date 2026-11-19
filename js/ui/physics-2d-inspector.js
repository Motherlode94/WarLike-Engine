import {defaultCollider2d,defaultController2d,actor2d,solidCollider2d,controllerMode2d} from '../core/physics-2d.js';
import {physicsDiagnostics2d,jointAnchor2d} from '../core/physics-tools-2d.js';
import {colliderShape2d} from '../core/collider-shapes-2d.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
export function renderPhysics2d(root,o,{component,field,selectField}){
 if(o.lightType||o.audioEnabled)return;
 const flag=(parent,data,key,label,attach)=>{const row=document.createElement('label'),input=document.createElement('input');row.className='logic-flag';input.type='checkbox';input.checked=!!data[key];input.disabled=state.playing;input.onchange=()=>{attach?.();data[key]=input.checked;record('Physique 2D : '+label);notify()};row.append(input,document.createTextNode(label));parent.append(row)};
 const numbers=(parent,data,fields,attach)=>{for(const [key,label] of fields){field(parent,data,key,label);parent.lastElementChild.querySelector('input')?.addEventListener('change',()=>attach?.(),{capture:true})}};
 component(root,'Collider 2D',body=>{
  const c={...defaultCollider2d(),...(o.collider2d||{enabled:solidCollider2d(o)||actor2d(o)&&o.collision3d!==false})},attach=()=>o.collider2d=c;
  selectField(body,c,'shape','Forme',[{value:'box',label:'Rectangle'},{value:'circle',label:'Cercle'},{value:'capsule',label:'Capsule'}]);body.lastElementChild.querySelector('select')?.addEventListener('change',attach,{capture:true});
  flag(body,c,'enabled','Collider actif',attach);flag(body,c,'isTrigger','Trigger · laisser traverser',attach);
  numbers(body,c,[['offsetX','Décalage X'],['offsetY','Décalage Y'],['width','Largeur · 0 = sprite'],['height','Hauteur · 0 = sprite'],['radius','Rayon du cercle · 0 = auto'],['layer','Couche · 0 à 31'],['mask','Masque de collision · bits']],attach);
  const note=document.createElement('small');note.textContent='Formes alignées aux axes, indépendantes de la rotation du sprite. Un solide bloque ; un trigger laisse traverser. Colliders affiche la forme, les vitesses et les articulations.';body.append(note);
 });
 if(o.rigidbody2d)component(root,'Rigidbody 2D',body=>{
  const rb=o.rigidbody2d;flag(body,rb,'enabled','Simulation active');selectField(body,rb,'bodyType','Type de corps',[{value:'dynamic',label:'Dynamique · gravité'},{value:'kinematic',label:'Cinématique · vitesse'},{value:'static',label:'Statique · obstacle'}]);
  numbers(body,rb,[['mass','Masse'],['gravity','Gravité · px/s²'],['gravityScale','Multiplicateur gravité'],['restitution','Rebond · 0 à 1'],['friction','Friction · 0 à 1'],['vx','Vitesse X · px/s'],['vy','Vitesse Y · px/s']]);
 });
 if(o.joint2d)component(root,'Articulation 2D',body=>{
  const joint=o.joint2d;flag(body,joint,'enabled','Articulation active');
  selectField(body,joint,'kind','Type',[{value:'distance',label:'Distance fixe'},{value:'spring',label:'Ressort amorti'}]);
  selectField(body,joint,'targetId','Cible',[{value:0,label:'Ancre fixe dans la scène'},...state.entities.filter(e=>e!==o).map(e=>({value:e.id,label:e.name+' · #'+e.id}))]);
  numbers(body,joint,[['anchorX','Ancre X · monde ou décalage cible'],['anchorY','Ancre Y · monde ou décalage cible'],['offsetX','Attache locale X'],['offsetY','Attache locale Y'],['distance','Distance · px'],['stiffness','Raideur du ressort'],['damping','Amortissement']]);
  const note=document.createElement('small');note.textContent='La cible sert d’ancre : elle ne reçoit pas de force réciproque. Une collision peut empêcher la distance demandée.';body.append(note);
 });
 if(o.effector2d)component(root,'Zone de forces 2D',body=>{
  const effect=o.effector2d;flag(body,effect,'enabled','Zone active');
  numbers(body,effect,[['forceX','Force X'],['forceY','Force Y'],['drag','Amortissement par seconde'],['layerMask','Masque des corps affectés']]);
  const note=document.createElement('small');note.textContent='Agit sur les Rigidbody dynamiques qui chevauchent la forme. La masse détermine l’accélération ; utiliser un Trigger pour une zone traversable.';body.append(note);
 });
 if(o.collider2d||o.rigidbody2d||o.joint2d||o.effector2d)component(root,'Diagnostic physique 2D',body=>{
  const report=physicsDiagnostics2d(state.entities),info=document.createElement('p');
  info.textContent=report.bodies+' corps · '+report.colliders+' colliders explicites · '+report.triggers+' triggers · '+report.joints+' articulations · '+report.effectors+' zones de forces';body.append(info);
  if(o.rigidbody2d){const speed=document.createElement('small');speed.textContent='Vitesse : '+Math.hypot(Number(o.rigidbody2d.vx)||0,Number(o.rigidbody2d.vy)||0).toFixed(1)+' px/s';body.append(speed)}
  const anchor=jointAnchor2d(o,state.entities);
  if(anchor){const shape=colliderShape2d(o),error=document.createElement('p');error.textContent='Écart à la distance cible : '+(Math.hypot(shape.cx+(Number(o.joint2d.offsetX)||0)-anchor.x,shape.cy+(Number(o.joint2d.offsetY)||0)-anchor.y)-(Number(o.joint2d.distance)||0)).toFixed(2)+' px';body.append(error)}
  for(const warning of report.warnings){const note=document.createElement('p');note.textContent=warning;body.append(note)}
 });
 if(actor2d(o)||o.controller2d)component(root,'Contrôleur de personnage 2D',body=>{
  const cfg=o.controller2d||defaultController2d(),attach=()=>o.controller2d=cfg;
  selectField(body,cfg,'mode','Déplacement',[{value:'auto',label:'Automatique'},{value:'topDown',label:'Vue du dessus'},{value:'platformer',label:'Plateforme · gravité et saut'}]);body.lastElementChild.querySelector('select')?.addEventListener('change',attach,{capture:true});
  numbers(body,cfg,[['walkSpeed','Marche · px/s'],['sprintSpeed','Sprint · px/s'],['jumpSpeed','Saut · px/s']],attach);
  const note=document.createElement('small');note.textContent='Mode actuel : '+(controllerMode2d(o,state.entities)==='platformer'?'plateforme · espace / Z / W / ↑ pour sauter.':'vue du dessus · mouvement sur les deux axes.')+' Automatique reconnaît les personnages et terrains Kenney Platformer.';body.append(note);
 });
}
