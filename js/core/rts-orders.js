// Minimal playable RTS move orders, shared across 2D and 3D workspace.
export const isRtsUnit=o=>Array.isArray(o?.tags)&&o.tags.includes('rts-unit');
export function orderRtsMove(entities,ids,target){
 if(!target||![target.x,target.y].every(Number.isFinite))return 0;
 let count=0;
 for(const o of entities){
  if(!ids.includes(o.id)||!isRtsUnit(o))continue;
  o.rtsOrder={type:'move',x:target.x,y:target.y};count++;
 }
 return count;
}
export function updateRtsOrders(entities,dt,playing){
 if(!playing||!Number.isFinite(dt)||dt<=0)return;
 for(const o of entities){
  if(!isRtsUnit(o)||!o.rtsOrder||o.rtsOrder.type!=='move')continue;
  const dx=o.rtsOrder.x-(o.x+o.w/2),dy=o.rtsOrder.y-(o.y+o.h/2),dist=Math.hypot(dx,dy);
  const speed=Math.max(1,Number(o.rtsSpeed)||Number(o.ai?.speed)||70);
  if(dist<3){delete o.rtsOrder;continue}
  const step=Math.min(dist,speed*Math.min(dt,.1));
  o.x+=dx/dist*step;o.y+=dy/dist*step;
 }
}
