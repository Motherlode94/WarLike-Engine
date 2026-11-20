// Component menu information architecture: real entries only.
// Unity-inspired hierarchy, not a promise of equivalent engines or packages.
const rootByCategory={
 'Animation':'Animation','Audio':'Audio','Constraints':'Constraints','Effects':'Effects',
 'Event':'Event','Input':'Input','Layout':'Layout','Mesh':'Mesh',
 'Miscellaneous':'Miscellaneous','Navigation':'Navigation',
 'Physics 2D':'Physics 2D','Physics':'Physics','Playables':'Playables',
 'Rendering':'Rendering','Scripts':'Scripts','Tilemap':'Tilemap',
 'UI Toolkit':'UI Toolkit','UI':'UI','Video':'Video','Visual Effects':'Visual Effects',
 'Movement':'Movement','Gameplay':'Gameplay','Vehicles':'Vehicles'
};
export const componentMenuRoots=Object.freeze([
 'Animation','Audio','Constraints','Effects','Event','Input','Layout','Mesh',
 'Miscellaneous','Navigation','Physics 2D','Physics','Playables','Rendering',
 'Scripts','Tilemap','UI Toolkit','UI','Video','Visual Effects',
 'Movement','Gameplay','Vehicles'
]);
const overrides={
 animatorGraph:['Animation','Animator'],spriteAnimation2d:['Animation','2D'],
 audio:['Audio','Sources'],
 joint3d:['Physics','Joints'],joint2d:['Physics 2D','Joints'],
 effector2d:['Physics 2D','Effectors'],collider2d:['Physics 2D','Colliders'],
 rigidbody2d:['Physics 2D','Rigidbodies'],
 collider3d:['Physics','Colliders'],rigidbody3d:['Physics','Rigidbodies'],
 grab3d:['Physics','Interactions'],'data-Rigidbody':['Physics','Rigidbodies'],
 fxEmitter:['Effects','Particle Effects'],
 cameraRig:['Input','Camera Controls'],inputActions:['Input','Actions'],
 sceneCamera3d:['Rendering','Cameras'],camera2d:['Rendering','Cameras'],
 light:['Rendering','Lighting'],environmentProbe3d:['Rendering','Lighting'],
 spriteRenderer2d:['Rendering','Sprites'],tilemap2d:['Tilemap','Tilemaps'],
 uiCanvas:['Layout','Canvas'],uiRect:['Layout','Rect Transform'],uiElement:['Layout','Elements'],
 webScripts:['Scripts','Web'],warScripts:['Scripts','WarScript'],
 vehicleController:['Vehicles','Controllers'],'data-VehicleController':['Vehicles','Controllers'],
 controller2d:['Movement','Player'],controller3d:['Movement','Player'],
 animalController:['Gameplay','Animals'],
 ai:['Navigation','Agents'],navigationAgent:['Navigation','Agents'],
 tacticalUnit:['Navigation','RTS'],'data-TacticalSquad':['Navigation','RTS'],
 'data-FollowActor':['Navigation','Following']
};
export function componentMenuPath(option,category){
 if(!option||typeof option.id!=='string')throw new TypeError('Component entry required');
 const root=category in rootByCategory?rootByCategory[category]:'Miscellaneous';
 return overrides[option.id]||[root];
}
export function componentMenuChildren(options,category,pathOf){
 const matches=options.filter(o=>pathOf(o)[0]===category);
 const groups=[...new Set(matches.map(o=>pathOf(o)[1]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const direct=matches.filter(o=>pathOf(o).length===1);
 return {groups,direct};
}
