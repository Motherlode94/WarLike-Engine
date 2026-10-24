// WarLike Studio: Genre Essentials — 72 original offline vector assets.
// Each asset has distinct geometry and deterministic styling; no external images.
export const genrePack={
 Characters:[
 ['footballer','Football Player'],['basketballer','Basketball Player'],['tennis-player','Tennis Player'],['referee','Referee'],
 ['boxer','Boxer'],['wrestler','Wrestler'],['samurai','Samurai'],['pirate','Pirate'],['farmer','Farmer'],['firefighter','Firefighter']
 ],
 Monsters:[
 ['zombie-nurse','Zombie Nurse'],['zombie-soldier','Zombie Soldier'],['zombie-dog','Zombie Dog'],['infected-mutant','Infected Mutant'],
 ['ghost','Ghost'],['vampire','Vampire'],['orc','Orc'],['dragon-whelp','Dragon Whelp'],['giant-rat','Giant Rat'],['sand-worm','Sand Worm']
 ],
 Vehicles:[
 ['sports-car','Sports Car'],['race-car','Race Car'],['bus','City Bus'],['taxi','Taxi'],['firetruck','Fire Truck'],
 ['tractor','Tractor'],['motorboat','Motorboat'],['speedboat','Speedboat'],['fighter-jet','Fighter Jet'],['harvester','RTS Harvester']
 ],
 Weapons:[
 ['boxing-glove','Boxing Glove'],['hockey-stick','Hockey Stick'],['fencing-sword','Fencing Sword'],['baseball-bat','Baseball Bat'],
 ['chakram','Chakram'],['boomerang','Boomerang'],['mace','Mace'],['scythe','Scythe'],['tactical-baton','Baton'],['wand','Magic Wand']
 ],
 Props:[
 ['football','Football'],['basketball','Basketball'],['tennis-ball','Tennis Ball'],['volleyball','Volleyball'],
 ['football-goal','Football Goal'],['basketball-hoop','Basketball Hoop'],['tennis-net','Tennis Net'],['boxing-ring','Boxing Ring'],
 ['scoreboard','Scoreboard'],['stadium-seat','Stadium Seat'],['training-cone','Training Cone'],['trophy','Trophy'],
 ['road-straight','Road Segment'],['road-corner','Road Corner'],['road-crossing','Road Crossing'],['traffic-barrier','Traffic Barrier'],
 ['street-sign','Street Sign'],['hydrant','Fire Hydrant'],['trash-bin','Trash Bin'],['bicycle-rack','Bicycle Rack'],
 ['crop-field','Crop Field'],['fishing-boat','Fishing Boat'],['wooden-palisade','Wooden Palisade'],['stone-wall','Stone Wall']
 ],
 VFX:[
 ['sword-swipe','Sword Swipe'],['punch-impact','Punch Impact'],['speed-trail','Speed Trail'],['goal-confetti','Goal Confetti'],
 ['engine-flame','Engine Flame'],['tire-skid','Tire Skid'],['water-splash','Water Splash'],['shield-burst','Shield Burst']
 ]
};
export const genreAssets=Object.entries(genrePack).flatMap(([category,rows])=>rows.map(([id,name])=>({id,name,category})));
const lookup=new Map(genreAssets.map(a=>[a.id,a]));
export const hasGenreAsset=id=>lookup.has(id);
export const genreKeywords=id=>{
 if(!lookup.has(id))return '';
 if(/football|basketball|tennis|referee|boxer|wrestler|hockey|volleyball|goal|hoop|net|ring|scoreboard|stadium|training|trophy|fencing|baseball/.test(id))return 'sport sports sports-game fight combat arena';
 if(/harvester|resource|palisade|stone-wall|crop|farmer|orc|dragon|worm|samurai|vampire|wand|mace|scythe/.test(id))return 'rts stratégie strategy fantasy medieval';
 if(/road|car|bus|taxi|firetruck|tractor|traffic|hydrant|trash|bicycle|barrier|seat/.test(id))return 'city ville simulation racing course conduite';
 if(/boat|splash/.test(id))return 'water mer marine naval';
 if(/zombie|mutant|ghost|rat|infected/.test(id))return 'survival horror zombie';
 return 'action aventure adventure combat';
};

