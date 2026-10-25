// Components supported by WarLike V2 editor and its Three.js/Rapier preview.
export const componentDefaults=Object.freeze({
 MeshRenderer:{type:'MeshRenderer',shape:'box',color:'#bcbcbc',roughness:.48,metalness:.08,visible:true},
 BoxCollider:{type:'BoxCollider',size:[1,1,1],isTrigger:false},
 Rigidbody:{type:'Rigidbody',bodyType:'dynamic',mass:1,gravityScale:1}
});
export function createComponent(type){
 const template=componentDefaults[type];if(!template)throw Error('Composant inconnu : '+type);
 return structuredClone(template);
}
export function validateComponent(c){
 if(!c||typeof c.type!=='string')return 'Type de composant requis';
 if(c.type==='MeshRenderer'&&(!['box','sphere','cylinder'].includes(c.shape)||!/^#[0-9a-f]{6}$/i.test(c.color)||!Number.isFinite(c.roughness)||c.roughness<0||c.roughness>1||!Number.isFinite(c.metalness)||c.metalness<0||c.metalness>1))return 'MeshRenderer invalide';
 if(c.type==='BoxCollider'&&(!Array.isArray(c.size)||c.size.length!==3||c.size.some(n=>!Number.isFinite(n)||n<=0)))return 'BoxCollider invalide';
 if(c.type==='Rigidbody'&&(!['dynamic','fixed','kinematic'].includes(c.bodyType)||!Number.isFinite(c.mass)||c.mass<=0))return 'Rigidbody invalide';
 return null;
}
