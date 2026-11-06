export const demoMaps=[
 ['demo-town-ground','Quartier du Canal · plan des rues',1728,1152,'town-ground.png'],
 ['demo-garage-ground','Piste d’essais · circuit fermé',1728,1200,'garage-ground.png'],
 ['demo-nature-ground','Première aube · clairière et source',1920,1536,'nature-ground.png'],
 ['demo-platformer-backdrop','Courrier des toits · arrière-plan',2380,900,'platformer-backdrop.png']
].map(([id,name,width,height,file])=>({id,name,width,height,category:'Terrain',kind:'prop',sourceType:'png',spriteUrl:'./assets/demos/'+file,pixelArt:true,author:'Kenney · composition WarLike',license:'CC0-1.0',packName:'Scènes démo',sourceUrl:'https://kenney.nl/assets/tiny-town'}));
