// Gaia import UI preview only; does not mutate scenes or run user scripts.
import {gaiaWorldToEntities} from './gaia-terrain-physics.js';
export const MAX_GAIA_FILE_BYTES=24*1024*1024;
export function inspectGaiaWorld(world){
 const entities=gaiaWorldToEntities(world,{firstId:1});
 const tiles=entities.map(entity=>{
  const t=entity.terrainHeightfield;
  const samples=t.heights;
  let min=Infinity,max=-Infinity;
  for(const h of samples){if(h<min)min=h;if(h>max)max=h;}
  return {name:entity.name,resolution:t.resolution,sizeMeters:t.size,
   elevationMeters:t.height,minMeters:min*t.height,maxMeters:max*t.height,
   worldX:t.offsetX,worldZ:t.offsetZ};
 });
 return {schema:world.schema,tiles,count:tiles.length,sampleCount:tiles.reduce((a,t)=>a+t.resolution*t.resolution,0),
  overallMinMeters:Math.min(...tiles.map(t=>t.minMeters)),
  overallMaxMeters:Math.max(...tiles.map(t=>t.maxMeters))};
}
export async function readGaiaWorldFile(file){
 if(!file)throw Error('Sélectionne un fichier Gaia JSON.');
 if(file.size>MAX_GAIA_FILE_BYTES)throw Error('Fichier trop volumineux : 24 Mo maximum.');
 if(!file.name.toLowerCase().endsWith('.json')&&file.type!=='application/json')throw Error('Fichier JSON attendu.');
 let world;
 try{world=JSON.parse(await file.text());}catch{throw Error('Fichier JSON illisible.');}
 return {world,preview:inspectGaiaWorld(world)};
}
