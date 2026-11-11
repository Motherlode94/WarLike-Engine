import {state,notify} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {view3d} from '../core/viewport-3d.js';
import {loadAuthoredDemo} from '../core/scene.js';
import {starterDemosForMode} from '../core/demo-catalog.js';
const make=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text)node.textContent=text;return node};
const scenes=[
 {id:'chambre07',name:'CHAMBRE 07 · La Voix',type:'Horreur psychologique · 3D raycast',description:'Explore un appartement labyrinthique, rassemble trois souvenirs, parle à Lia et échappe à une présence. Prototype autonome non éditable dans Inspector.',features:'Exploration · dialogue à choix · souvenirs · poursuite · sauvegarde · deux fins',mode:'3d',externalUrl:'examples/chambre-07/index.html'},
 {id:'worldforge',name:'Worldforge · Forge des mondes',type:'God game · simulation 2D',description:'Crée des continents, installe quatre peuples, observe leurs villages, leurs ressources, leur expansion et leurs conflits.',features:'Terrain · IA de civilisation · Expansion · Incendies · Météores · Sauvegarde',mode:'2d',externalUrl:'examples/worldforge/index.html'},
 {id:'animation',name:'Atelier du mouvement',type:'Personnages et animation · 3D',description:'Contrôle Alex puis explore cinq stations : poses, IK, root motion, clips de combat et interactions.',features:'Marche · course · saut · attaque · squelette · IK · root motion',mode:'3d'},
 {id:'town',name:'Quartier du Canal',type:'Exploration et mission',description:'Parle à Mara, retrouve le fusible de l’atelier, rétablis le courant et rouvre le passage.',features:'Dialogue · inventaire · barrière · lumière · effets · victoire'},
 {id:'nature',name:'Première aube',type:'Survie et construction',description:'Prépare ton camp dans une clairière, récolte sur les sentiers et survis aux dangers de la lisière.',features:'Besoins · récolte · fabrication · placement libre · nuit · sauvegarde'},
 {id:'garage',name:'Piste d’essais',type:'Conduite et chronométrage',description:'Lance l’essai depuis les stands, prends le véhicule et franchis les quatre points dans l’ordre.',features:'Véhicule pilotable · freinage · collisions · checkpoints · temps'},
 {id:'platformer',name:'Courrier des toits',type:'Plateforme et physique · 2D',description:'Récupère trois colis sur les plateformes, passe les points de reprise et termine la tournée.',features:'Saut · gravité · caisses dynamiques · collecte · reprise après chute',mode:'2d'}
];
const demoOf=()=>state.entities.map(object=>({object,demo:object.adventure?.demo||object.survival?.demo||object.controller2d?.demo})).find(entry=>entry.demo);
export function initDemoBrowser(){
 const dialog=make('dialog','demo-browser');dialog.id='demoSceneBrowser';dialog.setAttribute('aria-labelledby','demoSceneBrowserTitle');
 const header=make('header',''),title=make('h2','','Scènes démo jouables');title.id='demoSceneBrowserTitle';const close=make('button','','Fermer');close.type='button';close.onclick=()=>dialog.close();header.append(title,close);
 const standalone=make('dialog','demo-game-frame');standalone.id='warlikeStandaloneGame';
 const standaloneHeader=make('header','');const standaloneTitle=make('h2','','Démo jouable');
 const standaloneClose=make('button','','Fermer le jeu');standaloneClose.type='button';
 const iframe=make('iframe','');iframe.title='WarLike · Démo jouable';iframe.loading='lazy';
 iframe.setAttribute('referrerpolicy','no-referrer');
 standaloneClose.onclick=()=>standalone.close();
 standaloneHeader.append(standaloneTitle,standaloneClose);
 standalone.append(standaloneHeader,iframe);document.body.append(standalone);
 standalone.addEventListener('close',()=>{iframe.removeAttribute('src');state.keys.clear();});
 standalone.addEventListener('keydown',event=>{if(event.key!=='Escape')event.stopPropagation();});
 const intro=make('p','','Scènes jouables et parcours de départ par genre. Le chargement remplace la scène actuelle ; Ctrl+Z permet de revenir en arrière.'),search=make('input','demo-browser-search'),grid=make('div','demo-browser-grid'),status=make('p','demo-browser-status');search.type='search';search.placeholder='Rechercher un jeu ou une scène';search.setAttribute('aria-label','Rechercher une scène');status.setAttribute('role','status');dialog.append(header,intro,search,grid,status);document.body.append(dialog);
 dialog.addEventListener('keydown',event=>event.stopPropagation());dialog.addEventListener('close',()=>state.keys.clear());
 const render=()=>{grid.replaceChildren();const query=search.value.trim().toLocaleLowerCase('fr'),available=[...scenes.filter(scene=>!scene.mode||scene.mode===workspace.mode),...starterDemosForMode(workspace.mode)],filtered=available.filter(scene=>(scene.name+' '+scene.type+' '+scene.description).toLocaleLowerCase('fr').includes(query));status.textContent='Projet '+workspace.mode.toUpperCase()+' · '+filtered.length+' / '+available.length+' scènes · Les jeux autonomes se lancent ici, sans conversion en scène native.';for(const scene of filtered){
  const card=make('article','demo-browser-card');card.dataset.demoScene=scene.id;card.append(make('small','',scene.type),make('h3','',scene.name),make('p','',scene.description),make('p','demo-browser-features',scene.features));const load=make('button','',scene.externalUrl?'Jouer dans Engine':'Charger cette scène');load.type='button';load.disabled=state.playing;
  load.onclick=()=>{if(scene.externalUrl){
    iframe.src=new URL(scene.externalUrl,document.baseURI).href;
    standaloneTitle.textContent=scene.name;
    if(!standalone.open)standalone.showModal();
    dialog.close();return;
   }
   if(state.playing)return;if(!confirm('Charger « '+scene.name+' » à la place de la scène actuelle ? Ctrl+Z permet de revenir en arrière.'))return;try{if(!loadAuthoredDemo(scene.id))return;if(workspace.mode==='3d'){const actor=state.entities.find(object=>object.id===state.selected[0]);Object.assign(view3d,{target:[(actor.x+actor.w/2)/64,1,(actor.y+(actor.depth3d||actor.h)/2)/64],radius:18,yaw:-.65,pitch:.65})}dialog.close();document.getElementById('sceneTab')?.click()}catch(error){status.textContent=error.message}};card.append(load);grid.append(card);
 }};
 search.addEventListener('input',render);
 document.addEventListener('warlike:demo-browser-open',()=>{if(state.playing)return;state.keys.clear();render();if(!dialog.open)dialog.showModal()});
 const menu=[...document.querySelectorAll('#studioMenus>details')].find(details=>details.querySelector('summary')?.textContent.trim()==='Game')?.querySelector('.studio-dropdown');if(menu){const open=make('button','','Scènes démo jouables…');open.type='button';open.id='openDemoScenes';open.onclick=()=>{open.closest('details').open=false;document.dispatchEvent(new Event('warlike:demo-browser-open'))};menu.prepend(open)}
 const brief=make('details','demo-scene-brief'),summary=make('summary',''),body=make('div','demo-scene-brief-body');brief.hidden=true;brief.append(summary,body);document.getElementById('viewport')?.append(brief);let signature='';
 const update=()=>{const entry=demoOf();brief.hidden=state.playing||!entry||dialog.open;if(!entry)return;const key=workspace.mode+':'+entry.demo.id+':'+entry.object.id;if(key===signature)return;signature=key;summary.textContent='Scène démo · '+entry.demo.title;body.replaceChildren(make('p','',entry.demo.description),make('small','',entry.demo.features.join(' · ')));const actions=make('div','demo-brief-actions'),play=make('button','','Tester la scène');play.type='button';play.onclick=()=>document.getElementById('play').click();const inspect=make('button','','Voir un comportement');inspect.type='button';inspect.onclick=()=>{const owner=state.entities.find(object=>object.adventureInteractable&&object.sequence)||entry.object;state.selected=[owner.id];notify();document.dispatchEvent(new CustomEvent('warlike:open-behavior',{detail:{ownerId:owner.id,sequenceKey:owner.id}}))};actions.append(play,inspect);body.append(actions)};
 document.addEventListener('warlike:change',update);document.addEventListener('warlike:workspace',update);dialog.addEventListener('close',update);update();
}
