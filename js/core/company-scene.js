import {prefab3d,get3dAsset} from '../assets/catalog-3d.js';
import {makeCompanySquad} from './company-units.js';

export function createCompanyScene(){
 const entities=[];let id=1;
 const place=(asset,name,x,y,props={})=>{const model=prefab3d(asset,id++,x,y);if(!model?.model3dId)throw Error('Modèle intégré absent : '+asset);const value={...model,name,playable3d:false,...props};entities.push(value);return value};
 const base=place('free-city-kit-industrial-building-a','QG · Compagnie bleue',140,720,{team:1,w:300,h:300,depth3d:230,playable3d:true,cameraRig:{mode:'orbit',collision:false},companyBase:{team:1,exitY:320},stats:{health:2000,maxHealth:2000},hierarchyGroup:'Quartiers généraux'});
 place('free-city-kit-industrial-building-b','QG · Compagnie orange',2700,720,{team:2,w:300,h:300,depth3d:230,companyBase:{team:2,exitY:320},stats:{health:2000,maxHealth:2000},hierarchyGroup:'Quartiers généraux'});
 base.company={enabled:true,victoryPoints:180,timeLimit:600,captureRadius:210,captureSeconds:8,bounds:{minX:0,maxX:3200,minY:0,maxY:1900},sectors:[
  {id:'A',name:'A · Ferme',kind:'victory',x:850,y:680,owner:1,links:['base1','B','M']},
  {id:'B',name:'B · Carrefour',kind:'victory',x:1600,y:900,owner:0,links:['A','C']},
  {id:'C',name:'C · Dépôt',kind:'victory',x:2380,y:680,owner:2,links:['B','base2','F']},
  {id:'M',name:'M · Munitions',kind:'munitions',x:900,y:1430,owner:0,links:['A']},
  {id:'F',name:'F · Carburant',kind:'fuel',x:2350,y:1430,owner:0,links:['C']}
 ]};
 const terrain=get3dAsset('free-nature-kit-ground-grass').normalizedSize,height=640*terrain[1]/terrain[0];
 for(let x=0;x<5;x++)for(let y=0;y<3;y++)place('free-nature-kit-ground-grass','Terrain',x*640,y*640,{w:640,h:height,depth3d:640,elevation3d:-height/64,collision3d:false,solid3d:false,hierarchyGroup:'Terrain'});
 let firstSquad;
 for(const team of [1,2])for(const [index,role] of ['rifle','rifle','mg','engineer','tank'].entries()){
  const members=makeCompanySquad(role,team,id,team===1?470+(index%2)*300:2460-(index%2)*300,470+Math.floor(index/2)*380);
  if(firstSquad===undefined)firstSquad=id;id+=members.length;entities.push(...members);
 }
 for(const point of base.company.sectors){
  place('quaternius-toonshootergamekit-container-small','Repère '+point.name,point.x+200,point.y-230,{w:210,h:118,depth3d:122,hierarchyGroup:'Points stratégiques'});
  for(const direction of [-1,1])place('quaternius-toonshootergamekit-barrier-large','Couverture · '+point.id,point.x-80,point.y+direction*240,{w:230,h:45,depth3d:45,companyCover:{enabled:true,radius:170,protection:.55},hierarchyGroup:'Couvertures'});
 }
 for(const [x,y] of [[750,70],[1450,70],[2200,70],[1450,1570]])place('free-city-kit-industrial-building-a','Entrepôt',x,y,{w:300,h:300,depth3d:240,hierarchyGroup:'Environnement'});
 for(const [x,y] of [[400,100],[1150,1200],[1920,1250],[2850,1650]])place('free-nature-kit-rock-largeb','Rocher',x,y,{w:160,h:90,depth3d:140,hierarchyGroup:'Environnement'});
 return {entities,selected:entities.filter(o=>o.companyUnit?.squadId===firstSquad).map(o=>o.id),nextId:id,camera:{x:0,y:0,zoom:1},guide:'WARLIKE COMPANY · Escarmouche solo. Clic : escouade · Maj : sélection multiple · clic droit : déplacer / attaquer · R : retraite · H : tenir · Espace : pause tactique · flèches : caméra · molette : zoom. Capture A/B/C, relie les ressources au QG et recrute des renforts.'};
}
