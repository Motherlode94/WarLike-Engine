// WarLike browser building gameplay: construction, production and solid-state checks.
import {state} from './state.js';
import {getAsset} from '../assets/catalog.js';
import {defaults} from '../assets/buildings.js';
export const isBuilding=o=>o?.type==='prefab'&&getAsset(o.assetId)?.category==='Buildings';
export const isBuildingSolid=o=>isBuilding(o)&&o.buildCollision!==false&&o.buildState!=='destroyed'&&o.buildState!=='construction';
export function updateBuildings(dt){
 if(!state.playing)return;
 const created=[];
 for(const obj of state.entities.filter(isBuilding)){
  if(obj.buildState==='construction'){
   obj.constructionProgress=Math.min(100,Math.max(0,Number(obj.constructionProgress)||0)+dt*12);
   if(obj.constructionProgress>=100)obj.buildState='idle';
  }
  const hp=Number(obj.buildHp??obj.hp??600);
  if(hp<=0){obj.buildState='destroyed';continue}
  if(obj.buildState==='damaged'&&hp>=Number(obj.buildMaxHp||600)*.75)obj.buildState='idle';
  if(obj.buildState==='destroyed'||obj.buildState==='construction'||obj.buildState==='powered_off'||obj.buildPowered===false)continue;
  const unit=getAsset(obj.buildProduction);
  if(!unit||!['Characters','Vehicles'].includes(unit.category)||Number(obj.buildQueue)<=0)continue;
  obj.buildTimer=(Number(obj.buildTimer)||0)+dt;
  if(obj.buildTimer<Math.max(.5,Number(obj.buildTime)||8))continue;
  obj.buildTimer=0;
  const id=state.nextId++,margin=30;
  const x=obj.x+obj.w+margin,y=obj.y+obj.h*.5-unit.height*.5;
  created.push({id,type:'prefab',name:unit.name+' '+id,assetId:unit.id,x,y,w:unit.width,h:unit.height,color:'#689bad',hp:unit.hp,animation:'idle',animationSpeed:1,behavior:'none',team:obj.buildTeam||0});
  obj.buildQueue=Math.max(0,obj.buildQueue-1);
 }
 if(created.length)state.entities.push(...created);
}
