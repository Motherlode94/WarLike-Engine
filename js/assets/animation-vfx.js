import {humanoidClips} from './humanoid-rigs.js';
// Canvas animation layer for WarLike prefabs (procedural poses and visual effects).
export const presets={
actor:['idle','walk','run','attack','hurt','death'],
vehicle:['idle','move','hurt','death'],
weapon:['idle','attack','pulse'],
prop:['idle','pulse'],
effect:['loop','pulse','idle']
};
export function availableClips(kind,assetId=''){return kind==='actor'?humanoidClips(assetId):presets[kind]||presets.prop}
function part(ctx,x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
export function drawEffect(ctx,id,x,y,w,h,time,speed=1,opacity=1){
 const t=time*speed, cx=x+w/2,cy=y+h/2,span=Math.min(w,h)*.48;ctx.save();ctx.globalAlpha=Math.min(1,Math.max(0,opacity));ctx.globalCompositeOperation='lighter';
 const colors={fire:['#f28d3c','#fbd66d'],smoke:['#778996','#b6c1c9'],sparks:['#e8c45a','#fff2c4'],explosion:['#f07642','#ffdf81'],magic:['#9c7af2','#f5b6ff'],electric:['#5abff2','#f5fcff'],snow:['#c5e8fa','#f3faff'],rain:['#5588d9','#c5e4fb'],dust:['#b79f78','#e8ce98'],heal:['#48cf9b','#c8ffcc'],portal:['#9466ea','#82caff'],blood:['#b94754','#ec9191']}[id]||['#7ec6e3','#fff'];
 if(id==='portal'){ctx.strokeStyle=colors[0];ctx.lineWidth=Math.max(3,w*.09);ctx.beginPath();ctx.ellipse(cx,cy,span*.62,span*(.85+.04*Math.sin(t*4)),t*.12,0,Math.PI*2);ctx.stroke();part(ctx,cx,cy,span*.4,colors[1]+'44')}
 else if(id==='electric'){for(let i=0;i<3;i++){ctx.strokeStyle=colors[i%2];ctx.lineWidth=2+i;ctx.beginPath();for(let j=0;j<6;j++){const px=cx-span+j*span*.42,py=cy+Math.sin(t*8+i+j*4)*span*.48+j*2;if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)}ctx.stroke()}}
 else if(id==='rain'||id==='snow'){for(let i=0;i<21;i++){const px=x+(((i*41.3)%100)/100)*w,py=y+(((i*31.7+t*(id==='rain'?80:22))%100)/100)*h;ctx.strokeStyle=colors[i%2];ctx.lineWidth=id==='rain'?1.7:3;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-(id==='rain'?5:0),py+(id==='rain'?12:1));ctx.stroke()}}
 else {for(let i=0;i<14;i++){const angle=i*2.39996+t*(id==='heal'?.25:.11),travel=((t*(id==='smoke'?16:35)+i*9)%Math.max(6,span));const radius=id==='explosion'?travel:Math.max(2,span-travel);const px=cx+Math.cos(angle)*radius,py=cy+Math.sin(angle)*radius-(id==='fire'||id==='smoke'?travel*.9:0);const r=(id==='smoke'?8:id==='fire'?6:id==='dust'?5:3)*(1-radius/(span*1.8));part(ctx,px,py,Math.max(1,r),colors[i%2])}}
 ctx.restore();
}
export function drawAnimatedAsset(ctx,img,o,now,playing,kind,moving=false){
 const clips=availableClips(kind,o.assetId),clip=clips.includes(o.animation)?o.animation:'idle',speed=Math.max(.1,Math.min(4,Number(o.animationSpeed)||1));
 const t=now*.001*speed, running=/run|sprint/.test(clip),walking=/walk/.test(clip),striking=/attack|punch|kick|slash/.test(clip), bob=kind==='actor'?walking?Math.sin(t*12)*3:running?Math.sin(t*18)*5:clip==='idle'?Math.sin(t*2)*1.3:0:clip==='pulse'?Math.sin(t*5)*1.5:0;
 const cx=o.x+o.w/2,cy=o.y+o.h/2;ctx.save();ctx.translate(cx,cy);
 const animated=playing||o.animationPreview;
 if(animated){
 if(kind==='actor'&&(walking||running)){ctx.rotate(Math.sin(t*(running?13:8))*.06);ctx.scale(1+.025*Math.sin(t*9),1)}
 if(kind==='actor'&&striking){ctx.rotate(Math.sin(t*11)*.16);ctx.translate(4*Math.sin(t*11),0)}
 if(/hurt|hit|stagger|stun/.test(clip)){ctx.translate(Math.sin(t*29)*3,0);ctx.globalAlpha=.65+.35*Math.sin(t*18)**2}
 if(/death|knockdown/.test(clip)){ctx.rotate(Math.min(1,t%4)*.85);ctx.globalAlpha=.75}
 if(/pulse|meditate|victory/.test(clip)){const v=1+.08*Math.sin(t*6);ctx.scale(v,v)}
 if(/roll|backflip/.test(clip))ctx.rotate(t*5);if(/crouch|stealth/.test(clip))ctx.scale(1,.77);if(/jump|fall/.test(clip))ctx.translate(0,-Math.abs(Math.sin(t*3))*12);if(/block|parry/.test(clip))ctx.translate(-3,0);if(clip==='move'&&kind==='vehicle')ctx.rotate(.025*Math.sin(t*9));
 }
 ctx.drawImage(img,-o.w/2,-o.h/2-(animated?bob:0),o.w,o.h);
 ctx.restore();
}
