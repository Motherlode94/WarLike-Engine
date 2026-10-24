// Animated Canvas puppet rigs: original ninja and zombie characters (no external atlas).
const ninjaIds=new Set(['ninja','ninja-elite']), zombieIds=new Set(['zombie','zombie-runner','zombie-crawler','zombie-brute']);
export const universalClips=['idle','walk','run','sprint','turn_left','turn_right','crouch_idle','crouch_walk','jump_start','jump_loop','jump_land','fall','attack','attack_1','attack_2','attack_heavy','attack_air','block','parry','hurt','hit_front','hit_back','stagger','stun','death','interact','pickup','use_item','push_button','open','climb','roll','dash','victory'];
export const ninjaClips=['stealth_idle','stealth_walk','katana_attack_1','katana_attack_2','katana_attack_3','dash_slash','shuriken_throw','wall_run','wall_jump','backflip','evade','silent_takedown','hide','peek','meditate'];
export const zombieClips=['idle_zombie','walk_zombie','run_zombie','lunge','bite_attack','claw_attack_1','claw_attack_2','grab','hit_react','stagger_zombie','knockdown','get_up','death_zombie','crawl','crawl_attack','scream','vomit_attack','mutant_smash','berserk_run'];
export const humanoidClips=id=>[...universalClips,...(ninjaIds.has(id)?ninjaClips:zombieIds.has(id)?zombieClips:[])];
export const isPuppet=id=>ninjaIds.has(id)||zombieIds.has(id);
const stroke=(ctx,points,color,size)=>{ctx.strokeStyle=color;ctx.lineWidth=size;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.stroke()};
export function drawHumanoid(ctx,o,now,playing){
 const ninja=ninjaIds.has(o.assetId),brute=o.assetId==='zombie-brute',crawler=o.assetId==='zombie-crawler',runner=o.assetId==='zombie-runner',elite=o.assetId==='ninja-elite';
 const c=o.animation||'idle',speed=Math.max(.2,Math.min(4,Number(o.animationSpeed)||1)),t=now*.001*speed,active=playing||o.animationPreview;
 const walk=/walk|run|sprint|berserk|patrol|stealth_walk|wall_run/.test(c),run=/run|sprint|berserk|dash/.test(c),attack=/attack|slash|bite|claw|smash|takedown|throw/.test(c),hit=/hurt|hit_|stagger|stun/.test(c),dead=/death|knockdown/.test(c),crawl=/crawl/.test(c)||crawler;
 const phase=t*(run?16:walk?9:attack?11:3),swing=active&&walk?Math.sin(phase)*(run?13:8):0,arm=active&&attack?Math.sin(phase)*22:0,bob=active?Math.sin(phase)*((walk||run)?2.5:1):0;
 ctx.save();ctx.translate(o.x+o.w/2,o.y+o.h/2);ctx.rotate((o.rotation||0)*Math.PI/180);ctx.scale(o.w/64,o.h/96);
 if(active&&dead)ctx.rotate(Math.min(1,(t%5)*.8)*1.2);
 if(active&&/roll|backflip|evade/.test(c))ctx.rotate(t*5);
 if(active&&hit)ctx.translate(Math.sin(t*35)*3,0);
 if(active&&/jump|fall/.test(c))ctx.translate(0,-Math.abs(Math.sin(t*3))*17);
 if(crawl)ctx.scale(1.15,.68);
 ctx.translate(0,-bob);
 const body=ninja?(elite?'#544369':'#273444'):(brute?'#5b6f4c':runner?'#6b7658':'#63745d');
 const skin=ninja?'#c2a88f':brute?'#8b9673':'#a1a88a',dark='#182530',armor=ninja?'#506071':'#536953';
 // Ground contact.
 ctx.fillStyle='#07111b55';ctx.beginPath();ctx.ellipse(0,40,24,5,0,0,Math.PI*2);ctx.fill();
 const legs=[[[-10,13],[-12-swing*.22,27],[-12-swing,40]],[[10,13],[12+swing*.22,27],[12+swing,40]]];
 for(const leg of legs)stroke(ctx,leg,dark,brute?13:10);
 stroke(ctx,[[-12,40],[-3,40]],'#1b202b',5);stroke(ctx,[[12,40],[20,40]],'#1b202b',5);
 // Torso shoulders, clothing details.
 ctx.fillStyle=body;ctx.strokeStyle=dark;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-17,-17);ctx.lineTo(17,-17);ctx.lineTo(18,15);ctx.lineTo(-17,15);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle=armor;ctx.fillRect(-13,-9,26,11);stroke(ctx,[[-14,7],[14,7]],ninja?'#a68c70':'#404c43',5);
 const reach=ninja?[[-19,-13],[-23-arm*.25,2-arm*.5],[-24-arm*.5,14-arm]]:[[-19,-13],[-24,0+arm*.25],[-28,10+arm*.15]];
 const opposite=ninja?[[19,-13],[25+arm*.23,-1],[19+arm*.35,14-arm*.4]]:[[19,-13],[28,-1+arm*.23],[31,8+arm*.3]];
 stroke(ctx,reach,body,brute?13:10);stroke(ctx,opposite,body,brute?13:10);
 ctx.fillStyle=skin;for(const hand of [reach[2],opposite[2]]){ctx.beginPath();ctx.arc(hand[0],hand[1],4.5,0,Math.PI*2);ctx.fill()}
 // Head, hood or hair.
 ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,-27,12,13,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=dark;ctx.stroke();
 if(ninja){ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-13,-29);ctx.lineTo(-10,-42);ctx.lineTo(9,-42);ctx.lineTo(14,-28);ctx.lineTo(11,-19);ctx.lineTo(-11,-19);ctx.closePath();ctx.fill();ctx.fillStyle='#131b26';ctx.fillRect(-10,-29,20,8);stroke(ctx,[[-8,-25],[-3,-25]],'#e0cbab',2);stroke(ctx,[[3,-25],[8,-25]],'#e0cbab',2);stroke(ctx,[[-17,-24],[-25,-18]],elite?'#b796e8':'#a74c58',4)}
 else{ctx.fillStyle='#515b45';ctx.fillRect(-12,-37,23,7);stroke(ctx,[[-8,-26],[-3,-26]],'#ff6266',3);stroke(ctx,[[3,-26],[8,-26]],'#ff6266',3);stroke(ctx,[[-5,-18],[6,-17]],'#442c28',2);if(brute){stroke(ctx,[[-18,-10],[-24,4]],'#90a06b',6);stroke(ctx,[[18,-10],[24,4]],'#90a06b',6)}}
 // Props follow the attack hand.
 if(ninja){stroke(ctx,[[reach[2][0],reach[2][1]],[reach[2][0]+(active&&attack?23:5),reach[2][1]-24]],'#d2dbe1',3);if(/throw|shuriken/.test(c)){ctx.strokeStyle='#c7d3da';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(15,-8);ctx.lineTo(25,-18);ctx.moveTo(15,-18);ctx.lineTo(25,-8);ctx.stroke()}}
 if(active&&/dash|slash|lunge/.test(c)){ctx.strokeStyle=ninja?'#b4dcef':'#ce9284';ctx.globalAlpha=.6;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,35,-.9,.8);ctx.stroke()}
 ctx.restore();
}
