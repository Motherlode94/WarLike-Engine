// Phaser 4 adapter for WarLike V2. Phaser is a 2D runtime, not a 3D engine.
// Loaded by v2-phaser.html after the pinned Phaser CDN script.
import {createScene,createGameObject,addGameObject,serializeScene} from '../core/scene-graph-v2.js';
export function startPhaser2d(host,{onStatus=()=>{}}={}){
 const Phaser=globalThis.Phaser;
 if(!Phaser?.Game)throw Error('Phaser 4 absent : vérifier le chargement de la bibliothèque.');
 const scene=createScene('Phaser 2D Demo');
 const player=addGameObject(scene,createGameObject('Player 2D','player-2d'));
 player.components[0].position=[400,0,300];
 const obstacles=[[250,220,90,50],[540,390,130,55],[340,480,120,45]];
 obstacles.forEach(([x,y,w,h],i)=>{const object=addGameObject(scene,createGameObject('Obstacle '+(i+1),'obstacle-'+i));object.components[0].position=[x,0,y];object.components.push({type:'BoxCollider2D',width:w,height:h})});
 let phaserScene,graphics,keys,rects,hero;
 const game=new Phaser.Game({
  type:Phaser.AUTO,parent:host,width:800,height:600,backgroundColor:'#142434',
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  scene:{
   create(){
    phaserScene=this;
    graphics=this.add.graphics();
    rects=obstacles.map(([x,y,w,h])=>new Phaser.Geom.Rectangle(x-w/2,y-h/2,w,h));
    hero=this.add.rectangle(400,300,32,40,0x52dbb9);
    this.add.text(12,12,'WARLIKE V2 · PHASER 2D',{fontFamily:'monospace',fontSize:'16px',color:'#d9f9ed'});
    keys=this.input.keyboard.addKeys('W,A,S,D,Z,Q,UP,DOWN,LEFT,RIGHT');
    onStatus('Phaser 2D prêt · ZQSD/WASD ou flèches');
   },
   update(_time,delta){
    if(!keys||!hero)return;
    const speed=220,dx=(+!!(keys.D.isDown||keys.RIGHT.isDown)-+!!(keys.A.isDown||keys.Q.isDown||keys.LEFT.isDown)),
     dy=(+!!(keys.S.isDown||keys.DOWN.isDown)-+!!(keys.W.isDown||keys.Z.isDown||keys.UP.isDown)),length=Math.hypot(dx,dy)||1;
    const step=speed*Math.min(delta,50)/1000;
    const fits=(x,y)=>x>=16&&x<=784&&y>=20&&y<=580&&!rects.some(r=>Phaser.Geom.Intersects.RectangleToRectangle(new Phaser.Geom.Rectangle(x-16,y-20,32,40),r));
    const x=hero.x+dx/length*step,y=hero.y+dy/length*step;
    if(fits(x,hero.y))hero.x=x;if(fits(hero.x,y))hero.y=y;
    player.components[0].position=[hero.x,0,hero.y];
    graphics.clear();graphics.lineStyle(1,0x335267,.9);
    for(let v=0;v<800;v+=40)graphics.lineBetween(v,0,v,600);
    for(let v=0;v<600;v+=40)graphics.lineBetween(0,v,800,v);
    graphics.fillStyle(0x9c7990,1);for(const r of rects)graphics.fillRectShape(r);
   }
  }
 });
 return {game,scene,serialize:()=>serializeScene(scene),destroy:()=>game.destroy(true)};
}
