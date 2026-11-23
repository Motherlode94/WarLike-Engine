import {newId,templates} from '../../script-editor/core.js';
import {defaultCollider3d,defaultJoint3d} from './collider-3d.js';
import {defaultSurvival,defaultSurvivalNode,defaultSurvivalWorld} from './survival-runtime.js';
import {survivalBuildTemplates} from './survival-scene.js';
import {defaultAnimatorGraph} from './animator-graph.js';
import {defaultSuperhero} from './superhero-runtime.js';
import {defaultRpgProgression} from './rpg-progression.js';
import {defaultFxEmitter} from './fx-runtime.js';
import {defaultSimulationNode} from './simulation-nodes.js';
import {defaultTacticalUnit} from './rts-orders.js';
import {defaultCollider2d,defaultRigidbody2d,defaultController2d} from './physics-2d.js';
import {defaultJoint2d,defaultEffector2d} from './physics-tools-2d.js';
import {defaultCameraRig} from './play-camera.js';
import {defaultSpriteAnimation2d} from './sprite-animation-2d.js';
import {defaultTilemap2d} from './tilemap-2d.js';
import {defaultSceneCamera2d} from './scene-camera-2d.js';
import {defaultSceneCamera} from './scene-camera-3d.js';
import {defaultUiCanvas,defaultUiRect,defaultUiElement} from './ui-canvas-layout.js';
import {defaultStats,defaultInventory,defaultAi,defaultController} from './gameplay-components.js';
import {defaultRigidbody3d} from './physics-3d.js';
import {defaultGrab3d} from './grab-physics-3d.js';
import {defaultEnvironmentProbe3d} from './environment-probes-3d.js';
import {newSequence} from './logic-sequences.js';
import {defaultInputActions} from './input-actions.js';
import {defaultAnimalController} from './animal-controller.js';
import {defaultNavigationAgent} from './navigation-agent.js';
import {defaultVehicleController} from './vehicle-controller.js';
import {defaultGroundVehiclePhysics} from './ground-vehicle-rapier.js';
import {defaultAirplanePhysics,defaultHelicopterPhysics} from './aircraft-flight-physics.js';
import {defaultAircraftSystems} from './aircraft-systems.js';
import {defaultAircraftLandingGear} from './aircraft-landing-gear.js';
import {registeredComponentChoices,registerComponentManifest} from './component-registry.js';
// The component browser adds the same data that the existing Web runtime reads.
export const webComponentDefinitions=[
 {id:'webScripts',name:'JavaScript / TypeScript',category:'Scripts',description:'Modules JS natifs ou TS compilés, exécutés dans Play et l’export Web.',create:()=>[{scriptId:newId(),name:'script.js',source:templates.javascript,language:'javascript',enabled:true,values:{}}]},
 {id:'warScripts',name:'WarScript · C# simplifié',category:'Scripts',description:'Comportement .wls exécuté dans Play Web et le jeu exporté.',create:()=>[{scriptId:newId(),name:'Rotation.wls',source:templates.warscript,enabled:true,values:{}}]},
 {id:'adventure',name:'Aventure · Journal et quête',category:'Aventure',description:'Journal, indices révélés et objets de quête communs à l’équipe.',create:()=>({combatEnabled:false,title:'Mon aventure',items:[],notes:[]})},
 {id:'adventureInteractable',name:'Aventure · Interaction ciblée',category:'Aventure',description:'Interaction E ciblée avec portée et contrôle des obstacles.',create:()=>({enabled:true,label:'Interagir',radius:150})},
 {id:'animatorGraph',name:'Animator · Graphe d’états',category:'Animation',description:'États, transitions, mélange 1D, couches et événements.',create:defaultAnimatorGraph},
 {id:'survival',name:'Survie · Besoins et fabrication',category:'Survie',description:'Satiété, hydratation, fatigue, froid et recettes sur inventaire.',create:()=>({...defaultSurvival(),buildTemplates:survivalBuildTemplates()})},
 {id:'survivalNode',name:'Survie · Ressource ou campement',category:'Survie',description:'Récolte limitée, régénération, feu ou abri partagé.',create:defaultSurvivalNode},
 {id:'survivalWorld',name:'Survie · Cycle jour / nuit',category:'Survie',description:'Heure, vitesse du temps et jours persistants.',create:defaultSurvivalWorld},
 {id:'superhero',name:'Super-héros · Pouvoirs',category:'Hero Forge',description:'Énergie, trait, onde de choc, ruée, bouclier, vol et ralliement.',create:defaultSuperhero},
 {id:'rpgProgression',name:'Progression RPG',category:'RPG',description:'Expérience, niveaux et compétences combat, défense et commandement.',create:defaultRpgProgression},
 {id:'fxEmitter',name:'Émetteur FX',category:'Effets visuels',description:'Énergie, feu, électricité, fumée, soin et portail en 2D/3D.',create:defaultFxEmitter},
 {id:'simulationNode',name:'Simulation · Réseau et monde',category:'Simulation',description:'Destruction, matériaux, réparation, réseau énergétique et civils.',create:defaultSimulationNode},
 {id:'tacticalUnit',name:'Unité tactique RTS',category:'RTS',description:'Déplacement A*, suivi, défense et attaque d’escouade.',create:defaultTacticalUnit},
 {id:'tilemap2d',name:'Tilemap 2D',category:'Rendering',description:'Grille de tuiles native avec pinceau, dimensions et collisions par cellule.',modes:['2d'],create:defaultTilemap2d},
 {id:'spriteAnimation2d',name:'Sprite Animation 2D',category:'Animation',description:'Animation d’une Sprite Sheet horizontale PNG, configurable dans Inspector.',modes:['2d'],create:defaultSpriteAnimation2d},
 {id:'spriteRenderer2d',name:'Sprite Renderer 2D',category:'Rendering',description:'Ordre de dessin et opacité du sprite/rectangle de l’objet 2D.',modes:['2d'],create:()=>({enabled:true,sortingOrder:0,opacity:1})},
 {id:'collider2d',name:'Collider 2D',category:'Physique',description:'Rectangle, cercle ou capsule ; collision solide ou trigger, dimensions et décalage.',modes:['2d'],create:defaultCollider2d},
 {id:'rigidbody2d',name:'Rigidbody 2D',category:'Physique',description:'Gravité, vitesse, rebond et friction.',modes:['2d'],create:defaultRigidbody2d},
 {id:'joint2d',name:'Articulation 2D',category:'Physique',description:'Distance fixe ou ressort vers une ancre ou un objet cible.',modes:['2d'],create:defaultJoint2d},
 {id:'effector2d',name:'Zone de forces 2D',category:'Physique',description:'Force directionnelle et amortissement dans un volume Trigger.',modes:['2d'],create:defaultEffector2d},
 {id:'controller2d',name:'Contrôleur de personnage 2D',category:'Personnage',description:'Vue du dessus ou plateforme avec gravité et saut.',modes:['2d'],create:defaultController2d},
 {id:'uiCanvas',name:'UI Canvas · Overlay',category:'Interface du jeu',description:'Racine de l’interface de jeu, échelle responsive. Phase initiale : structure éditable ; rendu de jeu non encore relié.',create:defaultUiCanvas},
 {id:'uiRect',name:'UI RectTransform',category:'Interface du jeu',description:'Ancres, pivot, taille et position d’un objet UI rattaché au Canvas.',create:defaultUiRect},
 {id:'uiElement',name:'UI Element · Panel / Text / Button',category:'Interface du jeu',description:'Données du contrôle UI ; boutons et événements ne sont pas encore activés en Play.',create:defaultUiElement},
 {id:'sceneCamera3d',name:'Camera · Scene (Main Camera)',category:'Caméra',description:'Caméra native de scène, priorités, projection perspective et modes fixe/suivi. Active en Game/Play et export.',modes:['3d'],create:defaultSceneCamera},
 {id:'camera2d',name:'Camera 2D · Scène',category:'Caméra',description:'Caméra native orthographique pour scène 2D : suivi joueur, zoom, décalage et pixel perfect.',modes:['2d'],create:defaultSceneCamera2d},
 {id:'cameraRig',name:'Caméra de jeu',category:'Caméra',description:'Suivi fluide, distance, sensibilité et évitement des obstacles.',create:defaultCameraRig},
 {id:'inputActions',name:'Input Actions · Commandes',category:'Input',description:'Touches modulaires par joueur ou véhicule, profils enregistrés et exportables.',create:defaultInputActions},
 {id:'vehicleController',name:'Vehicle Controller · Arcade 2D/3D',category:'Véhicule',description:'Pilotage modulaire indépendant du Prefab : accélération, freinage, direction, vitesse et collisions.',create:defaultVehicleController},
 {id:'groundVehiclePhysics',name:'Ground Vehicle Physics · Rapier 3D',category:'Véhicule',modes:['3d'],description:'Voiture, camion ou blindé : suspensions et traction Rapier. Ajoute Rigidbody3D dynamique et Collider3D, active le backend Rapier.',create:()=>defaultGroundVehiclePhysics('car')},

 {id:'aircraftPhysics',name:'Aircraft Physics · Avion / Hélicoptère',category:'Véhicule',modes:['3d'],description:'Avion ou hélicoptère : poussée, portance, rotor et rotation via Rapier. Contrôles transmis par aircraftInput.',create:()=>({...defaultAirplanePhysics(),enabled:true})},
 {id:'aircraftLandingGear',name:'Aircraft Landing Gear · Suspension Rapier',category:'Véhicule',modes:['3d'],description:'Roues, contacts au sol, amortisseurs et freinage sur piste avec Rapier. Repli contrôlé par Aircraft Systems.',create:()=>defaultAircraftLandingGear('airplane')},
 {id:'aircraftSystems',name:'Aircraft Systems · Train, volets, aérofreins et rotors',category:'Véhicule',modes:['3d'],description:'États aérodynamiques du train, des volets et aérofreins, angles de rotation des hélices/rotors; requiert Aircraft Physics.',create:defaultAircraftSystems}, {id:'navigationAgent',name:'Navigation Agent · Points de passage',category:'Navigation',description:'Déplacement 2D/3D sur points/cible via collisions. Navigation locale sans NavMesh.',create:defaultNavigationAgent},
 {id:'animalController',name:'Animal Controller · Comportement',category:'Personnage',description:'Locomotion de faune 2D/3D : errance et fuite, avec collisions et paramètres Animator. À utiliser sans IA combat active.',create:defaultAnimalController},
 {id:'stats',name:'Stats · Santé et endurance',category:'Personnage',description:'Santé, endurance et régénération.',create:defaultStats},
 {id:'inventory',name:'Inventaire',category:'Personnage',description:'Objets, capacité et équipement.',create:defaultInventory},
 {id:'ai',name:'IA · Perception et navigation',category:'Intelligence artificielle',description:'Vision, mémoire, patrouille, poursuite et combat.',create:defaultAi},
 {id:'controller3d',name:'Contrôleur de personnage 3D',category:'Personnage',description:'Marche, sprint, saut et gravité.',modes:['3d'],create:defaultController},
 {id:'collider3d',name:'Collider 3D',category:'Physique',description:'Boîte orientée, capsule ou sphère, dimensions et décalage en mètres.',modes:['3d'],create:defaultCollider3d},
 {id:'joint3d',name:'Articulation 3D',category:'Physique',description:'Charnière, rotule ou liaison fixe entre deux corps Rapier.',modes:['3d'],create:defaultJoint3d},
 {id:'rigidbody3d',name:'Rigidbody 3D',category:'Physique',description:'Masse, gravité, friction et rebond.',modes:['3d'],create:defaultRigidbody3d},
 {id:'environmentProbe3d',name:'Zone de réflexion HDR 3D',category:'Rendu',description:'Zone locale de teinte et intensité du HDRI global (pas encore une capture de cubemap locale).',modes:['3d'],create:defaultEnvironmentProbe3d},
 {id:'grab3d',name:'Objet saisissable 3D',category:'Interactions',description:'G saisir/déposer, T lancer. Nécessite Rigidbody3D et Collider3D ; portée, distance tenue et vitesse du lancer.',modes:['3d'],create:defaultGrab3d},
 {id:'sequence',name:'Déclencheur · Blueprint',category:'Comportements',description:'Événement → conditions → instructions. Ouvrir le graphe dans Blueprint.',multiple:true,create:newSequence},
 {id:'horrorAiConfig',name:'IA · Survival Horror',category:'Intelligence artificielle',description:'Vision, audition, poursuite et recherche.',create:()=>({enabled:true,visionRange:230,hearingRange:220,chaseSpeed:75,searchSpeed:33,memorySeconds:5})},
 {id:'horrorHideConfig',name:'Cachette',category:'Interactions',description:'Cachette utilisable par le joueur.',create:()=>({enabled:true,radius:90})},
 {id:'horrorFearConfig',name:'Zone de peur',category:'Interactions',description:'Zone de peur avec rayon et intensité.',create:()=>({enabled:true,radius:170,strength:12})},
 {id:'worldPoliceConfig',name:'Police · Recherche',category:'Intelligence artificielle',description:'Patrouille et poursuite selon le niveau de recherche.',create:()=>({enabled:true,range:450,speed:75})},
 {id:'worldInfectedConfig',name:'Infecté · Horde',category:'Intelligence artificielle',description:'Poursuite du joueur à proximité.',create:()=>({enabled:true,range:300,speed:53})}
];
// Extension registration rejects built-in IDs and preserves existing scene fields unchanged.
export const registerWarLikeComponent=spec=>registerComponentManifest(spec,{builtinIds:webComponentDefinitions.map(d=>d.id)});
// Stable Inspector metadata: classification never depends on translated display names.
export const inspectorCoreComponentIds=new Set(['collider2d','rigidbody2d','joint2d','effector2d','collider3d','rigidbody3d','joint3d','cameraRig']);
export function inspectorComponentGroup(id){return inspectorCoreComponentIds.has(id)?(id==='cameraRig'?'render':'physics'):'extension'}
export const componentDependencies=Object.freeze({
 // Rigidbody 2D may legitimately run without a Collider 2D.
 collider2d:['joint2d','effector2d'],
 rigidbody2d:['joint2d'],
 collider3d:['rigidbody3d','joint3d','controller3d','groundVehiclePhysics','aircraftPhysics'],
 aircraftPhysics:['aircraftSystems','aircraftLandingGear'],
 rigidbody3d:['joint3d','groundVehiclePhysics','aircraftPhysics']
});
export function componentRemovalBlockers(object,id){
 return (componentDependencies[id]||[]).filter(dependent=>object?.[dependent]!=null);
}
export const componentChoices=mode=>[...webComponentDefinitions.filter(d=>!d.modes||d.modes.includes(mode)),...registeredComponentChoices(mode).filter(d=>!webComponentDefinitions.some(core=>core.id===d.id))];
export function hasObjectComponent(object,id){return id==='sequence'?!!object.sequence:object[id]!=null}
export function addObjectComponent(object,id,mode){
 const definition=componentChoices(mode).find(d=>d.id===id);if(!definition)return false;
 if(id==='sequence'&&object.sequence){object.sequences??=[];if(object.sequences.length>=32)return false;object.sequences.push(definition.create());return true}
 if(hasObjectComponent(object,id))return false;
 object[id]=definition.create();if(id==='collider2d')object.collision2d=true;if(id==='superhero'){object.rpgProgression??=defaultRpgProgression();object.animatorGraph??=defaultAnimatorGraph();object.stats??=defaultStats()}if(id==='survival'){object.stats??=defaultStats();object.inventory??={capacity:24,items:[],equipment:{weapon:null,armor:null}}}if(id==='controller3d'){object.collider3d??={...defaultCollider3d(),shape:'capsule'};object.collision3d=true;}if(['rigidbody3d','joint3d'].includes(id)){object.collider3d??=defaultCollider3d();object.collision3d=true;if(id==='joint3d')object.rigidbody3d??={...defaultRigidbody3d(),lockRotations:false}}if(id==='aircraftLandingGear'){
  object.aircraftPhysics??={...defaultAirplanePhysics(),enabled:true};
  object.aircraftSystems??=defaultAircraftSystems();
  object.collider3d??=defaultCollider3d();object.collider3d.enabled=true;object.collision3d=true;
  object.rigidbody3d??=defaultRigidbody3d();object.rigidbody3d.enabled=true;
  object.rigidbody3d.kinematic=false;object.rigidbody3d.lockRotations=false;
  object.rigidbody3d.mass=object.aircraftPhysics.mass;
  object.aircraftLandingGear.kind=object.aircraftPhysics.kind;
 }
 if(id==='aircraftSystems'){
  object.aircraftPhysics??={...defaultAirplanePhysics(),enabled:true};
  object.collider3d??=defaultCollider3d();object.collider3d.enabled=true;object.collision3d=true;
  object.rigidbody3d??=defaultRigidbody3d();object.rigidbody3d.enabled=true;
  object.rigidbody3d.kinematic=false;object.rigidbody3d.lockRotations=false;
  object.rigidbody3d.mass=object.aircraftPhysics.mass;
 }
 if(id==='aircraftPhysics'){
  object.collider3d??=defaultCollider3d();object.collision3d=true;
  object.rigidbody3d??=defaultRigidbody3d();object.rigidbody3d.enabled=true;
  object.rigidbody3d.kinematic=false;object.rigidbody3d.lockRotations=false;
  object.rigidbody3d.mass=object.aircraftPhysics.mass;
 }
 if(id==='groundVehiclePhysics'){
  object.collider3d??=defaultCollider3d();object.collision3d=true;
  object.rigidbody3d??=defaultRigidbody3d();
  object.rigidbody3d.enabled=true;object.rigidbody3d.kinematic=false;object.rigidbody3d.lockRotations=false;
  object.rigidbody3d.mass=object.groundVehiclePhysics.mass;
  object.vehicleController??=defaultVehicleController();
 }
 if(id==='collider3d')object.collision3d=true;if(['rigidbody2d','joint2d'].includes(id)){object.collider2d??=defaultCollider2d();object.collision2d=true;}if(id==='joint2d')object.rigidbody2d??=defaultRigidbody2d();if(id==='effector2d'){object.collider2d??={...defaultCollider2d(),isTrigger:true};object.collision2d=true;}return true;
}
export function resetObjectComponent(object,id){const definition=[...webComponentDefinitions,...registeredComponentChoices('2d'),...registeredComponentChoices('3d')].find(d=>d.id===id);if(!definition||!hasObjectComponent(object,id))return false;object[id]=definition.create();return true}
export function removeObjectComponent(object,id){if(![...webComponentDefinitions,...registeredComponentChoices('2d'),...registeredComponentChoices('3d')].some(d=>d.id===id)||!hasObjectComponent(object,id)||componentRemovalBlockers(object,id).length)return false;delete object[id];if(id==='collider2d')object.collision2d=false;if(id==='collider3d')object.collision3d=false;if(id==='superhero')delete object.heroState;if(id==='survival')delete object.survivalState;return true}
export {webComponentKinds as webDataComponentKinds} from './runtime-capabilities.js';
export function inspectorComponentRank(title){
 if(title==='Transform')return 0;
 if(/Renderer|Material|Sprite/.test(title))return 10;
 if(/Animator/.test(title))return 15;
 if(/Collider|Rigidbody|Collision|Articulation/.test(title))return 20;
 if(/Super-héros|Progression RPG/.test(title))return 25;
 if(/Stats|Health|Inventaire|Controller|Contrôleur/.test(title))return 30;
 if(/Enemy Intelligence|^IA|AI|Horror|Monde ouvert/.test(title))return 40;
 if(/Logic|Déclencheur|Blueprint/.test(title))return 50;
 if(/Lighting|Audio/.test(title))return 60;
 return 70;
}

