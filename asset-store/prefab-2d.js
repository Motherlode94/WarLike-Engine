// Native WarLike 2D prefabs created from included Kenney sprite records.
export const PREFAB_KEY='warlike.prefabs.library.v1';
const PREFIX='store-2d-';
export function spritePrefab(asset){
 if(!asset||!/^free-[\w.-]{1,140}$/.test(asset.id)||typeof asset.name!=='string'||asset.sourceType!=='png'||!asset.spriteUrl?.startsWith('./assets/free/kenney/')||!asset.spriteUrl.endsWith('.png'))throw Error('Sprite Kenney intégré requis');
 const width=Math.min(512,Math.max(8,Math.round(Number(asset.width)||64)));
 const height=Math.min(512,Math.max(8,Math.round(Number(asset.height)||64)));
 const isUi=asset.category==='UI',isActor=asset.kind==='actor';
 const components={type:isActor?'player':'object',assetId:asset.id,w:width,h:height,rotation:0,visible:true,
  // assetId resolves through the same editor asset catalog as the source PNG.
  spriteUrl:asset.spriteUrl,sourceType:'png',pixelArt:!!asset.pixelArt,collidable:!isUi};
 return {id:PREFIX+asset.id,name:asset.name,mode:'2d',components,
  origin:{store:'WarLike Asset Store',author:'Kenney',license:asset.license||'CC0-1.0',sourceUrl:asset.sourceUrl||'https://kenney.nl/assets',spriteId:asset.id}};
}
export function installSpritePrefab(asset,storage=globalThis.localStorage){
 const prefab=spritePrefab(asset);
 let list;try{list=JSON.parse(storage.getItem(PREFAB_KEY)||'[]')}catch{list=[]}
 if(!Array.isArray(list))throw Error('Bibliothèque invalide');
 const old=list.find(x=>x?.id===prefab.id);
 if(old)return {prefab:old,installed:false};
 if(list.length>=2000)throw Error('Bibliothèque pleine');
 list.push(prefab);storage.setItem(PREFAB_KEY,JSON.stringify(list));
 if(typeof document!=='undefined')document.dispatchEvent(new Event('warlike:prefabs'));
 return {prefab,installed:true};
}
export function installed2dIds(storage=globalThis.localStorage){
 try{const list=JSON.parse(storage.getItem(PREFAB_KEY)||'[]');return new Set(Array.isArray(list)?list.filter(x=>x?.id?.startsWith(PREFIX)).map(x=>x.id.slice(PREFIX.length)):[])}catch{return new Set()}
}