const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hash=s=>[...s].reduce((n,c)=>(n*33+c.charCodeAt(0))>>>0,5381);
const path=(d,color,stroke='#203040',sw=2)=>'<path d="'+d+'" fill="'+color+'" stroke="'+stroke+'" stroke-width="'+sw+'" stroke-linejoin="round" stroke-linecap="round"/>';
const rect=(x,y,w,h,c,r=3)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+c+'" stroke="#203040" stroke-width="2"/>';
const circle=(x,y,r,c)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+c+'" stroke="#203040" stroke-width="2"/>';
const line=(d,c='#dbe5e6',w=3)=>'<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round"/>';
const base=(asset,body)=>'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><title>'+esc(asset.name)+'</title><ellipse cx="48" cy="86" rx="37" ry="6" fill="#071622" opacity=".2"/>'+body+'</svg>';
function actorArt(id,color,monster){
 const skin=monster?'#95a992':'#d8ad8c',wear=monster?'#536c60':color;
 let body=path('M29 59 L22 82 H38 L44 62 L54 82 H69 L65 57Z','#2b3947')+
 path('M31 32 L64 32 L70 60 H26Z',wear)+
 line('M30 38 L17 58 M66 38 L79 58',wear,10)+
 circle(48,23,13,skin)+line('M42 22 L45 22 M53 22 L56 22','#1b2630',2);
 if(/football|basketball|tennis|referee/.test(id))body+=rect(40,34,15,15,id==='referee'?'#f1f3f0':'#f5f0d5',1)+line('M34 36 L34 57 M60 36 L60 57',id==='referee'?'#101e29':'#fff',4);
 if(/footballer/.test(id))body+=circle(74,77,8,'#f2f2e6')+line('M70 74 L77 80','#182a36',2);
 if(/basketballer/.test(id))body+=circle(78,64,11,'#c67b43')+line('M68 63 H88 M78 54 V74','#4c3832',2);
 if(/tennis-player/.test(id))body+=path('M77 41 Q93 39 85 59 Q71 66 69 48Z','#a7cad0')+line('M70 58 L60 73','#d8be8b',5);
 if(/boxer|wrestler/.test(id))body+=circle(17,56,10,'#c84c5a')+circle(78,56,10,'#c84c5a');
 if(/samurai/.test(id))body+=path('M27 20 L35 4 L60 4 L69 20Z','#2f3b49')+line('M76 20 L86 74','#d8dae2',4);
 if(/pirate/.test(id))body+=path('M27 17 Q48 -2 69 17 L74 25 H22Z','#384756')+rect(52,22,13,4,'#22272d');
 if(/farmer/.test(id))body+=path('M21 21 H74 L62 12 H32Z','#d9b66c')+line('M74 31 L79 74','#987951',4);
 if(/firefighter/.test(id))body+=path('M27 23 L32 10 H65 L71 23Z','#efbe65')+line('M35 53 H61','#efcd75',4);
 if(/zombie-nurse/.test(id))body+=path('M30 12 H66 L60 4 H36Z','#e7e6dc')+path('M44 9 H52 M48 5 V13','none','#ad494b',3);
 if(/zombie-soldier|orc/.test(id))body+=path('M29 18 L38 9 H59 L68 18Z','#38453f')+line('M32 48 H66','#ac9e70',7);
 if(/ghost/.test(id))body=path('M30 43 Q23 6 48 8 Q74 6 69 43 L72 82 L59 74 L48 84 L36 74 L22 83Z','#b7d1e1')+circle(39,35,4,'#27445b')+circle(56,35,4,'#27445b');
 if(/vampire/.test(id))body+=path('M30 31 L12 78 L48 67 L82 78 L65 31Z','#5d354f')+line('M45 33 L46 39 M52 33 L54 39','#fff',2);
 if(/dragon-whelp/.test(id))body+=path('M29 46 L4 30 L16 59 L30 64Z','#a4a06e')+path('M65 44 L91 25 L82 61 L65 65Z','#a4a06e')+path('M35 14 L39 1 L44 16 M56 15 L65 2 L64 20','#d1b67c');
 if(/zombie-dog|giant-rat/.test(id))body=path('M14 54 Q42 24 70 53 L80 70 H13Z',wear)+circle(72,41,13,skin)+path('M64 30 L61 11 L76 28Z','#aa9085')+line('M17 67 L11 82 M48 70 L48 82 M67 69 L75 82',wear,6)+line('M12 48 Q0 40 8 29','#986c79',4);
 if(/sand-worm/.test(id))body=path('M12 80 Q4 60 35 55 Q54 47 45 28 Q37 8 58 9 Q90 8 74 40 Q64 50 77 81Z','#bba184')+circle(58,28,10,'#39404a');
 if(/infected-mutant/.test(id))body+=path('M31 40 L18 47 L7 35 L15 25 L39 31Z','#729d77')+circle(25,25,7,'#9fc277');
 return body;
}
function vehicleArt(id,color){
 const water=/boat/.test(id),air=/jet/.test(id);
 let body=rect(10,38,76,35,color,10)+path('M30 37 L40 20 H63 L74 37Z','#a4c8d6')+rect(18,49,15,9,'#d9d3a5')+rect(65,49,14,9,'#d9d3a5')+circle(27,76,9,'#27323b')+circle(70,76,9,'#27323b');
 if(/bus/.test(id))body=rect(8,25,80,47,color,7)+Array.from({length:4},(_,i)=>rect(13+i*18,31,15,17,'#8ebed1',1)).join('')+circle(24,76,9,'#25313d')+circle(73,76,9,'#25313d');
 if(/firetruck/.test(id))body+=line('M24 28 H75 M27 22 H72','#ddd8ca',5)+rect(45,44,18,21,'#c9d2d9',1);
 if(/taxi/.test(id))body+=rect(42,15,17,9,'#f2d893',1);
 if(/race|sports/.test(id))body+=path('M8 56 L3 45 L30 50 L62 50 L90 45 L86 58Z','#efe9e4')+line('M25 64 H72','#f0f2f0',3);
 if(/tractor|harvester/.test(id))body=rect(10,40,68,32,color)+rect(43,19,28,26,'#a2c3bb')+circle(26,78,16,'#333a39')+circle(75,79,10,'#333a39')+(/harvester/.test(id)?line('M5 59 H91 M6 53 H90','#dacb7b',4):'');
 if(water)body=path('M5 53 H91 L71 78 H24Z',color)+path('M29 51 L36 27 H66 L74 51Z','#9ecbd9')+line('M14 77 Q47 85 83 77','#6ab5d0',3)+(/speedboat/.test(id)?line('M28 26 L66 26','#eadb9c',5):'');
 if(air)body=path('M45 5 L58 45 L94 59 L94 68 L56 61 L53 86 H41 L38 61 L2 68 L2 59 L39 45Z',color)+path('M42 37 L49 22 L54 37Z','#a8c7d6');
 return body;
}
function weaponArt(id,color){
 let body=path('M18 77 L67 26 L72 31 L24 83Z',color)+path('M61 20 L73 7 L87 20 L75 34Z','#c8d4d8');
 if(/glove/.test(id))body=path('M19 44 Q6 24 28 18 Q35 8 47 19 Q64 13 65 32 L70 48 L49 70 L27 66Z','#cf5860')+rect(25,63,28,19,'#913c4a');
 if(/stick|bat|baton/.test(id))body=path('M27 78 L59 15 L69 19 L35 83Z',color);
 if(/fencing|scythe/.test(id))body=line('M20 82 L77 13','#d8e8e9',4)+path(/scythe/.test(id)?'M77 13 Q88 22 84 45 Q80 28 56 29Z':'M74 9 L82 14 L72 21Z','#bdcad0');
 if(/chakram/.test(id))body=circle(50,42,26,'#e1e3d7')+circle(50,42,15,'#233540');
 if(/boomerang/.test(id))body=path('M16 70 L62 18 L83 40 L62 33Z',color);
 if(/mace/.test(id))body=line('M22 80 L69 29','#9e7d55',8)+circle(70,22,16,'#9aadb5')+line('M70 5 V39 M53 22 H87','#d6e1e5',4);
 if(/wand/.test(id))body=line('M17 82 L66 27','#a58e66',5)+path('M67 4 L73 18 L88 23 L74 31 L69 46 L60 30 L45 23 L61 18Z','#b5a4e9');
 return body;
}
function propArt(id,color){
 let body=rect(16,25,62,50,color);
 if(/football|basketball|tennis-ball|volleyball/.test(id))body=circle(48,48,/tennis/.test(id)?23:30,id==='basketball'?'#ce8552':id==='tennis-ball'?'#b5d46a':id==='volleyball'?'#f0e7d2':'#e9eee9')+line(id==='basketball'?'M18 48 H78 M48 18 V78':id==='football'?'M36 31 L60 31 L70 48 L56 69 L34 65 L23 46Z':'M28 27 Q49 47 28 70 M68 27 Q47 47 68 70',id==='basketball'?'#51352b':'#4c6060',3);
 if(/goal/.test(id))body=line('M10 76 V20 H86 V76 M10 32 L86 32 M24 20 V76 M42 20 V76 M60 20 V76 M76 20 V76','#e7ebea',4);
 if(/hoop/.test(id))body=rect(18,10,60,42,'#dfe9ed')+circle(47,49,20,'#d98451')+line('M28 49 V72 M66 49 V72','#dfe7dd',3);
 if(/net/.test(id))body=line('M9 22 V78 M87 22 V78 M9 28 H87 M9 45 H87 M9 62 H87 M25 28 V77 M45 28 V77 M65 28 V77','#dfebed',3);
 if(/ring/.test(id))body=rect(9,46,79,36,'#718d9d')+line('M9 48 H88 M9 59 H88 M9 71 H88','#e3dee0',3)+line('M10 22 V84 M85 22 V84','#cdd2d9',5);
 if(/scoreboard/.test(id))body=rect(9,17,78,57,'#263849')+rect(16,26,29,30,'#212c34')+rect(51,26,29,30,'#212c34')+line('M24 39 H36 M59 39 H72','#e3d46d',5);
 if(/seat|bench/.test(id))body=rect(18,32,62,28,color,7)+rect(13,61,71,12,'#465c6f');
 if(/cone/.test(id))body=path('M47 9 L69 78 H25Z',color)+line('M33 59 H62','#f2f0de',7);
 if(/trophy/.test(id))body=path('M28 21 H68 L63 53 L53 63 H43 L33 53Z','#dcb758')+path('M28 30 Q9 24 14 44 L34 48 M68 30 Q87 24 82 44 L63 48','none','#dcb758',6)+rect(38,65,24,11,'#998045');
 if(/road/.test(id))body=rect(4,4,88,88,'#47535a',0)+line(id==='road-corner'?'M49 96 V50 H95':id==='road-crossing'?'M48 0 V96 M0 48 H96':'M48 0 V96','#eddea2',4);
 if(/barrier/.test(id))body=rect(7,38,82,20,'#dd8b68')+line('M16 40 L30 57 M40 40 L54 57 M64 40 L78 57','#fff3e5',5);
 if(/street-sign/.test(id))body=line('M46 18 V86','#8999a3',6)+rect(16,13,63,26,'#76adba');
 if(/hydrant/.test(id))body=rect(34,24,29,55,'#ce6261',8)+circle(49,21,11,'#da6a67')+line('M20 52 H75','#e5aea0',8);
 if(/trash-bin/.test(id))body=rect(23,28,49,51,'#587b7a')+rect(18,21,58,9,'#9dbbbb');
 if(/bicycle/.test(id))body=circle(25,68,18,'none')+circle(74,68,18,'none')+line('M25 68 L43 43 L74 68 L52 68 L43 43 M52 68 L59 37','#b0bdc3',4);
 if(/crop/.test(id))body=rect(5,49,86,33,'#89725a')+Array.from({length:5},(_,i)=>line('M'+(12+i*18)+' 75 L'+(12+i*18)+' 24','#8ec57a',5)).join('');
 if(/fishing-boat/.test(id))body=path('M6 58 H90 L75 80 H25Z',color)+line('M48 17 V57 M48 17 L77 50 H48','#dfe7e3',4);
 if(/palisade|stone-wall/.test(id))body=Array.from({length:6},(_,i)=>rect(6+i*14,18,14,64,id==='stone-wall'?'#84939a':'#947859',1)).join('');
 return body;
}
function effectArt(id,color){
 let body='';
 const seed=hash(id);
 for(let i=0;i<13;i++){
  const theta=(i*2.39996+(seed%25)/20),r=12+(i*9)%34,x=48+Math.cos(theta)*r,y=48+Math.sin(theta)*r;
  if(/trail|skid|swipe/.test(id))body+=line('M'+Math.round(x-14)+' '+Math.round(y+8)+' L'+Math.round(x+6)+' '+Math.round(y-11),color,2+i%4);
  else body+=circle(Math.round(x),Math.round(y),2+i%5,i%2?'#f6df9c':color);
 }
 if(/shield/.test(id))body+=circle(48,48,22,'none')+line('M48 30 V66 M32 48 H64',color,3);
 if(/flame/.test(id))body+=path('M45 77 Q22 53 43 25 Q49 39 54 15 Q80 53 56 77Z',color);
 if(/splash/.test(id))body+=path('M18 66 Q48 36 76 66Z','#79c0e2');
 return body;
}
const colors={Characters:['#577f9c','#a17a65','#51796e','#b4a163'],Monsters:['#6f8570','#8d697f','#697d91'],Vehicles:['#bf7c59','#5d8a9a','#8f9a62'],Weapons:['#aabec6','#caab70'],Props:['#bd9b6b','#76a69e','#a0aab3'],VFX:['#8acdeb','#eaab78','#b7a0e6']};
export function genreSvg(asset){
 const own=lookup.get(asset.id);if(!own)return null;
 const palette=colors[own.category],color=palette[hash(own.id)%palette.length];
 const art=own.category==='Characters'||own.category==='Monsters'?actorArt(own.id,color,own.category==='Monsters'):
 own.category==='Vehicles'?vehicleArt(own.id,color):
 own.category==='Weapons'?weaponArt(own.id,color):
 own.category==='Props'?propArt(own.id,color):effectArt(own.id,color);
 return base(own,art);
}
