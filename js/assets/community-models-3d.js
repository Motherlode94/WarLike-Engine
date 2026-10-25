// CC0 3D asset catalog from Polygonal Mind community collections.
// Index only actual .glb files reported by the repository tree; do not generate fake asset URLs.
import {importedModels3d} from './real-models-3d.js';
const source='ToxSam/cc0-models-Polygonal-Mind';
const api='https://api.github.com/repos/'+source+'/git/trees/main?recursive=1';
const raw='https://raw.githubusercontent.com/'+source+'/main/';
const wanted=150;
let catalogPromise=null;
const classify=path=>{
 const s=path.split('/').pop().toLowerCase();
 if(/character|avatar|human|person|npc|creature|animal/.test(s))return 'Characters';
 if(/vehicle|car|truck|bike|motor|boat|spaceship/.test(s))return 'Vehicles';
 if(/weapon|sword|shield|gun|rifle|axe/.test(s))return 'Weapons';
 if(/building|house|temple|tower|pyramid|pagoda|castle|structure/.test(s))return 'Buildings';
 if(/bush|tree|plant|grass|rock|flower|nature|garden|mushroom|foliage|branch|leaf/.test(s))return 'Nature';
 if(/button|icon|ui|logo|interface|panel|cursor/.test(s))return 'Props';
 return 'Props';
};
const label=path=>path.split('/').pop().replace(/\.glb$/i,'').replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').trim();
export async function addCommunityModels3d({limit=wanted}={}){
 if(catalogPromise)return catalogPromise;
 catalogPromise=(async()=>{
  const response=await fetch(api,{headers:{Accept:'application/vnd.github+json'}});
  if(!response.ok)throw Error('Catalogue externe indisponible (GitHub HTTP '+response.status+')');
  const data=await response.json();
  if(data.truncated)throw Error('Index GitHub incomplet : aucun catalogue partiel ajouté');
  const paths=(data.tree||[]).filter(f=>f.type==='blob'&&/\.glb$/i.test(f.path)&&Number(f.size)>0&&Number(f.size)<=25*1024*1024)
   .map(f=>f.path).sort((a,b)=>a.localeCompare(b));
  const unique=[...new Set(paths)].slice(0,Math.min(Math.max(1,limit),500));
  if(unique.length<limit)throw Error('Seulement '+unique.length+' fichiers GLB admissibles trouvés pour '+limit+' demandés');
  let count=0;
  for(const path of unique){
   const id='cc0-polygonal-'+count.toString().padStart(3,'0');
   const name=label(path);
   importedModels3d.set(id,{id,name,category:classify(path),shape:'glb',
    license:'CC0 — Polygonal Mind (vérifier les sources)',url:raw+path.split('/').map(encodeURIComponent).join('/'),
    sourceUrl:'https://github.com/'+source+'/blob/main/'+path.split('/').map(encodeURIComponent).join('/'),
    collection:'Polygonal Mind CC0',modelPath:path});
   count++;
  }
  return count;
 })();
 try{return await catalogPromise}catch(error){catalogPromise=null;throw error}
}
