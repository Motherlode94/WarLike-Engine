// Deterministic 2D contact state machine for Engine Play and Web exports.
// Tracks collider pairs across completed simulation frames, not editor frames.
import {solidCollider2d,collisionLayersAllow2d} from './physics-2d.js';
import {tilemapColliders2d} from './tilemap-2d.js';
import {colliderShape2d,colliderSeparation2d} from './collider-shapes-2d.js';
const box=o=>colliderShape2d(o);
const touches=(a,b)=>colliderSeparation2d(a,b)<=.12;
const overlaps=(a,b)=>colliderSeparation2d(a,b)<-1e-5;
const involved=e=>e.enabled!==false&&!e._sequenceDestroyed&&e.collider2d?.enabled!==false;
const dynamic=e=>e.type==='player'||e.type==='character'||e.controller2d||e.rigidbody2d?.enabled||e.playable2d;
const key=(kind,a,b)=>kind+':'+Math.min(a,b)+':'+Math.max(a,b);
export class ContactEvents2d {
 constructor(){this.previous=new Map();}
 reset(){this.previous.clear();}
 update(entities){
  const objects=(entities||[]).filter(e=>involved(e)&&e.id!=null&&!e.tilemap2d);
  const solids=objects.filter(e=>solidCollider2d(e));
  const cells=tilemapColliders2d((entities||[]).filter(involved));
  const current=new Map(),events=[];
  for(let i=0;i<objects.length;i++){
   const a=objects[i],ab=box(a);
   for(let j=i+1;j<objects.length;j++){
    const b=objects[j];if(!dynamic(a)&&!dynamic(b)||!collisionLayersAllow2d(a,b))continue;
    const trigger=a.collider2d?.isTrigger||b.collider2d?.isTrigger;
    if(trigger?!overlaps(ab,box(b)):!(solidCollider2d(a)&&solidCollider2d(b)&&touches(ab,box(b))))continue;
    const kind=trigger?'trigger':'collision',k=key(kind,a.id,b.id);
    current.set(k,{kind,a,b});
   }
   if(!dynamic(a)||a.collider2d?.isTrigger)continue;
   for(const cell of cells){
    if(cell.id===a.id||!collisionLayersAllow2d(a,cell)||!touches(ab,box(cell)))continue;
    const k=key('collision',a.id,cell.id);
    if(!current.has(k))current.set(k,{kind:'collision',a,b:(entities||[]).find(e=>e.id===cell.id)||cell});
   }
  }
  const emit=(pair,stage)=>{
   for(const [self,other] of [[pair.a,pair.b],[pair.b,pair.a]]){
    events.push({kind:pair.kind,stage,ownerId:self.id,otherId:other.id,otherName:String(other.name||other.type||'GameObject')});
   }
  };
  for(const [k,pair] of current)emit(pair,this.previous.has(k)?'stay':'enter');
  for(const [k,pair] of this.previous)if(!current.has(k))emit(pair,'exit');
  this.previous=current;return events.slice(0,256);
 }
}
export const physicsContactEvents2d=new ContactEvents2d();