/**
 * Declarative editor fields, shared by native/script/custom component adapters.
 * Schema describes allowed types, not arbitrary executable render callbacks.
 */
export function validateEditorProperty(meta,value){
 if(!meta||typeof meta!=='object')throw Error('Métadonnées de propriété absentes');
 switch(meta.type){
  case 'number':{
   const n=typeof value==='number'?value:Number(value);
   if(!Number.isFinite(n))throw Error('Nombre fini requis');
   if(Number.isFinite(meta.min)&&n<meta.min||Number.isFinite(meta.max)&&n>meta.max)throw Error('Valeur hors limites');
   return n;
  }
  case 'boolean':return Boolean(value);
  case 'string':{
   const s=String(value);if(s.length>4096)throw Error('Chaîne trop longue');
   return s;
  }
  case 'color':{
   if(!/^#[a-f\d]{6}$/i.test(String(value)))throw Error('Couleur hexadécimale requise');
   return value.toLowerCase();
  }
  case 'vector3':{
   const o=value;
   if(!o||!['x','y','z'].every(k=>Number.isFinite(Number(o[k]))))throw Error('Vector3 invalide');
   return {x:Number(o.x),y:Number(o.y),z:Number(o.z)};
  }
  case 'enum':{
   if(!Array.isArray(meta.options)||!meta.options.includes(value))throw Error('Choix invalide');
   return value;
  }
  default:throw Error('Type de propriété non pris en charge : '+meta.type);
 }
}
