// Axis-aligned rounded rectangles: box r=0, circle r=w/2, capsule r=min(w,h)/2.
// The same geometry drives swept motion, contacts and the editor overlay.
const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
export function colliderShape2d(object){
 const c=object.collider2d||{};
 let w=Math.max(.01,number(c.width)>0?number(c.width):number(object.w,32));
 let h=Math.max(.01,number(c.height)>0?number(c.height):number(object.h,32));
 let x=number(object.x)+number(c.offsetX),y=number(object.y)+number(c.offsetY),r=0;
 if(c.shape==='circle'){
  r=number(c.radius)>0?Math.min(100000,number(c.radius)):Math.min(w,h)/2;
  x+=w/2-r;y+=h/2-r;w=h=2*r;
 }else if(c.shape==='capsule')r=Math.min(w,h)/2;
 return {x,y,w,h,r,cx:x+w/2,cy:y+h/2};
}
function minkowski(a,b){return {x:a.cx-b.cx,y:a.cy-b.cy,hx:(a.w+b.w)/2-a.r-b.r,hy:(a.h+b.h)/2-a.r-b.r,r:a.r+b.r}}
export function colliderSeparation2d(a,b){
 const m=minkowski(a,b),x=Math.abs(m.x)-m.hx,y=Math.abs(m.y)-m.hy;
 return Math.hypot(Math.max(0,x),Math.max(0,y))+Math.min(Math.max(x,y),0)-m.r;
}
export function colliderDepenetration2d(a,b){
 const m=minkowski(a,b),qx=Math.max(0,Math.abs(m.x)-m.hx),qy=Math.max(0,Math.abs(m.y)-m.hy),length=Math.hypot(qx,qy);
 if(length>0){const depth=m.r-length;if(depth<=1e-6)return null;return {x:(m.x<0?-1:1)*qx/length*depth,y:(m.y<0?-1:1)*qy/length*depth}}
 const dx=m.hx+m.r-Math.abs(m.x),dy=m.hy+m.r-Math.abs(m.y);
 if(dx<=1e-6||dy<=1e-6)return null;
 return dx<dy?{x:(m.x<0?-1:1)*dx,y:0}:{x:0,y:(m.y<0?-1:1)*dy};
}
// Exact intersection interval for an axis-aligned sweep through the Minkowski
// rounded rectangle. Thin walls cannot be skipped at high speed.
export function colliderSweep2d(a,b,axis,desired){
 const m=minkowski(a,b),horizontal=axis==='x',position=horizontal?m.x:m.y;
 const off=Math.max(0,Math.abs(horizontal?m.y:m.x)-(horizontal?m.hy:m.hx));
 if(m.r>0&&off>=m.r-1e-7)return desired;
 if(off>m.r+1e-7||m.r===0&&off>0)return desired;
 const half=(horizontal?m.hx:m.hy)+Math.sqrt(Math.max(0,m.r*m.r-off*off));
 // Tangential travel along a flat edge is allowed.
 if(m.r===0&&Math.abs(horizontal?m.y:m.x)>=(horizontal?m.hy:m.hx)-1e-7)return desired;
 if(desired>0&&position<=-half+1e-6)return Math.min(desired,Math.max(0,-half-position));
 if(desired<0&&position>=half-1e-6)return Math.max(desired,Math.min(0,half-position));
 return desired;
}
