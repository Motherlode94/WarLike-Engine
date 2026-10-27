// Bundled, same-origin community examples. The catalog is curated, not a remote registry.
export const communityCatalog=[
 {id:'field-tools',title:'Field Tools',category:'RP / Aventure',source:'./examples/community/field-tools.json',description:'Dialogue, réputation et réserve de provisions'},
 {id:'survival-signals',title:'Survival Signals',category:'Horreur / Survie',source:'./examples/community/survival-signals.json',description:'Alerte de secteur et ration de refuge'},
 {id:'platformer-2d',title:'Platformer Essentials 2D',category:'2D / Plateforme',source:'./examples/community/platformer-2d.json',description:'Checkpoint, pièces et porte de sortie 2D'},
 {id:'adventure-3d',title:'Adventure Essentials 3D',category:'3D / Aventure',source:'./examples/community/adventure-3d.json',description:'Terminal, caisse de matériel et zone objectif 3D'}
];
export async function loadCatalogEntry(id,{fetcher=fetch}={}){
 const item=communityCatalog.find(entry=>entry.id===id);
 if(!item)throw Error('Pack du catalogue inconnu.');
 const response=await fetcher(item.source,{credentials:'same-origin'});
 if(!response.ok)throw Error('Impossible de charger le pack intégré.');
 const length=Number(response.headers?.get('content-length')||0);
 if(length>131072)throw Error('Pack trop volumineux.');
 const text=await response.text();
 if(new TextEncoder().encode(text).byteLength>131072)throw Error('Pack trop volumineux.');
 return JSON.parse(text);
}
