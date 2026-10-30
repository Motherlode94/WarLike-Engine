import {lifeArt} from '../assets/life-sprites-2d.js';
import {defaultStats} from './gameplay-components.js';
import {defaultLifeState} from './life-simulation.js';

export function createLifeScene(){
 const entities=[],add=o=>{o.id=entities.length+1;entities.push(o);return o};
 const image=(name,key,x,y,w,h,props={})=>add({type:'object',name,x,y,w,h,color:'#8ec76d',spriteDataUrl:lifeArt[key],collision3d:false,hideLabelInPlay:true,hierarchyGroup:'Quartier des Tilleuls',...props});
 image('Les Tilleuls · Kenney Tiny Town', 'ground',0,0,1280,960);
 image('Maison · repas, douche et repos','home',192,192,160,160,{collider2d:{enabled:true,width:160,height:110,offsetY:20},lifePlace:{kind:'home',entry:{x:272,y:386},label:'À la maison'}});
 image('Café des voisins','cafe',864,192,160,160,{collider2d:{enabled:true,width:160,height:110,offsetY:20},lifePlace:{kind:'cafe',entry:{x:944,y:386},label:'Café des voisins'}});
 image('Atelier · missions rémunérées','studio',192,640,192,160,{collider2d:{enabled:true,width:192,height:110,offsetY:20},lifePlace:{kind:'work',entry:{x:288,y:834},label:'L’atelier'}});
 add({type:'prefab',assetId:'life-town-tile-0043',name:'Jardin des rencontres',x:904,y:696,w:80,h:80,color:'#8ec76d',collision3d:false,hideLabelInPlay:true,hierarchyGroup:'Quartier des Tilleuls',lifePlace:{kind:'garden',entry:{x:944,y:750},label:'Jardin des rencontres'}});
 const person=(assetId,name,x,y,props={})=>add({type:'prefab',assetId,name,x,y,w:44,h:52,color:'#81bca5',animation:'idle',behavior:'none',collision3d:true,collider2d:{enabled:true,width:24,height:24,offsetX:10,offsetY:24},hideLabelInPlay:true,hierarchyGroup:'Habitants',...props});
 const player=person('free-tiny-dungeon-tile-0098','Alex',570,450,{team:1,tags:['player','life-player'],controller2d:{mode:'topDown',walkSpeed:175,sprintSpeed:235},stats:defaultStats(),lifeSim:{enabled:true,title:'Liens de vie',bounds:{w:1280,h:960}},lifeState:defaultLifeState()});
 const villagers=[
  ['free-tiny-dungeon-tile-0099','Maya',500,420,'Illustratrice · 26 ans','art',true,'Je cherche de l’inspiration pour une fresque du quartier.','Quand je dessine les gens d’ici, j’ai l’impression de mieux les connaître.'],
  ['free-tiny-dungeon-tile-0088','Noah',640,550,'Musicien · 28 ans','music',true,'Je prépare un petit concert, mais j’ai un peu le trac.','Un morceau peut raconter tout ce qu’on n’arrive pas à dire.'],
  ['free-tiny-dungeon-tile-0085','Jade',936,720,'Jardinière · 30 ans','nature',true,'Les nouvelles fleurs commencent enfin à pousser.','Le jardin change chaque jour. J’aime prendre le temps de le regarder.'],
  ['free-tiny-dungeon-tile-0084','Éli',910,370,'Cuisinier · 29 ans','food',false,'Je teste une recette pour le menu de demain. Tu me diras ce que tu en penses ?','Pour moi, un bon repas est surtout une occasion de se retrouver.'],
 ];
 for(const [i,[asset,name,x,y,bio,likes,romance,news,favorite]] of villagers.entries())person(asset,name,x,y,{lifeNpc:{bio,likes,romance,news,favorite,home:{x:270+i*190,y:390},morning:{x:x+22,y:y+26},afternoon:{x:420+i*140,y:560},evening:{x:840+i*45,y:760}}});
 return {entities,selected:[player.id],nextId:entities.length+1,camera:{x:0,y:0,zoom:.85}};
}
