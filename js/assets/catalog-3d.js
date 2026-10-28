import {realModels3d,importedModels3d,model3dById} from './real-models-3d.js';
// Native WarLike 3D Beta library: procedural mesh kits, not 2D sprites.
export const assets3d=[
 ['primitive-cube','Cube','Primitives','#83acda','cube'],['primitive-sphere','Sphere','Primitives','#9ad9ca','sphere'],['primitive-cylinder','Cylinder','Primitives','#e1b47a','cylinder'],['primitive-cone','Cone','Primitives','#d6a0bd','cone'],
 ['primitive-platform','Platform','Primitives','#728fa3','slab'],['primitive-ramp','Ramp','Primitives','#9db0ad','ramp'],
 ['nature-oak','Oak Tree','Nature','#559b6d','tree'],['nature-pine','Pine Tree','Nature','#3c907a','pine'],['nature-rock','Rock','Nature','#959a9f','rock'],['nature-boulder','Boulder','Nature','#a1a9a6','rock'],['nature-bush','Bush','Nature','#5a9a70','bush'],['nature-cactus','Cactus','Nature','#6ba77c','cactus'],['nature-log','Log','Nature','#a68159','log'],
 ['environment-grass','Grass Ground','Terrain','#68965d','ground'],['environment-sand','Sand Ground','Terrain','#d9bc83','ground'],['environment-road','Road','Terrain','#61727e','road'],['environment-water','Water','Terrain','#4c9bbd','water'],
 ['building-house','House','Buildings','#d19c7b','house'],['building-tower','Watchtower','Buildings','#a9a3a3','tower'],['building-hangar','Hangar','Buildings','#8f9ca9','hangar'],['building-garage','Garage','Buildings','#b79b8e','house'],['building-wall','Stone Wall','Buildings','#929ca1','wall'],['building-fence','Fence','Buildings','#a39071','fence'],['building-lamp','Street Lamp','Buildings','#e3c990','lamp'],
 ['vehicle-jeep','Jeep','Vehicles','#78a997','car'],['vehicle-sports','Sport Car','Vehicles','#d88772','car'],['vehicle-truck','Truck','Vehicles','#93a2b0','truck'],['vehicle-tank','Tank','Vehicles','#858e71','tank'],['vehicle-buggy','Buggy','Vehicles','#d9a961','car'],['vehicle-bike','Motorbike','Vehicles','#8bbbd2','bike'],
 ['vehicle-sedan','Sedan','Vehicles','#7897b7','car'],
 ['vehicle-police','Police Cruiser','Vehicles','#507eaa','car'],
 ['vehicle-ambulance','Ambulance','Vehicles','#e9ebe9','truck'],
 ['vehicle-firetruck','Fire Truck','Vehicles','#cf5651','truck'],
 ['vehicle-bus','City Bus','Vehicles','#dab96b','truck'],
 ['vehicle-van','Delivery Van','Vehicles','#a8b7bd','truck'],
 ['vehicle-pickup','Pickup','Vehicles','#8d9b77','truck'],
 ['vehicle-suv','SUV 4x4','Vehicles','#727f92','car'],
 ['vehicle-taxi','Taxi','Vehicles','#d9b84e','car'],
 ['vehicle-muscle','Muscle Car','Vehicles','#b24e50','car'],
 ['vehicle-supercar','Supercar','Vehicles','#ad70cc','car'],
 ['vehicle-formula','Formula Racer','Vehicles','#cd5150','car'],
 ['vehicle-kart','Go-Kart','Vehicles','#e6a958','car'],
 ['vehicle-rally','Rally Car','Vehicles','#5c9eaa','car'],
 ['vehicle-quad','ATV Quad','Vehicles','#a99262','bike'],
 ['vehicle-dirtbike','Dirt Bike','Vehicles','#c48a6f','bike'],
 ['vehicle-armored-truck','Armored Truck','Vehicles','#5d716e','truck'],
 ['vehicle-apc','Armored Personnel Carrier','Vehicles','#7e917a','tank'],
 ['vehicle-ifv','Infantry Fighting Vehicle','Vehicles','#87906b','tank'],
 ['vehicle-artillery','Artillery Vehicle','Vehicles','#929875','tank'],
 ['vehicle-aa','Anti-Air Vehicle','Vehicles','#6e807b','tank'],
 ['vehicle-recon','Recon Buggy','Vehicles','#98a67a','car'],
 ['vehicle-military-jeep','Military Jeep','Vehicles','#788764','car'],
 ['vehicle-rescue','Rescue Vehicle','Vehicles','#e9a255','truck'],
 ['vehicle-forklift','Forklift','Vehicles','#d4ac57','truck'],
 ['vehicle-tractor','Tractor','Vehicles','#77a46a','truck'],
 ['vehicle-bulldozer','Bulldozer','Vehicles','#d5ad4e','tank'],
 ['vehicle-excavator','Excavator','Vehicles','#d2a94c','tank'],
 ['vehicle-garbage','Garbage Truck','Vehicles','#6ca27d','truck'],
 ['vehicle-snowmobile','Snowmobile','Vehicles','#83b4c8','bike'],
 ['character-hero','Hero','Characters','#54bfa6','humanoid'],['character-soldier','Soldier','Characters','#829b8c','humanoid'],['character-zombie','Zombie','Characters','#8eac75','humanoid'],['character-robot','Robot','Characters','#96b8cd','humanoid'],['character-civilian','Civilian','Characters','#c29d7e','humanoid'],
 ['prop-crate','Crate','Props','#b79a70','cube'],['prop-barrel','Barrel','Props','#9c7671','cylinder'],['prop-bridge','Bridge','Props','#ae9778','slab'],['prop-container','Shipping Container','Props','#789caa','box'],['prop-table','Table','Props','#b99c77','table'],['prop-bench','Bench','Props','#8e8577','bench'],['prop-cone','Traffic Cone','Props','#dca56b','cone'],['prop-obstacle','Training Obstacle','Props','#bb9975','cube']
].map(([id,name,category,color,shape])=>({id,name,category,color,shape}));
const lookup=new Map(assets3d.map(a=>[a.id,a]));
export const get3dAsset=id=>lookup.get(id)||model3dById(id)||null;
export const allAssets3d=()=>[...assets3d,...realModels3d,...importedModels3d.values()];
export const categories3d=['All',...new Set(allAssets3d().map(a=>a.category)),'Weapons'];
export const dimensions3d=a=>{
 const kind=typeof a==='string'?get3dAsset(a):a;
 const shape=kind?.shape||'cube';
 if(shape==='ground'||shape==='road'||shape==='water')return {w:460,h:5,d:360};
 if(shape==='wall'||shape==='fence')return {w:210,h:130,d:28};
 if(shape==='house'||shape==='hangar'||shape==='garage')return {w:210,h:150,d:165};
 if(shape==='tower'||shape==='lamp')return {w:65,h:225,d:65};
 if(shape==='car'||shape==='truck'||shape==='tank')return {w:185,h:82,d:110};
 if(shape==='bike')return {w:98,h:75,d:60};
 if(shape==='humanoid')return {w:48,h:100,d:40};
 if(shape==='glb')return kind.category==='Characters'?{w:80,h:135,d:80}:kind.category==='Vehicles'?{w:190,h:95,d:115}:{w:90,h:105,d:85};
 if(shape==='tree'||shape==='pine')return {w:120,h:225,d:120};
 return {w:90,h:90,d:85};
};
const vehicleTunings={
 sedan:[205,155,126],police:[245,190,142],ambulance:[170,115,105],firetruck:[125,85,76],bus:[135,87,72],
 van:[165,125,105],pickup:[185,150,117],suv:[195,148,113],taxi:[202,157,128],
 muscle:[250,210,124],supercar:[335,260,140],formula:[360,290,154],kart:[190,210,157],rally:[260,230,151],
 quad:[135,153,148],dirtbike:[185,210,165], 'armored-truck':[115,80,65],apc:[95,75,67],
 ifv:[95,75,68],artillery:[75,58,52],aa:[88,65,61],recon:[215,185,137],
 'military-jeep':[170,140,123],rescue:[180,130,109],forklift:[65,65,92],tractor:[88,75,82],
 bulldozer:[70,55,51],excavator:[60,48,48],garbage:[120,80,73],snowmobile:[170,165,149]
};
const armedKinds={apc:[18,.3],ifv:[34,.6],artillery:[72,2],aa:[16,.15],recon:[16,.35],'military-jeep':[15,.4]};
function defaultsForVehicle(id){
 const short=id.replace(/^vehicle-/,'');
 const tune=vehicleTunings[short];
 if(!tune)return {};
 const [maxSpeed,acceleration,turnRate]=tune;
 const result={vehicleConfig:{driveable:true},maxSpeed,acceleration,turnRate,
  brakeForce:Math.max(130,Math.round(acceleration*1.65)),drag:short==='formula'?.9:1.45,
  traction:['rally','quad','dirtbike','snowmobile'].includes(short)?1.18:1,
  steeringResponse:['bus','firetruck','armored-truck','apc','ifv'].includes(short)?3.1:5.4,
  reverseRatio:.38,tags:['vehicle',short]};
 if(armedKinds[short]){
  const [damage,cooldown]=armedKinds[short];
  result.vehicleWeapon={enabled:true,range:short==='artillery'?1050:620,damage,cooldown,arc:45};
  result.tags.push('armed-vehicle');
 }
 return result;
}
// Actual GLB geometry for supported starter prefabs; procedural primitives remain explicit tools.
const defaultRealModel={
 'character-hero':'real-cesium-man',
 'character-soldier':'real-rigged-figure',
 'character-civilian':'real-cesium-man',
 'vehicle-truck':'real-cesium-milk-truck',
 'vehicle-van':'real-cesium-milk-truck',
 'vehicle-toycar':'real-toycar',
 'building-lamp':'real-lantern'
};
export function prefab3d(id,nextId=1,x=120,y=120){
 const a=get3dAsset(id);if(!a)return null;
 const size=dimensions3d(a),realId=defaultRealModel[a.id],real=realId&&model3dById(realId);return {id:nextId,name:a.name+' '+nextId,type:'mesh3d',assetId:a.id,
 x,y,w:size.w,h:size.h,depth3d:size.d,meshShape:real?'glb':a.shape,elevation3d:0,color:a.color,rotation:0,
 collision3d:!['water','ground','road','lamp','bush'].includes(a.shape),...(real?{model3dId:realId}:a.shape==='glb'?{model3dId:a.id}:{}),...(a.category==='Characters'?{playable3d:true}:{})};
}
export function thumbnail3d(asset){
 const a=typeof asset==='string'?get3dAsset(asset):asset;if(!a)return '';
 const escaped=a.name.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const top='<path d="M16 39 L51 17 L90 38 L55 60Z" fill="'+a.color+'" stroke="#263b4e" stroke-width="2"/>';
 const sides='<path d="M16 39 L55 60 V89 L16 68Z" fill="'+a.color+'" stroke="#253747" stroke-width="2"/><path d="M55 60 L90 38 V67 L55 89Z" fill="#466279" stroke="#253747" stroke-width="2"/>';
 const detail=a.shape==='humanoid'?'<circle cx="53" cy="25" r="14" fill="#d1b18e"/><path d="M39 41 H67 L75 78 H31Z" fill="'+a.color+'"/>':a.shape==='car'||a.shape==='truck'||a.shape==='tank'?'<circle cx="37" cy="77" r="9" fill="#172634"/><circle cx="76" cy="77" r="9" fill="#172634"/><path d="M44 34 L55 20 H76 L83 35Z" fill="#a2d5e4"/>':a.shape==='pine'||a.shape==='tree'?'<path d="M52 10 L18 75 H86Z" fill="'+a.color+'"/><path d="M45 73 V90 H59 V73Z" fill="#967351"/>':a.shape==='sphere'?'<circle cx="54" cy="47" r="34" fill="'+a.color+'" stroke="#365366" stroke-width="2"/>':'';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 104"><title>'+escaped+'</title><ellipse cx="53" cy="91" rx="43" ry="7" fill="#0c1520" opacity=".25"/>'+top+sides+detail+'</svg>';
}
export const url3d=id=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(thumbnail3d(id));
