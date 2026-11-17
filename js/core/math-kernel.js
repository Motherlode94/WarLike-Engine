// WarLike Math Core v1 — deterministic, allocation-conscious pure geometry.
// Units: metres in 3D, radians in math functions, column-major Matrix4.
// No WebGL/DOM dependency. Invalid input is rejected instead of propagating NaNs.
const valid=n=>typeof n==='number'&&Number.isFinite(n);
const assertVec=(v,size)=>{if(!Array.isArray(v)&&!ArrayBuffer.isView(v)||v.length!==size||!Array.from(v).every(valid))throw RangeError('Vecteur '+size+'D invalide');return v};
const assertMat=m=>{if((!Array.isArray(m)&&!ArrayBuffer.isView(m))||m.length!==16||!Array.from(m).every(valid))throw RangeError('Matrix4 invalide');return m};
export const EPSILON=1e-9;
export const clampMath=(v,min,max)=>{if(![v,min,max].every(valid)||min>max)throw RangeError('Clamp invalide');return Math.min(max,Math.max(min,v))};
export const lerpMath=(a,b,t)=>{if(![a,b,t].every(valid))throw RangeError('Lerp invalide');return a+(b-a)*t};
export const dot3=(a,b)=>{assertVec(a,3);assertVec(b,3);return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]};
export const cross3=(a,b)=>{assertVec(a,3);assertVec(b,3);return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]};
export const add3=(a,b)=>{assertVec(a,3);assertVec(b,3);return a.map((n,i)=>n+b[i])};
export const subtract3=(a,b)=>{assertVec(a,3);assertVec(b,3);return a.map((n,i)=>n-b[i])};
export const scale3=(a,k)=>{assertVec(a,3);if(!valid(k))throw RangeError('Échelle invalide');return a.map(n=>n*k)};
export const length3=a=>{assertVec(a,3);return Math.hypot(...a)};
export const normalize3=(a,epsilon=EPSILON)=>{const l=length3(a);return l>epsilon?scale3(a,1/l):[0,0,0]};
export const distance3=(a,b)=>length3(subtract3(a,b));
export const reflect3=(incident,normal)=>subtract3(incident,scale3(normalize3(normal),2*dot3(incident,normalize3(normal))));
export const project3=(a,onto)=>{const d=dot3(onto,onto);return d<=EPSILON?[0,0,0]:scale3(onto,dot3(a,onto)/d)};
export const quaternionIdentity=()=>[0,0,0,1];
export function normalizeQuaternion(q){assertVec(q,4);const l=Math.hypot(...q);if(l<EPSILON)throw RangeError('Quaternion nul');return q.map(n=>n/l)}
export function quaternionMultiply(a,b){assertVec(a,4);assertVec(b,4);const [x,y,z,w]=a,[u,v,t,s]=b;return [w*u+x*s+y*t-z*v,w*v-x*t+y*s+z*u,w*t+x*v-y*u+z*s,w*s-x*u-y*v-z*t]}
export function quaternionFromAxisAngle(axis,angle){assertVec(axis,3);if(!valid(angle))throw RangeError('Angle invalide');const n=normalize3(axis);if(length3(n)<EPSILON)throw RangeError('Axe nul');const h=angle/2;return [...scale3(n,Math.sin(h)),Math.cos(h)]}
export function quaternionRotate3(q,point){const [x,y,z,w]=normalizeQuaternion(q);assertVec(point,3);const u=[x,y,z],t=scale3(cross3(u,point),2);return add3(point,add3(scale3(t,w),cross3(u,t)))}
export function slerpQuaternion3(a,b,t){
 const q=normalizeQuaternion(a),p=normalizeQuaternion(b);if(!valid(t))throw RangeError('T invalide');
 let cos=q.reduce((sum,n,i)=>sum+n*p[i],0),end=p;
 if(cos<0){cos=-cos;end=p.map(x=>-x)}
 if(cos>.9995)return normalizeQuaternion(q.map((n,i)=>lerpMath(n,end[i],t)));
 const angle=Math.acos(clampMath(cos,-1,1)),s=Math.sin(angle);
 return normalizeQuaternion(q.map((n,i)=>(Math.sin((1-t)*angle)*n+Math.sin(t*angle)*end[i])/s));
}
export const matrixIdentity4=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
export function multiplyMatrix4Math(a,b){assertMat(a);assertMat(b);const out=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out}
export function transformPoint4(matrix,p){assertMat(matrix);assertVec(p,3);const x=p[0],y=p[1],z=p[2],w=matrix[3]*x+matrix[7]*y+matrix[11]*z+matrix[15];if(Math.abs(w)<EPSILON)throw RangeError('Coordonnée homogène nulle');return [(matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12])/w,(matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13])/w,(matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14])/w]}
export function transformDirection4(matrix,v){assertMat(matrix);assertVec(v,3);return [matrix[0]*v[0]+matrix[4]*v[1]+matrix[8]*v[2],matrix[1]*v[0]+matrix[5]*v[1]+matrix[9]*v[2],matrix[2]*v[0]+matrix[6]*v[1]+matrix[10]*v[2]]}
// Partial-pivot Gauss–Jordan with scale-aware singularity detection. Inverse
// stability is checked by a residual bound rather than a fixed absolute pivot.
export function invertMatrix4Math(matrix,{epsilon=1e-12}={}){
 assertMat(matrix);if(!valid(epsilon)||epsilon<=0)throw RangeError('Tolérance invalide');
 const norm=Math.max(...Array.from({length:4},(_,r)=>Math.abs(matrix[r])+Math.abs(matrix[4+r])+Math.abs(matrix[8+r])+Math.abs(matrix[12+r])));
 if(norm===0)throw RangeError('Matrice singulière');
 const rows=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>c<4?matrix[c*4+r]:Number(c-4===r)));
 const scales=rows.map(row=>Math.max(...row.slice(0,4).map(Math.abs)));
 for(let col=0;col<4;col++){
  let pivot=col,score=-1;
  for(let row=col;row<4;row++){const v=scales[row]?Math.abs(rows[row][col])/scales[row]:0;if(v>score){score=v;pivot=row}}
  if(Math.abs(rows[pivot][col])<=epsilon*Math.max(scales[pivot],Number.MIN_VALUE))throw RangeError('Matrice singulière ou mal conditionnée');
  [rows[col],rows[pivot]]=[rows[pivot],rows[col]];[scales[col],scales[pivot]]=[scales[pivot],scales[col]];
  const v=rows[col][col];for(let j=0;j<8;j++)rows[col][j]/=v;
  for(let row=0;row<4;row++)if(row!==col){const factor=rows[row][col];for(let j=0;j<8;j++)rows[row][j]-=factor*rows[col][j]}
 }
 const result=Array.from({length:16},(_,i)=>rows[i%4][4+Math.floor(i/4)]);
 if(!result.every(valid))throw RangeError('Inverse non finie');
 const residual=multiplyMatrix4Math(matrix,result);
 if(residual.some((v,i)=>Math.abs(v-(i%5===0?1:0))>Math.max(1e-8,epsilon*100)*Math.max(1,norm)))throw RangeError('Inverse numériquement instable');
 return result;
}
// Positive ray intersections only. Zero-length directions are rejected.
export function rayAabb3(origin,direction,min,max,{epsilon=EPSILON}={}){
 assertVec(origin,3);assertVec(direction,3);assertVec(min,3);assertVec(max,3);
 if(length3(direction)<=epsilon)throw RangeError('Direction de rayon nulle');
 if(min.some((v,i)=>v>max[i]))throw RangeError('Boîte invalide');
 let enter=-Infinity,exit=Infinity,axis=-1,sign=0;
 for(let i=0;i<3;i++){
  if(Math.abs(direction[i])<=epsilon){if(origin[i]<min[i]||origin[i]>max[i])return null;continue}
  let a=(min[i]-origin[i])/direction[i],b=(max[i]-origin[i])/direction[i],face=-1;
  if(a>b){[a,b]=[b,a];face=1}
  if(a>enter){enter=a;axis=i;sign=face}
  exit=Math.min(exit,b);
  if(enter>exit)return null;
 }
 if(exit<0)return null;
 const inside=enter<0,t=inside?exit:enter;
 const point=origin.map((n,i)=>n+direction[i]*t);
 const normal=[0,0,0];normal[axis]=inside?-sign:sign;
 return {distance:t,point,normal,inside};
}
export function barycentric3(point,a,b,c){
 const u=subtract3(b,a),v=subtract3(c,a),w=subtract3(point,a);
 const aa=dot3(u,u),ab=dot3(u,v),bb=dot3(v,v),aw=dot3(u,w),bw=dot3(v,w),den=aa*bb-ab*ab;
 if(Math.abs(den)<=EPSILON*Math.max(1,aa*bb))return null;
 const y=(bb*aw-ab*bw)/den,z=(aa*bw-ab*aw)/den;
 return [1-y-z,y,z];
}
export function closestPointSegment3(point,a,b){
 const dir=subtract3(b,a),len=dot3(dir,dir),t=len<=EPSILON?0:clampMath(dot3(subtract3(point,a),dir)/len,0,1);
 return {point:add3(a,scale3(dir,t)),t};
}
// Stable accumulator for editor/game fixed physics updates.
export function fixedStepAccumulator(accumulator,dt,{step=1/60,maxSteps=6,maxFrame=.1}={}){
 if(![accumulator,dt,step,maxSteps,maxFrame].every(valid)||accumulator<0||dt<0||step<=0||maxSteps<1||maxFrame<0)throw RangeError('Physique : pas de temps invalide');
 const total=accumulator+Math.min(dt,maxFrame),steps=Math.min(Math.floor((total+EPSILON)/step),Math.floor(maxSteps));
 return {steps,remaining:Math.max(0,total-steps*step),alpha:clampMath((total-steps*step)/step,0,1)};
}
