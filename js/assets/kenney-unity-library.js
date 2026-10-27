// Kenney CC0 assets, loaded from a real public manifest on demand.
// These GLB models work in WarLike; use the OBJ exporter for Unity's native import.
import {importedModels3d} from './real-models-3d.js';
export const kenneyCatalogUrl='https://hidencod.github.io/tge-assets/catalog.json';
const base='https://hidencod.github.io/tge-assets/';
export const categoryForKenney=(packId,name='')=>{
 const p=String(packId).toLowerCase(),n=String(name).toLowerCase();
 if(/character|pet|animal/.test(p)||/^(animal|character|person|human)[ -]/.test(n))return 'Characters';
 if(/car-kit|road|vehicle/.test(p)||/^(car|truck|bus|kart|vehicle|wheel)[ -]/.test(n))return 'Vehicles';
 if(/blaster|weapon/.test(p)||/^(gun|rifle|laser|blaster|sword)[ -]/.test(n))return 'Weapons';
 if(/city|castle|dungeon|tower-defense/.test(p))return 'Buildings';
 if(/nature|graveyard/.test(p))return 'Nature';
 return 'Props';
};
const allowedPath=path=>typeof path==='string'&&/^packs\/[a-z0-9-]+\/[a-z0-9_-]+\.glb$/i.test(path);
export function indexKenneyManifest(manifest,{limit=500}={}){
 if(!Array.isArray(manifest?.packs))throw Error('Catalogue Kenney invalide');
 const records=[],seen=new Set();
 for(const pack of manifest.packs){
  if(!pack||typeof pack.id!=='string'||!Array.isArray(pack.models))continue;
  for(const m of pack.models){
   if(!allowedPath(m?.file)||!Number.isFinite(m.size)||m.size<1||m.size>25*1024*1024||seen.has(m.file))continue;
   seen.add(m.file);
   const category=categoryForKenney(pack.id,m.name);
   const filename=m.file.split('/').pop();
   records.push({id:'kenney-'+pack.id+'-'+filename.replace(/\.glb$/i,''),name:String(m.name||filename).slice(0,100),
    category,shape:'glb',license:'CC0-1.0 • Kenney',collection:'Kenney CC0 • Unity export',
    url:base+m.file,sourceUrl:String(pack.url||'https://kenney.nl/assets'),
    modelPath:m.file,thumbnailUrl:typeof m.thumb==='string'&&/^packs\/[a-z0-9-]+\/thumbs\/[a-z0-9_-]+\.webp$/i.test(m.thumb)?base+m.thumb:null});
  }
 }
 const groups=new Map(['Characters','Vehicles','Weapons','Buildings','Nature','Props'].map(c=>[c,[]]));
 for(const record of records)groups.get(record.category)?.push(record);
 const indexed=[],max=Math.min(1500,Math.max(1,Math.round(limit)));
 while(indexed.length<max){
  let added=false;
  for(const group of groups.values())if(group.length&&indexed.length<max){indexed.push(group.shift());added=true}
  if(!added)break;
 }
 return indexed;
}
let loading=null;
export async function loadKenneyUnityAssets({limit=500}={}){
 if(loading)return loading;
 loading=(async()=>{
  const response=await fetch(kenneyCatalogUrl,{mode:'cors',credentials:'omit'});
  if(!response.ok)throw Error('Kenney : manifeste HTTP '+response.status);
  const data=await response.json();
  const records=indexKenneyManifest(data,{limit});
  if(!records.length)throw Error('Aucun modèle Kenney valide');
  for(const record of records)importedModels3d.set(record.id,record);
  return records.length;
 })();
 try{return await loading}catch(error){loading=null;throw error}
}
