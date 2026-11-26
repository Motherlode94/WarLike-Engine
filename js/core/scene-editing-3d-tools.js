import {dot3} from './math-kernel.js';
// Editor-only gizmo helpers. A visual guide grid is not a game-world collider.
export function projectedAxisDrag3d(origin,endpoint,dx,dy,axisLength=1){
 if(!origin||!endpoint||![origin.x,origin.y,endpoint.x,endpoint.y,dx,dy,axisLength].every(Number.isFinite))return 0;
 const sx=endpoint.x-origin.x,sy=endpoint.y-origin.y,length2=sx*sx+sy*sy;
 if(axisLength<=0||!Number.isFinite(length2)||length2<4)return 0; // Ignore foreshortened axes rather than making them jump.
 const metres=dot3([dx,dy,0],[sx,sy,0])/length2*axisLength;
 return Number.isFinite(metres)?Math.max(-250,Math.min(250,metres)):0;
}
// Screen-space scale follows the visible handle, irrespective of camera yaw/pitch.
// The same projected-axis contract as translation avoids inverted drags.
export function projectedAxisScale3d(origin,endpoint,dx,dy,{sensitivity=.5,min=.1,max=8}={}){
 const metres=projectedAxisDrag3d(origin,endpoint,dx,dy);
 if(!Number.isFinite(sensitivity)||sensitivity<=0||!Number.isFinite(min)||min<=0||!Number.isFinite(max)||max<min)return 1;
 return Math.min(max,Math.max(min,1+metres*sensitivity));
}
// Rotation by the actual angular sweep of the pointer around the projected pivot.
// directionSign reverses the on-screen winding when viewing the opposite side
// of an axis. A tiny initial radius is ignored instead of producing large jumps.
export function projectedAxisRotation3d(pivot,start,current,{directionSign=1}={}){
 if(!pivot||!start||!current||![pivot.x,pivot.y,start.x,start.y,current.x,current.y,directionSign].every(Number.isFinite))return 0;
 const sx=start.x-pivot.x,sy=start.y-pivot.y,cx=current.x-pivot.x,cy=current.y-pivot.y;
 if(Math.hypot(sx,sy)<8||Math.hypot(cx,cy)<8)return 0;
 const angle=Math.atan2(sx*cy-sy*cx,sx*cx+sy*cy);
 return angle*180/Math.PI*(directionSign<0?-1:1);
}
export function alignSceneObjects3d(entities,ids,{axis='x',to='first'}={}){
 if(!Array.isArray(entities)||!Array.isArray(ids)||!['x','y','height'].includes(axis)||to!=='first')throw Error('Alignement invalide');
 const selected=ids.map(id=>entities.find(e=>e.id===id)).filter(Boolean);
 if(selected.length<2)return 0;
 const first=selected[0],property=axis==='height'?'elevation3d':axis;
 const target=Number(first[property])||0;
 let changed=0;
 for(const object of selected.slice(1)){
  const before=Number(object[property])||0;
  if(before===target)continue;
  object[property]=target;changed++;
 }
 return changed;
}
export function snapSelected3d(entities,ids,{step=.5}={}){
 if(!Number.isFinite(step)||step<=0||step>20)throw Error('Pas de grille invalide');
 let changed=0;
 for(const object of entities.filter(o=>ids.includes(o.id))){
  const before=[object.x,object.y,object.elevation3d||0];
  object.x=Math.round(object.x/(step*64))*step*64;
  object.y=Math.round(object.y/(step*64))*step*64;
  object.elevation3d=Math.round((object.elevation3d||0)/step)*step;
  if(before.some((v,i)=>v!==[object.x,object.y,object.elevation3d][i]))changed++;
 }
 return changed;
}
