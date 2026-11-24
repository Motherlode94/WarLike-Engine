import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {findGaiaRoadJunctions,roadJunctionEntity} from '../js/core/gaia-road-junctions.js';
import {buildGaiaTrafficNetwork} from '../js/core/gaia-traffic-ai.js';
import {buildGaiaJunctionLaneConnectors,findGaiaLaneRoute} from '../js/core/gaia-traffic-routing.js';

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
