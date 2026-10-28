import {playSound} from './audio.js';
// Walkable 2D house interiors and animated doors for RP / survival houses.
import {state} from './state.js';
import {getAsset} from '../assets/catalog.js';
export const homeIds=new Set(['city-house','city-apartments','survival-safehouse','survival-cabin','fantasy-inn']);
export const isHome=o=>o?.type==='prefab'&&homeIds.has(o.assetId);
export const housing={inside:null,doorHeld:false,lightHeld:false,progress:0,lightOn:true,x:0,y:0,transition:0};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const nearest=(p)=>state.entities.filter(isHome).map(h=>({h,d:Math.hypot(p.x+p.w/2-(h.x+h.w/2),p.y+p.h/2-(h.y+h.h+12))})).sort((a,b)=>a.d-b.d)[0];
export function resetHousing(){Object.assign(housing,{inside:null,doorHeld:false,lightHeld:false,progress:0,lightOn:true,x:0,y:0,transition:0})}
export function housingActive(){return !!housing.inside}
export function updateHousing(dt,p,input=state.keys){
 if(!state.playing||!p)return false;
 housing.transition=Math.max(0,housing.transition-dt);
 const keys=input,pressed=keys.has('e'),light=keys.has('l');
 const near=nearest(p);
 if(housing.inside){
  if(light&&!housing.lightHeld){housing.lightOn=!housing.lightOn;playSound('switch');const building=state.entities.find(o=>o.id===housing.inside);if(building)building.houseLightsOn=housing.lightOn;}
  housing.lightHeld=light;
  const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft'));
  const y=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('z')||keys.has('arrowup'));
  const d=Math.hypot(x,y)||1;
  housing.x=clamp(housing.x+x/d*dt*160,44,432);
  housing.y=clamp(housing.y+y/d*dt*160,80,277);
  if(pressed&&!housing.doorHeld&&housing.transition===0){
   const home=state.entities.find(o=>o.id===housing.inside);
   if(home){home.houseDoorOpen=true;home.houseDoorTimer=2.5;playSound('door');p.x=home.x+home.w/2-p.w/2;p.y=home.y+home.h+8;p.animation='exit_house';p._actionAnimationUntil=performance.now()/1000+.45}
   housing.inside=null;housing.transition=.5;p._hiddenInHouse=false;
  }
  housing.doorHeld=pressed;return true;
 }
 if(pressed&&!housing.doorHeld&&near?.d<95&&!p._hiddenInVehicle&&housing.transition===0){
  const home=near.h;if(home.buildState!=='destroyed'&&home.buildState!=='construction'){
   home.houseDoorOpen=true;home.houseDoorTimer=2.5;housing.inside=home.id;housing.x=240;housing.y=243;
   housing.lightOn=home.houseLightsOn!==false;housing.transition=.5;
   p._hiddenInHouse=true;p.animation='enter_house';p._actionAnimationUntil=performance.now()/1000+.5;
  }
 }
 housing.doorHeld=pressed;housing.lightHeld=light;
 return false;
}
export function updateHouseAnimation(dt){
 if(!state.playing)return;
 for(const h of state.entities.filter(isHome)){
  h.houseDoorTimer=Math.max(0,(h.houseDoorTimer||0)-dt);
  if(!h.houseDoorTimer&&h.houseDoorOpen&&!housing.inside)h.houseDoorOpen=false;
  const target=h.houseDoorOpen?1:0;
  h.houseDoorProgress=clamp((h.houseDoorProgress||0)+(target?1:-1)*dt*3,0,1);
 }
}
export function drawHouseFacade(ctx,o,time){
 if(!isHome(o))return;
 const p=Math.max(0,Math.min(1,o.houseDoorProgress||0)),x=o.x+o.w*.39,y=o.y+o.h*.6,w=o.w*.21,h=o.h*.28;
 ctx.save();
 if(o.houseLightsOn!==false){ctx.fillStyle='#ffe7a955';ctx.fillRect(o.x+o.w*.14,o.y+o.h*.43,o.w*.18,o.h*.11);ctx.fillRect(o.x+o.w*.67,o.y+o.h*.43,o.w*.16,o.h*.11)}
 ctx.fillStyle='#172938';ctx.fillRect(x,y,w,h);
 ctx.fillStyle='#91694e';ctx.fillRect(x+p*w*.83,y,w*(1-p*.82),h);
 ctx.fillStyle='#f0d7a4';ctx.beginPath();ctx.arc(x+w*(.76+.09*p),y+h*.55,2.5,0,Math.PI*2);ctx.fill();
 if(p>.05){ctx.strokeStyle='#d4b26c';ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h)}
 ctx.restore();
}
export function drawHousing(ctx,width,height,player){
 if(!state.playing)return;
 const house=state.entities.find(h=>h.id===housing.inside);
 if(!house&&!player?._hiddenInHouse){
  if(!player||player._hiddenInVehicle)return;
  const near=nearest(player);
  if(near?.d<95){ctx.save();ctx.fillStyle='#112738ed';ctx.fillRect(width/2-155,height-120,310,30);ctx.font='12px system-ui';ctx.fillStyle='#caffeb';ctx.textAlign='center';ctx.fillText('E — Entrer dans '+near.h.name,width/2,height-100);ctx.restore()}
  return;
 }
 if(!house)return;
 const scale=Math.min((width-20)/480,(height-20)/330,1.25),w=480*scale,h=330*scale,x=(width-w)/2,y=(height-h)/2;
 ctx.save();ctx.fillStyle='#07131bed';ctx.fillRect(0,0,width,height);ctx.translate(x,y);ctx.scale(scale,scale);
 ctx.fillStyle=housing.lightOn?'#bca98a':'#343943';ctx.fillRect(0,0,480,330);
 ctx.strokeStyle='#39434d';ctx.lineWidth=19;ctx.strokeRect(10,10,460,310);
 ctx.fillStyle=housing.lightOn?'#8d654e':'#3c3839';ctx.fillRect(30,45,104,82);ctx.fillStyle='#d1bd9e';ctx.fillRect(42,51,78,38);
 ctx.fillStyle=housing.lightOn?'#558277':'#374b4a';ctx.fillRect(290,70,145,65);
 ctx.fillStyle=housing.lightOn?'#9a7660':'#4b4143';ctx.fillRect(170,100,75,45);
 ctx.fillStyle='#253a45';ctx.fillRect(213,307,56,23);
 ctx.fillStyle=housing.lightOn?'#ffc76b':'#657079';ctx.beginPath();ctx.arc(260,90,15,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#43dec0';ctx.beginPath();ctx.arc(housing.x,housing.y,12,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#f0faf9';ctx.font='bold 13px system-ui';ctx.fillText(house.name+' — Intérieur',23,25);
 ctx.font='12px system-ui';ctx.fillText('ZQSD : marcher  •  L : lumière  •  E : sortir',23,301);
 ctx.restore();
}
