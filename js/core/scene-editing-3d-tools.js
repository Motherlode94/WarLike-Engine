// Editor-only gizmo helpers. A visual guide grid is not a game-world collider.
export function projectedAxisDrag3d(origin,endpoint,dx,dy,axisLength=1){
 if(!origin||!endpoint||![origin.x,origin.y,endpoint.x,endpoint.y,dx,dy,axisLength].every(Number.isFinite))return 0;
 const sx=endpoint.x-origin.x,sy=endpoint.y-origin.y,length2=sx*sx+sy*sy;
 if(length2<4)return 0; // Ignore foreshortened axes rather than making them jump.
 const metres=(dx*sx+dy*sy)/length2*axisLength;
 return Math.max(-250,Math.min(250,metres));
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
