import {survivalSprites2d} from './survival-sprites-2d.js';
import {freeSprites2d,freeUiAssets} from './free-game-assets.js';
import {newWeaponEntries,newVehicleEntries,armoryGarageSvg,weaponStats,vehicleStats} from './armory-garage.js';
import {genrePack,genreSvg} from './genre-essentials.js';
import {elements,elementSvg} from './game-elements.js';
import {buildings,buildingSvg} from './buildings.js';
import {expansion,extraSvg} from './expansion.js';
import {detailedSvg} from './detailed-art.js';
// WarLike Engine built-in asset pack. All images are authored SVG, generated locally from catalog metadata.
const defs={
Characters:[['scout','Scout'],['soldier','Soldier'],['medic','Medic'],['sniper','Sniper'],['mechanic','Mechanic'],['survivor','Survivor']],
Monsters:[['zombie','Zombie'],['slime','Slime'],['skeleton','Skeleton'],['goblin','Goblin'],['robot','Hostile Robot'],['demon','Demon']],
Vehicles:[['jeep','Jeep'],['buggy','Buggy'],['tank','Tank'],['bike','Motorbike'],['apc','APC']],
Weapons:[['pistol','Pistol'],['rifle','Assault Rifle'],['sniper-rifle','Sniper Rifle'],['shotgun','Shotgun'],['smg','SMG'],['rocket','Rocket Launcher'],['sword','Sword'],['axe','Axe'],['bow','Bow'],['staff','Magic Staff'],['grenade','Grenade'],['mine','Mine']],
Props:[['crate','Crate'],['barrel','Barrel'],['explosive','Explosive Barrel'],['chest','Treasure Chest'],['door','Door'],['lamp','Lamp'],['terminal','Terminal'],['bed','Bed'],['table','Table'],['chair','Chair'],['rock','Rock'],['tree','Tree'],['bush','Bush'],['fence','Fence'],['sign','Sign'],['bridge','Bridge'],['stairs','Stairs'],['campfire','Campfire'],['sandbag','Sandbags'],['wall','Wall'],['window','Window'],['computer','Computer'],['generator','Generator'],['medkit','Medkit'],['ammo','Ammo Box']]
};
for(const [category,items] of Object.entries(expansion)){if(defs[category])defs[category].push(...items);else defs[category]=items}
defs.Buildings=buildings.map(([id,name])=>[id,name]);
defs.Elements=elements.map(([id,name])=>[id,name]);
for(const [category,items] of Object.entries(genrePack))defs[category].push(...items);
defs.Weapons.push(...newWeaponEntries);defs.Vehicles.push(...newVehicleEntries);
export const catalog=[...survivalSprites2d,...freeSprites2d,...freeUiAssets,...Object.entries(defs).flatMap(([category,items])=>items.map(([id,name],index)=>({id,category,name,index,kind:category==='Elements'?'element':category==='Buildings'?'building':category==='Characters'||category==='Monsters'?'actor':category==='Vehicles'?'vehicle':category==='Weapons'?'weapon':category==='VFX'?'effect':'prop',width:category==='Elements'?48:category==='Buildings'?128:category==='Vehicles'?110:category==='Weapons'?76:category==='Props'?64:category==='VFX'?90:56,height:category==='Elements'?48:category==='Buildings'?112:category==='Vehicles'?66:category==='Weapons'?40:category==='Props'?64:category==='VFX'?90:80,hp:category==='Buildings'?600:category==='Monsters'?65:category==='Vehicles'?180:100,animation:'idle',...(category==='Weapons'?weaponStats(id)||{}:{}),...(category==='Vehicles'?vehicleStats(id)||{}:{})})))];
export const categories=['All',...new Set(catalog.map(asset=>asset.category))];
export const getAsset=id=>catalog.find(a=>a.id===id);
const palette={Characters:['#32c4a8','#5e92e1','#f4e0cc','#7596b2','#e0b65e','#ba85d2'],Monsters:['#6ba869','#7ade96','#d7d6b2','#799447','#839da9','#a25378'],Vehicles:['#688b78','#d3ad5b','#6e8672','#6b85b4','#7d8790'],Weapons:['#bdc5d1','#839aac','#d0b781'],Props:['#b48b57','#919ba3','#6e8c65','#a06f50']};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export function svgFor(asset){const armoryArt=armoryGarageSvg(asset);if(armoryArt)return armoryArt;const themed=genreSvg(asset);if(themed)return themed;if(asset.category==='Elements')return elementSvg(asset.id);if(asset.category==='Buildings')return buildingSvg(asset.id);const extra=extraSvg(asset);if(extra)return extra;if(asset.category!=='Characters'){const detailed=detailedSvg(asset);if(detailed)return detailed}const color=palette[asset.category][asset.index%palette[asset.category].length],dark='#233142',edge='#101e2b';
const common='stroke="'+edge+'" stroke-width="2" stroke-linejoin="round"';
let art='';
if(asset.kind==='actor'){
const monster=asset.category==='Monsters',shape=asset.id==='slime'?'slime':asset.id==='robot'?'robot':'humanoid';
art=shape==='slime'?'<path d="M13 70 Q8 49 22 38 Q32 21 47 38 Q60 49 53 70Z" fill="'+color+'" '+common+'/>' : '<path d="M20 67 L18 88 H28 L33 67 L38 88 H49 L47 66Z" fill="'+dark+'" '+common+'/><path d="M17 42 Q33 30 49 42 L50 68 H15Z" fill="'+color+'" '+common+'/><path d="M16 43 L8 66 L17 69 L25 49 M48 43 L56 66 L48 69 L41 49" fill="'+color+'" '+common+'/><rect x="20" y="16" width="26" height="28" rx="'+(shape==='robot'?3:12)+'" fill="'+(monster?'#afc5a8':'#deb18b')+'" '+common+'/>';
art+='<path d="M25 29 h5 m7 0 h5" stroke="'+(monster?'#e34f5b':'#162839')+'" stroke-width="3"/><path d="M24 17 Q33 '+(monster?'3':'5')+' 44 17" fill="none" stroke="'+dark+'" stroke-width="7"/>';
if(asset.id==='demon')art+='<path d="M17 19 L12 4 L29 16 M47 19 L52 4 L36 16" fill="#b54e67" '+common+'/>';
if(asset.id==='skeleton')art+='<path d="M28 36 H38 M30 39 V44 M36 39 V44" stroke="#283a44" stroke-width="2"/>';
if(asset.id==='medic')art+='<path d="M29 46 h7 v12 h-7z M26 49 h13 v6 H26z" fill="#fff"/>';
}else if(asset.kind==='vehicle'){
art='<ellipse cx="32" cy="81" rx="27" ry="8" fill="#111b25" opacity=".3"/><rect x="4" y="40" width="13" height="36" rx="5" fill="'+dark+'"/><rect x="48" y="40" width="13" height="36" rx="5" fill="'+dark+'"/><rect x="12" y="22" width="40" height="57" rx="9" fill="'+color+'" '+common+'/><rect x="20" y="34" width="24" height="22" rx="3" fill="#8fbbc8" '+common+'/><path d="M15 63 H49" stroke="'+edge+'" stroke-width="5"/>';
if(asset.id==='tank'||asset.id==='apc')art+='<circle cx="32" cy="50" r="12" fill="'+dark+'" '+common+'/><rect x="29" y="3" width="6" height="43" fill="#b5beab" '+common+'/>';
if(asset.id==='bike')art='<circle cx="12" cy="72" r="10" fill="'+dark+'" stroke="#cfd5d8" stroke-width="4"/><circle cx="53" cy="72" r="10" fill="'+dark+'" stroke="#cfd5d8" stroke-width="4"/><path d="M12 72 L28 47 L43 72 L53 72 L42 40 L28 47" fill="none" stroke="'+color+'" stroke-width="7"/>';
}else if(asset.kind==='weapon'){
art=asset.id==='sword'||asset.id==='axe'?'<path d="M31 13 L35 61 L44 67 L33 70 L24 66 L31 60Z" fill="#bdcbd8" '+common+'/><path d="M33 62 V89" stroke="#976a40" stroke-width="7"/>' :asset.id==='grenade'||asset.id==='mine'?'<rect x="19" y="37" width="29" height="34" rx="9" fill="'+color+'" '+common+'/><rect x="27" y="25" width="14" height="12" fill="'+dark+'" '+common+'/>' :asset.id==='bow'?'<path d="M35 12 Q-7 44 35 86 M35 12 L35 86" fill="none" stroke="'+color+'" stroke-width="5"/><path d="M10 49 H52" stroke="#c7d5de" stroke-width="3"/>' :'<rect x="10" y="37" width="45" height="12" rx="3" fill="'+color+'" '+common+'/><rect x="16" y="48" width="11" height="24" fill="'+dark+'" '+common+'/><rect x="32" y="48" width="15" height="8" fill="'+color+'" '+common+'/><rect x="4" y="39" width="9" height="8" fill="#c1cbd0" '+common+'/>';
}else{
art='<rect x="12" y="33" width="42" height="44" rx="3" fill="'+color+'" '+common+'/><path d="M13 45 H53 M30 34 V77" stroke="#253442" stroke-width="3"/>';
if(['tree','bush'].includes(asset.id))art='<path d="M29 58 H38 V85 H29Z" fill="#846446" '+common+'/><circle cx="33" cy="39" r="25" fill="#598f59" '+common+'/><circle cx="17" cy="49" r="15" fill="#72ae66" '+common+'/>';
else if(asset.id==='rock')art='<path d="M5 71 L13 39 L39 22 L59 46 L54 78Z" fill="#8b969c" '+common+'/>';
else if(asset.id==='barrel'||asset.id==='explosive')art='<ellipse cx="33" cy="32" rx="19" ry="8" fill="#a6b2b4" '+common+'/><path d="M14 32 V70 Q33 85 52 70 V32" fill="'+(asset.id==='explosive'?'#b9564c':color)+'" '+common+'/><path d="M14 47 H52 M14 62 H52" stroke="#d4d7ce" stroke-width="5"/>';
else if(asset.id==='campfire')art='<path d="M14 75 L49 64 M49 75 L14 64" stroke="#946a41" stroke-width="9"/><path d="M31 15 Q52 49 32 67 Q11 55 24 37Z" fill="#efa742" '+common+'/>';
else if(asset.id==='lamp')art='<rect x="29" y="30" width="8" height="57" fill="#78848e" '+common+'/><path d="M14 30 L24 13 H42 L53 30Z" fill="#f2d484" '+common+'/>';
else if(asset.id==='medkit')art='<rect x="10" y="32" width="44" height="42" rx="6" fill="#f1f2e9" '+common+'/><path d="M29 39 h8 v27 h-8z M19 49 h28 v8 H19z" fill="#d65954"/>';
}
return '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="96" viewBox="0 0 64 96"><title>'+esc(asset.name)+'</title>'+art+'</svg>'}
export const animationClips=['idle','walk','run','attack','hurt','death','move','pulse','loop'];
const cache=new Map();
export function imageFor(id){if(cache.has(id))return cache.get(id);const asset=getAsset(id);if(!asset)return null;const img=new Image();img.src=asset.spriteUrl||'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgFor(asset));cache.set(id,img);return img}
export function urlFor(id){const asset=getAsset(id);return asset?(asset.spriteUrl||'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgFor(asset))):''}

const frameCache=new Map();
export function spriteFrameFor(id,animation,now,playing){
 const asset=getAsset(id);if(!asset)return null;
 const frames=asset.frames?.[animation==='run'?'walk':animation];
 if(!playing||!frames?.length)return imageFor(id);
 const url=frames[Math.floor(now/100)%frames.length];
 if(!frameCache.has(url)){const image=new Image();image.src=url;frameCache.set(url,image)}
 const image=frameCache.get(url);return image.complete&&image.naturalWidth?image:imageFor(id);
}
