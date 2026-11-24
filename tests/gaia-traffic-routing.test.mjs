import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {findGaiaRoadJunctions,roadJunctionEntity} from '../js/core/gaia-road-junctions.js';
import {buildGaiaTrafficNetwork} from '../js/core/gaia-traffic-ai.js';
import {buildGaiaJunctionLaneConnectors,findGaiaLaneRoute,controlGaiaRoutedTrafficVehicle} from '../js/core/gaia-traffic-routing.js';

const fixture=()=>{
 const north=roadSplineEntity(1,createRoadSpline([{x:0,z:-40},{x:0,z:40}],{width:6}));
 const east=roadSplineEntity(2,createRoadSpline([{x:-40,z:0},{x:40,z:0}],{width:6}));
 const junction=roadJunctionEntity(3,findGaiaRoadJunctions([north,east])[0]);
 return [north,east,junction];
};
test('WB 2.7a connects both driving directions between crossing Gaia roads',()=>{
 const network=buildGaiaTrafficNetwork(fixture());
 const links=buildGaiaJunctionLaneConnectors(network);
 assert.equal(links.length,8);
 assert(links.every(c=>c.fromRoadId!==c.toRoadId&&c.points.length===13));
 assert(links.every(c=>c.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z))));
 assert(links.some(c=>c.fromLaneId==='1:1'&&c.toLaneId==='2:1'));
 assert(links.some(c=>c.fromLaneId==='2:-1'&&c.toLaneId==='1:-1'));
});
test('WB 2.7a route finds junction transition and does not mutate authored scene',()=>{
 const entities=fixture(),before=structuredClone(entities);
 const network=buildGaiaTrafficNetwork(entities);
 const route=findGaiaLaneRoute(network,'1:1','2:-1');
 assert.deepEqual(route.laneIds,['1:1','2:-1']);
 assert.equal(route.connectors.length,1);
 assert.deepEqual(entities,before);
 assert.deepEqual(buildGaiaJunctionLaneConnectors(buildGaiaTrafficNetwork(JSON.parse(JSON.stringify(entities)))),buildGaiaJunctionLaneConnectors(network));
});
test('WB 2.7a missing or disconnected lanes fail explicitly without invented links',()=>{
 const [a,b]=fixture();
 const network=buildGaiaTrafficNetwork([a,b]);
 assert.deepEqual(buildGaiaJunctionLaneConnectors(network),[]);
 assert.equal(findGaiaLaneRoute(network,'1:1','2:1'),null);
 assert.equal(findGaiaLaneRoute(network,'missing','1:1'),null);
 assert.deepEqual(findGaiaLaneRoute(network,'1:1','1:1'),{laneIds:['1:1'],connectors:[]});
});

test('WB 2.7b a green light permits opt-in turn steering via existing vehicle controls',()=>{
 const network=buildGaiaTrafficNetwork(fixture()),link=buildGaiaJunctionLaneConnectors(network)
  .find(x=>x.fromLaneId==='1:1'&&x.toLaneId==='2:1');
 assert(link);
 const approach=link.points[0];
 const options={position:approach,forward:{x:0,z:1},speedMps:2,seconds:3,
  destinationLaneId:'2:1',maxSpeedMps:8};
 const turn=controlGaiaRoutedTrafficVehicle(network,options);
 assert.equal(turn.status,'turning');
 assert.equal(turn.routeConnectorId,link.id);
 assert(Number.isFinite(turn.steer)&&Number.isFinite(turn.brake));
 assert(turn.throttle>=0&&turn.throttle<=1,'routing must command forces, not a teleport');
});
test('WB 2.7b a red light blocks the turn and preserves existing braking',()=>{
 const network=buildGaiaTrafficNetwork(fixture()),link=buildGaiaJunctionLaneConnectors(network)
  .find(x=>x.fromLaneId==='1:1'&&x.toLaneId==='2:1');
 const stopped=controlGaiaRoutedTrafficVehicle(network,{
  position:link.points[0],forward:{x:0,z:1},speedMps:5,seconds:20,destinationLaneId:'2:1'});
 assert.equal(stopped.routeConnectorId,null);
 assert(stopped.brake>0);
});
test('WB 2.7b active turn keeps control through junction and exits onto destination',()=>{
 const network=buildGaiaTrafficNetwork(fixture()),link=buildGaiaJunctionLaneConnectors(network)
  .find(x=>x.fromLaneId==='1:1'&&x.toLaneId==='2:1');
 const midway=link.points[6];
 const turn=controlGaiaRoutedTrafficVehicle(network,{position:midway,forward:{x:1,z:1},
  speedMps:2,seconds:20,destinationLaneId:'2:1',activeConnectorId:link.id});
 assert.equal(turn.routeConnectorId,link.id);
 const exit=controlGaiaRoutedTrafficVehicle(network,{position:link.points.at(-1),
  forward:{x:1,z:0},speedMps:2,seconds:20,destinationLaneId:'2:1',activeConnectorId:link.id});
 assert.equal(exit.routeConnectorId,null);
 assert.equal(exit.laneId,'2:1');
});
