import {getAsset} from '../assets/catalog.js';
import {defaultCollider2d,defaultRigidbody2d,defaultController2d} from './physics-2d.js';
export function createBundledPhysicsScene2d(){
 const entities=[];
 const sprite=(id,x,y,options={})=>{const asset=getAsset(id);if(!asset)throw Error('Sprite intégré absent : '+id);const e={id:entities.length+1,name:asset.name,type:'prefab',assetId:id,x,y,w:asset.width,h:asset.height,color:'#83bdd2',animation:'idle',hp:100,...options};entities.push(e);return e};
 const player=sprite('free-platformer-art-deluxe-p1-stand',70,100,{name:'Player · Plateforme',hierarchyGroup:'Joueur',controller2d:{...defaultController2d(),mode:'platformer',jumpSpeed:470},rigidbody2d:defaultRigidbody2d(),collider2d:defaultCollider2d()});
 for(let i=0;i<10;i++)sprite(i===0?'free-platformer-art-deluxe-grassleft':i===9?'free-platformer-art-deluxe-grassright':'free-platformer-art-deluxe-grassmid',i*70,340,{hierarchyGroup:'Terrain',collider2d:defaultCollider2d()});
 for(let i=0;i<3;i++)sprite('free-platformer-art-deluxe-grassmid',190+i*70,260,{hierarchyGroup:'Plateformes',collider2d:defaultCollider2d()});
 sprite('free-platformer-art-deluxe-box',440,30,{name:'Caisse · Rigidbody 2D',w:50,h:50,hierarchyGroup:'Corps physiques',collider2d:defaultCollider2d(),rigidbody2d:{...defaultRigidbody2d(),mass:2}});
 sprite('free-platformer-art-deluxe-box',500,-50,{name:'Caisse · Rebond',w:45,h:45,hierarchyGroup:'Corps physiques',collider2d:defaultCollider2d(),rigidbody2d:{...defaultRigidbody2d(),restitution:.35}});
 for(const y of [200,270])sprite('free-platformer-art-deluxe-brickwall',630,y,{name:'Obstacle · Collider solide',hierarchyGroup:'Obstacles',collider2d:defaultCollider2d()});
 return {entities,selected:[player.id],nextId:entities.length+1,camera:{x:40,y:30,zoom:1},guide:'Physique 2D : Q/D ou flèches pour marcher · Espace/Z/W pour sauter · Maj pour courir. Les caisses tombent et les colliders bloquent. Réglages dans l’Inspecteur.'};
}
