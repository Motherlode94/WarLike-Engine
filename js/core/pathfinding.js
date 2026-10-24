// 2D ground-plane A* pathfinding for WarLike 3D actors. Coordinates are scene pixels.
// Static obstacles are rasterized into cells; expansion is bounded per request.
const key=(x,y)=>x+','+y;
export function findPath(start,goal,obstacles=[],options={}){
 const cell=Math.max(16,Math.min(128,Number(options.cellSize)||48));
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
 const startNode={x:x0,y:y0,g:0,f:heuristic(x0,y0),prev:null};
 const open=[startNode],best=new Map([[key(x0,y0),0]]);let visits=0;
 while(open.length&&visits++<limit){
  let i=0;for(let j=1;j<open.length;j++)if(open[j].f<open[i].f)i=j;
  const node=open.splice(i,1)[0];
  if(node.g!==best.get(key(node.x,node.y)))continue;
  if(node.x===xg&&node.y===yg){
   const path=[];let n=node;while(n){path.push({x:(n.x+.5)*cell,y:(n.y+.5)*cell});n=n.prev}
   path.reverse();path.shift();path.push({x:goal.x,y:goal.y});return path;
  }
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=node.x+dx,y=node.y+dy,k=key(x,y),g=node.g+1;
   if(x<minX||x>maxX||y<minY||y>maxY||blocked.has(k)||g>= (best.get(k)??Infinity))continue;
   best.set(k,g);open.push({x,y,g,f:g+heuristic(x,y),prev:node});
  }
 }
 return [];
}
