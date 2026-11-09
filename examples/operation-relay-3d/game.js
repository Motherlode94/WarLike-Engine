import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";
import {CONFIG,startMission,countRelays,activateRelay,tryExtract,damagePlayer} from "./game-rules.js";

const $=id=>document.getElementById(id);
const canvas=$("game"),renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color("#0d1824");scene.fog=new THREE.Fog("#0d1824",22,66);
const camera=new THREE.PerspectiveCamera(58,1,.1,100);camera.position.set(0,19,17);
scene.add(new THREE.HemisphereLight(0xa0ddfa,0x20333c,2));
const sun=new THREE.DirectionalLight(0xddefff,2.6);sun.position.set(-9,18,13);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-26;sun.shadow.camera.right=26;sun.shadow.camera.top=26;sun.shadow.camera.bottom=-26;scene.add(sun);
const materials={
 ground:new THREE.MeshStandardMaterial({color:"#23383b",roughness:1}),
 road:new THREE.MeshStandardMaterial({color:"#253b4a",roughness:1}),
 wall:new THREE.MeshStandardMaterial({color:"#3f5d66",roughness:.88}),
 crate:new THREE.MeshStandardMaterial({color:"#946d4b",roughness:.9}),
 player:new THREE.MeshStandardMaterial({color:"#94e4cc",roughness:.58}),
 enemy:new THREE.MeshStandardMaterial({color:"#d57676",roughness:.63}),
 relay:new THREE.MeshStandardMaterial({color:"#f5b76d",emissive:"#ad4f0a",emissiveIntensity:.35}),
 relayDone:new THREE.MeshStandardMaterial({color:"#6ef0b9",emissive:"#178753",emissiveIntensity:.9}),
 bullet:new THREE.MeshBasicMaterial({color:"#fff1a4"}),
 exit:new THREE.MeshStandardMaterial({color:"#2a7469",emissive:"#195844",emissiveIntensity:.3})
};
const box=(w,h,d,material,x,y,z,cast=true)=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=cast;mesh.receiveShadow=true;scene.add(mesh);return mesh;
};
box(60,.35,60,materials.ground,0,-.2,0,false);
box(3,.05,57,materials.road,0,.015,0,false);
for(let i=-25;i<=25;i+=4){const mark=box(.12,.02,1.9,new THREE.MeshBasicMaterial({color:"#63908b"}),0,.056,i,false);mark.visible=Math.abs(i)>2;}
const obstacles=[];
function barrier(x,z,w,d,h=2.5,mat=materials.wall){
 box(w,h,d,mat,x,h/2,z);
 obstacles.push({x,z,w,d});
}
for(let i=-25;i<=25;i+=10){barrier(-28,i,3,7,3);barrier(28,i,3,7,3)}
barrier(-15,-12,9,4,3.2);barrier(14,11,12,5,3.2);
barrier(-13,13,5,8,3);barrier(13,-13,7,6,3);
barrier(-20,0,3,7,2.7);barrier(21,0,4,7,2.5);
const crates=[[-7,-5],[5,-8],[-6,9],[7,4],[16,-3],[-19,-19],[19,20]];
for(const [x,z] of crates)barrier(x,z,2.4,2.4,1.7,materials.crate);
for(const [x,z] of [[-24,-22],[22,-20],[-24,23],[23,23],[-10,20]]){
 const mast=box(.15,4.7,.15,materials.wall,x,2.3,z);
 const lamp=new THREE.PointLight("#66cdb7",1.4,8);lamp.position.set(x,4.7,z);scene.add(lamp);
}
const pGroup=new THREE.Group();scene.add(pGroup);
const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.44,.95,5,10),materials.player);torso.position.y=1.05;torso.castShadow=true;pGroup.add(torso);
const head=new THREE.Mesh(new THREE.SphereGeometry(.31,14,12),materials.player);head.position.y=2.07;head.castShadow=true;pGroup.add(head);
const gun=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.95),new THREE.MeshStandardMaterial({color:"#17242a"}));gun.position.set(.35,1.38,.45);pGroup.add(gun);
const reticle=new THREE.Mesh(new THREE.RingGeometry(.24,.29,28),new THREE.MeshBasicMaterial({color:"#f3c98d",side:THREE.DoubleSide,transparent:true,opacity:.75}));reticle.rotation.x=-Math.PI/2;reticle.position.y=.07;scene.add(reticle);
const relayPoints=[[-20,-19],[19,-17],[-15,21]];
const relays=relayPoints.map(([x,z],i)=>{
 const base=box(2,.3,2,materials.wall,x,.15,z);
 const console=box(1.1,1.9,.7,materials.relay,x,1.2,z);
 const antenna=box(.05,2,.05,materials.wall,x,2.9,z);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.25,.07,8,42),new THREE.MeshBasicMaterial({color:"#f0a65e"}));ring.rotation.x=Math.PI/2;ring.position.set(x,.1,z);scene.add(ring);
 return {x,z,console,ring};
});
const extraction=box(4,.08,4,materials.exit,21,.12,23);
const extractionLight=new THREE.PointLight("#27ee91",2,7);extractionLight.position.set(21,2,23);scene.add(extractionLight);
const extractionRing=new THREE.Mesh(new THREE.RingGeometry(2.3,2.48,64),new THREE.MeshBasicMaterial({color:"#3ee6a2",side:THREE.DoubleSide}));extractionRing.rotation.x=-Math.PI/2;extractionRing.position.set(21,.21,23);scene.add(extractionRing);
const enemyLocations=[[-5,-16],[10,-22],[-21,6],[18,18],[-8,18],[-24,-7],[9,5],[2,22]];
const enemies=enemyLocations.map(([x,z],i)=>{
 const group=new THREE.Group();scene.add(group);group.position.set(x,0,z);
 const chest=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.85,5,8),materials.enemy);chest.position.y=1;chest.castShadow=true;group.add(chest);
 const helm=new THREE.Mesh(new THREE.SphereGeometry(.33,10,8),materials.enemy);helm.position.y=1.85;group.add(helm);
 return {group,x,z,homeX:x,homeZ:z,alive:true,hp:2,cooldown:i*.2,angle:i*.6};
});
const bullets=[];const keys=new Set();const mouse=new THREE.Vector2(.5,.5);const ray=new THREE.Raycaster();const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
let mission=startMission(),started=false,paused=true,last=performance.now(),shotCooldown=0,fireHeld=false;
let dangerTimer=0;
function collide(x,z,radius=.5){
 if(Math.abs(x)>28.5-radius||Math.abs(z)>28.5-radius)return true;
 return obstacles.some(o=>x>o.x-o.w/2-radius&&x<o.x+o.w/2+radius&&z>o.z-o.d/2-radius&&z<o.z+o.d/2+radius);
}
function move(obj,dx,dz,r=.52){
 const nx=obj.position.x+dx,nz=obj.position.z+dz;
 if(!collide(nx,obj.position.z,r))obj.position.x=nx;
 if(!collide(obj.position.x,nz,r))obj.position.z=nz;
}
function reset(){
 mission=startMission();started=true;paused=false;shotCooldown=0;dangerTimer=0;fireHeld=false;
 keys.clear();pGroup.position.set(0,0,0);pGroup.rotation.y=0;
 relays.forEach(r=>{r.console.material=materials.relay;r.ring.material.color.set("#f0a65e");});
 enemies.forEach((e,i)=>{e.x=e.homeX;e.z=e.homeZ;e.group.position.set(e.x,0,e.z);e.hp=2;e.alive=true;e.cooldown=i*.2;e.group.visible=true;});
 for(const bullet of bullets)scene.remove(bullet.mesh);bullets.length=0;
 $("overlay").hidden=true;$("overlay").style.display="none";updateHUD();
}
function showEnd(){
 paused=true;
 $("overlay").hidden=false;$("overlay").style.display="grid";
 $("overlayTitle").textContent=mission.phase==="won"?"MISSION ACCOMPLIE":"MISSION ÉCHOUÉE";
 $("overlayText").textContent=mission.message+" · "+mission.kills+" ennemis neutralisés · "+Math.round(mission.elapsed)+" secondes.";
 $("play").textContent="RECOMMENCER";
}
function updateHUD(){
 $("hp").textContent=mission.health;$("hpbar").style.width=mission.health+"%";
 $("relays").textContent=countRelays(mission)+"/3";$("kills").textContent=mission.kills;
 const sec=Math.floor(mission.elapsed);$("timer").textContent=String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0");
 $("status").textContent=mission.message;
 $("objective").textContent=countRelays(mission)===3?"Rejoins le cercle vert dans le secteur nord-est.":"Active les "+(3-countRelays(mission))+" relais restants (E à proximité).";
}
function interact(){
 if(paused)return;
 const d=relays.map((r,i)=>({i,d:Math.hypot(r.x-pGroup.position.x,r.z-pGroup.position.z)})).sort((a,b)=>a.d-b.d)[0];
 if(d && d.d<2.9){
  if(activateRelay(mission,d.i)){relays[d.i].console.material=materials.relayDone;relays[d.i].ring.material.color.set("#47ffc0");}
 }else if(Math.hypot(pGroup.position.x-21,pGroup.position.z-23)<3){
  if(tryExtract(mission))showEnd();
 }else mission.message="Approche-toi d'un relais ou de la zone d'extraction.";
 updateHUD();
}
function fire(){
 if(paused||shotCooldown>0)return;
 shotCooldown=CONFIG.fireCooldown;mission.shots++;
 const origin=pGroup.position.clone().add(new THREE.Vector3(0,1.35,0));
 const dir=new THREE.Vector3(Math.sin(pGroup.rotation.y),0,Math.cos(pGroup.rotation.y));
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(.12,8,8),materials.bullet);mesh.position.copy(origin);scene.add(mesh);
 bullets.push({mesh,dir,life:.8});
}
function shootEnemy(b){
 for(const e of enemies){
  if(!e.alive)continue;
  if(Math.hypot(b.mesh.position.x-e.group.position.x,b.mesh.position.z-e.group.position.z)<.75){
   e.hp--;return e.hp<=0?(e.alive=false,e.group.visible=false,mission.kills++,true):true;
  }
 }
 return false;
}
function update(dt,t){
 if(paused)return;
 mission.elapsed+=dt;shotCooldown=Math.max(0,shotCooldown-dt);dangerTimer=Math.max(0,dangerTimer-dt);
 const x=(keys.has("d")||keys.has("arrowright")?1:0)-(keys.has("a")||keys.has("q")||keys.has("arrowleft")?1:0);
 const z=(keys.has("s")||keys.has("arrowdown")?1:0)-(keys.has("w")||keys.has("z")||keys.has("arrowup")?1:0);
 const dist=Math.hypot(x,z)||1;move(pGroup,x/dist*CONFIG.playerSpeed*dt,z/dist*CONFIG.playerSpeed*dt);
 const aim=new THREE.Vector3();ray.setFromCamera(new THREE.Vector2(mouse.x*2-1,1-mouse.y*2),camera);
 if(ray.ray.intersectPlane(groundPlane,aim)){pGroup.rotation.y=Math.atan2(aim.x-pGroup.position.x,aim.z-pGroup.position.z);reticle.position.set(aim.x,.08,aim.z);}
 if(fireHeld)fire();
 for(let i=bullets.length-1;i>=0;i--){
  const b=bullets[i];b.mesh.position.addScaledVector(b.dir,dt*24);b.life-=dt;
  if(shootEnemy(b)||collide(b.mesh.position.x,b.mesh.position.z,.05)||b.life<=0){scene.remove(b.mesh);bullets.splice(i,1);}
 }
 for(const e of enemies){
  if(!e.alive)continue;
  const px=pGroup.position.x, pz=pGroup.position.z, dd=Math.hypot(px-e.group.position.x,pz-e.group.position.z);
  const pursuit=dd<15,tx=pursuit?px:e.homeX+Math.cos(t*.45+e.angle)*3,tz=pursuit?pz:e.homeZ+Math.sin(t*.45+e.angle)*3;
  const vx=tx-e.group.position.x,vz=tz-e.group.position.z,l=Math.hypot(vx,vz);
  if(l>.7){move(e.group,vx/l*dt*(pursuit?2.25:1),vz/l*dt*(pursuit?2.25:1),.5);}
  e.group.rotation.y=Math.atan2(vx,vz);
  e.cooldown=Math.max(0,e.cooldown-dt);
  if(dd<CONFIG.enemyRange&&e.cooldown<=0){damagePlayer(mission,CONFIG.enemyDamage);e.cooldown=1.15;}
 }
 if(mission.health===0){showEnd();}
 if(Math.hypot(pGroup.position.x-21,pGroup.position.z-23)<2.8 && countRelays(mission)===3){if(tryExtract(mission))showEnd();}
 camera.position.lerp(new THREE.Vector3(pGroup.position.x,19,pGroup.position.z+17),Math.min(1,dt*5));
 camera.lookAt(pGroup.position.x,0,pGroup.position.z);
 for(const r of relays)r.ring.rotation.z+=dt*.25;
 extractionRing.material.opacity=.5+Math.sin(t*2)*.2;
 updateHUD();
}
function resize(){
 const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
addEventListener("resize",resize);resize();
addEventListener("keydown",e=>{const key=e.key.toLowerCase();if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key))e.preventDefault();keys.add(key);
 if(e.repeat)return;
 if(key==="e")interact();if(key==="r")reset();
 if(key==="escape"&&started&&mission.phase==="playing"){paused=!paused;$("overlay").style.display=paused?"grid":"none";$("overlayTitle").textContent="PAUSE";$("overlayText").textContent="Reprends l'opération ou recommence."; $("play").textContent="REPRENDRE";}
});
addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
canvas.addEventListener("pointermove",e=>{mouse.set(e.clientX/innerWidth,e.clientY/innerHeight);});
canvas.addEventListener("pointerdown",e=>{if(e.button===0)fireHeld=true;});
addEventListener("pointerup",()=>fireHeld=false);
$("play").addEventListener("click",()=>{if(started&&mission.phase==="playing"&&paused){paused=false;$("overlay").style.display="none";}else reset();});
$("interactTouch").addEventListener("click",interact);
$("shootTouch").addEventListener("pointerdown",e=>{e.preventDefault();fireHeld=true;});
$("shootTouch").addEventListener("pointerup",()=>fireHeld=false);
for(const button of document.querySelectorAll("[data-key]")){
 const code=button.dataset.key;
 button.addEventListener("pointerdown",e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(code);});
 const stop=()=>keys.delete(code);button.addEventListener("pointerup",stop);button.addEventListener("pointercancel",stop);
}
let frames=0;function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;update(dt,now/1000);renderer.render(scene,camera);}requestAnimationFrame(animate);
