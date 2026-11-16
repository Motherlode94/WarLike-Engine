import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {MAP,obstacles,specs,createMission,live,giveOrder,findPath,tick,serialize,restore,MISSION_KEY} from './game-rules.js';
const $=id=>document.getElementById(id),canvas=$('battlefield');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.23;
const scene=new THREE.Scene();scene.background=new THREE.Color('#101b25');scene.fog=new THREE.Fog('#101b25',65,145);
const camera=new THREE.PerspectiveCamera(52,1,.1,250),raycaster=new THREE.Raycaster();
scene.add(new THREE.HemisphereLight(0xbfd7ed,0x394236,1.7));
const sun=new THREE.DirectionalLight(0xffd4a4,2.6);sun.position.set(-25,45,22);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;scene.add(sun);
const groundMat=new THREE.MeshStandardMaterial({color:0x42504a,roughness:1}),roadMat=new THREE.MeshStandardMaterial({color:0x252b33,roughness:1}),wallMat=new THREE.MeshStandardMaterial({color:0x62656a,roughness:.88}),roofMat=new THREE.MeshStandardMaterial({color:0x283039,roughness:.95});
const yellow=new THREE.MeshBasicMaterial({color:0xffb45b}),green=new THREE.MeshBasicMaterial({color:0x69e5b7}),red=new THREE.MeshBasicMaterial({color:0xff6d6d});
const geom=(w,h,d,material,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=h>.5;mesh.receiveShadow=true;parent.add(mesh);return mesh};
geom(72,.25,58,groundMat,0,-.2,0);
geom(8,.06,56,roadMat,0,.01,0);geom(63,.06,7,roadMat,0,.025,-19);
for(let z=-27;z<28;z+=6)geom(.14,.015,2.8,new THREE.MeshBasicMaterial({color:0xa1a4a6}),0,.06,z);
for(let x=-30;x<32;x+=8)geom(3,.017,.13,new THREE.MeshBasicMaterial({color:0x90939a}),x,.075,-19);
const covers=[],staticTargets=new Map();
for(const o of obstacles){const material=o.type==='barricade'?new THREE.MeshStandardMaterial({color:0x9c9b93,roughness:1}):wallMat;const body=geom(o.w,o.h,o.d,material,o.x,o.h/2,o.z);const fallback=[body];if(o.type==='building'){fallback.push(geom(o.w+.35,.24,o.d+.35,roofMat,o.x,o.h+.12,o.z));for(let z=-o.d/2+1;z<o.d/2-1;z+=2){geom(.08,1.25,.8,new THREE.MeshBasicMaterial({color:0x233443}),o.x+o.w/2+.06,2.4,o.z+z);}}if(o.assetId)staticTargets.set(o.assetId,{obstacle:o,fallback,model:null});covers.push(o);}
const exit=new THREE.Mesh(new THREE.RingGeometry(4.3,4.8,64),new THREE.MeshBasicMaterial({color:0x6fffc8,side:THREE.DoubleSide,transparent:true,opacity:.88}));exit.rotation.x=-Math.PI/2;exit.position.set(29,.12,22);scene.add(exit);
const exitLamp=new THREE.PointLight(0x66ffc0,2.5,16);exitLamp.position.set(29,4,22);scene.add(exitLamp);
const roadMarks=[[-28,-22],[-22,-21],[-14,-19],[-7,-17],[-1,-10],[3,-2],[7,6],[15,16],[29,22]];
const pathLine=new THREE.BufferGeometry().setFromPoints(roadMarks.map(([x,z])=>new THREE.Vector3(x,.15,z)));
const routeVisual=new THREE.Line(pathLine,new THREE.LineDashedMaterial({color:0x88cabb,dashSize:.8,gapSize:.65,transparent:true,opacity:.65}));routeVisual.computeLineDistances();scene.add(routeVisual);
const materials={friendly:new THREE.MeshStandardMaterial({color:0x639b82,roughness:.75}),enemy:new THREE.MeshStandardMaterial({color:0xaa5b57,roughness:.68}),steel:new THREE.MeshStandardMaterial({color:0x323c3e,metalness:.38,roughness:.66}),track:new THREE.MeshStandardMaterial({color:0x262a2d,roughness:.95}),glass:new THREE.MeshStandardMaterial({color:0x86b9cb,metalness:.3,roughness:.22})};
let mission=createMission(),paused=false,selection=new Set(),objects=new Map(),loadedTemplates=new Map(),muzzleFlashes=[],messageTime=0;
const orbital={x:0,z:0,zoom:58,azimuth:.65},keys=new Set();let rotate=false;
function soldier(group,mat,scale=1){
 const c=new THREE.Group();group.add(c);
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.31,.65,4,8),mat);body.position.y=1.2;body.castShadow=true;c.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.23,12,9),mat);head.position.y=1.88;c.add(head);
 const limbs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.39,1.56,0);c.add(arm);
  geom(.18,.62,.19,mat,0,-.31,.04,arm);limbs.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.2,.9,0);c.add(leg);
  geom(.2,.7,.23,materials.steel,0,-.34,0,leg);limbs.push(leg);
 }
 geom(.55,.1,.13,materials.steel,.23,1.3,.35,c);c.scale.setScalar(scale);
 group.userData.proceduralRig={kind:'humanoid',limbs};
}
function vehicle(group,type,mat){
 const tank=type==='tank'||type==='enemyArmor',truck=type==='supply'||type==='convoy'||type==='ambulance',apc=type==='apc',drone=type==='drone'||type==='airDrone';
 if(drone){geom(1,.45,1,mat,0,1,0,group);for(const x of [-.65,.65])for(const z of [-.65,.65])geom(.12,.1,.95,materials.steel,x,1.0,z,group);return}
 const w=tank?3.7:truck?2.65:apc?3.1:2.15,l=tank?5.5:truck?5.1:apc?4.5:3.8,h=tank?1.18:truck?1.7:1.24;
 geom(w,h,l,mat,0,.95,0,group);geom(w*.85,.28,l*.75,materials.steel,0,1.55,0,group);
 const wheels=[],positions=tank?[-2.1,-.8,.8,2.1]:[-1.5,0,1.5];
 for(const z of positions)for(const x of [-w/2-.05,w/2+.05]){
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.27,12),materials.track);
  wheel.rotation.z=Math.PI/2;wheel.position.set(x,.53,z);group.add(wheel);wheels.push(wheel);
 }
 let turret=null;
 if(tank||apc||type==='scout'){
  turret=new THREE.Group();turret.name='Turret_Pivot';turret.position.y=1.87;group.add(turret);
  geom(tank?1.5:1,.5,tank?1.8:1.1,mat,0,0,0,turret);
  geom(.22,.2,tank?2.8:1.65,materials.steel,0,.02,1.2,turret);
 }
 if(truck){geom(w*.82,1.07,2.7,mat,0,1.5,-.9,group);geom(w*.85,.47,.14,materials.glass,0,1.9,2.05,group)}
 group.userData.proceduralRig={kind:'vehicle',wheels,turret};
}
function createVisual(u){
 const root=new THREE.Group();root.userData.unitId=u.id;scene.add(root);const mat=materials[u.team],primitive=new THREE.Group();root.add(primitive);
 if(['infantry','medic','engineer','bot'].includes(u.type))soldier(primitive,mat,u.type==='bot'?1.2:1);
 else if(u.type==='drone'){vehicle(primitive,'drone',mat)}else vehicle(primitive,u.type,mat);
 const outline=new THREE.Mesh(new THREE.RingGeometry(u.radius+.2,u.radius+.3,32),new THREE.MeshBasicMaterial({color:u.team==='friendly'?0x87ffdb:0xff8d79,side:THREE.DoubleSide,transparent:true,opacity:.9}));outline.rotation.x=-Math.PI/2;outline.position.y=.12;outline.visible=false;root.add(outline);
 const bar=new THREE.Group();bar.position.set(0,u.type==='infantry'?2.35:3.15,0);const back=geom(1.45,.11,.08,new THREE.MeshBasicMaterial({color:0x1b2526}),0,0,0,bar);back.castShadow=false;
 const fill=geom(1.4,.12,.09,new THREE.MeshBasicMaterial({color:u.team==='friendly'?0x72edb3:0xff7e7a}),0,.01,.02,bar);fill.castShadow=false;root.add(bar);
 root.traverse(n=>{if(n.isMesh)n.userData.unitId=u.id});
 objects.set(u.id,{root,primitive,outline,bar,fill,lastX:u.x,lastZ:u.z,mixer:null});
 return root;
}
function syncUnits(){
 const active=new Set(mission.units.map(u=>u.id));
 for(const [id,o] of objects)if(!active.has(id)){scene.remove(o.root);objects.delete(id)}
 for(const u of mission.units){let o=objects.get(u.id);if(!o){createVisual(u);o=objects.get(u.id)}
  o.root.visible=u.alive;o.root.position.set(u.x,u.type==='airDrone'?2.5:0,u.z);o.root.rotation.y=u.yaw;
  o.outline.visible=u.alive&&selection.has(u.id);
  o.fill.scale.x=Math.max(.001,u.hp/specs[u.type].hp);o.fill.position.x=-.7*(1-u.hp/specs[u.type].hp);
  const walked=Math.hypot(u.x-o.lastX,u.z-o.lastZ),moving=walked>.002;
  const rig=o.primitive.userData.proceduralRig;
  if(rig?.kind==='humanoid'){rig.limbs.forEach((part,i)=>{part.rotation.x=moving?Math.sin(mission.time*11+i*Math.PI)*.4:0})}
  if(rig?.kind==='vehicle'){for(const wheel of rig.wheels)wheel.rotation.x+=walked/Math.max(.2,.48);if(rig.turret){const target=live(mission).filter(v=>v.team!==u.team).sort((a,b)=>Math.hypot(u.x-a.x,u.z-a.z)-Math.hypot(u.x-b.x,u.z-b.z))[0];if(target)rig.turret.rotation.y=Math.atan2(target.x-u.x,target.z-u.z)-u.yaw}}
  o.lastX=u.x;o.lastZ=u.z;
  if(o.modelLoaded){o.primitive.visible=false;o.modelLoaded.visible=true;}
 }
}
const typeToAsset={infantry:'ID-INF-01',medic:'ID-INF-02',engineer:'ID-INF-03',apc:'ID-ARM-01',tank:'ID-ARM-02',scout:'ID-ARM-03',supply:'ID-LOG-01',convoy:'ID-LOG-01',drone:'ID-DRN-01',bot:'ID-DRN-01',airDrone:'ID-DRN-02',ambulance:'ID-LOG-02',enemyArmor:'ID-ARM-02'};
async function assignAsset(file,assetId){
 if(!file||!file.name.toLowerCase().endsWith('.glb'))throw Error('Un fichier GLB est nécessaire.');
 if(file.size>32*1024*1024)throw Error('Maximum 32 Mo par GLB pour ce prototype.');
 const url=URL.createObjectURL(file);
 try{
  const gltf=await new GLTFLoader().loadAsync(url);const original=gltf.scene;
  original.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(original),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.length()<.00001)throw Error('Modèle GLB sans géométrie.');
  original.position.sub(center);original.position.y+=size.y/2;const scale=(assetId.startsWith('ID-INF')?2:assetId.startsWith('ID-DRN')?1.5:assetId==='ID-ENV-02'?6:assetId==='ID-ENV-01'?3:3.5)/Math.max(size.x,size.y,size.z);
  original.scale.setScalar(scale);
  let skinned=0;const joints=[];original.traverse(node=>{if(node.isSkinnedMesh)skinned++;if(/turret|wheel|rotor|barrel|gun_pivot|track/i.test(node.name||''))joints.push(node.name)});
  loadedTemplates.set(assetId,{original,skinned,joints,animations:gltf.animations});
  for(const u of mission.units.filter(u=>typeToAsset[u.type]===assetId)){const o=objects.get(u.id);if(o?.modelLoaded)o.root.remove(o.modelLoaded);
   const clone=cloneSkinned(original);o.root.add(clone);o.modelLoaded=clone;o.primitive.visible=false;
   if(o.mixer)o.mixer.stopAllAction();o.mixer=null;
   if(gltf.animations.length){o.mixer=new THREE.AnimationMixer(clone);o.mixer.clipAction(gltf.animations[0]).play()};
  }
  announce(assetId+' installé · '+skinned+' mesh(es) skinné(s), '+joints.length+' pivots nommés, '+gltf.animations.length+' animation(s). Les articulations absentes doivent être préparées dans Rig Studio.');
  const staticTarget=staticTargets.get(assetId);
  if(staticTarget){if(staticTarget.model)scene.remove(staticTarget.model);
   const decor=cloneSkinned(original);decor.position.x=staticTarget.obstacle.x;decor.position.z=staticTarget.obstacle.z;
   scene.add(decor);staticTarget.model=decor;staticTarget.fallback.forEach(item=>item.visible=false);
  }
  return original;
 }finally{URL.revokeObjectURL(url)}
}
async function preloadBundledModels(){
 try{
  const r=await fetch('./models/manifest.json',{cache:'no-store'});if(!r.ok)return;
  const manifest=await r.json();if(manifest.version!==1||!Array.isArray(manifest.files))return;
  let count=0;
  for(const fileName of manifest.files.slice(0,12)){
   if(!/^ID-(INF|ARM|LOG|DRN|ENV)-\d{2}\.glb$/i.test(fileName))continue;
   const response=await fetch('./models/'+encodeURIComponent(fileName));if(!response.ok)continue;
   const file=new File([await response.blob()],fileName,{type:'model/gltf-binary'});
   try{await assignAsset(file,fileName.slice(0,-4).toUpperCase());count++}catch(error){console.warn('Iron Defiance asset import skipped:',fileName,error)}
  }
  if(count)announce(count+' GLB installés dans la mission depuis le bundle Web.');
 }catch(e){console.warn('Modèles Web non chargés :',e)}
}
const rayGround=new THREE.Plane(new THREE.Vector3(0,1,0),0),mouse=new THREE.Vector2(),intersection=new THREE.Vector3();
function pointerGround(e){const rect=canvas.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);return raycaster.ray.intersectPlane(rayGround,intersection)?{x:intersection.x,z:intersection.z}:null}
function pick(e){const rect=canvas.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);
 const hits=raycaster.intersectObjects([...objects.values()].map(o=>o.root),true);
 for(const h of hits){const id=h.object.userData.unitId||h.object.parent?.userData.unitId;if(id&&mission.units.some(u=>u.id===id&&u.alive))return id}
 const pt=pointerGround(e);if(!pt)return null;
 const near=live(mission).filter(u=>Math.hypot(u.x-pt.x,u.z-pt.z)<u.radius+1.1).sort((a,b)=>Math.hypot(a.x-pt.x,a.z-pt.z)-Math.hypot(b.x-pt.x,b.z-pt.z))[0];return near?.id||null;
}
function select(ids,append=false){if(!append)selection.clear();ids.forEach(id=>{const u=mission.units.find(x=>x.id===id&&x.alive&&x.team==='friendly'&&x.type!=='convoy');if(u)selection.add(u.id)});updateHud()}
let down=null;
canvas.addEventListener('pointerdown',e=>{if(e.button===2){rotate=true;down={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,button:2};return}if(e.button!==0)return;down={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,button:0};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(rotate&&down){orbital.azimuth+=(e.clientX-down.x)*.006;orbital.zoom=Math.max(20,orbital.zoom+(e.clientY-down.y)*.04);down.x=e.clientX;down.y=e.clientY}
 if(down?.button===0&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>8){const box=$('selectionBox');box.hidden=false;box.style.left=Math.min(e.clientX,down.x)+'px';box.style.top=Math.min(e.clientY,down.y)+'px';box.style.width=Math.abs(e.clientX-down.x)+'px';box.style.height=Math.abs(e.clientY-down.y)+'px'}});
