// WarLike Force Organization — reusable deterministic formation and command rules.
// No graphics, browser APIs or mutable global state.
export const TEAM_NAMES=Object.freeze(['Alpha','Beta','Delta']);
export const STANDARD_SQUAD=Object.freeze({Alpha:5,Beta:4,Delta:3});
export const FORCE_DOCTRINE_VERSION='1.0';
export function createSquad(id, soldiers, {specialty='assault'}={}){
 if(!id||!Array.isArray(soldiers)||soldiers.length!==12)throw new Error('Une escouade standard exige exactement 12 soldats.');
 const seen=new Set();
 for(const soldier of soldiers){if(!soldier?.id||seen.has(soldier.id))throw new Error('Identifiant de soldat absent ou dupliqué.');seen.add(soldier.id)}
 const teams={};let offset=0;
 for(const name of TEAM_NAMES){const slice=soldiers.slice(offset,offset+STANDARD_SQUAD[name]);teams[name]={name,role:specialty,soldierIds:slice.map(s=>s.id),leaderId:null,deputyId:null,locked:false};offset+=slice.length}
 return {id,specialty,teams,leaderId:null,deputyId:null,orders:[],version:1};
}
export function appoint(squad,{team=null,role='leader',soldierId}){
 if(!['leader','deputy'].includes(role))throw new Error('Poste de commandement inconnu.');
 const roster=team?squad.teams?.[team]?.soldierIds:Object.values(squad.teams).flatMap(t=>t.soldierIds);
 if(!roster?.includes(soldierId))throw new Error('Soldat absent de cette formation.');
 if(team)squad.teams[team][role+'Id']=soldierId;else squad[role+'Id']=soldierId;
 return squad;
}
export function orderFormation(squad,{level='squad',team=null,soldierId=null,order,lock=false}){
 if(!order||typeof order!=='object'||typeof order.kind!=='string')throw new Error('Ordre invalide.');
 let targetIds;
 if(level==='soldier'){targetIds=Object.values(squad.teams).flatMap(t=>t.soldierIds).filter(id=>id===soldierId);if(!targetIds.length)throw new Error('Soldat inconnu.')}
 else if(level==='team'){if(!squad.teams[team])throw new Error('Équipe inconnue.');targetIds=squad.teams[team].soldierIds.slice();}
 else if(level==='squad'){targetIds=Object.values(squad.teams).filter(t=>!t.locked).flatMap(t=>t.soldierIds);}
 else throw new Error('Niveau inconnu.');
 if(level==='team'&&lock)squad.teams[team].locked=true;
 const record={order:{...order},level,team,soldierId,targetIds};squad.orders.push(record);return record;
}
export function squadStatus(squad,availableIds){
 const available=new Set(availableIds),teams={};let active=0;
 for(const name of TEAM_NAMES){const roster=squad.teams[name].soldierIds,count=roster.filter(id=>available.has(id)).length;active+=count;teams[name]={active:count,nominal:roster.length,missing:roster.length-count}}
 return {active,nominal:12,missing:12-active,teams};
}
export function rankReinforcements(formations){
 return formations.map(f=>({...f,missing:Math.max(0,f.nominal-f.active)}))
 .filter(f=>f.nominal>0&&f.missing>0)
 .sort((a,b)=>(b.missing/b.nominal)-(a.missing/a.nominal)||String(a.id).localeCompare(String(b.id)));
}
export function canRecoverItem(unit,item,{safe=false,approved=false}={}){
 if(!safe||!unit||!item||item.quantity<=0)return false;
 if(item.kind==='primaryWeapon')return !!approved;
 if(item.kind==='ammo')return !!unit.compatibleAmmunition?.includes(item.caliber)&&unit.ammoNeeded>0;
 return item.kind==='supply'&&unit.capacityRemaining>=item.weight;
}
export function canOperateVehicle(vehicle,crew){
 if(!vehicle||!Array.isArray(crew))return false;
 const roles=new Set(crew.filter(member=>member.alive&&member.qualified).map(member=>member.post));
 return !!vehicle.functional?.engine&&roles.has('driver');
}
