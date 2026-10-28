import {get3dAsset,prefab3d} from '../assets/catalog-3d.js';
import {getAsset} from '../assets/catalog.js';
import {defaultController,defaultStats,defaultAi} from './gameplay-components.js';
import {defaultSuperhero} from './superhero-runtime.js';
import {defaultRpgProgression} from './rpg-progression.js';
import {defaultSimulationNode} from './simulation-nodes.js';
import {defaultTacticalUnit} from './rts-orders.js';
import {defaultFxEmitter} from './fx-runtime.js';
export function createHeroForgeScene(mode='3d'){
 if(!['2d','3d'].includes(mode))throw Error('Mode Hero Forge invalide');
 const three=mode==='3d',entities=[];
 const spawn=(id3d,id2d,name,x,y,size,group,properties={})=>{
  let o;if(three){const asset=get3dAsset(id3d);if(!asset)throw Error('Modèle Hero Forge absent : '+id3d);o=prefab3d(id3d,entities.length+1);const [w,h,d]=asset.normalizedSize.map(n=>Math.max(.01,n*size*64));Object.assign(o,{x:x*64-w/2,y:y*64-d/2,w,h,depth3d:d,playable3d:false,animationAuto:true})}
  else{const asset=getAsset(id2d);if(!asset)throw Error('Sprite Hero Forge absent : '+id2d);o={id:entities.length+1,type:'prefab',assetId:id2d,x:420+x*64-asset.width/2,y:380+y*64-asset.height/2,w:asset.width,h:asset.height,color:'#78bcdd',animation:'idle',hp:100,behavior:'none'}}
  Object.assign(o,{name,hierarchyGroup:group},properties);o.x=(three?x*64:420+x*64)-o.w/2;o.y=(three?y*64:380+y*64)-(three?o.depth3d??o.h:o.h)/2;entities.push(o);return o;
 };
 const hero=spawn('quaternius-ultimatedanimatedcharacter-bluesoldier-male','free-platformer-art-deluxe-p1-stand','Hero · Gardien',0,4,1.8,'Héros',{team:1,tags:['player','hero'],superhero:defaultSuperhero(),rpgProgression:defaultRpgProgression(),stats:{...defaultStats(),health:140,maxHealth:140},rotation:three?180:0,cameraRig:{mode:'orbit',distance:7,height:.72,followSharpness:10,sensitivity:.0026,collision:true},...(three?{playable3d:true,controller3d:defaultController()}:{controller2d:{mode:'topDown',walkSpeed:190,sprintSpeed:300,jumpSpeed:430}})});
 if(three)for(const z of [-8,8])spawn('free-nature-kit-ground-grass','free-tiny-dungeon-tile-0048','Terrain du quartier',0,z,32,'Environnement',{collision3d:false,elevation3d:-.12});
 else for(const [x,y] of [[-4,-3],[0,-3],[4,-3],[-4,2],[0,2],[4,2]])spawn('', 'free-tiny-dungeon-tile-0048','Sol',x,y,1,'Environnement',{w:250,h:250,collision3d:false});
 if(three)for(const [x,y] of [[-10,-6],[10,-7]])spawn('free-city-kit-commercial-building-a','free-tiny-dungeon-tile-0014','Bâtiment du quartier',x,y,5.5,'Environnement');
 for(const [i,x] of [-2.5,2.5].entries())spawn('free-mini-characters-character-male-a','free-platformer-art-deluxe-p2-stand','Escouade · Agent '+(i+1),x,4,1.6,'Escouade',{team:1,tags:['rts-unit','ally'],stats:defaultStats(),tacticalUnit:defaultTacticalUnit(),collision3d:true});
 for(const [i,[x,y]] of [[-3,-1],[3,-1],[0,-5]].entries())spawn('quaternius-monster-big-orc','free-tiny-dungeon-tile-0111','Menace · Orc '+(i+1),x,y,1.9,'Menaces',{team:2,tags:['enemy'],stats:{...defaultStats(),health:85,maxHealth:85},ai:{...defaultAi(),enabled:true,detection:550,attackRange:85,attackDamage:7,speed:42,patrolRadius:25},collision3d:false,sequence:{enabled:true,event:'death',once:true,conditions:[],instructions:[{type:'addObjectiveProgress',key:'heroThreats',value:1}]}});
 for(const [i,[x,y]] of [[-1.5,3],[1.5,3],[0,1.5]].entries())spawn('free-furniture-kit-bookcaseclosedwide','free-platformer-art-deluxe-box','Décor destructible '+(i+1),x,y,1,'Destruction',{simulationNode:{...defaultSimulationNode(),health:35,maxHealth:35},...(three?{rigidbody3d:{enabled:true,kinematic:false,mass:2,gravity:15,restitution:.1,friction:.8,vx:0,vy:0,vz:0}}:{rigidbody2d:{enabled:true,bodyType:'dynamic',mass:2,gravity:980,gravityScale:0,friction:.8,restitution:0,vx:0,vy:0}})});
 const generator=spawn('free-space-kit-machine-generator','free-tiny-dungeon-tile-0089','Générateur · à réparer',-6,2.5,1.8,'Réseau énergétique',{simulationNode:{...defaultSimulationNode(),kind:'generator',health:30,maxHealth:100,output:8},fxEmitter:{...defaultFxEmitter(),kind:'electric',color:'#ffba6b',rate:8}});
 const station=spawn('free-space-kit-machine-generator','free-tiny-dungeon-tile-0090','Station de recharge',-6,-.5,1.5,'Réseau énergétique',{simulationNode:{...defaultSimulationNode(),kind:'consumer',demand:6},fxEmitter:{...defaultFxEmitter(),kind:'energy',color:'#67f9d0',rate:22}});
 const civilian=spawn('free-mini-characters-character-female-a','free-platformer-art-deluxe-p3-stand','Civil · E pour secourir',6,2.5,1.6,'Civils',{team:1,collision3d:false,simulationNode:{...defaultSimulationNode(),kind:'civilian'}});
 hero.sequence={enabled:true,event:'start',once:true,conditions:[],instructions:[{type:'setObjective',key:'heroRescue',value:'Secourir le civil',total:1},{type:'setObjective',key:'heroGrid',value:'Rétablir le réseau énergétique',total:1},{type:'setObjective',key:'heroThreats',value:'Neutraliser les trois menaces',total:3},{type:'message',value:'Hero Forge · 1 trait · 2 onde · 3 ruée · 4 bouclier · 5 vol · 6 ralliement · E secours/réparation · U compétence'}]};
 civilian.sequence={enabled:true,event:'interval',interval:.25,once:true,conditions:[{type:'simulationRescued'}],instructions:[{type:'addObjectiveProgress',key:'heroRescue',value:1}]};
 station.sequence={enabled:true,event:'interval',interval:.25,once:true,conditions:[{type:'simulationPowered'}],instructions:[{type:'addObjectiveProgress',key:'heroGrid',value:1}]};
 hero.sequences=[{enabled:true,event:'death',once:true,conditions:[],instructions:[{type:'loseGame',value:'Le Gardien est tombé · Réessaie en combinant bouclier et escouade.'}]},{enabled:true,event:'interval',interval:.5,once:true,conditions:['heroRescue','heroGrid','heroThreats'].map(key=>({type:'objectiveComplete',key})),instructions:[{type:'winGame',value:'Quartier sécurisé · Mission Hero Forge accomplie'}]}];
 const ordered=three?entities:[...entities.filter(o=>o.hierarchyGroup==='Environnement'),...entities.filter(o=>o.hierarchyGroup!=='Environnement')];
 return {entities:ordered,selected:[hero.id],nextId:entities.length+1,camera:{x:0,y:0,zoom:.8},heroId:hero.id,generatorId:generator.id,civilianId:civilian.id,guide:'Hero Forge · 1–6 pouvoirs · E secourir / réparer · U améliorer une compétence · vol : espace monter, X descendre · clic gauche / Maj : sélectionner les agents · clic droit : ordre RTS.'};
}
