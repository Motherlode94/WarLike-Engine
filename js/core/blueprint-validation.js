import {sequenceEntries,sequenceEvents,sequenceInstructions} from './logic-sequences.js';
import {inspectGraph,compileGraph} from './blueprint-graph.js';
import {getAsset} from '../assets/catalog.js';
import {gameProject,validEntities,safeKey} from './game-project.js';
export function inspectBlueprintGame(entities,{project=gameProject,requirePlayer=true}={}){
 const issues=[],add=(severity,message,entityId=null)=>issues.push({severity,message,entityId});
 if(!validEntities(entities))return [{severity:'error',message:'Scène invalide : vérifie les identifiants et les dimensions.'}];
 const names=new Set();for(const v of project.variables||[]){if(!safeKey(v.name)||names.has(v.name))add('error','Nom de variable globale invalide ou dupliqué : '+String(v.name));names.add(v.name)}
 const ids=new Set(entities.map(o=>o.id)),knownScenes=new Set([project.activeSceneId,...project.scenes.map(s=>s.id)]);
 if(!knownScenes.has(project.startupSceneId))add('error','La scène de démarrage est absente.');
 if(requirePlayer&&!entities.some(o=>o.type==='player'||o.type==='character'||o.playable3d||o.type==='prefab'&&getAsset(o.assetId)?.category==='Characters'))add('error','Ajoute un personnage jouable.');
 let hasWin=false;
 const scan=(steps,owner,depth=0)=>{
  if(depth>8){add('error','Trop de branches imbriquées.',owner.id);return}
  if(!Array.isArray(steps))return;
  for(const a of steps.slice(0,1024)){
   if(!a||a.disabled)continue;
   if(!sequenceInstructions.includes(a.type))add('error','Instruction inconnue : '+String(a.type),owner.id);
   if(a.type==='winGame')hasWin=true;
   if(a.targetId>0&&!ids.has(Number(a.targetId)))add('error','Objet cible absent : '+a.targetId,owner.id);
   if(a.key&&!safeKey(a.key))add('error','Nom de variable réservé ou invalide.',owner.id);
   if(a.type==='loadScene'&&!knownScenes.has(String(a.value||a.key)))add('error','Scène de destination absente : '+String(a.value||a.key),owner.id);
   if(a.type==='spawnObject'&&!ids.has(Number(a.value)))add('error','Modèle d’instance absent : '+a.value,owner.id);
   if(a.type==='branch'){scan(a.thenInstructions,owner,depth+1);scan(a.elseInstructions,owner,depth+1)}
  }
 };
 for(const o of entities)for(const {sequence:s} of sequenceEntries(o)){
  if(s.enabled===false)continue;
  if(!sequenceEvents.includes(s.event))add('error','Déclencheur inconnu : '+String(s.event),o.id);
  if(s.graph){const errors=inspectGraph(s.graph);for(const message of errors)add('error',message,o.id);if(!errors.length){try{scan(compileGraph(s.graph).instructions,o)}catch(error){add('error',error.message,o.id)}}}
  else{scan(s.instructions,o);scan(s.elseInstructions,o);for(const b of s.branches||[])scan(b.instructions,o)}
 }
 if(!hasWin)add('warning','Aucune instruction de victoire : ajoute une fin si ton jeu en a besoin.');
 return issues;
}
