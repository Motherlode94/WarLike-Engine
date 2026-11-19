// Reusable transform masks. A more specific subtree wins over its ancestors,
// independently of row order; missing/ambiguous bones fail closed.
export function inspectTransformMask(mask,rig=null){
 if(!mask||mask.schema!=='warlike.avatar-mask.v1'||!Number.isFinite(mask.defaultWeight)||mask.defaultWeight<0||mask.defaultWeight>1||!Array.isArray(mask.transforms)||mask.transforms.length>128)return ['Masque de transformations invalide.'];
 const errors=[],seen=new Set();for(const row of mask.transforms){
  if(!row||typeof row.bone!=='string'||!row.bone||row.bone.length>160||!Number.isFinite(row.weight)||row.weight<0||row.weight>1||row.recursive!=null&&typeof row.recursive!=='boolean'||seen.has(row.bone)){errors.push('Os ou poids de masque invalide ou dupliqué.');continue}seen.add(row.bone);
  if(rig&&rig.nodes.filter(n=>n.name===row.bone).length!==1)errors.push('Os du masque absent ou ambigu : '+row.bone);
 }return errors;
}
export function resolveTransformMask(mask,rig){
 const errors=inspectTransformMask(mask,rig);if(errors.length)throw Error(errors.join(' '));
 return rig.nodes.map((node,index)=>{let current=index;const seen=new Set();while(current>=0){if(seen.has(current)||!rig.nodes[current])throw Error('Squelette du masque invalide.');seen.add(current);const row=mask.transforms.find(r=>r.bone===rig.nodes[current].name&&(current===index||r.recursive!==false));if(row)return row.weight;current=rig.parents[current]}return mask.defaultWeight});
}
export const defaultTransformMask=()=>({schema:'warlike.avatar-mask.v1',defaultWeight:1,transforms:[]});
