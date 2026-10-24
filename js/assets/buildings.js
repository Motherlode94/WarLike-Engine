// Original, self-contained 2D building catalogue and isometric-inspired SVG artwork.
export const buildings=[
 ['rts-hq','Command HQ','RTS'],['rts-barracks','Barracks','RTS'],['rts-factory','Vehicle Factory','RTS'],
 ['rts-power','Power Plant','RTS'],['rts-refinery','Refinery','RTS'],['rts-radar','Radar Station','RTS'],
 ['rts-turret','Defense Turret','RTS'],['rts-depot','Resource Depot','RTS'],['rts-lab','Research Center','RTS'],
 ['rts-bunker','Bunker','RTS'],
 ['city-house','Family House','City'],['city-apartments','Apartments','City'],['city-shop','Shop','City'],
 ['city-hospital','Hospital','City'],['city-school','School','City'],['city-firestation','Fire Station','City'],
 ['city-police','Police Station','City'],['city-warehouse','Warehouse','City'],
 ['fantasy-inn','Tavern / Inn','Fantasy'],['fantasy-blacksmith','Blacksmith','Fantasy'],
 ['fantasy-castle','Castle','Fantasy'],['fantasy-temple','Temple','Fantasy'],
 ['fantasy-mage-tower','Mage Tower','Fantasy'],['fantasy-stable','Stable','Fantasy'],
 ['survival-safehouse','Safehouse','Survival'],['survival-lab','Abandoned Laboratory','Survival'],
 ['survival-cabin','Wooden Cabin','Survival'],['military-hangar','Aircraft Hangar','Military'],
 ['military-armory','Armory','Military'],['military-watchtower','Watchtower','Military'],
 ['sports-stadium','Stadium','Sports'],['sports-gym','Training Gym','Sports']
];
export const buildingGroups=['RTS','City','Fantasy','Survival','Military','Sports'];
export const getBuilding=id=>buildings.find(b=>b[0]===id);
export const defaults=(asset)=>({
 buildState:'idle',constructionProgress:100,buildHp:asset?.hp||500,buildMaxHp:asset?.hp||500,
 buildLevel:1,buildTeam:0,buildPowered:true,buildCollision:true,
 buildProduction:'none',buildTime:8,buildQueue:0,buildTimer:0,buildGrid:32
});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shape=(p,fill,stroke='#253441',width=2)=>'<path d="'+p+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+width+'" stroke-linejoin="round"/>';
const rect=(x,y,w,h,fill,rx=2)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+fill+'" stroke="#253441" stroke-width="1.6"/>';
const addWindows=(n,level=1)=>Array.from({length:n},(_,i)=>{let x=14+(i%4)*15,y=44+Math.floor(i/4)*14;return rect(x,y,8,9,level===1?'#c6e3f0':'#405e76',1)}).join('');
function art(a){
 const [id,,group]=a,castle=group==='Fantasy',rts=group==='RTS',city=group==='City';
 const colors={RTS:['#647b83','#405967','#bdab79'],City:['#d6a66e','#8e705e','#7bb3ba'],Fantasy:['#9a8f82','#6b6886','#d3af73'],Survival:['#818b7b','#4c645e','#af8d74'],Military:['#718274','#3b584f','#a8a995'],Sports:['#729bab','#c3c9d0','#65bda9']}[group];
 const [base,roof,trim]=colors,shadow='<ellipse cx="48" cy="87" rx="38" ry="7" fill="#091a24" opacity=".24"/>';
 let building=shadow+shape('M7 38 L47 17 L90 38 L48 60Z',roof)+shape('M7 38 L48 60 V89 L7 68Z',base)+shape('M48 60 L90 38 V68 L48 89Z',base);
 const door=shape('M33 66 L44 71 V88 L33 82Z','#35404a')+shape('M44 71 L53 67 V87 L44 88Z','#566978');
 const trimLine=shape('M8 47 L47 69 L89 47','none',trim,2);
 let detail=door+trimLine;
 if(id.includes('hq')||id.includes('police')||id.includes('armory'))detail+=shape('M46 24 L47 9 L67 17 L65 31Z',trim)+rect(54,12,8,7,'#2e5873');
 if(id.includes('tower')||id.includes('temple')||id.includes('castle'))detail+=shape('M34 21 L34 6 L48 0 L62 8 L62 28Z',trim)+rect(44,8,8,13,'#536473')+shape('M28 24 L45 3 L65 24Z',roof);
 if(id.includes('radar'))detail+='<ellipse cx="48" cy="20" rx="28" ry="11" transform="rotate(-28 48 20)" fill="#bad1d5" stroke="#364b5b" stroke-width="3"/>'+shape('M42 25 L45 43 L56 43 L55 24Z','#60747c');
 if(id.includes('turret'))detail+='<circle cx="49" cy="32" r="15" fill="#455b61" stroke="#203444" stroke-width="4"/>'+shape('M47 30 L81 13 L85 21 L51 41Z','#b8bdb1');
 if(id.includes('power'))detail+=rect(20,19,12,33,'#b0b5b6')+rect(55,15,14,36,'#91a7ac')+shape('M32 10 L25 28 L37 28 L29 47 L48 22 L37 22Z','#f6dd70');
 if(id.includes('refinery')||id.includes('factory')||id.includes('hangar')||id.includes('warehouse'))detail+=rect(12,45,23,25,'#526c73')+rect(60,46,23,18,'#b8c5c8')+shape('M16 61 H33 M64 59 H82','none','#2b4354',3);
 if(id.includes('hospital'))detail+=rect(49,40,22,22,'#f1ebd9')+shape('M57 43 H63 V49 H69 V55 H63 V61 H57 V55 H51 V49 H57Z','#cb5755','#cb5755',0);
 if(id.includes('firestation'))detail+=rect(55,46,27,24,'#b95b55')+shape('M56 56 H81 M56 63 H81','none','#f5d4be',3);
 if(id.includes('school'))detail+=shape('M20 30 L37 22 L52 30 L52 49 L20 40Z','#e7d6ad')+rect(29,28,12,10,'#6394a1');
 if(id.includes('stadium')){building=shadow+shape('M5 38 Q48 -7 91 38 V69 Q48 100 5 69Z',base)+shape('M13 37 Q48 6 83 37 V63 Q48 90 13 63Z','#e8eaeb')+shape('M22 40 Q48 20 74 40 V60 Q48 80 22 60Z','#508b63');detail='<path d="M47 28 V72 M22 50 H74" stroke="#f1f4ea" stroke-width="2"/>'}
 if(id.includes('gym'))detail+=shape('M26 32 H57 L64 40 L33 50Z','#eee5c6')+shape('M39 37 H52 M45 32 V42','none','#5998a4',3);
 if(id.includes('blacksmith'))detail+=shape('M55 61 Q53 47 64 43 Q75 55 68 65Z','#ee9450')+shape('M68 55 L77 49 L83 55 L74 62Z','#b6c6c8');
 if(id.includes('mage'))detail+='<circle cx="50" cy="16" r="9" fill="#7d83e5" stroke="#ddd4ff" stroke-width="3"/>'+shape('M50 3 L55 12 L65 16 L55 21 L50 31 L45 21 L35 16 L45 12Z','#cfb1ed');
 if(id.includes('stable'))detail+=shape('M19 44 L35 35 L52 44Z','#ad805b')+shape('M62 63 Q73 46 81 65 L78 77 L60 80Z','#704f40');
 if(id.includes('bunker')||id.includes('safehouse'))detail+=rect(15,47,21,7,'#2f4149')+rect(59,46,22,7,'#2f4149');
 if(id.includes('lab'))detail+=rect(60,47,18,17,'#67d8dd')+rect(17,46,17,11,'#9de7e1');
 if(id.includes('shop')||id.includes('inn'))detail+=shape('M12 45 L36 54 L36 62 L12 52Z','#bc5658')+shape('M59 55 L84 43 L84 52 L59 65Z','#d7b46a');
 if(id.includes('apartment'))detail+=addWindows(8);
 else if(city||castle)detail+=addWindows(4);
 return '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><title>'+esc(a[1])+'</title><defs><linearGradient id="roof" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#ffffff" stop-opacity=".25"/><stop offset="1" stop-color="#081823" stop-opacity=".22"/></linearGradient></defs>'+building+detail+shape('M7 38 L47 17 L90 38 L48 60Z','url(#roof)','#253441',1)+'</svg>';
}
const cache=new Map();
export function buildingSvg(id){if(!cache.has(id)){const a=getBuilding(id);if(!a)return null;cache.set(id,art(a))}return cache.get(id)}
export function buildingPreviewState(ctx,o,now){
 const state=o.buildState||'idle',hp=o.buildHp??o.hp??500,max=o.buildMaxHp??500,ratio=Math.max(0,Math.min(1,hp/Math.max(1,max)));
 if(state==='idle'&&ratio>.95)return;
 ctx.save();ctx.translate(o.x,o.y);if(state==='construction'){const p=Math.max(0,Math.min(100,o.constructionProgress??0));ctx.fillStyle='#0a1d29bb';ctx.fillRect(0,o.h+3,o.w,5);ctx.fillStyle='#5dddb4';ctx.fillRect(0,o.h+3,o.w*p/100,5)}
 if(state==='damaged'||ratio<.5){ctx.strokeStyle='#d75b4b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(o.w*.28,o.h*.2);ctx.lineTo(o.w*.52,o.h*.4);ctx.lineTo(o.w*.39,o.h*.63);ctx.stroke()}
 if(state==='destroyed'){ctx.fillStyle='#10222dbb';ctx.fillRect(0,0,o.w,o.h);ctx.strokeStyle='#ff8c65';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(o.w,o.h);ctx.moveTo(o.w,0);ctx.lineTo(0,o.h);ctx.stroke()}
 if(state==='powered_off'){ctx.fillStyle='#07111b88';ctx.fillRect(0,0,o.w,o.h)}
 if(state==='burning'){for(let i=0;i<5;i++){const x=(i+.5)*o.w/5,y=8+Math.sin(now/170+i)*8;ctx.fillStyle=i%2?'#f6cb69':'#e8754e';ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill()}}
 ctx.restore();
}
