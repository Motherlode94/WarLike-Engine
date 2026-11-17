// Single source of truth for imported GLB bounds in the 3D editor.
// Inspector Dimensions are physical metres; renderer and mesh picking must use
// the same per-axis dimensions. Never collapse them into a uniform min-scale.
export function glbVisualScale3d(box,normalizedSize=[1,1,1]){
 if(!box||![box.w,box.h,box.d].every(v=>Number.isFinite(v)&&v>0))throw Error('Dimensions 3D invalides');
 const size=normalizedSize.map(value=>Number(value));
 if(size.length!==3||size.some(v=>!Number.isFinite(v)||v<=0))throw Error('Dimensions GLB invalides');
 return [box.w/size[0],box.h/size[1],box.d/size[2]];
}
export function glbVisualPlacement3d(box,elevation=0,normalizedSize=[1,1,1]){
 const scale=glbVisualScale3d(box,normalizedSize);
 if(!Number.isFinite(elevation))throw Error('Altitude invalide');
 return {position:[box.x,elevation+box.h/2,box.z],scale};
}
