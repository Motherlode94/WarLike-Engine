// Engine-native static diagnostics for bundled games. No fake playability claims:
// a scene is certified only after its gameplay controls and runtime are tested.
const safeId=id=>Number.isSafeInteger(id)&&id>=0;
export function inspectBundledGame(scene,mode,{genre=scene?.genre}={}){
 const issues=[];
 if(!Array.isArray(scene?.entities)||scene.entities.length===0)return [{severity:'error',code:'empty-scene',message:'La scène est vide.'}];
 const entities=scene.entities,ids=new Set(),allIds=new Set(entities.map(o=>o.id));
 for(const o of entities){
  if(!o||!safeId(o.id)||ids.has(o.id))issues.push({severity:'error',code:'id',message:'Identifiant GameObject absent ou dupliqué.'});
  else ids.add(o.id);
  if(o&&!['number'].every(t=>typeof o.x===t&&typeof o.y===t&&Number.isFinite(o.x)&&Number.isFinite(o.y)))
   issues.push({severity:'error',code:'position',message:'Position invalide : '+(o.name||o.id)});
 }
 const actors=entities.filter(o=>o&&(o.type==='player'||o.playable3d===true||o.controller2d));
 if(!actors.length)issues.push({severity:'error',code:'player',message:'Aucun personnage jouable.'});
 if(genre!=='sandbox'){
  const activePlayer=actors.find(o=>o.id===scene.playerId)||actors[0];
  if(!activePlayer)issues.push({severity:'error',code:'player',message:'Personnage principal manquant.'});
  if(!entities.some(o=>o.sequence?.enabled||o.sequences?.some(s=>s.enabled)))issues.push({severity:'error',code:'mission',message:'Aucun événement de gameplay natif.'});
  const cameraKey=mode==='3d'?'sceneCamera3d':'camera2d';
  const specialDirector=mode==='3d'&&['rts','company','battlefield'].includes(genre);
  if(!specialDirector&&!entities.some(o=>o[cameraKey]))issues.push({severity:'error',code:'camera',message:'Caméra native introuvable.'});
  const hasColliders=entities.some(o=>o.collider2d||o.collider3d||o.collision3d===true||o.solid2d===true);
  if(!hasColliders)issues.push({severity:'warning',code:'collision',message:'Aucun obstacle physique détecté.'});
 }
 for(const owner of entities){
  const steps=owner?.adventure?.demo?.steps||owner?.controller2d?.demo?.steps||[];
  for(const step of steps){
   for(const id of step.targetIds||[step.targetId]){
    if(id!==undefined&&!allIds.has(id))issues.push({severity:'error',code:'target',message:'Objectif '+step.goal+' : cible GameObject #'+id+' manquante.'});
   }
  }
  const scripts=[owner?.sequence,...(owner?.sequences||[])].filter(Boolean);
  for(const script of scripts){
   if(!script.event)issues.push({severity:'error',code:'event',message:'Séquence sans événement sur '+owner.name});
   for(const branch of script.branches||[])if(!Array.isArray(branch.instructions))issues.push({severity:'error',code:'branch',message:'Branche sans actions sur '+owner.name});
  }
 }
 return issues;
}
