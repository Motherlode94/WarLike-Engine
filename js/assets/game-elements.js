// Original game element library (drawn procedurally; no external downloads).
export const elements=[
 ['coin','Pièce','Pickups'],['gem','Gemme','Pickups'],['health-pickup','Kit de soins','Pickups'],['ammo-pickup','Munitions','Pickups'],
 ['keycard','Carte d’accès','Pickups'],['shield-pickup','Bouclier','Pickups'],['speed-pickup','Boost vitesse','Pickups'],['quest-scroll','Parchemin de quête','Pickups'],
 ['checkpoint','Checkpoint','Gameplay'],['spawn-pad','Point d’apparition','Gameplay'],['portal-pad','Portail','Gameplay'],['teleporter','Téléporteur','Gameplay'],
 ['pressure-plate','Plaque de pression','Gameplay'],['lever','Levier','Gameplay'],['locked-gate','Porte verrouillée','Gameplay'],['save-terminal','Terminal de sauvegarde','Gameplay'],
 ['spike-trap','Piège à pics','Hazards'],['laser-trap','Laser','Hazards'],['toxic-pool','Bassin toxique','Hazards'],['mine-trap','Mine','Hazards'],
 ['boost-pad','Accélérateur','Racing'],['jump-pad','Plateforme de saut','Racing'],['finish-line','Ligne d’arrivée','Racing'],['traffic-light','Feu tricolore','Racing'],
 ['capture-flag','Drapeau de capture','RTS'],['resource-node','Gisement','RTS'],['supply-crate','Caisse de ravitaillement','RTS'],['rally-point','Point de ralliement','RTS']
];
export const elementGroups=['Pickups','Gameplay','Hazards','Racing','RTS'];
export const elementDef=id=>elements.find(([key])=>key===id);
const C={Pickups:'#6ad9b2',Gameplay:'#74aeed',Hazards:'#ef856c',Racing:'#ebc36d',RTS:'#aa97e8'};
export function elementSvg(id){
 const a=elementDef(id);if(!a)return null;
 const [name,,group]=a,color=C[group];let inside='';
 const circle=(x,y,r,fill)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'"/>';
 const path=(d,fill)=>'<path d="'+d+'" fill="'+fill+'" stroke="#1e3040" stroke-width="2.5" stroke-linejoin="round"/>';
 if(/coin|gem|resource-node/.test(name))inside=name==='coin'?circle(32,32,18,'#ebbf5d')+circle(32,32,11,'#ffec9e'):path('M32 5 L51 25 L40 56 L23 56 L12 25Z',name==='gem'?'#7de3da':'#b0a1ee')+path('M12 25 H51 L32 55Z','#f5ffff77');
 else if(/health|save/.test(name))inside=path('M26 10 H38 V26 H54 V38 H38 V54 H26 V38 H10 V26 H26Z','#f1f3f5');
 else if(/ammo|supply/.test(name))inside=path('M17 19 L27 9 L37 19 V52 H17Z','#dbd3a4')+path('M40 19 L50 9 L54 22 V52 H40Z','#9b806a');
 else if(/keycard/.test(name))inside=path('M10 16 H54 V48 H10Z','#a1c5db')+circle(43,32,7,'#467f9c');
 else if(/shield/.test(name))inside=path('M32 5 L52 16 L48 43 L32 57 L16 43 L12 16Z','#91aafa');
 else if(/speed|boost|jump/.test(name))inside=path('M35 6 L14 37 H29 L24 57 L51 25 H35Z','#f2cf71');
 else if(/checkpoint|spawn|rally/.test(name))inside=path('M14 52 V10 H22 V52Z','#c3d5e2')+path('M22 10 L51 19 L22 31Z',color);
 else if(/portal|teleport/.test(name))inside='<ellipse cx="32" cy="32" rx="18" ry="25" fill="#284779" stroke="#a6dfff" stroke-width="7"/>'+circle(32,32,8,'#aaccff');
 else if(/lever|pressure|locked-gate/.test(name))inside=path('M10 46 H54 V56 H10Z','#a0abb5')+path('M31 44 L45 8 L52 14 L37 48Z','#e5ad79');
 else if(/spike|mine|laser/.test(name))inside=path('M8 52 L18 14 L27 52 L36 14 L46 52 L55 17 L60 55Z','#eaa09b');
 else if(/toxic/.test(name))inside='<ellipse cx="32" cy="36" rx="27" ry="14" fill="#72bd78"/>'+circle(24,31,4,'#d4ff91')+circle(42,37,6,'#9df9a1');
 else if(/traffic-light/.test(name))inside=path('M23 4 H43 V57 H23Z','#334350')+circle(33,15,7,'#f27369')+circle(33,31,7,'#e3c65a')+circle(33,46,7,'#76dba0');
 else if(/finish/.test(name))inside=Array.from({length:16},(_,i)=>'<rect x="'+(8+(i%4)*12)+'" y="'+(9+Math.floor(i/4)*12)+'" width="12" height="12" fill="'+((i+Math.floor(i/4))%2?'#fff':'#1c2d3b')+'"/>').join('');
 else if(/flag/.test(name))inside=path('M19 8 H24 V57 H19Z','#d7dfe6')+path('M24 8 L54 15 L24 30Z',color);
 else inside=path('M10 22 L32 8 L54 22 V52 H10Z',color);
 return '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><title>'+a[1]+'</title><rect x="2" y="2" width="60" height="60" rx="13" fill="#213443" stroke="'+color+'" stroke-width="3"/>'+inside+'</svg>';
}
