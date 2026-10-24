// Additional offline WarLike content. Original SVG illustrations and stylized effect thumbnails.
export const expansion={
Characters:[['ranger','Forest Ranger'],['knight','Knight'],['pilot','Pilot'],['engineer','Engineer'],['assassin','Assassin'],['mage','Battle Mage'],['guard','City Guard'],['raider','Raider'],['ninja','Shadow Ninja'],['ninja-elite','Elite Ninja']],
Monsters:[['werewolf','Werewolf'],['spider','Giant Spider'],['bat','Cave Bat'],['wraith','Wraith'],['golem','Stone Golem'],['alien','Alien'],['mutant','Mutant'],['troll','Troll'],['zombie-runner','Runner Zombie'],['zombie-crawler','Crawler Zombie'],['zombie-brute','Brute Zombie']],
Vehicles:[['pickup','Pickup Truck'],['van','Cargo Van'],['truck','Military Truck'],['police-car','Police Car'],['ambulance','Ambulance'],['helicopter','Helicopter'],['hovercraft','Hovercraft'],['quad','Quad Bike']],
Weapons:[['katana','Katana'],['hammer','War Hammer'],['crossbow','Crossbow'],['flamethrower','Flamethrower'],['shield','Shield'],['laser','Laser Rifle'],['dagger','Dagger'],['spear','Spear']],
Props:[['pine','Pine Tree'],['mushroom','Mushroom'],['crystal','Mana Crystal'],['statue','Ancient Statue'],['well','Stone Well'],['tower','Watchtower'],['tent','Camp Tent'],['bench','Park Bench'],['traffic-cone','Traffic Cone'],['streetlight','Street Light'],['gas-pump','Gas Pump'],['ruins','Ruins']],
VFX:[['fire','Fire'],['smoke','Smoke'],['sparks','Sparks'],['explosion','Explosion'],['magic','Magic Burst'],['electric','Electric Arc'],['snow','Snowfall'],['rain','Rainfall'],['dust','Dust Cloud'],['heal','Healing Aura'],['portal','Portal'],['blood','Impact Splatter']]
};
const palettes={
Characters:['#638c72','#8692b7','#cf9d70','#e0b965','#724c69','#9677dc','#527c9b','#a75d50'],
Monsters:['#71545e','#624969','#435b77','#8d8ca4','#898c82','#74a9b0','#a36c6f','#8c674d'],
Vehicles:['#5d8271','#c3a96d','#647871','#526f95','#e8e9e1','#6d8c99','#628fa5','#b28b63'],
Weapons:['#b8c6d0','#9eabb0','#b79a6e','#bc8a6d','#6a91b1','#81e7e0','#bfc5d1','#9c8d6b'],
Props:['#59825c','#cc9d7e','#7be0e4','#a0a2a4','#9b9387','#a08665','#7b996e','#a57d56','#e79757','#a3b1b6','#b14e4b','#a49f92'],
VFX:['#ff973d','#b4bcc7','#f9d585','#f8794c','#b48dff','#75caff','#e6faff','#80adf3','#c3ac83','#68edaf','#ad85fb','#c76c6b']};
const palette=(asset)=>palettes[asset.category][asset.index%palettes[asset.category].length];
const base=(a,art)=>'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="96" viewBox="0 0 64 96"><title>'+a.name+'</title><ellipse cx="32" cy="90" rx="20" ry="4" fill="#142332" opacity=".26"/>'+art+'</svg>';
const outline=' stroke="#24323d" stroke-width="2.5" stroke-linejoin="round"';
function figure(a,c){const id=a.id,head=id==='werewolf'?'#887c69':a.category==='Monsters'?'#91a4a0':'#d7aa83';
const wings=id==='bat'||id==='wraith'||id==='alien'?' <path d="M21 46 L3 19 L8 63 L23 55 M44 46 L61 19 L56 63 L43 55" fill="'+c+'"'+outline+'/>':'';
const ears=id==='werewolf'||id==='troll'?' <path d="M19 22 L11 6 L27 18 M45 22 L53 6 L36 18" fill="'+head+'"'+outline+'/>':'';
const robot=id==='golem'||id==='alien';
const body='<path d="M19 62 L15 85 H29 L32 66 L37 85 H50 L46 62" fill="#34404a"'+outline+'/>'+
'<path d="M17 41 Q32 33 48 41 L49 65 Q31 74 15 65Z" fill="'+c+'"'+outline+'/>'+
'<path d="M17 44 L9 62 L17 68 L23 51 M48 44 L55 62 L47 68 L42 51" fill="'+c+'"'+outline+'/>'+
'<rect x="20" y="17" width="25" height="28" rx="'+(robot?5:12)+'" fill="'+head+'"'+outline+'/>';
const face='<path d="M24 30 H29 M37 30 H42" stroke="'+(a.category==='Monsters'?'#e66e70':'#243544')+'" stroke-width="3" stroke-linecap="round"/>';
const detail=id==='spider'?'<ellipse cx="32" cy="51" rx="23" ry="17" fill="'+c+'"'+outline+'/><path d="M14 47 L2 34 M14 58 L2 69 M50 47 L62 34 M50 58 L62 69" stroke="'+c+'" stroke-width="6"/><circle cx="25" cy="45" r="3" fill="#ef6168"/><circle cx="39" cy="45" r="3" fill="#ef6168"/>':
id==='golem'?'<path d="M18 47 H46 M24 65 L28 47 L39 57" stroke="#dae3ce" stroke-width="4" fill="none"/>':
id==='mage'?'<path d="M13 22 L32 3 L52 22Z" fill="#51417d"'+outline+'/><circle cx="47" cy="55" r="7" fill="#b8a3ff"/>':
id==='knight'||id==='guard'?'<path d="M17 26 Q32 8 48 26 L45 37 H20Z" fill="#a2b2b8"'+outline+'/><path d="M18 51 H47" stroke="#d1d7d6" stroke-width="5"/>':
id==='pilot'?'<path d="M17 24 Q31 6 49 24" fill="none" stroke="#495c6d" stroke-width="8"/><rect x="21" y="29" width="24" height="8" rx="3" fill="#759bac"/>':
id==='werewolf'?'<path d="M27 40 L32 46 L38 40" stroke="#f4d9a1" stroke-width="5" fill="none"/>':
id==='wraith'?'<path d="M11 65 Q21 80 13 87 Q31 79 38 88 Q49 80 53 69" fill="'+c+'" opacity=".65"/>':'';
return base(a,wings+ears+body+face+detail)}
function vehicle(a,c){const id=a.id;
if(id==='helicopter')return base(a,'<path d="M6 25 H58 M32 7 V31" stroke="#b5c5cd" stroke-width="5"/><ellipse cx="32" cy="55" rx="20" ry="28" fill="'+c+'"'+outline+'/><rect x="24" y="36" width="16" height="20" rx="5" fill="#8fbec8"/><path d="M12 62 L4 87 M52 62 L60 87" stroke="#566f78" stroke-width="5"/>');
if(id==='quad')return base(a,'<circle cx="12" cy="25" r="10" fill="#25333b"/><circle cx="52" cy="25" r="10" fill="#25333b"/><circle cx="12" cy="73" r="10" fill="#25333b"/><circle cx="52" cy="73" r="10" fill="#25333b"/><path d="M19 32 L45 32 L50 66 H14Z" fill="'+c+'"'+outline+'/><path d="M20 50 H44" stroke="#e1d5ad" stroke-width="6"/>');
if(id==='hovercraft')return base(a,'<ellipse cx="32" cy="52" rx="29" ry="40" fill="#33434d"'+outline+'/><ellipse cx="32" cy="49" rx="23" ry="33" fill="'+c+'"'+outline+'/><rect x="22" y="28" width="20" height="30" rx="5" fill="#7eacba"/><circle cx="32" cy="76" r="10" fill="#526872" stroke="#c3d1d3" stroke-width="3"/>');
const ambulance=id==='ambulance',police=id==='police-car',heavy=id==='truck'||id==='van';
return base(a,'<rect x="4" y="25" width="13" height="20" rx="5" fill="#2c373f"/><rect x="47" y="25" width="13" height="20" rx="5" fill="#2c373f"/><rect x="4" y="68" width="13" height="20" rx="5" fill="#2c373f"/><rect x="47" y="68" width="13" height="20" rx="5" fill="#2c373f"/><rect x="12" y="11" width="40" height="78" rx="'+(heavy?5:11)+'" fill="'+c+'"'+outline+'/><path d="M17 30 H47 L48 45 H16Z" fill="#8aaeb9"'+outline+'/><path d="M18 55 H46" stroke="#273e4b" stroke-width="4"/>'+(ambulance?'<path d="M30 56 H35 V76 H30Z M23 63 H42 V69 H23Z" fill="#d55657"/>':police?'<rect x="20" y="49" width="24" height="6" fill="#dc636c"/><rect x="20" y="54" width="24" height="6" fill="#629ee2"/>':heavy?'<path d="M18 64 H46 M18 72 H46" stroke="#293942" stroke-width="4"/>':'<rect x="23" y="65" width="18" height="13" fill="#556978"/>'))}
function weapon(a,c){const id=a.id;
if(id==='shield')return base(a,'<path d="M32 14 L53 25 L49 63 L32 84 L15 63 L11 25Z" fill="'+c+'"'+outline+'/><path d="M32 23 V75 M20 44 H44" stroke="#d8e2e5" stroke-width="5"/>');
if(['katana','dagger','spear'].includes(id))return base(a,'<path d="M30 '+(id==='dagger'?30:8)+' L38 '+(id==='dagger'?30:8)+' L37 63 L32 70 L27 62Z" fill="#c0d0d8"'+outline+'/><path d="M18 66 H47 M32 66 V88" stroke="'+c+'" stroke-width="7"/>');
if(id==='hammer')return base(a,'<rect x="11" y="16" width="43" height="23" rx="3" fill="#a5b8c4"'+outline+'/><rect x="29" y="35" width="8" height="55" fill="#9a7054"'+outline+'/>');
if(id==='crossbow')return base(a,'<path d="M5 44 Q32 8 59 44 L32 39Z" fill="'+c+'"'+outline+'/><path d="M6 44 H58 M32 25 V85" stroke="#d2bca2" stroke-width="4"/><path d="M26 50 H38 V77 H26Z" fill="#765f49"/>');
return base(a,'<rect x="7" y="37" width="50" height="14" rx="3" fill="'+c+'"'+outline+'/><rect x="17" y="50" width="11" height="22" fill="#2a3741"'+outline+'/><rect x="30" y="29" width="19" height="8" rx="2" fill="#5c7480"/><path d="M50 42 H62" stroke="#b9cbd4" stroke-width="4"/>')}
function props(a,c){const id=a.id;
if(id==='pine')return base(a,'<rect x="27" y="56" width="11" height="32" fill="#916d4e"/><path d="M32 3 L7 54 H20 L10 70 H54 L44 54 H57Z" fill="#638e74"'+outline+'/>');
if(id==='mushroom')return base(a,'<path d="M26 52 V80 H39 V52" fill="#eee0c4"'+outline+'/><path d="M7 53 Q7 18 32 18 Q57 18 57 53Z" fill="'+c+'"'+outline+'/><circle cx="23" cy="36" r="6" fill="#f3e4cc"/><circle cx="43" cy="43" r="5" fill="#f3e4cc"/>');
if(id==='crystal')return base(a,'<path d="M32 8 L52 32 L43 79 L32 88 L20 79 L11 32Z" fill="'+c+'" stroke="#d2ffff" stroke-width="3"/><path d="M11 32 H52 L32 88Z" fill="#69bdd0" opacity=".6"/><path d="M32 9 L32 88" stroke="#d8ffff" stroke-width="3"/>');
if(id==='traffic-cone')return base(a,'<path d="M22 18 H42 L53 80 H11Z" fill="'+c+'"'+outline+'/><path d="M18 57 H47 M23 35 H42" stroke="#ecf1eb" stroke-width="8"/><path d="M8 83 H56" stroke="#3c4850" stroke-width="9"/>');
if(id==='streetlight')return base(a,'<path d="M31 87 V19 H48 V25" stroke="#829da5" stroke-width="7" fill="none"/><path d="M41 24 H58 L52 37 H44Z" fill="#ffe5a1"'+outline+'/>');
if(id==='gas-pump')return base(a,'<rect x="15" y="25" width="35" height="55" rx="4" fill="'+c+'"'+outline+'/><rect x="22" y="32" width="20" height="18" fill="#c2d4d5"/><path d="M48 43 Q61 44 56 67" fill="none" stroke="#242c32" stroke-width="5"/>');
if(id==='tent')return base(a,'<path d="M32 8 L60 79 H4Z" fill="'+c+'"'+outline+'/><path d="M32 8 L32 79 L48 79Z" fill="#45576a"/><path d="M25 79 L32 49 L40 79Z" fill="#29353f"/>');
if(id==='well')return base(a,'<ellipse cx="32" cy="35" rx="25" ry="13" fill="#707b81"'+outline+'/><path d="M7 35 V75 Q31 92 57 75 V35" fill="'+c+'"'+outline+'/><ellipse cx="32" cy="36" rx="17" ry="8" fill="#233d4b"/><path d="M12 51 H52 M13 64 H51" stroke="#e4e0d3" stroke-width="4"/>');
if(id==='statue')return base(a,'<rect x="13" y="75" width="38" height="13" fill="#84979c"'+outline+'/><circle cx="32" cy="22" r="11" fill="'+c+'"'+outline+'/><path d="M21 34 H43 L48 75 H15Z" fill="'+c+'"'+outline+'/>');
if(id==='bench')return base(a,'<rect x="6" y="39" width="52" height="13" fill="'+c+'"'+outline+'/><path d="M13 50 V84 M51 50 V84 M10 26 H54" stroke="#847260" stroke-width="7"/>');
return base(a,'<rect x="12" y="29" width="40" height="49" rx="3" fill="'+c+'"'+outline+'/><path d="M14 44 H50 M20 65 H44" stroke="#d1dedb" stroke-width="4"/>')}
function effect(a,c){const id=a.id;let art='';
if(id==='portal')art='<ellipse cx="32" cy="49" rx="21" ry="36" fill="none" stroke="'+c+'" stroke-width="8"/><ellipse cx="32" cy="49" rx="13" ry="25" fill="#4058aa" opacity=".6"/>';
else if(id==='rain'||id==='snow')art=Array.from({length:13},(_,i)=>{const x=8+(i*23)%51,y=12+(i*37)%76;return id==='rain'?'<path d="M'+x+' '+y+' l-4 12" stroke="'+c+'" stroke-width="3"/>':'<circle cx="'+x+'" cy="'+y+'" r="3" fill="'+c+'"/>'}).join('');
else if(id==='electric')art='<path d="M42 8 L17 49 H32 L20 88 L51 39 H36Z" fill="'+c+'" stroke="#eafaff" stroke-width="2"/>';
else if(id==='fire')art='<path d="M32 7 Q49 29 39 42 Q58 42 52 67 Q47 86 31 84 Q12 85 13 62 Q16 42 26 35 Q25 51 36 46Z" fill="'+c+'" stroke="#f8cf66" stroke-width="3"/><path d="M31 43 Q42 58 34 81 Q22 77 25 61Z" fill="#ffe4a1"/>';
else if(id==='heal')art='<circle cx="32" cy="48" r="26" fill="none" stroke="'+c+'" stroke-width="5"/><path d="M28 27 H36 V43 H53 V52 H36 V69 H28 V52 H12 V43 H28Z" fill="'+c+'"/>';
else art=Array.from({length:10},(_,i)=>{let a=i*2*Math.PI/10,x=32+Math.cos(a)*16,y=48+Math.sin(a)*18,X=32+Math.cos(a)*31,Y=48+Math.sin(a)*34;return '<path d="M'+x+' '+y+' L'+X+' '+Y+'" stroke="'+c+'" stroke-width="'+(id==='smoke'?9:4)+'" stroke-linecap="round" opacity="'+(id==='smoke'?.48:1)+'"/>'}).join('')+'<circle cx="32" cy="48" r="8" fill="'+c+'"/>';
return base(a,art)}
const expansionIds=new Set(Object.values(expansion).flat().map(([id])=>id));
export function extraSvg(a){if(!expansionIds.has(a.id))return null;const c=palette(a);const type=a.category;return type==='Characters'||type==='Monsters'?figure(a,c):type==='Vehicles'?vehicle(a,c):type==='Weapons'?weapon(a,c):type==='Props'?props(a,c):type==='VFX'?effect(a,c):null}
