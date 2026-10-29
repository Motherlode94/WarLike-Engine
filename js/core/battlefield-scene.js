import {prefab3d,get3dAsset} from '../assets/catalog-3d.js';
import {defaultController,defaultStats} from './gameplay-components.js';

export function createBattlefieldScene(){
 const entities=[];
 const place=(asset,name,x,y,props={})=>{const model=prefab3d(asset,entities.length+1,x,y);if(!model||model.meshShape!=='glb')throw Error('Modèle intégré absent : '+asset);const value={...model,name,playable3d:false,...props};entities.push(value);return value};
 const player=place('quaternius-ultimatedanimatedcharacter-bluesoldier-male','Assaut · Joueur',150,700,{playable3d:true,fpsController:true,rotation:270,team:1,stats:defaultStats(),controller3d:defaultController(),w:110,h:112,depth3d:42,tags:['battlefield-soldier'],hierarchyGroup:'Équipe bleue'});
 player.battlefield={enabled:true,tickets:80,timeLimit:480,respawnSeconds:5,captureRadius:140,captureSeconds:7,sectors:[{x:650,y:720,owner:1},{x:1350,y:600,owner:0},{x:2050,y:720,owner:2}]};
 player.cameraRig={mode:'firstPerson'};
 player.weaponSystem={model3dId:'quaternius-ultimategun-assaultrifle-1'};
 const groundSize=get3dAsset('free-nature-kit-ground-grass').normalizedSize,groundHeight=600*groundSize[1]/groundSize[0];
 for(let x=0;x<5;x++)for(let y=0;y<3;y++)place('free-nature-kit-ground-grass','Sol',x*600-100,y*600-150,{w:600,h:groundHeight,depth3d:600,elevation3d:-groundHeight/64,collision3d:false,solid3d:false,hierarchyGroup:'Terrain'});
 for(const team of [1,2])for(let i=0;i<(team===1?5:6);i++)place(team===1?'quaternius-ultimatedanimatedcharacter-bluesoldier-male':'quaternius-ultimatedanimatedcharacter-soldier-male',team===1?'Allié '+(i+1):'Opposant '+(i+1),team===1?280+(i%2)*135:2400+(i%2)*135,430+Math.floor(i/2)*130,{team,stats:defaultStats(),w:110,h:112,depth3d:42,hierarchyGroup:team===1?'Équipe bleue':'Équipe orange',tags:['battlefield-soldier'],tacticalUnit:{enabled:true,speed:105,attackRange:650,damage:12,attackInterval:.8,autoAttack:true}});
 for(const team of [1,2])place('quaternius-animatedtanks-tank',team===1?'Blindé · Bleu':'Blindé · Orange',team===1?260:2280,950,{team,w:240,h:87,depth3d:157,stats:{...defaultStats(),health:300,maxHealth:300},vehicleConfig:{driveable:true},maxSpeed:200,acceleration:135,brakeForce:250,turnRate:85,vehicleWeapon:{enabled:true,range:1200,damage:45,cooldown:1,arc:35},csharpComponents:[{kind:'VehicleController',maxSpeed:200,acceleration:135,brakeForce:250,turnRate:85}],hierarchyGroup:'Véhicules'});
 place('free-car-kit-truck','Transport · Bleu',30,1100,{team:1,vehicleConfig:{driveable:true},maxSpeed:260,hierarchyGroup:'Véhicules'});
 for(const [index,sector] of player.battlefield.sectors.entries()){
  place('quaternius-toonshootergamekit-container-small','Secteur '+['A','B','C'][index],sector.x+160,sector.y-220,{w:240,h:135,depth3d:140,hierarchyGroup:'Secteurs & couvertures'});
  for(const side of [-1,1])place('quaternius-toonshootergamekit-barrier-large','Couverture '+['A','B','C'][index],sector.x-80,sector.y+side*220,{w:200,h:70,depth3d:45,hierarchyGroup:'Secteurs & couvertures'});
 }
 for(const [x,y] of [[500,100],[1150,50],[1800,50],[500,1250],[1350,1320],[2100,1250]])place('free-city-kit-industrial-building-a','Entrepôt',x,y,{w:330,h:330,depth3d:260,hierarchyGroup:'Environnement'});
 for(const [x,y] of [[50,150],[950,1150],[1700,1100],[2650,300]])place('free-nature-kit-rock-largeb','Rocher',x,y,{w:170,h:100,depth3d:160,hierarchyGroup:'Environnement'});
 return {entities,selected:[player.id],nextId:entities.length+1,camera:{x:0,y:0,zoom:1},guide:'WARLIKE FRONT · Conquête solo avec bots. Capture A/B/C et épuise les renforts adverses. ZQSD/WASD · souris : viser · clic/F : tirer · R : recharger · Maj : courir · E : véhicule · F en véhicule : canon · Échap : libérer la souris.'};
}
