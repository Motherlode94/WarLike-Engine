import {prefab3d,get3dAsset} from '../assets/catalog-3d.js';
import {getAsset} from '../assets/catalog.js';
export function decorateNatureDemo(scene,mode){
 const three=mode==='3d',player=scene.entities.find(object=>object.survival);
 const positions={wood:[[150,260],[0,0],[1050,80],[1100,950]],stone:[[720,340]],fiber:[[300,800]],water:[[900,740]],berries:[[920,490]]},counts={};
 for(const object of scene.entities){if(object.survivalNode){const kind=object.survivalNode.kind,index=counts[kind]||0;counts[kind]=index+1;const at=positions[kind]?.[index];if(at)[object.x,object.y]=at;}if(object.survivalThreat){object.x=object.x<0?-520:1510;object.y=object.x<0?1050:1150;object.hierarchyGroup='Lisière · danger nocturne'}}
 player.x=440;player.y=500;player.survival.demo={id:'nature',title:'Première aube',description:'Une clairière centrale pour bâtir le camp, des ressources sur les sentiers et une lisière dangereuse la nuit.',features:['Récolte et inventaire','Fabrication et construction libre','Besoins vitaux','Cycle jour / nuit','Menaces, sauvegarde et victoire']};
 if(!three){scene.entities=scene.entities.filter(object=>object.hierarchyGroup!=='Terrain');scene.entities.unshift({id:scene.nextId++,name:'Clairière · sentiers et source',type:'prefab',assetId:'demo-nature-ground',x:-400,y:-300,w:1920,h:1536,color:'#7daf6a',collision3d:false,hideLabelInPlay:true,hierarchyGroup:'Terrain'});}
 const border=[[-300,-180],[0,-220],[300,-200],[600,-230],[900,-180],[1250,-100],[-350,170],[-350,530],[-320,900],[1300,200],[1310,540],[1250,880],[-80,1150],[300,1180],[650,1160],[1000,1150]];
 for(const [i,[x,y]] of border.entries()){
  const asset=three?get3dAsset('free-nature-kit-tree-pinegrounda'):getAsset('survival-2d-survival-kit-tree'),o=three?prefab3d(asset.id,scene.nextId++):{id:scene.nextId++,type:'prefab',assetId:asset.id,w:120,h:160,color:'#6ca270'};
  if(three){const scale=280/Math.max(...asset.normalizedSize);[o.w,o.h,o.depth3d]=asset.normalizedSize.map(value=>value*scale);o.playable3d=false}
  Object.assign(o,{name:'Lisière · pin '+(i+1),x,y,collision3d:false,solid3d:false,hideLabelInPlay:true,hierarchyGroup:'Végétation'});scene.entities.push(o);
 }
 Object.assign(scene,{genre:'survival',camera:{x:50-player.x*.8,y:220-player.y*.8,zoom:.8},guide:'Première aube · Construis ton camp au centre de la clairière. E : récolter · I : inventaire / fabrication · R : tourner un bâtiment · F5/F9 : sauvegarder / charger. Prépare le feu, l’abri et le repas avant la nuit.'});
 scene.entities.forEach((object,index)=>object.id=index+1);scene.selected=[player.id];scene.playerId=player.id;scene.nextId=scene.entities.length+1;
 return scene;
}
