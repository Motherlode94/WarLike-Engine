// Editor-facing hierarchy operations on legacy entities. Canonical relationship:
// parentId only; children are derived. Does not mutate incoming collections.
export function hierarchyIndex(entities){
 const byId=new Map(entities.map(o=>[o.id,o])),children=new Map([[null,[]]]);
 for(const item of entities){
  const parent=byId.has(item.parentId)&&item.parentId!==item.id?item.parentId:null;
  if(!children.has(parent))children.set(parent,[]);
  children.get(parent).push(item);
 }
 return {byId,children};
}
export function descendants(entities,id){
 const {children,byId}=hierarchyIndex(entities);
 if(!byId.has(id))return new Set();
 const seen=new Set(),stack=[id];
 while(stack.length){
  const next=stack.pop();
  if(seen.has(next))continue;
  seen.add(next);
  for(const item of children.get(next)||[])stack.push(item.id);
 }
 return seen;
}
export function validateReparent(entities,id,parentId){
 const {byId}=hierarchyIndex(entities);
 if(!byId.has(id))throw Error('GameObject introuvable');
 if(parentId===id)throw Error('Un objet ne peut pas être son propre parent');
 if(parentId!==null&&!byId.has(parentId))throw Error('Parent inexistant');
 if(parentId!==null&&descendants(entities,id).has(parentId))throw Error('Parentage cyclique interdit');
 return true;
}
export function reparentEntities(entities,id,parentId){
 validateReparent(entities,id,parentId);
 return entities.map(o=>o.id===id?{...o,parentId}:o);
}
export function deleteEntitySubtrees(entities,ids){
 const removed=new Set();
 for(const id of ids)for(const child of descendants(entities,id))removed.add(child);
 return {entities:entities.filter(o=>!removed.has(o.id)),removed};
}
export function duplicateEntitySubtrees(entities,ids,nextId,{offset=24}={}){
 const byId=new Map(entities.map(o=>[o.id,o]));
 const roots=ids.filter(id=>byId.has(id)&&!ids.some(parent=>parent!==id&&descendants(entities,parent).has(id)));
 const all=new Set();for(const id of roots)for(const child of descendants(entities,id))all.add(child);
 const idMap=new Map();let serial=nextId;
 for(const o of entities)if(all.has(o.id))idMap.set(o.id,serial++);
 const copies=entities.filter(o=>all.has(o.id)).map(o=>{
  const clone=structuredClone(o);
  clone.id=idMap.get(o.id);
  clone.name=o.name+' Copy';
  clone.parentId=idMap.get(o.parentId)??(o.parentId??null);
  if(roots.includes(o.id)){if(Number.isFinite(clone.x))clone.x+=offset;if(Number.isFinite(clone.y))clone.y+=offset;}
  return clone;
 });
 return {entities:[...entities,...copies],selected:roots.map(id=>idMap.get(id)),nextId:serial};
}
