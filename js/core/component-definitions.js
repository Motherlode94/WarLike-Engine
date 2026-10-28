import {defaultCollider2d,defaultRigidbody2d,defaultController2d} from './physics-2d.js';
import {defaultCameraRig} from './play-camera.js';
import {defaultStats,defaultInventory,defaultAi,defaultController} from './gameplay-components.js';
import {defaultRigidbody3d} from './physics-3d.js';
import {newSequence} from './logic-sequences.js';
// The component browser adds the same data that the existing Web runtime reads.
export const webComponentDefinitions=[
 {id:'collider2d',name:'Box Collider 2D',category:'Physique',description:'Collision solide ou trigger, dimensions et décalage.',modes:['2d'],create:defaultCollider2d},
 {id:'rigidbody2d',name:'Rigidbody 2D',category:'Physique',description:'Gravité, vitesse, rebond et friction.',modes:['2d'],create:defaultRigidbody2d},
 {id:'controller2d',name:'Contrôleur de personnage 2D',category:'Personnage',description:'Vue du dessus ou plateforme avec gravité et saut.',modes:['2d'],create:defaultController2d},
 {id:'cameraRig',name:'Caméra de jeu',category:'Caméra',description:'Suivi fluide, distance, sensibilité et évitement des obstacles.',create:defaultCameraRig},
 {id:'stats',name:'Stats · Santé et endurance',category:'Personnage',description:'Santé, endurance et régénération.',create:defaultStats},
 {id:'inventory',name:'Inventaire',category:'Personnage',description:'Objets, capacité et équipement.',create:defaultInventory},
 {id:'ai',name:'IA · Perception et navigation',category:'Intelligence artificielle',description:'Vision, mémoire, patrouille, poursuite et combat.',create:defaultAi},
 {id:'controller3d',name:'Contrôleur de personnage 3D',category:'Personnage',description:'Marche, sprint, saut et gravité.',modes:['3d'],create:defaultController},
 {id:'rigidbody3d',name:'Rigidbody 3D',category:'Physique',description:'Masse, gravité, friction et rebond.',modes:['3d'],create:defaultRigidbody3d},
 {id:'sequence',name:'Déclencheur · Blueprint',category:'Comportements',description:'Événement → conditions → instructions. Ouvrir le graphe dans Blueprint.',multiple:true,create:newSequence},
 {id:'horrorAiConfig',name:'IA · Survival Horror',category:'Intelligence artificielle',description:'Vision, audition, poursuite et recherche.',create:()=>({enabled:true,visionRange:230,hearingRange:220,chaseSpeed:75,searchSpeed:33,memorySeconds:5})},
 {id:'horrorHideConfig',name:'Cachette',category:'Interactions',description:'Cachette utilisable par le joueur.',create:()=>({enabled:true,radius:90})},
 {id:'horrorFearConfig',name:'Zone de peur',category:'Interactions',description:'Zone de peur avec rayon et intensité.',create:()=>({enabled:true,radius:170,strength:12})},
 {id:'worldPoliceConfig',name:'Police · Recherche',category:'Intelligence artificielle',description:'Patrouille et poursuite selon le niveau de recherche.',create:()=>({enabled:true,range:450,speed:75})},
 {id:'worldInfectedConfig',name:'Infecté · Horde',category:'Intelligence artificielle',description:'Poursuite du joueur à proximité.',create:()=>({enabled:true,range:300,speed:53})}
];
export const componentChoices=mode=>webComponentDefinitions.filter(d=>!d.modes||d.modes.includes(mode));
export function hasObjectComponent(object,id){return id==='sequence'?!!object.sequence:object[id]!=null}
export function addObjectComponent(object,id,mode){
 const definition=componentChoices(mode).find(d=>d.id===id);if(!definition)return false;
 if(id==='sequence'&&object.sequence){object.sequences??=[];if(object.sequences.length>=32)return false;object.sequences.push(definition.create());return true}
 if(hasObjectComponent(object,id))return false;
 object[id]=definition.create();if(id==='rigidbody2d')object.collider2d??=defaultCollider2d();return true;
}
export function resetObjectComponent(object,id){const definition=webComponentDefinitions.find(d=>d.id===id);if(!definition||!hasObjectComponent(object,id))return false;object[id]=definition.create();return true}
export function removeObjectComponent(object,id){if(!webComponentDefinitions.some(d=>d.id===id)||!hasObjectComponent(object,id))return false;delete object[id];if(id==='collider2d')object.collision3d=false;return true}
export const webDataComponentKinds=new Set(['Weapon','Damageable','Health','Team','Respawn','DeathmatchRules']);
export function inspectorComponentRank(title){
 if(title==='Transform')return 0;
 if(/Renderer|Material|Sprite/.test(title))return 10;
 if(/Animator/.test(title))return 15;
 if(/Collider|Rigidbody|Collision/.test(title))return 20;
 if(/Stats|Health|Inventaire|Controller|Contrôleur/.test(title))return 30;
 if(/Enemy Intelligence|^IA|AI|Horror|Monde ouvert/.test(title))return 40;
 if(/Logic|Déclencheur|Blueprint/.test(title))return 50;
 if(/Lighting|Audio/.test(title))return 60;
 return 70;
}
