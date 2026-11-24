// WB 2.8c — deterministic urban traffic certification fixture.
// This tests real Gaia road/junction, vehicle and pedestrian planners together.
// It is not a substitute for a browser/Rapier end-to-end test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {findGaiaRoadJunctions,roadJunctionEntity} from '../js/core/gaia-road-junctions.js';
import {buildGaiaTrafficNetwork,controlGaiaTrafficVehicle,gaiaTrafficLight,gaiaJunctionSignalPositions} from '../js/core/gaia-traffic-ai.js';
import {buildGaiaJunctionLaneConnectors,findGaiaLaneRoute,controlGaiaRoutedTrafficVehicle} from '../js/core/gaia-traffic-routing.js';
import {buildGaiaPedestrianCrosswalks} from '../js/core/gaia-pedestrian-crosswalks.js';
import {gaiaSidewalkPath,planGaiaPedestrianSidewalkStep,planGaiaPedestrianCrossingStep} from '../js/core/gaia-pedestrian-sidewalk-ai.js';

function scene(){
 const roads=[],positions=[-40,0,40];let id=1;
 for(const x of positions)roads.push(roadSplineEntity(id++,createRoadSpline([{x,z:-90},{x,z:90}],{width:6})));
 for(const z of positions)roads.push(roadSplineEntity(id++,createRoadSpline([{x:-90,z},{x:90,z}],{width:6})));
 const generated=findGaiaRoadJunctions(roads);
 const junctions=generated.map(j=>roadJunctionEntity(id++,j));
 return [...roads,...junctions];
}
const finiteControls=out=>['throttle','steer','brake','handbrake'].every(key=>Number.isFinite(out[key])&&Math.abs(out[key])<=1+1e-8);
test('WB 2.8c: city grid topology and authored scene survive JSON reopen',()=>{
 const entities=scene(),snapshot=structuredClone(entities);
 const network=buildGaiaTrafficNetwork(entities),links=buildGaiaJunctionLaneConnectors(network);
 assert.equal(entities.filter(e=>e.roadSpline).length,6);
 assert.equal(network.junctions.length,9);
 assert.equal(network.lanes.length,12);
 assert.equal(network.crosswalks.length,36);
 assert(links.length>=18,'network must connect streets at each junction');
 assert.deepEqual(buildGaiaTrafficNetwork(JSON.parse(JSON.stringify(entities))),network);
 assert.deepEqual(entities,snapshot,'derived network must not mutate authored scene');
});
test('WB 2.8c: thirty traffic agents produce finite bounded inputs and use the same lights as the visual scene',()=>{
 const entities=scene(),network=buildGaiaTrafficNetwork(entities);
 const vehicles=Array.from({length:30},(_,id)=>{
  const lane=network.lanes[id%network.lanes.length],point=lane.points[2+Math.floor(id/network.lanes.length)*3];
  return {id,position:{x:point.x,z:point.z}};
 });
 for(const seconds of [0,3,14,20,29]){
  for(const junction of network.junctions){
   const lights=gaiaJunctionSignalPositions(junction,entities,seconds);
   assert.equal(lights.length,4);
   for(const light of lights)assert.equal(light.color,gaiaTrafficLight(junction,light.roadId,seconds));
  }
  for(const [index,agent] of vehicles.entries()){
   const lane=network.lanes[index%network.lanes.length];
   const start=lane.points[0],end=lane.points.at(-1),dx=end.x-start.x,dz=end.z-start.z,n=Math.hypot(dx,dz);
   const plan=controlGaiaTrafficVehicle(network,{...agent,forward:{x:dx/n,z:dz/n},
    speedMps:index%3===0?6:2,seconds,vehicleId:agent.id,vehicles});
   assert(finiteControls(plan),'controller must return bounded Rapier input for vehicle '+agent.id);
   assert.equal(typeof plan.status,'string');
  }
 }
});
test('WB 2.8c: autonomous route and all pedestrian paths remain deterministic for a populated city',()=>{
 const entities=scene(),network=buildGaiaTrafficNetwork(entities);
 const route=findGaiaLaneRoute(network,'1:1','4:1');
 assert(route&&route.connectors.length>0,'vehicles should route through a city junction');
 const first=route.connectors[0],position=first.points[0];
 const planned=controlGaiaRoutedTrafficVehicle(network,{position,forward:{x:0,z:1},speedMps:2,seconds:3,destinationLaneId:'4:1'});
 assert(finiteControls(planned));
 const roads=entities.filter(e=>e.roadSpline),walkers=[];
 for(let i=0;i<60;i++){
  const road=roads[i%roads.length],side=i%2===0?'right':'left';
  const points=gaiaSidewalkPath(road.roadSpline,{side});
  walkers.push({roadId:road.id,side,position:points[2+(i%5)]});
 }
 for(const walker of walkers){
  const plan=planGaiaPedestrianSidewalkStep(entities,{enabled:true,roadId:walker.roadId,side:walker.side,
   speedMps:1.2},walker.position,1/60);
  assert.equal(plan.status,'walking');
  assert(Math.hypot(plan.dx,plan.dz)<=1.2/60+1e-7);
 }
 const crossings=buildGaiaPedestrianCrosswalks(entities);
 for(const crossing of crossings){
  const bank=crossing.halfWidth+.55,point={x:crossing.center.x+crossing.normal.x*bank,
   z:crossing.center.z+crossing.normal.z*bank};
  const junction=network.junctions.find(j=>j.id===crossing.junctionId);
  const red=[0,3,14,20,29].find(t=>gaiaTrafficLight(junction,crossing.roadId,t)==='red');
  assert.notEqual(red,undefined);
  const decision=planGaiaPedestrianCrossingStep(entities,{enabled:true,crosswalkId:crossing.id,
   speedMps:1.2},point,1/60,{seconds:red});
  assert.equal(decision.status,'crossing');
  assert(Math.hypot(decision.dx,decision.dz)<=1.2/60+1e-7);
 }
});
test('WB 2.8c: standalone Web player and runtime manifest include the whole urban traffic module chain',()=>{
 const player=readFileSync(new URL('../js/core/player-modules.js',import.meta.url),'utf8');
 const runtime=JSON.parse(readFileSync(new URL('../runtime-files.json',import.meta.url),'utf8'));
 for(const path of ['js/core/gaia-traffic-ai.js','js/core/gaia-traffic-routing.js',
  'js/core/gaia-pedestrian-crosswalks.js','js/core/gaia-pedestrian-sidewalk-ai.js']){
  assert(player.includes('"'+path+'"'),'missing player module '+path);
  assert(runtime.files.includes(path),'missing exported file '+path);
 }
});
