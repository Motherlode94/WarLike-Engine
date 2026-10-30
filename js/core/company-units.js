import {prefab3d,get3dAsset} from '../assets/catalog-3d.js';
import {defaultStats} from './gameplay-components.js';

export const companyUnitTypes={
 rifle:{label:'Fusiliers',members:3,manpower:180,fuel:0,seconds:8,range:530,damage:5,interval:1,speed:100,suppression:.045},
 mg:{label:'Mitrailleuse',members:2,manpower:220,fuel:0,seconds:11,range:650,damage:4,interval:.6,speed:82,suppression:.22},
 engineer:{label:'Génie',members:2,manpower:160,fuel:0,seconds:8,range:430,damage:4,interval:1,speed:108,suppression:.03},
 tank:{label:'Blindé',members:1,manpower:380,fuel:60,seconds:18,range:760,damage:32,interval:2.2,speed:90,suppression:.2}
};
export function makeCompanySquad(role,team,firstId,x,y){
 if(!Object.hasOwn(companyUnitTypes,role)||![1,2].includes(team)||!Number.isSafeInteger(firstId)||firstId<1)throw Error('Escouade invalide.');
 const type=companyUnitTypes[role],tank=role==='tank';
 return Array.from({length:type.members},(_,index)=>{
  const asset=tank?'quaternius-animatedtanks-tank':team===1?'quaternius-ultimatedanimatedcharacter-bluesoldier-male':'quaternius-ultimatedanimatedcharacter-soldier-male';
  const model=prefab3d(asset,firstId+index,x+(index%2)*130,y+Math.floor(index/2)*85);
  if(!model?.model3dId)throw Error('Modèle intégré absent : '+asset);
  const clips=get3dAsset(model.model3dId)?.animationClips||[],clip=pattern=>clips.find(name=>pattern.test(name));
  return {...model,name:type.label+' '+firstId+' · '+(index+1),playable3d:false,team,
   w:tank?235:95,h:tank?85:96,depth3d:tank?154:36,stats:{...defaultStats(),health:tank?360:100,maxHealth:tank?360:100},
   companyUnit:{squadId:firstId,role,suppression:0},tags:['company-unit'],hierarchyGroup:team===1?'Compagnie bleue':'Compagnie orange',
   animationMap:Object.fromEntries(Object.entries({idle:clip(/^Idle$/i),walk:clip(tank?/Forward/:/^Walk$/i),run:clip(tank?/Forward/:/^Run$/i),attack:clip(/Shoot_OneHanded/i),death:clip(/^Death$/i)}).filter(([,value])=>value)),
   tacticalUnit:{enabled:true,speed:type.speed,autoAttack:false,attackRange:type.range,damage:0},
   ...(tank?{csharpComponents:[{kind:'VehicleController',maxSpeed:180,acceleration:130,brakeForce:250,turnRate:80}]}:{})};
 });
}
