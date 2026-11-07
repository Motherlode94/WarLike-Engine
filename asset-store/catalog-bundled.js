// WarLike bundled CC0 catalog adapter, no invented product records.
const categories={Characters:'Personnages',Character:'Personnages',Monsters:'Personnages',Animals:'Personnages',Vehicles:'Véhicules',Weapons:'Armes',Buildings:'Bâtiments',Nature:'Nature',Props:'Objets'};
export function categoryFor(asset){
 if(categories[asset.category])return categories[asset.category];
 const p=(asset.pack+' '+asset.category+' '+asset.name).toLowerCase();
 if(/character|person|human|monster|animal|creature|zombie/.test(p))return 'Personnages';
 if(/vehicle|car|truck|ship|tank|motorcycle|train/.test(p))return 'Véhicules';
 if(/gun|weapon|blaster|rifle|sword|turret/.test(p))return 'Armes';
 if(/building|house|town|city|castle|factory|dungeon/.test(p))return 'Bâtiments';
 if(/nature|tree|forest|plant|crop|rock/.test(p))return 'Nature';
 return 'Objets';
}
function assetUrl(path,extension){
 if(typeof path!=='string')return null;
 const clean=path.replace(/^\.\//,'');
 if(clean.includes('..')||!new RegExp('^assets/free/(kenney|quaternius)/[a-z0-9_./-]+\\.'+extension+'$','i').test(clean))return null;
 return new URL('../'+clean,import.meta.url).href;
}
export function toStoreAsset(a,author){
 if(!a||typeof a.id!=='string'||typeof a.name!=='string')return null;
 const url=assetUrl(a.url,'glb');if(!url)return null;
 const pack=String(a.pack||'sans-pack');
 return {id:a.id,name:a.name,author,pack,packName:String(a.packName||pack),
  category:categoryFor(a),url,thumb:assetUrl(a.thumbnailUrl,'(?:png|webp|jpg|jpeg)'),
  size:Number(a.bytes)||0,triangles:Number(a.triangles)||0,
  animationClips:Array.isArray(a.animationClips)?a.animationClips.length:0,
  animationNames:Array.isArray(a.animationClips)?a.animationClips.map(c=>typeof c==='string'?c:String(c?.name||'')).filter(Boolean):[],
  source:typeof a.sourceUrl==='string'&&a.sourceUrl.startsWith('https://')?a.sourceUrl:author==='Kenney'?'https://kenney.nl/assets':'https://quaternius.com/',
  license:String(a.license||'CC0-1.0'),bundled:true};
}
export async function loadBundledCatalog(){
 const entries=[['Kenney','../assets/free/kenney/models.json'],['Quaternius','../assets/free/quaternius/models.json']];
 const settled=await Promise.allSettled(entries.map(async ([author,path])=>{
  const r=await fetch(new URL(path,import.meta.url),{credentials:'same-origin'});
  if(!r.ok)throw Error(author+' : HTTP '+r.status);
  const list=await r.json();if(!Array.isArray(list))throw Error(author+' : manifeste invalide');
  return list.map(a=>toStoreAsset(a,author)).filter(Boolean);
 }));
 const assets=[],errors=[];
 settled.forEach((r,i)=>{if(r.status==='fulfilled')assets.push(...r.value);else errors.push(entries[i][0]+': '+r.reason.message)});
 return {assets:[...new Map(assets.map(a=>[a.id,a])).values()],errors};
}
