import test from 'node:test';
import assert from 'node:assert/strict';
import {createScriptApi} from '../js/core/war-script-runtime.js';
import {compileWarScript} from '../script-editor/warscript.js';
import {updateDriving3d,driving3d,resetDriving3d} from '../js/core/vehicle-3d.js';
const actor={id:1,type:'player',x:0,y:0,w:32,h:64};
const car=(air=false)=>({id:2,type:'object',x:0,y:0,w:64,h:64,depth3d:64,vehicleSystems:{seats:{driverId:1}},...(air?{aircraftPhysics:{enabled:true,kind:'airplane'}}:{groundVehiclePhysics:{enabled:true}})});
test('WarScript vehicle commands reach native input and are consumed once',()=>{
 assert.equal(compileWarScript('Update(){Vehicle.Drive(1,0.4,0);Aircraft.Pilot(1,0,0,0,0);Vehicle.ReleaseControls();}').ok,true);
 for(const air of [false,true]){
 const vehicle=car(air),entities=[actor,vehicle],ctx={mode:'3d',entities};const api=createScriptApi(vehicle,ctx,{delta:.02,elapsed:0});
 resetDriving3d();driving3d.vehicleId=2;
 try{
 if(air){assert.equal(api.call('Aircraft.Pilot',[.8,.5,2,-2,0]),true);updateDriving3d(entities,actor,new Set(),.02);assert.equal(vehicle.aircraftInput.throttle,.8);assert.equal(vehicle.aircraftInput.roll,1);assert.equal(vehicle.aircraftInput.yaw,-1);assert.equal(vehicle._warAircraft,undefined)}
 else{assert.equal(api.call('Vehicle.Drive',[2,.4,.2]),true);updateDriving3d(entities,actor,new Set(),.02);assert.equal(vehicle.groundVehicleInput.throttle,1);assert.equal(vehicle.groundVehicleInput.steer,.4);assert.equal(vehicle.groundVehicleInput.brake,.2);assert.equal(vehicle._warDrive,undefined);updateDriving3d(entities,actor,new Set(),.02);assert.equal(vehicle.groundVehicleInput.throttle,0)}
 vehicle.vehicleSystems.seats.driverId=null;assert.equal(api.call(air?'Aircraft.Pilot':'Vehicle.Drive',air?[1,0,0,0,0]:[1,0,0]),false);
 }finally{resetDriving3d()}
 }
});
