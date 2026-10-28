import {defaultSuperhero,heroArchetypes,heroAbilities} from '../core/superhero-runtime.js';
import {experienceForLevel} from '../core/rpg-progression.js';
import {fxPresets} from '../core/fx-runtime.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
export function renderHeroForgeInspector(root,o,{component,field,selectField,colorPalette}){
 const flag=(body,data,key,title)=>{const line=document.createElement('label'),check=document.createElement('input');line.className='logic-flag';check.type='checkbox';check.checked=key==='preview'?data[key]===true:data[key]!==false;check.disabled=state.playing;check.onchange=()=>{data[key]=check.checked;record('Hero Forge : '+title);notify()};line.append(check,document.createTextNode(title));body.append(line)};
 const note=(body,text)=>{const p=document.createElement('small');p.textContent=text;body.append(p)};
 if(o.superhero)component(root,'Super-héros · Pouvoirs',body=>{
  const cfg=o.superhero;flag(body,cfg,'enabled','Pouvoirs actifs');selectField(body,cfg,'archetype','Archétype',Object.entries(heroArchetypes).map(([value,p])=>({value,label:p.name})));
  const apply=document.createElement('button');apply.type='button';apply.textContent='Appliquer cet archétype';apply.disabled=state.playing;apply.onclick=()=>{o.superhero=defaultSuperhero(cfg.archetype);delete o.heroState;record('Archétype '+o.superhero.name);notify()};body.append(apply);colorPalette(body,cfg,'color','Couleur des pouvoirs');
  for(const [key,label] of [['maxEnergy','Énergie maximale'],['energyRegen','Régénération / s'],['damage','Puissance'],['range','Portée · unités'],['novaRadius','Rayon onde de choc'],['dashDistance','Distance de ruée'],['shieldCapacity','Capacité bouclier'],['shieldDuration','Durée bouclier · s'],['flightSpeed','Vitesse de vol · m/s'],['cooldownScale','Multiplicateur recharge'],['startingMaterials','Matériaux de départ']])field(body,cfg,key,label);
  flag(body,cfg,'aimAssist','Aide à la visée');if(!Array.isArray(cfg.slots))cfg.slots=Object.keys(heroAbilities);
  for(let i=0;i<6;i++){const row=document.createElement('label');row.className='hero-slot-field';row.append(document.createTextNode('Touche '+(i+1)));const select=document.createElement('select');select.disabled=state.playing;select.setAttribute('aria-label','Pouvoir sur la touche '+(i+1));for(const [value,def] of Object.entries(heroAbilities)){const option=document.createElement('option');option.value=value;option.textContent=def.name;select.append(option)}select.value=cfg.slots[i]||Object.keys(heroAbilities)[i];select.onchange=()=>{cfg.slots[i]=select.value;record('Emplacement de pouvoir '+(i+1));notify()};row.append(select);body.append(row)}
  note(body,'Play : 1–6 pour les pouvoirs · vol : espace monter, X descendre · U améliorer la branche RPG choisie · E secourir / réparer. Le vol et la ruée respectent les obstacles.');
 });
 if(o.rpgProgression)component(root,'Progression RPG',body=>{
  const p=o.rpgProgression;flag(body,p,'enabled','Progression active');for(const [key,label] of [['level','Niveau'],['experience','Expérience actuelle'],['skillPoints','Points de compétence']])field(body,p,key,label);
  selectField(body,p,'trainingFocus','Branche améliorée avec U',[{value:'power',label:'Combat · dégâts'},{value:'guard',label:'Défense · bouclier et résistance'},{value:'command',label:'Commandement · soutien d’escouade'}]);p.skills??={power:0,guard:0,command:0};for(const [key,label] of [['power','Combat · rang 0–5'],['guard','Défense · rang 0–5'],['command','Commandement · rang 0–5']])field(body,p.skills,key,label);
  note(body,'Prochain niveau : '+experienceForLevel(p.level)+' XP. Chaque niveau donne un point de compétence et +10 PV maximum. Combat renforce les attaques, Défense réduit les dégâts et Commandement renforce le ralliement.');
 });
 if(o.fxEmitter)component(root,'Émetteur FX',body=>{
  const studio=document.createElement('button');studio.type='button';studio.textContent='Ouvrir FX Studio';studio.onclick=()=>document.dispatchEvent(new CustomEvent('warlike:fx-open',{detail:{id:o.id}}));body.append(studio);
  const cfg=o.fxEmitter;flag(body,cfg,'enabled','Émission active');flag(body,cfg,'preview','Prévisualiser dans la scène');selectField(body,cfg,'kind','Effet',Object.keys(fxPresets).map(value=>({value,label:({energy:'Énergie',fire:'Feu',electric:'Électricité',smoke:'Fumée',heal:'Soin',portal:'Portail'})[value]})));colorPalette(body,cfg,'color','Couleur des particules');for(const [key,label] of [['rate','Particules / s · max 120'],['scale','Échelle'],['lifetime','Durée de vie · s'],['speed','Vitesse'],['gravity','Gravité des particules']])field(body,cfg,key,label);note(body,'Aperçu indépendant du Play. Le moteur limite les particules et regroupe le rendu 3D en deux lots GPU maximum. Les consommateurs du réseau émettent lorsque leur alimentation est active.');
 });
 if(o.simulationNode)component(root,'Simulation · Réseau et monde',body=>{
  const cfg=o.simulationNode;flag(body,cfg,'enabled','Simulation active');selectField(body,cfg,'kind','Rôle',[{value:'destructible',label:'Décor destructible'},{value:'generator',label:'Générateur'},{value:'consumer',label:'Consommateur / station de recharge'},{value:'civilian',label:'Civil à secourir'}]);field(body,cfg,'network','Réseau énergétique','text');for(const [key,label] of [['health','État / intégrité'],['maxHealth','Intégrité maximale'],['repairCost','Coût réparation · matériaux'],['resourceYield','Matériaux récupérés']])field(body,cfg,key,label);
  if(cfg.kind==='generator')field(body,cfg,'output','Puissance produite');if(cfg.kind==='consumer'){field(body,cfg,'demand','Puissance demandée');field(body,cfg,'priority','Priorité alimentation');note(body,cfg.powered?'Station alimentée':'Station hors tension · capacité du réseau insuffisante')}
  note(body,'E à proximité : secourir un civil ou réparer avec des matériaux. Les dégâts des pouvoirs récupèrent une fois les matériaux d’un décor détruit. La production dépend de l’intégrité du générateur.');
 });
 if(o.tacticalUnit)component(root,'Unité tactique RTS',body=>{
  const cfg=o.tacticalUnit;flag(body,cfg,'enabled','Unité active');flag(body,cfg,'autoAttack','Défense automatique');for(const [key,label] of [['speed','Vitesse déplacement'],['attackRange','Portée d’attaque'],['damage','Dégâts'],['attackInterval','Intervalle de tir · s'],['followDistance','Distance de suivi']])field(body,cfg,key,label);field(body,o,'team','Équipe');note(body,'Play : clic gauche / Maj pour sélectionner · clic droit au sol pour déplacer, sur un ennemi pour attaquer. Le HUD propose Suivre et Tenir. Les obstacles utilisent A* et des collisions.');
 });
}
