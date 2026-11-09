// WarLike Worldforge - deterministic top-down god-sandbox simulation.
// Independent WarLike Engine example; no WorldBox artwork/code/branding reused.
export const WIDTH=72, HEIGHT=46;
export const TERRAIN=Object.freeze({DEEP:0,WATER:1,SAND:2,GRASS:3,FOREST:4,MOUNTAIN:5,ASH:6});
export const TERRAINS=["Océan","Eau","Plage","Plaine","Forêt","Montagne","Cendres"];
export const FACTIONS=Object.freeze([
  {name:"Aube",color:"#f3ca79",symbol:"☀"},
  {name:"Mousse",color:"#72d8ae",symbol:"❖"},
  {name:"Azur",color:"#7fbef3",symbol:"✦"},
  {name:"Bra braise",color:"#e8958a",symbol:"✹"}
]);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function random(seed=1){
 let x=(seed>>>0)||1;
 return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
}
const index=(x,y,w=WIDTH)=>y*w+x;
const inWorld=(world,x,y)=>x>=0&&y>=0&&x<world.width&&y<world.height;
const cell=(world,x,y)=>world.tiles[index(x,y,world.width)];
const land=tile=>tile===TERRAIN.SAND||tile===TERRAIN.GRASS||tile===TERRAIN.FOREST||tile===TERRAIN.ASH;
const hash2=(x,y,seed)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(seed,2246822519);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
function noise(x,y,seed){
 const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi;
 const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
 const a=hash2(xi,yi,seed),b=hash2(xi+1,yi,seed),c=hash2(xi,yi+1,seed),d=hash2(xi+1,yi+1,seed);
 return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
export function makeWorld(seed=91724,width=WIDTH,height=HEIGHT){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<16||height<12||width*height>12000)throw Error("Dimensions de carte invalides.");
 const tiles=new Array(width*height),moisture=new Array(width*height),fire=new Array(width*height).fill(0);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/(width-1),v=y/(height-1),d=Math.hypot((u-.5)*1.12,(v-.5)*1.15);
  const heightmap=noise(x/20,y/20,seed)*.50+noise(x/8,y/8,seed+13)*.26+noise(x/3,y/3,seed+43)*.12+(.5-d)*.35;
  const humid=noise(x/14,y/14,seed+91);
  const i=index(x,y,width);moisture[i]=humid;
  tiles[i]=heightmap<.32?0:heightmap<.38?1:heightmap<.42?2:heightmap>.70?5:humid>.52?4:3;
 }
 return {version:1,seed,width,height,tiles,moisture,fire,year:0,ticks:0,nextId:1,settlements:[],news:["Un monde nouveau attend ses habitants."],stats:{births:0,deaths:0,wars:0,disasters:0},climate:"Tempéré"};
}
export function countLand(world){
 return world.tiles.reduce((sum,t)=>sum+(land(t)?1:0),0);
}
function closeTo(world,x,y,other,maxDistance){
 return world.settlements.some(s=>!s.destroyed&&(other==null||s.faction===other)&&Math.hypot(x-s.x,y-s.y)<maxDistance);
}
export function found(world,x,y,faction=0){
 if(!inWorld(world,x,y)||!land(cell(world,x,y)))return {ok:false,reason:"Choisis une terre ferme."};
 if(!Number.isInteger(faction)||faction<0||faction>=FACTIONS.length)return {ok:false,reason:"Peuple inconnu."};
 if(closeTo(world,x,y,null,5))return {ok:false,reason:"Trop proche d'un village."};
 const id=world.nextId++;
 const s={id,x,y,faction,pop:18,food:65,wood:18,stone:4,houses:3,level:1,age:0,morale:75,territory:0,defense:1};
 world.settlements.push(s);addNews(world,FACTIONS[faction].name+" fonde la cité "+id+".");
 return {ok:true,settlement:s};
}
function addNews(world,message){world.news.unshift("An "+world.year+" · "+message);world.news.length=Math.min(7,world.news.length);}
export function paint(world,x,y,tool,faction=0){
 if(!inWorld(world,x,y))return {ok:false,reason:"Hors du monde."};
 if(tool==="spawn")return found(world,x,y,faction);
 const i=index(x,y,world.width),old=world.tiles[i];
 const terrain={water:TERRAIN.WATER,grass:TERRAIN.GRASS,forest:TERRAIN.FOREST,mountain:TERRAIN.MOUNTAIN,sand:TERRAIN.SAND};
 if(Object.hasOwn(terrain,tool)){
   world.tiles[i]=terrain[tool];world.fire[i]=0;
   if(!land(world.tiles[i]))for(const s of world.settlements)if(s.x===x&&s.y===y){s.pop=0;addNews(world,"Un village est submergé.");}
   return {ok:true};
 }
 if(tool==="fire"){
   if(!land(old))return {ok:false,reason:"Le feu réclame une terre."};
   world.fire[i]=6;return {ok:true};
 }
 if(tool==="meteor"){
   world.stats.disasters++;
   for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
     const xx=x+dx,yy=y+dy,d=Math.hypot(dx,dy);
     if(!inWorld(world,xx,yy)||d>3.2)continue;
     const k=index(xx,yy,world.width);
     world.tiles[k]=d<1.5?TERRAIN.WATER:d<2.5?TERRAIN.ASH:world.tiles[k];
     world.fire[k]=d>1.5?4:0;
   }
   for(const s of world.settlements){
     const dist=Math.hypot(s.x-x,s.y-y);
     if(dist<4){const lost=Math.floor(s.pop*(1-dist/5));s.pop=Math.max(0,s.pop-lost);world.stats.deaths+=lost;}
   }
   addNews(world,"Une météorite frappe le monde !");return {ok:true};
 }
 if(tool==="rain"){
   world.moisture[i]=1;world.fire[i]=0;
   if(world.tiles[i]===TERRAIN.ASH)world.tiles[i]=TERRAIN.GRASS;
   return {ok:true};
 }
 return {ok:false,reason:"Outil inconnu."};
}
function nearby(world,x,y,filter,radius){
 let n=0;for(let yy=y-radius;yy<=y+radius;yy++)for(let xx=x-radius;xx<=x+radius;xx++){
  if(inWorld(world,xx,yy)&&Math.hypot(xx-x,yy-y)<=radius&&filter(cell(world,xx,yy)))n++;
 }
 return n;
}
export function tick(world,rng=random(world.seed+world.ticks)){
 world.ticks++;world.year++;
 const old=world.settlements.filter(s=>s.pop>0);
 const deathsBefore=world.stats.deaths;
 for(const s of old){
   s.age++;
   const fields=nearby(world,s.x,s.y,t=>t===TERRAIN.GRASS||t===TERRAIN.FOREST,Math.min(6,2+s.level));
   const forests=nearby(world,s.x,s.y,t=>t===TERRAIN.FOREST,3+s.level);
   const mountains=nearby(world,s.x,s.y,t=>t===TERRAIN.MOUNTAIN,3);
   const harvest=fields*Math.min(1.8,.45+s.level*.14)*(1+(rng()-.5)*.15);
   const need=s.pop*.42+s.houses*.22;
   s.food=clamp(s.food+harvest-need,0,2000);
   s.wood=clamp(s.wood+forests*.12,0,500);
   s.stone=clamp(s.stone+mountains*.1,0,300);
   if(s.food<2){const lost=Math.max(1,Math.ceil(s.pop*.13));s.pop=Math.max(0,s.pop-lost);world.stats.deaths+=lost;s.morale=clamp(s.morale-10,0,100);}
   else if(s.food>s.pop*.8&&s.pop<s.houses*12){const born=1+Math.floor(rng()*Math.max(1,s.houses*.3));s.pop+=born;world.stats.births+=born;s.morale=clamp(s.morale+1,0,100);}
   if(s.wood>8&&s.food>20&&s.pop>=s.houses*6&&s.houses<70){s.wood-=8;s.food-=4;s.houses++;}
   if(s.houses>=s.level*8&&s.wood>15&&s.stone>=s.level*4&&s.level<5){s.wood-=15;s.stone-=s.level*4;s.level++;s.defense+=1;addNews(world,"La cité "+s.id+" atteint le niveau "+s.level+".");}
   s.territory=Math.min(7,Math.max(1,Math.ceil(Math.sqrt(s.houses)/1.8)+s.level-1));
 }
 world.settlements=world.settlements.filter(s=>s.pop>0);
 // Autonomous colonization: sufficiently prosperous cities send settlers
 // to nearby land. Spawn events use deterministic tick RNG; no new timers.
 const colonists=[];
 if(world.settlements.length<60)for(const origin of world.settlements){
  if(origin.age<16||origin.age%11!==0||origin.pop<58||origin.food<85||origin.wood<19||rng()>.58)continue;
  for(let trial=0;trial<22;trial++){
   const angle=rng()*Math.PI*2,distance=7+rng()*7;
   const xx=Math.round(origin.x+Math.cos(angle)*distance),yy=Math.round(origin.y+Math.sin(angle)*distance);
   if(!inWorld(world,xx,yy)||!land(cell(world,xx,yy))||closeTo(world,xx,yy,null,6)||
      colonists.some(s=>Math.hypot(s.x-xx,s.y-yy)<6))continue;
   colonists.push({x:xx,y:yy,faction:origin.faction,origin});
   break;
  }
 }
 for(const colony of colonists){
  const {origin,x,y,faction}=colony;
  const result=found(world,x,y,faction);
  if(!result.ok)continue;
  origin.pop-=15;origin.food-=30;origin.wood-=12;
  result.settlement.pop=15;result.settlement.food=45;result.settlement.wood=12;
  addNews(world,"Des colons de la cité "+origin.id+" fondent une nouvelle communauté.");
 }
 // Finite interactions for the small number of settlements; no per-tile AI.
 for(let i=0;i<world.settlements.length;i++)for(let j=i+1;j<world.settlements.length;j++){
  const a=world.settlements[i],b=world.settlements[j];if(a.faction===b.faction)continue;
  const distance=Math.hypot(a.x-b.x,a.y-b.y),reach=a.territory+b.territory;
  if(distance>reach+1||rng()>.09)continue;
  const strengthA=a.pop*(.3+a.level*.1)+a.defense*4, strengthB=b.pop*(.3+b.level*.1)+b.defense*4;
  const aWins=(strengthA/(strengthA+strengthB))>rng();
  const victor=aWins?a:b,loser=aWins?b:a;
  const loss=Math.min(loser.pop,Math.max(1,Math.ceil(loser.pop*.09)));
  loser.pop-=loss;victor.pop=Math.max(1,victor.pop-Math.floor(loss/3));
  world.stats.deaths+=loss+Math.floor(loss/3);world.stats.wars++;
  if(loser.pop<=0) addNews(world,FACTIONS[victor.faction].name+" prend la cité "+loser.id+".");
 }
 world.settlements=world.settlements.filter(s=>s.pop>0);
 // Fire spreads through forests, dies in rain and scorches vegetation.
 const next=world.fire.slice();
 for(let y=1;y<world.height-1;y++)for(let x=1;x<world.width-1;x++){
  const i=index(x,y,world.width);if(!world.fire[i])continue;
  next[i]=world.fire[i]-1;
  if(world.fire[i]===1&&land(world.tiles[i]))world.tiles[i]=TERRAIN.ASH;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const xx=x+dx,yy=y+dy,k=index(xx,yy,world.width);
    if(world.tiles[k]===TERRAIN.FOREST&&rng()<.22*(1-world.moisture[k]*.35))next[k]=Math.max(next[k],4);
  }
 }
 world.fire=next;
 if(world.year%12===0)for(let i=0;i<world.tiles.length;i++)
  if(world.tiles[i]===TERRAIN.ASH&&world.fire[i]===0&&rng()<.15)world.tiles[i]=TERRAIN.GRASS;
 if(world.settlements.length&&world.stats.deaths-deathsBefore>15)addNews(world,"Une année difficile emporte de nombreux habitants.");
 return world;
}
export function worldStats(world){
 const population=world.settlements.reduce((n,s)=>n+s.pop,0);
 const territories=FACTIONS.map((f,i)=>({name:f.name,color:f.color,pop:world.settlements.filter(s=>s.faction===i).reduce((n,s)=>n+s.pop,0),cities:world.settlements.filter(s=>s.faction===i).length}));
 return {year:world.year,population,cities:world.settlements.length,land:countLand(world),territories};
}
export function verifyWorld(data){
 if(!data||data.version!==1||!Number.isInteger(data.width)||!Number.isInteger(data.height)||data.width<16||data.height<12||data.width*data.height>12000)throw Error("Sauvegarde incompatible.");
 const n=data.width*data.height;
 if(!Array.isArray(data.tiles)||data.tiles.length!==n||data.tiles.some(v=>!Number.isInteger(v)||v<0||v>6))throw Error("Terrain corrompu.");
 if(!Array.isArray(data.fire)||data.fire.length!==n||data.fire.some(v=>!Number.isFinite(v)||v<0||v>10))throw Error("Incendies corrompus.");
 if(!Array.isArray(data.moisture)||data.moisture.length!==n||data.moisture.some(v=>!Number.isFinite(v)||v<0||v>1))throw Error("Climat corrompu.");
 if(!Array.isArray(data.settlements)||data.settlements.length>200||data.settlements.some(s=>!Number.isFinite(s.x)||!Number.isFinite(s.y)||!Number.isFinite(s.pop)||!Number.isInteger(s.faction)||s.faction<0||s.faction>=FACTIONS.length||!inWorld(data,s.x,s.y)))throw Error("Peuples corrompus.");
 if(!Number.isInteger(data.year)||data.year<0||data.year>1e8||!Number.isInteger(data.nextId)||data.nextId<1)throw Error("Chronologie corrompue.");
 if(!data.stats||!["births","deaths","wars","disasters"].every(k=>Number.isFinite(data.stats[k])&&data.stats[k]>=0))throw Error("Statistiques corrompues.");
 return data;
}