canvas.addEventListener('pointerup',e=>{if(!down)return;if(down.button===2){if(Math.hypot(e.clientX-down.startX,e.clientY-down.startY)<6){const pt=pointerGround(e);if(pt){giveOrder(mission,[...selection],pt,{append:e.shiftKey});announce('Ordre de déplacement transmis.')}}rotate=false;down=null;return}
 const distanceDragged=Math.hypot(e.clientX-down.x,e.clientY-down.y),box=$('selectionBox');box.hidden=true;
 if(distanceDragged<8){const id=pick(e);select(id?[id]:[],e.shiftKey);}
 else{const rect=canvas.getBoundingClientRect();const minx=Math.min(down.x,e.clientX),maxx=Math.max(down.x,e.clientX),miny=Math.min(down.y,e.clientY),maxy=Math.max(down.y,e.clientY);
  const ids=live(mission).filter(u=>u.team==='friendly'&&u.type!=='convoy').filter(u=>{const p=new THREE.Vector3(u.x,1,u.z).project(camera),sx=(p.x+1)*rect.width/2+rect.left,sy=(1-p.y)*rect.height/2+rect.top;return sx>=minx&&sx<=maxx&&sy>=miny&&sy<=maxy}).map(u=>u.id);select(ids,e.shiftKey)}
 down=null;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{e.preventDefault();orbital.zoom=THREE.MathUtils.clamp(orbital.zoom+e.deltaY*.032,16,90)},{passive:false});
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;keys.add(e.key.toLowerCase());if(e.key===' '){e.preventDefault();paused=!paused;announce(paused?'Pause':'Reprise')};if(e.key==='Escape')select([]);if(e.key.toLowerCase()==='g')select(live(mission).filter(u=>u.team==='friendly'&&u.type!=='convoy').map(u=>u.id));});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function announce(s){$('status').textContent=s;messageTime=performance.now()}
$('save').onclick=()=>{try{localStorage.setItem(MISSION_KEY,serialize(mission));announce('Mission sauvegardée sur cet appareil.')}catch(e){announce('Échec de sauvegarde : '+e.message)}};
$('load').onclick=()=>{try{const raw=localStorage.getItem(MISSION_KEY);if(!raw)throw Error('Aucune sauvegarde.');mission=restore(raw);selection.clear();syncUnits();announce('Mission reprise.')}catch(e){announce(e.message)}};
$('restart').onclick=()=>{if(!confirm('Recommencer la mission CENDRE-01 ?'))return;mission=createMission();paused=false;selection.clear();syncUnits();announce('Nouvelle mission.')};
$('escort').onclick=()=>{mission.escortEnabled=!mission.escortEnabled;mission.message=mission.escortEnabled?'Convoi automatique activé.':'Convoi arrêté.';announce(mission.message)};
$('resupply').onclick=()=>{const supply=mission.units.find(u=>u.id==='supply'&&u.alive);if(!supply){announce('Camion de ravitaillement perdu.');return}
 const first=mission.units.find(u=>selection.has(u.id));if(first){giveOrder(mission,[supply.id],{x:first.x+2,z:first.z+1});announce('Le camion logistique rejoint les unités sélectionnées.')}else announce('Sélectionnez une unité à ravitailler.')};
