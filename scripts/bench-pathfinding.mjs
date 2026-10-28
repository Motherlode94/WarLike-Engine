// Reproducible pathfinding benchmark: node scripts/bench-pathfinding.mjs
// Compares the raw grid route with the smoothed one on seeded random scenes (start/goal always in free space).
import {pathToFileURL} from 'node:url';
import {findPath} from '../js/core/pathfinding.js';
const SIZE=1800,PADDING=8,CELL=32;
const makeRandom=seed=>()=>(seed=(seed*1664525+1013904223)>>>0)/2**32;
const length=(start,path)=>path.reduce((sum,p,i)=>sum+Math.hypot(p.x-(i?path[i-1].x:start.x),p.y-(i?path[i-1].y:start.y)),0);
export function freePoint(rnd,obstacles,margin=CELL){
 for(let tries=0;tries<200;tries++){
  const p={x:rnd()*SIZE,y:rnd()*SIZE};
  if(!obstacles.some(o=>p.x>o.x-PADDING-margin&&p.x<o.x+o.w+PADDING+margin&&p.y>o.y-PADDING-margin&&p.y<o.y+o.h+PADDING+margin))return p;
 }
 return {x:0,y:0};
}
export function makeScene(seed,count){
 const rnd=makeRandom(seed);
 const obstacles=Array.from({length:count},()=>({x:rnd()*SIZE,y:rnd()*SIZE,w:40+rnd()*120,h:40+rnd()*120}));
 return {rnd,obstacles};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const RUNS=200;
 console.log('obstacles | mode   | ms/chemin | trouvés | points | longueur (px)');
 for(const count of [20,60,120]){
  for(const smooth of [false,true]){
   const {rnd,obstacles}=makeScene(7,count);
   let found=0,points=0,total=0,elapsed=0;
   for(let i=0;i<RUNS;i++){
    const a=freePoint(rnd,obstacles),b=freePoint(rnd,obstacles);
    const t=performance.now(),path=findPath(a,b,obstacles,{cellSize:CELL,padding:PADDING,maxNodes:12000,smooth});elapsed+=performance.now()-t;
    if(path.length){found++;points+=path.length;total+=length(a,path)}
   }
   console.log(`${String(count).padStart(9)} | ${(smooth?'lissé':'brut ').padEnd(6)} | ${(elapsed/RUNS).toFixed(2).padStart(9)} | ${String(found).padStart(3)}/${RUNS} | ${(points/Math.max(1,found)).toFixed(1).padStart(6)} | ${(total/Math.max(1,found)).toFixed(0).padStart(6)}`);
  }
 }
}
