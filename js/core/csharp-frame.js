// Apply snapshots from the explicitly connected local .NET process.
export function applyCsharpFrame(entities,actors){
 if(!Array.isArray(actors))throw Error('Réponse C# invalide.');
 const byId=new Map(entities.map(o=>[o.id,o]));let applied=0;
 for(const a of actors){const target=byId.get(a.id);if(!target||![a.x,a.y,a.elevation3d,a.rotation].every(Number.isFinite))continue;
  Object.assign(target,{x:a.x,y:a.y,elevation3d:a.elevation3d,rotation:a.rotation});
  if(Number.isFinite(a.hp)){target.hp=a.hp;if(target.stats)target.stats.health=a.hp}applied++;
 }return applied;
}
