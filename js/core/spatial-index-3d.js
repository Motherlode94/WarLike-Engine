// Spatial hashing for 3D scene collision candidates (scene X/Z expressed in pixels).
// Conservative: all cells touched by each object's horizontal bounds are indexed.
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export function createSpatialIndex3d(entities,{cellSize=128,filter=()=>true}={}){
 const unit=Math.max(8,finite(cellSize,128));
 const cells=new Map();
 const overflow=new Set();
 const key=(x,z)=>x+':'+z;
 const coords=o=>{
  const x=finite(o.x),z=finite(o.y);
  const w=Math.max(1,finite(o.w,32)),d=Math.max(1,finite(o.depth3d,o.h||32));
  return [Math.floor(x/unit),Math.floor(z/unit),Math.floor((x+w)/unit),Math.floor((z+d)/unit)];
 };
 const add=o=>{
  if(!filter(o))return;
  const [x0,z0,x1,z1]=coords(o);
  // Extremely large scenery should not produce unbounded allocations.
  if((x1-x0+1)*(z1-z0+1)>4096){overflow.add(o);return;}
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
   const k=key(x,z);if(!cells.has(k))cells.set(k,new Set());cells.get(k).add(o);
  }
 };
 for(const o of entities)add(o);
 const query=o=>{
  const found=new Set(overflow),[x0,z0,x1,z1]=coords(o);
  if((x1-x0+1)*(z1-z0+1)>4096)return entities.filter(filter);
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)for(const item of cells.get(key(x,z))||[])found.add(item);
  return [...found];
 };
 return {query,cellCount:cells.size};
}
