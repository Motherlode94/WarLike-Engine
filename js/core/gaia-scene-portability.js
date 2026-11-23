// Compatibility bridge for archived WB 1.1–1.4 road/Gaia scene entities.
// Serialized schema and authored height samples are never recreated or reset.
import {validRoadSpline,roadSplineEntity} from './gaia-road-spline.js';
import {validTerrainHeightfield} from './gaia-terrain-physics.js';

export function portableGaiaSceneEntity(entity,id=entity?.id){
 if(!entity||!Number.isSafeInteger(id)||id<1)throw Error('Invalid Gaia scene entity id');
 if(entity.type==='road'){
  if(!validRoadSpline(entity.roadSpline))throw Error('Invalid saved Gaia road spline');
  const defaults=roadSplineEntity(id,entity.roadSpline,{name:entity.name||'Gaia Road'});
  return {...defaults,...structuredClone(entity),id,
   x:Number.isFinite(entity.x)?entity.x:defaults.x,
   y:Number.isFinite(entity.y)?entity.y:defaults.y,
   w:Number.isFinite(entity.w)&&entity.w>0?entity.w:defaults.w,
   h:Number.isFinite(entity.h)&&entity.h>0?entity.h:defaults.h,
   color:typeof entity.color==='string'&&/^#[0-9a-f]{6}$/i.test(entity.color)?entity.color:defaults.color,
   roadSpline:structuredClone(entity.roadSpline)};
 }
 if(entity.type==='terrain3d'||entity.terrainHeightfield){
  if(!validTerrainHeightfield(entity.terrainHeightfield))throw Error('Invalid saved Gaia terrain heightfield');
  const t=entity.terrainHeightfield;
  const x=(t.offsetX-t.size/2)*64,y=(t.offsetZ-t.size/2)*64;
  return {...structuredClone(entity),id,type:'terrain3d',
   x:Number.isFinite(entity.x)?entity.x:x,
   y:Number.isFinite(entity.y)?entity.y:y,
   w:Number.isFinite(entity.w)&&entity.w>0?entity.w:t.size*64,
   h:Number.isFinite(entity.h)&&entity.h>0?entity.h:t.height*64,
   depth3d:Number.isFinite(entity.depth3d)&&entity.depth3d>0?entity.depth3d:t.size*64,
   color:typeof entity.color==='string'&&/^#[0-9a-f]{6}$/i.test(entity.color)?entity.color:'#52734d',
   terrainHeightfield:structuredClone(t)};
 }
 return null;
}
