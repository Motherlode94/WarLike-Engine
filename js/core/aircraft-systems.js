// Aircraft V6: deterministic flight surfaces, undercarriage state and visual shaft angles.
// Gear state is aerodynamic/visual only; physical wheel joints require a separate component.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
export const defaultAircraftSystems=()=>({
 enabled:true,gear:{deployed:true,dragCoefficient:.035},
 flaps:{position:0,liftBonus:.55,dragCoefficient:.075},
 airbrake:{deployed:false,dragCoefficient:.22},
 propeller:{enabled:true,rpmMax:2600,angle:0},
 rotor:{enabled:true,rpmMax:420,angle:0}
});
export function validateAircraftSystems(value){
 if(!value||typeof value!=='object')return ['Aircraft systems: configuration missing'];
 const errors=[];
 for(const [label,v] of [['gear drag',value.gear?.dragCoefficient],['flap lift',value.flaps?.liftBonus],
  ['flap drag',value.flaps?.dragCoefficient],['airbrake drag',value.airbrake?.dragCoefficient],
  ['propeller rpm',value.propeller?.rpmMax],['rotor rpm',value.rotor?.rpmMax]]){
  if(!Number.isFinite(v)||v<0||v>10000)errors.push('Aircraft systems: invalid '+label);
 }
 if(!Number.isFinite(value.flaps?.position)||value.flaps.position<0||value.flaps.position>1)errors.push('Aircraft systems: flaps position must be 0..1');
 for(const [name,v] of [['gear',value.gear],['airbrake',value.airbrake]])if(typeof v?.deployed!=='boolean')errors.push('Aircraft systems: invalid '+name+' state');
 return errors;
}
export function aircraftAeroModifiers(systems,kind){
 if(!systems?.enabled)return {extraDrag:0,extraLift:0};
 if(validateAircraftSystems(systems).length)return {extraDrag:0,extraLift:0};
 const flap=kind==='airplane'?systems.flaps.position:0;
 return {extraLift:flap*systems.flaps.liftBonus,
  extraDrag:(systems.gear.deployed?systems.gear.dragCoefficient:0)+
   (kind==='airplane'?flap*systems.flaps.dragCoefficient:0)+
   (systems.airbrake.deployed?systems.airbrake.dragCoefficient:0)};
}
export function stepAircraftSystems(systems,kind,keys=new Set(),dt=0,power=0){
 if(!systems?.enabled)return systems;
 if(validateAircraftSystems(systems).length)return systems;
 const active=k=>keys.has(k);
 const prev=systems._keys||{};
 const edge=k=>active(k)&&!prev[k];
 if(edge('g'))systems.gear.deployed=!systems.gear.deployed;
 if(edge('x'))systems.airbrake.deployed=!systems.airbrake.deployed;
 if(edge('b')&&kind==='airplane')systems.flaps.position=systems.flaps.position>=.99?0:Math.min(1,Math.round((systems.flaps.position+.25)*100)/100);
 // Angles are visual channels, not aerodynamics. Runtime renderers or a rig
 // may bind to them; no geometry is synthesized by this module.
 const p=clamp(power,0,1),step=clamp(dt,0,.1);
 const shaft=kind==='helicopter'?'rotor':'propeller',axis=systems[shaft];
 axis.angle=(clamp(axis.angle,0,360)+p*axis.rpmMax*6*step)%360;
 systems._keys={g:active('g'),x:active('x'),b:active('b')};
 return systems;
}