$('assetFile').onchange=async e=>{const files=[...e.target.files];let count=0;for(const file of files){const id=file.name.match(/ID-(?:INF|ARM|LOG|DRN|ENV)-\d\d/i)?.[0]?.toUpperCase();if(!id){announce('Renommez les GLB avec leur ID : ID-INF-01.glb, etc.');continue}
  try{await assignAsset(file,id);count++}catch(error){announce(id+' : '+error.message)}
 }if(count)announce(count+' modèle(s) importé(s) en mémoire. Rechargez les GLB après actualisation.');e.target.value='';};
function updateHud(){const team=live(mission).filter(u=>u.team==='friendly'),foes=live(mission).filter(u=>u.team==='enemy'),convoy=mission.units.find(u=>u.id==='convoy');
 $('allies').textContent=team.length;$('hostiles').textContent=foes.length;$('convoyHp').textContent=Math.round(convoy.hp/specs.convoy.hp*100)+' %';
 $('route').textContent=Math.min(mission.routeIndex,mission.convoyRoute.length)+' / '+mission.convoyRoute.length;
 $('selectionCount').textContent=selection.size;
 $('selectedNames').textContent=team.filter(u=>selection.has(u.id)).map(u=>u.id+' · '+Math.ceil(u.hp)+' PV · '+u.ammo+' balles').join(' | ')||'Aucune unité sélectionnée';
 $('time').textContent=Math.floor(mission.time/60).toString().padStart(2,'0')+':'+Math.floor(mission.time%60).toString().padStart(2,'0');
 $('phase').textContent=mission.phase==='playing'?'MISSION ACTIVE':mission.phase==='won'?'MISSION ACCOMPLIE':'ÉCHEC';
 $('escort').textContent=mission.escortEnabled?'Convoi : automatique':'Convoi : arrêté';
 if(mission.phase!=='playing'){$('ending').hidden=false;$('endingTitle').textContent=mission.phase==='won'?'VICTOIRE — CENDRE-01':'DÉFAITE — CENDRE-01';$('endingText').textContent=mission.result}
 else $('ending').hidden=true;
}
function updateCamera(dt){
 const speed=22*dt,forward=new THREE.Vector3(Math.sin(orbital.azimuth),0,Math.cos(orbital.azimuth));
 const side=new THREE.Vector3(forward.z,0,-forward.x);
 if(keys.has('w')||keys.has('z')||keys.has('arrowup')){orbital.x-=forward.x*speed;orbital.z-=forward.z*speed}
 if(keys.has('s')||keys.has('arrowdown')){orbital.x+=forward.x*speed;orbital.z+=forward.z*speed}
 if(keys.has('a')||keys.has('q')||keys.has('arrowleft')){orbital.x-=side.x*speed;orbital.z-=side.z*speed}
 if(keys.has('d')||keys.has('arrowright')){orbital.x+=side.x*speed;orbital.z+=side.z*speed}
 orbital.x=THREE.MathUtils.clamp(orbital.x,-30,30);orbital.z=THREE.MathUtils.clamp(orbital.z,-24,24);
 camera.position.set(orbital.x+Math.sin(orbital.azimuth)*orbital.zoom*.8,orbital.zoom*.78,orbital.z+Math.cos(orbital.azimuth)*orbital.zoom*.8);
 camera.lookAt(orbital.x,0,orbital.z);
}
function shotEffect(shot,now){const source=mission.units.find(u=>u.id===shot.attacker),target=mission.units.find(u=>u.id===shot.target);
 if(!source||!target)return;const mesh=new THREE.Mesh(new THREE.SphereGeometry(.12,7,6),new THREE.MeshBasicMaterial({color:shot.team==='friendly'?0xffd06b:0xff7774}));
 mesh.position.set(source.x,source.type==='tank'?2:1.3,source.z);scene.add(mesh);muzzleFlashes.push({mesh,born:now,from:mesh.position.clone(),to:new THREE.Vector3(target.x,1.2,target.z),life:Math.max(.05,shot.life)});}
let last=performance.now(),frame=0;
function draw(now){const dt=Math.min(.05,(now-last)/1000);last=now;updateCamera(dt);
 if(!paused&&mission.phase==='playing'){tick(mission,dt);for(const shot of mission.shots){if(!shot.visualized){shot.visualized=true;shotEffect(shot,now)}}}
 if(now-messageTime>5000&&mission.phase==='playing')$('status').textContent=mission.message;
 syncUnits();for(const o of objects.values())if(o.mixer&&!paused)o.mixer.update(dt);
 for(const x of muzzleFlashes){const t=Math.min(1,(now-x.born)/1000/x.life);x.mesh.position.lerpVectors(x.from,x.to,t);if(t>=1){scene.remove(x.mesh);x.done=true}}
 muzzleFlashes=muzzleFlashes.filter(x=>!x.done);
 if(++frame%8===0)updateHud();
 const rect=canvas.getBoundingClientRect(),w=Math.max(1,rect.width|0),h=Math.max(1,rect.height|0);
 if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
 camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);requestAnimationFrame(draw);
}
syncUnits();updateHud();announce('Sélectionnez vos unités ; clic droit sur la route pour donner un ordre.');preloadBundledModels();requestAnimationFrame(draw);
