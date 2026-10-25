// WarLike V2 engine registry. A rendering runtime is selected per project;
// do not load competing rendering engines in the same viewport.
export const engines=Object.freeze({
 'phaser-2d':{name:'Phaser',version:'4.2.1',dimension:'2d',entry:'./v2-phaser.html',status:'prototype'},
 'three-3d':{name:'Three.js',version:'0.186.1',dimension:'3d',entry:'./v2-three.html',status:'prototype'}
});
export const services=Object.freeze({
 physics3d:{name:'Rapier 3D',package:'@dimforge/rapier3d-compat',version:'0.21.0',status:'available-in-v1'},
 physics2d:{name:'Phaser collision demo',status:'prototype'},
 editor:{name:'WarLike Core V2',status:'prototype'}
});
export function engineForProject(mode){
 if(mode==='2d')return engines['phaser-2d'];
 if(mode==='3d')return engines['three-3d'];
 throw Error('Type de projet non pris en charge : '+mode);
}
