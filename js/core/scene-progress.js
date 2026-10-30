// Personal progress travels with the party; level objects belong to their scene.
// Authoring data (controllers, quests, sequences and appearance) comes from the
// destination's player template, so a chapter can introduce new behaviours.
const personalFields=['lifeState','inventory','stats','hp','rpgProgression','heroState','survivalState','survivalCompanions','coopSeat','coopName','_netPeerId','_netRemote'];
export const scenePlayer=entities=>entities.find(o=>!o._netRemote&&(o.playable3d===true||o.controller2d||o.type==='player'||o.adventure))||null;
export function savedSceneEntities(entities){
 return entities.map(entity=>{const copy=structuredClone(entity);for(const key of ['_netKeys','_netFrom','_netTo','_netAt','_animatorFrame','_support3d'])delete copy[key];return copy});
}
function transferPersonal(copy,actor){
 for(const key of personalFields){delete copy[key];if(Object.hasOwn(actor,key))copy[key]=structuredClone(actor[key])}
 return copy;
}
export function sceneCompanion(template,actor){
 const copy=transferPersonal(structuredClone(template),actor);copy.name=actor.name;copy.playable3d=false;
 delete copy.sequence;delete copy.sequences;delete copy.survivalCompanions;return copy;
}
export function carrySceneParty(destination,source,{entryX,entryY}={}){
 const template=scenePlayer(destination),host=scenePlayer(source);
 if(!template||!host)throw Error('Conserver le groupe demande un personnage jouable dans les deux scènes.');
 const party=[host,...source.filter(o=>o!==host&&o._netRemote)];
 if(destination.length+party.length-1>10000)throw Error('Limite de 10000 objets atteinte.');
 const result=destination.filter(o=>!o._netRemote),spawn={x:Number.isFinite(entryX)?entryX:template.x,y:Number.isFinite(entryY)?entryY:template.y};
 let next=Math.max(0,...result.map(o=>o.id))+1;
 party.forEach((actor,index)=>{
  const copy=index?sceneCompanion(template,actor):transferPersonal(template,actor);
  // A saved destination must not resurrect its previous party or inventory.
  Object.assign(copy,{x:spawn.x+index*65,y:spawn.y+index*45,elevation3d:0});
  if(index){copy.id=next++;result.push(copy)}
 });
 return result;
}
