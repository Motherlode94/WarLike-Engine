// 2D ground-plane A* pathfinding for WarLike 3D actors. Coordinates are scene pixels.
// Static obstacles are rasterized into cells; expansion is bounded per request.
// The raw grid route is then straightened by smoothPath (line-of-sight shortcuts).
const key=(x,y)=>x+','+y;
const cellOf=options=>Math.max(16,Math.min(128,Number(options.cellSize)||48));

// Binary min-heap ordered by f, then by larger g (closer to the goal), then insertion order (deterministic).
class OpenList{
 constructor(){this.items=[];this.counter=0}
 get size(){return this.items.length}
 less(a,b){return a.f!==b.f?a.f<b.f:a.g!==b.g?a.g>b.g:a.order<b.order}
 push(node){
  node.order=this.counter++;
  const items=this.items;let i=items.push(node)-1;
  while(i>0){const parent=(i-1)>>1;if(!this.less(items[i],items[parent]))break;[items[i],items[parent]]=[items[parent],items[i]];i=parent}
 }
 pop(){
  const items=this.items,top=items[0],last=items.pop();
  if(items.length){
   items[0]=last;let i=0;
   for(;;){
    const l=2*i+1,r=l+1;let m=i;
    if(l<items.length&&this.less(items[l],items[m]))m=l;
    if(r<items.length&&this.less(items[r],items[m]))m=r;
    if(m===i)break;[items[i],items[m]]=[items[m],items[i]];i=m;
   }
  }
  return top;
 }
}

// Does the open segment a→b cross the interior of the rectangle? Touching an edge or corner is allowed.
function segmentCrossesRect(ax,ay,bx,by,left,top,right,bottom){
 const dx=bx-ax,dy=by-ay;let t0=0,t1=1;
 for(const [p,q] of [[-dx,ax-left],[dx,right-ax],[-dy,ay-top],[dy,bottom-ay]]){
  if(p===0){if(q<=0)return false;continue}
  const r=q/p;
  if(p<0){if(r>t1)return false;if(r>t0)t0=r}else{if(r<t0)return false;if(r<t1)t1=r}
 }
 return t0<t1;
}

// Clearance used when straightening a route: the requested padding plus a quarter cell,
// so shortcuts keep roughly the margin the grid route had. Shared with the native (C++) route.
export const smoothingPadding=(options={})=>Math.max(0,Number(options.padding)||0)+cellOf(options)*.25;

const MAX_LOOKAHEAD=48;
// Greedy "string pulling": from each anchor jump to the farthest waypoint reachable in a straight line
// that crosses no obstacle (inflated by padding). Never lengthens a route; start is not part of the result.
export function smoothPath(start,path,obstacles=[],{padding=0}={}){
 if(!Array.isArray(path)||!path.length)return [];
 const copy=path.map(p=>({x:p.x,y:p.y}));
 if(copy.length<2)return copy;
 const pad=Math.max(0,Number(padding)||0),points=[{x:start.x,y:start.y},...copy];
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const p of points){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y)}
 const rects=[];
 for(const o of obstacles){
  if(!o||![o.x,o.y,o.w,o.h].every(Number.isFinite)||o.w<=0||o.h<=0)continue;
  const r=[o.x-pad,o.y-pad,o.x+o.w+pad,o.y+o.h+pad];
  if(r[2]>minX&&r[0]<maxX&&r[3]>minY&&r[1]<maxY)rects.push(r);
 }
 const clear=(a,b)=>{
  const lo=Math.min(a.x,b.x),hi=Math.max(a.x,b.x),top=Math.min(a.y,b.y),bottom=Math.max(a.y,b.y);
  for(const r of rects)if(r[2]>lo&&r[0]<hi&&r[3]>top&&r[1]<bottom&&segmentCrossesRect(a.x,a.y,b.x,b.y,r[0],r[1],r[2],r[3]))return false;
  return true;
 };
 const out=[];let anchor=0;
 while(anchor<points.length-1){
  let next=anchor+1;
  for(let j=Math.min(points.length-1,anchor+MAX_LOOKAHEAD);j>anchor+1;j--)if(clear(points[anchor],points[j])){next=j;break}
  out.push(points[next]);anchor=next;
 }
 return out;
}

export function findPath(start,goal,obstacles=[],options={}){
 const cell=cellOf(options);
 const padding=Math.max(0,Number(options.padding)||0);
 const limit=Math.max(64,Math.min(12000,Number(options.maxNodes)||2400));
 const x0=Math.floor(start.x/cell),y0=Math.floor(start.y/cell);
 const xg=Math.floor(goal.x/cell),yg=Math.floor(goal.y/cell);
 const minX=Math.min(x0,xg)-16,maxX=Math.max(x0,xg)+16;
 const minY=Math.min(y0,yg)-16,maxY=Math.max(y0,yg)+16;
 const blocked=new Set();
 for(const o of obstacles){
  if(!o||!Number.isFinite(o.x)||!Number.isFinite(o.y)||!Number.isFinite(o.w)||!Number.isFinite(o.h))continue;
  for(let x=Math.max(minX,Math.floor((o.x-padding)/cell));x<=Math.min(maxX,Math.floor((o.x+o.w+padding-0.001)/cell));x++)
   for(let y=Math.max(minY,Math.floor((o.y-padding)/cell));y<=Math.min(maxY,Math.floor((o.y+o.h+padding-0.001)/cell));y++)blocked.add(key(x,y));
 }
 blocked.delete(key(x0,y0));blocked.delete(key(xg,yg));
 const heuristic=(x,y)=>Math.abs(x-xg)+Math.abs(y-yg);
 const open=new OpenList(),best=new Map([[key(x0,y0),0]]);let visits=0;
 open.push({x:x0,y:y0,g:0,f:heuristic(x0,y0),prev:null});
 while(open.size&&visits++<limit){
  const node=open.pop();
  if(node.g!==best.get(key(node.x,node.y)))continue;
  if(node.x===xg&&node.y===yg){
   const path=[];let n=node;while(n){path.push({x:(n.x+.5)*cell,y:(n.y+.5)*cell});n=n.prev}
   path.reverse();path.shift();path.push({x:goal.x,y:goal.y});
   return options.smooth===false?path:smoothPath(start,path,obstacles,{padding:smoothingPadding(options)});
  }
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=node.x+dx,y=node.y+dy,k=key(x,y),g=node.g+1;
   if(x<minX||x>maxX||y<minY||y>maxY||blocked.has(k)||g>= (best.get(k)??Infinity))continue;
   best.set(k,g);open.push({x,y,g,f:g+heuristic(x,y),prev:node});
  }
 }
 return [];
}
