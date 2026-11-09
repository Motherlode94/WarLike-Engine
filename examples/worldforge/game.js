import {WIDTH,HEIGHT,TERRAIN,FACTIONS,random,makeWorld,found,paint,tick,worldStats,verifyWorld} from "./world.js";
const $=id=>document.getElementById(id);
const canvas=$("world"),ctx=canvas.getContext("2d",{alpha:false});
const STORAGE="warlike-worldforge-v1";
const colors=["#17394b","#255b72","#dfcb88","#89b56b","#3d815e","#808879","#655d53"];
let world=null,seed=91724,tool="inspect",faction=0,speed=1,playing=true,brush=1;
let hover=null,selected=null,dragging=false,pan=false,lastPointer=null;
let zoom=1,offsetX=0,offsetY=0,cellSize=15;
const rand=(n)=>random((n>>>0)||1);
const notify=(message)=>{$("toast").textContent=message;$("toast").hidden=false;clearTimeout(notify.timeout);notify.timeout=setTimeout(()=>$("toast").hidden=true,2900);};
function init(nextSeed=seed){
 seed=(nextSeed>>>0)||91724;world=makeWorld(seed);
 const rng=rand(seed+992);let placed=0;
 for(let a=0;a<1500&&placed<4;a++){
  const x=5+Math.floor(rng()*(world.width-10)),y=5+Math.floor(rng()*(world.height-10));
  const result=found(world,x,y,placed);
  if(result.ok)placed++;
 }
 selected=null;fit();renderHud();
 notify(placed+" civilisation(s) installée(s). Peins et observe leur évolution.");
}
function fit(){
 const rect=canvas.getBoundingClientRect();
 const width=Math.max(1,rect.width),height=Math.max(1,rect.height);
 const scale=Math.min(width/(WIDTH*16),height/(HEIGHT*16));
 cellSize=16*scale;
 zoom=1;offsetX=(width-WIDTH*cellSize)/2;offsetY=(height-HEIGHT*cellSize)/2;
}
const eachSettlement=(draw)=>{for(const s of world.settlements)draw(s);};
function draw(){
 if(!world)return;
 const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 }
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle="#111a20";ctx.fillRect(0,0,w,h);
 ctx.save();ctx.translate(offsetX,offsetY);ctx.scale(zoom,zoom);
 const tile=cellSize;
 const minX=Math.max(0,Math.floor(-offsetX/zoom/tile)-1),minY=Math.max(0,Math.floor(-offsetY/zoom/tile)-1);
 const maxX=Math.min(world.width,Math.ceil((w-offsetX)/zoom/tile)+1),maxY=Math.min(world.height,Math.ceil((h-offsetY)/zoom/tile)+1);
 for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){
  const i=y*world.width+x,t=world.tiles[i],px=x*tile,py=y*tile;
  ctx.fillStyle=colors[t];ctx.fillRect(px,py,tile+.4,tile+.4);
  const hash=((x*1973+y*9277+world.seed*26699)^((x*y+17)*19))>>>0;
  if(t===TERRAIN.GRASS||t===TERRAIN.FOREST){
   ctx.fillStyle=t===TERRAIN.FOREST?"#244e40":"#67965b";
   const a=tile*.17;ctx.fillRect(px+tile*.25,py+tile*.28,a,a);
   if(t===TERRAIN.FOREST){ctx.fillStyle="#215847";ctx.beginPath();ctx.moveTo(px+tile*.55,py+tile*.12);ctx.lineTo(px+tile*.83,py+tile*.76);ctx.lineTo(px+tile*.32,py+tile*.76);ctx.fill();}
  }else if(t===TERRAIN.MOUNTAIN){
   ctx.fillStyle="#c4c4a3";ctx.beginPath();ctx.moveTo(px+tile*.15,py+tile*.87);ctx.lineTo(px+tile*.55,py+tile*.12);ctx.lineTo(px+tile*.88,py+tile*.87);ctx.fill();
  }else if(t===TERRAIN.WATER||t===TERRAIN.DEEP){
   ctx.fillStyle=t===TERRAIN.DEEP?"#26516a":"#6c99a1";ctx.fillRect(px+((hash%3)+1)*tile/7,py+tile*.45,tile*.3,Math.max(.6,tile*.06));
  }else if(t===TERRAIN.SAND){
   ctx.fillStyle="#f4e4ab";ctx.fillRect(px+tile*.2,py+tile*.48,Math.max(1,tile*.09),Math.max(1,tile*.09));
  }
  if(world.fire[i]>0){ctx.globalAlpha=.85;ctx.fillStyle=world.fire[i]%2?"#ff9650":"#e95736";ctx.beginPath();ctx.arc(px+tile*.5,py+tile*.45,tile*.30,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
 }
 // Soft territory discs around settlements, showing contested frontiers.
 eachSettlement(s=>{
  const x=(s.x+.5)*tile,y=(s.y+.5)*tile,r=(s.territory||1)*tile;
  ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);
  ctx.fillStyle=FACTIONS[s.faction].color+"17";ctx.strokeStyle=FACTIONS[s.faction].color+"99";
  ctx.lineWidth=Math.max(.7,tile*.055);ctx.fill();ctx.stroke();
 });
 eachSettlement(s=>{
  const x=(s.x+.5)*tile,y=(s.y+.5)*tile,r=Math.max(tile*.34,2.2);
  ctx.fillStyle="#2c2c2b";ctx.fillRect(x-r*.9,y-r*.45,r*1.8,r*1.1);
  ctx.fillStyle=FACTIONS[s.faction].color;
  ctx.fillRect(x-r*.64,y-r*.22,r*1.26,r*.7);
  ctx.beginPath();ctx.moveTo(x-r*.85,y-r*.4);ctx.lineTo(x,y-r*1.28);ctx.lineTo(x+r*.85,y-r*.4);ctx.closePath();ctx.fill();
  ctx.fillStyle="#25302d";ctx.fillRect(x-r*.16,y+r*.06,r*.34,r*.48);
  if(s.houses>7){ctx.fillStyle="#f9e8ad";ctx.fillRect(x+r*.80,y-r*.33,Math.max(2,r*.26),Math.max(2,r*.26));}
  if(s.id===selected){ctx.strokeStyle="#fff6d4";ctx.lineWidth=1.8;ctx.strokeRect(x-r*1.5,y-r*1.7,r*3,r*3);}
  if(zoom*tile>11){ctx.font="bold "+Math.max(8,tile*.64)+"px system-ui";ctx.textAlign="center";ctx.fillStyle="#ffffff";ctx.shadowColor="#000";ctx.shadowBlur=4;ctx.fillText(String(s.pop),x,y-r*1.6);ctx.shadowBlur=0;}
 });
 if(hover){const x=hover.x*tile,y=hover.y*tile,r=tile*brush;ctx.strokeStyle="#faf5cb";ctx.lineWidth=1.5/zoom;ctx.strokeRect(x-(brush-1)*tile,y-(brush-1)*tile,2*r-tile,2*r-tile);}
 ctx.restore();
}
function pos(e){
 const rect=canvas.getBoundingClientRect();
 const x=Math.floor((e.clientX-rect.left-offsetX)/zoom/cellSize);
 const y=Math.floor((e.clientY-rect.top-offsetY)/zoom/cellSize);
 return {x,y,px:e.clientX-rect.left,py:e.clientY-rect.top};
}
const valid=(x,y)=>x>=0&&y>=0&&x<world.width&&y<world.height;
function useTool(x,y){
 if(!valid(x,y))return;
 if(tool==="inspect"){
  const hits=world.settlements.filter(s=>Math.hypot(s.x-x,s.y-y)<Math.max(2,s.territory));
  const s=hits.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
  selected=s?.id??null;renderHud();return;
 }
 let last=null;
 for(let dy=-brush+1;dy<brush;dy++)for(let dx=-brush+1;dx<brush;dx++){
  if(dx*dx+dy*dy>(brush-.25)*(brush-.25))continue;
  const px=x+dx,py=y+dy;if(!valid(px,py))continue;
  if(tool==="spawn"&&last?.ok)continue;
  last=paint(world,px,py,tool,faction);
 }
 if(last&&!last.ok&&tool==="spawn")notify(last.reason||"Placement impossible.");
 if(last?.ok&&tool==="spawn")selected=last.settlement?.id||selected;
 renderHud();
}
canvas.addEventListener("contextmenu",e=>e.preventDefault());
canvas.addEventListener("pointerdown",e=>{
 canvas.setPointerCapture(e.pointerId);
 dragging=true;pan=e.button===1||e.button===2||e.shiftKey;
 const p=pos(e);lastPointer=p;hover={x:p.x,y:p.y};
 if(!pan)useTool(p.x,p.y);
});
canvas.addEventListener("pointermove",e=>{
 const p=pos(e);hover=valid(p.x,p.y)?{x:p.x,y:p.y}:null;
 if(!dragging)return;
 if(pan){offsetX+=p.px-lastPointer.px;offsetY+=p.py-lastPointer.py;}
 else if(tool!=="spawn"&&tool!=="inspect")useTool(p.x,p.y);
 lastPointer=p;
});
canvas.addEventListener("pointerup",()=>{dragging=false;pan=false;lastPointer=null;});
canvas.addEventListener("pointercancel",()=>{dragging=false;pan=false;});
canvas.addEventListener("pointerleave",()=>{hover=null;});
canvas.addEventListener("wheel",e=>{
 e.preventDefault();const rect=canvas.getBoundingClientRect();
 const mx=e.clientX-rect.left,my=e.clientY-rect.top;
 const next=Math.max(.6,Math.min(4.5,zoom*(e.deltaY<0?1.13:.885)));
 const q=next/zoom;offsetX=mx-(mx-offsetX)*q;offsetY=my-(my-offsetY)*q;zoom=next;
},{passive:false});
function renderHud(){
 if(!world)return;
 const stats=worldStats(world);
 $("year").textContent=stats.year.toLocaleString("fr");
 $("population").textContent=stats.population.toLocaleString("fr");
 $("cities").textContent=stats.cities;
 $("warCount").textContent=world.stats.wars;
 $("eventLog").replaceChildren(...world.news.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
 $("peoples").replaceChildren(...stats.territories.map(f=>{
  const row=document.createElement("div");row.className="people-row";
  const name=document.createElement("span");name.textContent=f.name;
  const count=document.createElement("strong");count.textContent=f.pop+" hab. · "+f.cities+" cités";
  name.style.color=f.color;row.append(name,count);return row;
 }));
 const s=world.settlements.find(s=>s.id===selected);
 $("inspected").textContent=s?"Cité "+s.id+" · "+FACTIONS[s.faction].name+" · "+s.pop+" habitants · "+s.houses+" maisons · Niveau "+s.level+" · Nourriture "+Math.round(s.food):"Clique sur une ville pour inspecter ses ressources et sa population.";
}
function save(){
 try{localStorage.setItem(STORAGE,JSON.stringify({world,seed,speed}));notify("Monde sauvegardé localement.");}
 catch(error){notify("Sauvegarde impossible : "+error.message);}
}
function load(){
 try{const raw=localStorage.getItem(STORAGE);if(!raw)throw Error("Aucune sauvegarde locale.");const data=JSON.parse(raw);world=verifyWorld(data.world);seed=world.seed;speed=[0,1,2,5].includes(data.speed)?data.speed:1;playing=speed>0;selected=null;renderHud();syncSpeed();notify("Monde restauré.");}
 catch(error){notify("Chargement refusé : "+error.message);}
}
function exportWorld(){
 try{
  const blob=new Blob([JSON.stringify({format:"WarLike-Worldforge",version:1,world},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="warlike-worldforge-"+seed+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
 }catch(error){notify("Export impossible : "+error.message);}
}
function syncSpeed(){
 $("speed").value=String(speed);
 $("playPause").textContent=playing?"⏸ Pause":"▶ Reprendre";
}
document.querySelectorAll("[data-tool]").forEach(button=>button.addEventListener("click",()=>{
 tool=button.dataset.tool;
 document.querySelectorAll("[data-tool]").forEach(b=>{b.classList.toggle("active",b===button);b.setAttribute("aria-pressed",String(b===button));});
 $("currentTool").textContent=button.textContent.trim();notify("Outil : "+button.textContent.trim());
}));
$("civilization").addEventListener("change",e=>{faction=Number(e.target.value);});
$("brush").addEventListener("change",e=>{brush=Number(e.target.value);});
$("speed").addEventListener("change",e=>{speed=Number(e.target.value);playing=speed>0;syncSpeed();});
$("playPause").addEventListener("click",()=>{playing=!playing;speed=playing?(speed||1):0;syncSpeed();});
$("newWorld").addEventListener("click",()=>{if(confirm("Créer un nouveau monde et perdre les changements non sauvegardés ?")){init(Math.floor(Math.random()*1e9));syncSpeed();}});
$("saveWorld").addEventListener("click",save);
$("loadWorld").addEventListener("click",load);
$("exportWorld").addEventListener("click",exportWorld);
$("helpButton").addEventListener("click",()=>{$("helpDialog").showModal();});
$("closeHelp").addEventListener("click",()=>{$("helpDialog").close();});
document.addEventListener("keydown",e=>{
 if(e.target.closest("input,select,textarea,dialog"))return;
 if(e.code==="Space"){e.preventDefault();$("playPause").click();}
 if(e.key.toLowerCase()==="s"&&e.ctrlKey){e.preventDefault();save();}
 if(e.key.toLowerCase()==="f")fit();
});
let lastTime=0,carry=0;
function loop(time){
 requestAnimationFrame(loop);
 if(world&&playing&&speed){
  const dt=Math.min(.2,(time-lastTime)/1000||0);carry+=dt*speed;
  let turns=0;
  while(carry>=.45&&turns++<16){
   const rng=random(world.seed+world.ticks*13+1761);tick(world,rng);carry-=.45;
  }
  if(turns>1)renderHud();
 }
 lastTime=time;draw();
}
new ResizeObserver(()=>{if(world)fit();}).observe(canvas);
init(seed);syncSpeed();requestAnimationFrame(loop);
