// Native Iron Defiance company builder. 108 individual editable soldiers per faction.
// Does not mutate editor global state; each invocation returns an independent scene.
import {prefab3d} from '../assets/catalog-3d.js';
import {defaultStats,defaultController,defaultInventory} from './gameplay-components.js';
import {defaultTacticalUnit} from './rts-orders.js';
import {FACTIONS,createUniform,applyUniform} from './iron-defiance-uniforms.js';
import {createSquad,appoint,TEAM_NAMES,STANDARD_SQUAD} from '../../examples/iron-defiance/force-organization.js';
export const SQUAD_SPECIALTIES=Object.freeze(['assault','recon','anti-tank','fire-support','engineer','medic']);
export const COMPANY_STRUCTURE=Object.freeze({platoons:3,squadsPerPlatoon:3,soldiersPerSquad:12,soldiers:108});
const assignment=Object.freeze({assault:'infantry',recon:'recon','anti-tank':'infantry','fire-support':'infantry',engineer:'engineer',medic:'medic'});
const medal=role=>role==='medic'?'medic':role==='engineer'?'engineer':'infantry';
export function createIronDefianceCompanyScene(mode='3d',faction='rdc'){
 if(mode!=='3d')throw Error('Iron Defiance Company exige un projet 3D.');
 if(!FACTIONS[faction])throw Error('Faction inconnue : '+faction);
 const entities=[],squads=[],company={id:'company-01',faction,platoons:[]};
 function add(asset,name,x,y,props={}){
  const object=prefab3d(asset,entities.length+1,x,y);if(!object)throw Error('Ressource 3D manquante : '+asset);
  Object.assign(object,{id:entities.length+1,name,hierarchyGroup:'Iron Defiance / Compagnie',hideLabelInPlay:true,playable3d:false,...props});
  entities.push(object);return object;
 }
 // 3 x 3 large parade plots separated to keep initial positions distinct.
 // Engine world ground coordinates are in 64 units per meter.
 add('primitive-cube','Terrain de rassemblement · compagnie',0,0,{
  w:4608,depth3d:3072,h:16,elevation3d:-.25,color:'#51605A',collision3d:true,solid3d:true,
  tags:['ai-walkable'],hierarchyGroup:'Terrain'
 });
 const commander=add('character-hero','Commandement · inspection FPS',120,120,{
  hierarchyGroup:'Commandement',team:1,tags:['player','iron-company-command'],
  playable3d:true,cameraRig:{mode:'firstPerson',distance:1.2,height:.78,collision:true,followSharpness:12},
  controller3d:{...defaultController(),walkSpeed:4,sprintSpeed:6},stats:defaultStats(),
  inventory:defaultInventory(),collision3d:true
 });
 applyUniform(commander,createUniform(faction,{role:'officer',rankMark:'company-commander'}));
 for(let p=0;p<3;p++){
  const platoon={id:'platoon-'+(p+1),squads:[]};company.platoons.push(platoon);
  for(let s=0;s<3;s++){
   const number=p*3+s+1;
   const specialty=SQUAD_SPECIALTIES[(number-1)%SQUAD_SPECIALTIES.length];
   const group='Compagnie 01 / Peloton '+(p+1)+' / Escouade '+number;
   const originX=180+s*1380,originY=330+p*850;
   const soldiers=[];
   let offset=0;
   for(const team of TEAM_NAMES){
    for(let slot=0;slot<STANDARD_SQUAD[team];slot++){
     const index=offset+slot,role=assignment[specialty]||'infantry';
     const x=originX+(index%6)*92,y=originY+Math.floor(index/6)*105;
     const soldier=add('character-soldier','P'+(p+1)+' E'+number+' '+team+' · '+(slot+1),x,y,{
      hierarchyGroup:group+' / '+team,
      tags:['iron-soldier','iron-'+team.toLowerCase(),'iron-company-unit','iron-'+specialty],
      team:1,stats:defaultStats(),collision3d:true,solid3d:false,
      tacticalUnit:{...defaultTacticalUnit(),autoAttack:false,passFriendlyUnits:true,speed:95}
     });
     applyUniform(soldier,createUniform(faction,{
      role:index===0?'officer':medal(role),
      environment:'forest',rankMark:index===0?'squad-leader':slot===0?'team-leader':'none'
     }));
     soldier.ironTraining={company:'company-01',platoon:platoon.id,squad:'squad-'+number,
      team,slot:slot+1,specialty,editable:true};
     const signal='iron:company:platoon'+(p+1)+':squad'+number+':'+team.toLowerCase();
     soldier.sequence={enabled:true,event:'signal',signal,once:false,instructions:[
      {type:'rtsOrder',value:'move',x:x+95,y:y+130}
     ]};
     soldiers.push(soldier);
    }
    offset+=STANDARD_SQUAD[team];
   }
   const model=createSquad('squad-'+number,soldiers,{specialty});
   appoint(model,{soldierId:soldiers[0].id});
   for(const team of TEAM_NAMES){const leader=soldiers.find(e=>e.ironTraining.team===team);appoint(model,{team,soldierId:leader.id})}
   squads.push(model);platoon.squads.push(model.id);
   const terminal=add('primitive-cube','Terminal · P'+(p+1)+' E'+number,originX+620,originY,{
    w:44,h:82,depth3d:44,elevation3d:.6,color:FACTIONS[faction].accent,
    collision3d:false,solid3d:false,hierarchyGroup:'Ordres Blueprint / Peloton '+(p+1),
    adventureInteractable:{label:'Déployer escouade '+number,radius:155}
   });
   terminal.sequence={enabled:true,event:'interact',key:'e',radius:155,once:false,
    instructions:[
     {type:'message',value:'Escouade '+number+' — ordre de déplacement collectif envoyé à Alpha, Beta et Delta.'},
     ...TEAM_NAMES.map(team=>({type:'emitSignal',value:'iron:company:platoon'+(p+1)+':squad'+number+':'+team.toLowerCase()}))
    ]};
  }
 }
 commander.adventure={title:'IRON DEFIANCE · '+FACTIONS[faction].title,combatEnabled:false,items:[],notes:[],
  demo:{id:'ironcompany-'+faction,title:'Iron Defiance · Compagnie '+FACTIONS[faction].name,
   description:'3 pelotons, 9 escouades, 108 soldats natifs éditables ; 7 factions disponibles comme scènes alternatives.',
   features:['108 soldats','3 pelotons','9 escouades','Alpha 5 / Beta 4 / Delta 3','WarNode → RTS'],
   steps:[]}};
 commander.sequence={enabled:true,event:'start',once:true,instructions:[
  {type:'message',value:'IRON DEFIANCE · '+FACTIONS[faction].title+' : 108 soldats organisés en 3 pelotons et 9 escouades. E sur un terminal donne un ordre RTS.'}
 ]};
 return {entities,selected:[commander.id],nextId:entities.length+1,playerId:commander.id,
  company,squads,genre:'rts',camera:{x:120,y:90,zoom:.65},
  guide:'Compagnie '+FACTIONS[faction].name+' : 3 pelotons, 9 escouades, 108 soldats. Terminal de chaque escouade = ordre Blueprint vers RTS. La scène est éditable dans Hierarchy / Inspector.'};
}
