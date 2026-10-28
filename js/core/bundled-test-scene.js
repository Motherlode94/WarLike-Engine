import {get3dAsset,prefab3d} from '../assets/catalog-3d.js';
import {defaultStats,defaultController,defaultAi,defaultInventory} from './gameplay-components.js';
// Author models remain intact; only scene placement and gameplay components vary.
export function createBundledTestScene(kind='town'){
 const entities=[];
 const put=(id,name,x,z,longest=2,group='Décor',options={})=>{
  const asset=get3dAsset(id);if(!asset)return null;
  const e=prefab3d(id,entities.length+1);if(!e)return null;
  const [w,h,d]=(asset.normalizedSize||[1,1,1]).map(n=>Math.max(.1,n*longest*64));
  Object.assign(e,{name,x:x*64-w/2,y:z*64-d/2,w,h,depth3d:d,hierarchyGroup:group,playable3d:false,animationAuto:true,animationPreview:!!asset.animationClips?.length},options);entities.push(e);return e;
 };
 const playerId=get3dAsset('quaternius-ultimatedanimatedcharacter-bluesoldier-male')?'quaternius-ultimatedanimatedcharacter-bluesoldier-male':'free-mini-characters-character-male-a';
 const player=put(playerId,'Player · Soldat animé',0,7,1.8,'Joueur',{playable3d:true,controller3d:defaultController(),stats:defaultStats(),inventory:defaultInventory(),cameraRig:{mode:'thirdPerson',distance:4.8,height:.72,followSharpness:10,sensitivity:.0026,collision:true},tags:['player']});
 for(const z of [-8,8])put('free-nature-kit-ground-grass','Terrain · Kenney Nature Kit',0,z,32,'Environnement',{collision3d:false,elevation3d:-.12,w:32*64,h:.12*64,depth3d:16*64});
 for(const [x,z] of [[-14,-10],[-10,-11],[14,-10],[13,-4],[-14,5],[14,10],[-10,12],[-4,12]])put('free-nature-kit-tree-oak','Chêne',x,z,3.6,'Végétation');
 for(const [x,z] of [[-12,-4],[12,-3],[-11,9],[10,11]])put('free-nature-kit-rock-largea','Rocher',x,z,1.4,'Végétation');
 if(kind==='nature'){
  for(const [x,z] of [[-5,-6],[-2,-7],[3,-8],[6,-5],[8,3]])put('free-nature-kit-tree-pinegrounda','Pin',x,z,4.1,'Végétation');
  put('free-nature-kit-tent-smallopen','Campement',-6,3,3,'Campement');put('free-nature-kit-campfire-logs','Feu de camp',-3,3,1.2,'Campement',{collision3d:false});
 }else{
  put('free-city-kit-commercial-building-a','Bâtiment · Accueil',-10,-7,6,'Bâtiments');
  put('free-city-kit-commercial-building-e','Bâtiment · Atelier',9,-9,6,'Bâtiments');
  for(const [x,id,name] of [[-5,'free-car-kit-sedan','Berline'],[1,'free-car-kit-police','Police'],[8,'free-car-kit-race','Voiture de course']])put(id,name,x,kind==='garage'?-1:-6,3.8,'Véhicules',{vehicleConfig:{driveable:true},maxSpeed:210,acceleration:155,turnRate:115,brakeForce:270,drag:1.4,tags:['vehicle']});
 }
 const weapons=['assaultrifle-1','pistol-2','revolver-1','bullpup-1','sniperrifle-1','shotgun-1'];
 for(let i=0;i<3;i++){
  const x=-8+i*4;const table=put('free-furniture-kit-table','Établi · Armes '+(i+1),x,2,2.8,'Armurerie');
  for(let n=0;n<2;n++){const weapon=weapons[i*2+n],id='quaternius-ultimategun-'+weapon;put(id,'Ultimate Guns · '+(get3dAsset(id)?.name||weapon),x+(n? .6:-.6),2,1.2,'Armurerie',{elevation3d:(table?.h||64)/64+.04,collision3d:false,rotation:90,tags:['weapon','showcase']})}
 }
 const monsters=[['quaternius-monster-big-orc','Orc · Entraînement',5,1,1.9],['quaternius-monster-flying-dragon','Dragon · Entraînement',8,3,2.1]];
 for(const [id,name,x,z,size] of monsters){const enemy=put(id,name,x,z,size,'Ennemis',{stats:defaultStats(),ai:{...defaultAi(),speed:45,detection:260,attackDamage:5,patrolRadius:85},tags:['enemy']});if(enemy)enemy.playable3d=false}
 const next=()=>entities.length+1;
 entities.push({id:next(),name:'Éclairage · Cour',type:'object',x:0,y:0,w:12,h:12,elevation3d:5,color:'#ffd5a3',visible:false,collision3d:false,hierarchyGroup:'Audio et lumière',lightType:'point',lightEnabled:true,lightColor:'#ffd5a3',lightIntensity:2,lightRange:14});
 entities.push({id:next(),name:'Audio · Ambiance de test',type:'object',x:0,y:320,w:12,h:12,color:'#78aebf',visible:false,collision3d:false,hierarchyGroup:'Audio et lumière',audioEnabled:true,audioClip:'kenney-rpg-audio-doorOpen_1',audioLoop:false,audioSpatial:true,audioGain:.25,audioRange:12});
 return {entities,selected:player?[player.id]:[],nextId:entities.length+1,guide:'Scène test : ZQSD/WASD · Maj courir · E entrer/sortir d’un véhicule · F attaquer · clic droit orbiter. Armes Quaternius Ultimate Guns, monstres animés et décors Kenney.'};
}
