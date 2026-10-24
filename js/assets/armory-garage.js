// WarLike Armory & Garage V2.5. Original offline SVG silhouettes and configurable gameplay stats.
export const armory=[
 ['burst-rifle','Burst Rifle','rifle',25,.115,680],['marksman-rifle','Marksman Rifle','rifle',48,.42,980],
 ['heavy-machinegun','Heavy Machine Gun','rifle',18,.075,600],['compact-smg','Compact SMG','rifle',16,.065,520],
 ['tactical-shotgun','Tactical Shotgun','shotgun',62,.72,390],['double-barrel','Double Barrel','shotgun',78,.95,330],
 ['revolver','Revolver','pistol',52,.62,760],['machine-pistol','Machine Pistol','pistol',13,.075,470],
 ['energy-carbine','Energy Carbine','energy',27,.16,800],['plasma-cannon','Plasma Cannon','energy',65,1.2,460],
 ['crossbow-heavy','Heavy Crossbow','bow',53,.85,720],['longbow','Longbow','bow',38,.65,740],
 ['war-spear','War Spear','melee',39,.58,95],['greatsword','Greatsword','melee',66,.95,105],
 ['dual-daggers','Dual Daggers','melee',22,.28,80],['battle-axe','Battle Axe','melee',60,.85,105],
 ['warhammer','Warhammer','melee',73,1.1,105],['magic-scepter','Magic Scepter','energy',35,.38,600],
 ['ice-wand','Ice Wand','energy',31,.32,590],['fire-staff','Fire Staff','energy',42,.49,600],
 ['railgun','Railgun','rifle',90,1.35,1250],['grenade-launcher','Grenade Launcher','launcher',68,1.05,360],
 ['anti-armor-launcher','Anti-Armor Launcher','launcher',100,1.8,440],['laser-pistol','Laser Pistol','energy',22,.21,740]
];
export const garage=[
 ['offroad-suv','Offroad SUV','car',265,200,165,27],['armored-suv','Armored SUV','armored',185,145,360,31],
 ['city-hatchback','City Hatchback','car',230,185,120,22],['delivery-van','Delivery Van','truck',170,120,240,29],
 ['heavy-truck','Heavy Truck','truck',125,92,450,33],['fuel-tanker','Fuel Tanker','truck',110,80,300,34],
 ['police-suv','Police SUV','car',250,185,210,26],['swat-van','SWAT Van','armored',170,115,400,31],
 ['ambulance-van','Rescue Ambulance','truck',205,145,220,28],['rally-car','Rally Car','race',335,280,150,24],
 ['formula-racer','Formula Racer','race',395,330,130,22],['dune-buggy','Dune Buggy','race',315,260,145,23],
 ['motorcycle-sport','Sport Motorcycle','bike',360,280,90,18],['motorcycle-cruiser','Cruiser Motorcycle','bike',235,175,120,21],
 ['armored-carrier','Armored Carrier','armored',145,105,550,34],['scout-tank','Scout Tank','tank',150,105,430,33],
 ['heavy-tank','Heavy Tank','tank',85,60,850,42],['rocket-truck','Rocket Truck','military',118,88,470,33],
 ['command-truck','Command Truck','military',125,92,430,33],['rescue-boat','Rescue Boat','boat',205,140,200,25],
 ['patrol-boat','Patrol Boat','boat',250,165,260,26],['hover-bike','Hover Bike','hover',350,285,130,20],
 ['hover-tank','Hover Tank','hover',170,130,600,34],['cargo-forklift','Cargo Forklift','utility',80,65,240,25]
];
export const newWeaponEntries=armory.map(([id,name])=>[id,name]);
export const newVehicleEntries=garage.map(([id,name])=>[id,name]);
const weaponById=new Map(armory.map(row=>[row[0],row]));
const vehicleById=new Map(garage.map(row=>[row[0],row]));
export const weaponStats=id=>{const r=weaponById.get(id);return r?{weaponDamage:r[3],weaponInterval:r[4],weaponRange:r[5],weaponClass:r[2]}:null};
export const vehicleStats=id=>{const r=vehicleById.get(id);return r?{maxSpeed:r[3],acceleration:r[4],hp:r[5],collisionRadius:r[6],brakeForce:r[4]*1.3,turnRate:['tank','truck','armored','military'].includes(r[2])?65:155,drag:1.35,vehicleClass:r[2]}:null};
export const armoryGarageSvg=asset=>{
 const id=asset.id,w=weaponById.get(id),v=vehicleById.get(id);if(!w&&!v)return null;
 const text=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const bg='<ellipse cx="64" cy="92" rx="52" ry="7" fill="#07131b" opacity=".22"/>';
 let shapes='';
 if(w){
  const klass=w[2],color=klass==='energy'?'#65caee':klass==='melee'?'#d6c8a3':'#9dadb9';
  if(klass==='melee'){
   shapes='<path d="M29 80 L88 22 L101 27 L40 89Z" fill="#c4d3db" stroke="#334554" stroke-width="3"/><path d="M21 69 L50 94" stroke="#b39360" stroke-width="10" stroke-linecap="round"/>';
   if(/axe|hammer/.test(id))shapes+='<path d="M82 13 Q113 17 105 53 L80 48Z" fill="'+color+'" stroke="#364653" stroke-width="3"/>';
   if(/daggers/.test(id))shapes+='<path d="M85 78 L29 19 L35 13 L98 68Z" fill="#d6dfe4" stroke="#334554" stroke-width="3"/>';
  }else if(klass==='bow'){
   shapes='<path d="M28 15 Q107 46 29 91" fill="none" stroke="#b68a5f" stroke-width="9"/><path d="M28 15 L29 91 M28 51 L106 51" stroke="#d8e4e6" stroke-width="3"/>';
  }else{
   shapes='<rect x="17" y="35" width="90" height="25" rx="5" fill="#465e70" stroke="#20303d" stroke-width="3"/>'+
   '<rect x="14" y="40" width="24" height="9" fill="#c1d2d6"/><path d="M68 57 L80 81 H63 L53 57Z" fill="#273b4a" stroke="#182c36" stroke-width="3"/>'+
   '<rect x="86" y="31" width="23" height="8" rx="2" fill="'+color+'"/>';
   if(klass==='energy')shapes+='<rect x="25" y="40" width="53" height="10" rx="5" fill="#4be4e0"/><circle cx="85" cy="47" r="8" fill="#8cf9ee"/>';
   if(klass==='shotgun')shapes+='<path d="M16 33 H110 M16 39 H110" stroke="#e6b978" stroke-width="4"/>';
   if(klass==='launcher')shapes+='<rect x="13" y="28" width="91" height="22" rx="9" fill="#758e7b"/><rect x="91" y="25" width="21" height="28" rx="8" fill="#879996"/>';
   if(klass==='pistol')shapes='<path d="M23 32 H105 V49 H66 L62 84 H45 L47 49 H23Z" fill="#7d96a1" stroke="#253947" stroke-width="4"/>';
  }
 }else{
  const klass=v[2],heavy=['tank','armored','military','truck'].includes(klass);
  const color=klass==='race'?'#df985a':klass==='hover'?'#87b3df':klass==='boat'?'#79b6b1':heavy?'#7b8b75':'#6e9bb4';
  shapes='<rect x="15" y="34" width="98" height="42" rx="'+(heavy?4:12)+'" fill="'+color+'" stroke="#203643" stroke-width="4"/>'+
  '<path d="M40 34 L47 18 H86 L96 34Z" fill="#9dc3cf" stroke="#264656" stroke-width="3"/>'+
  '<rect x="27" y="40" width="27" height="12" rx="3" fill="#d3e2df"/>'+
  '<rect x="79" y="40" width="27" height="12" rx="3" fill="#d3e2df"/>'+
  '<circle cx="38" cy="77" r="11" fill="#253c44" stroke="#a9b7b2" stroke-width="3"/>'+
  '<circle cx="95" cy="77" r="11" fill="#253c44" stroke="#a9b7b2" stroke-width="3"/>';
  if(klass==='tank'||klass==='armored')shapes+='<rect x="42" y="29" width="44" height="19" rx="5" fill="#4d655e" stroke="#293f43" stroke-width="3"/><rect x="83" y="36" width="38" height="7" fill="#728c81"/>';
  if(klass==='race')shapes+='<path d="M18 62 H112" stroke="#faf7e1" stroke-width="5"/><path d="M48 23 H80" stroke="#273e47" stroke-width="5"/>';
  if(klass==='bike')shapes='<circle cx="33" cy="70" r="18" fill="none" stroke="#9eaeb6" stroke-width="7"/><circle cx="101" cy="70" r="18" fill="none" stroke="#9eaeb6" stroke-width="7"/><path d="M34 70 L57 38 L78 69 L101 70 L76 35Z" fill="none" stroke="'+color+'" stroke-width="8"/>';
  if(klass==='boat')shapes='<path d="M8 54 H121 L98 82 H29Z" fill="'+color+'" stroke="#284453" stroke-width="4"/><rect x="39" y="30" width="45" height="26" rx="5" fill="#9ccbd6"/><path d="M20 85 Q54 91 106 85" fill="none" stroke="#81d6ed" stroke-width="4"/>';
  if(klass==='hover')shapes+='<ellipse cx="65" cy="81" rx="50" ry="8" fill="#5bdeef" opacity=".55"/>';
  if(klass==='utility')shapes+='<path d="M108 34 H120 V89 H106 V54 H84" fill="none" stroke="#d9d9c0" stroke-width="7"/>';
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 104" width="128" height="104"><title>'+text(asset.name)+'</title>'+bg+shapes+'</svg>';
};
