import {fxRuntime,fxColor} from './fx-runtime.js';
import {heroCenter} from './hero-movement.js';
// Two GPU batches at most: additive energy and alpha-blended smoke. No remote sprites.
export function createFxRenderer3d(gl){
 const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
 const vs=compile(gl.VERTEX_SHADER,`precision highp float;attribute vec3 aPosition;attribute float aSize;attribute vec4 aColor;uniform vec3 uEye,uRight,uUp,uForward;uniform vec2 uViewport;uniform float uMaxPoint;varying vec4 vColor;void main(){vec3 rel=aPosition-uEye;float d=max(.01,dot(rel,uForward));gl_Position=vec4(dot(rel,uRight)*1.7320508/(uViewport.x/uViewport.y),dot(rel,uUp)*1.7320508,d*1.00066689-.20006669,d);gl_PointSize=clamp(aSize*uViewport.y*.8660254/d,1.,uMaxPoint);vColor=aColor;}`);
 const fs=compile(gl.FRAGMENT_SHADER,`precision mediump float;varying vec4 vColor;void main(){float r=length(gl_PointCoord-vec2(.5))*2.;if(r>1.)discard;float glow=pow(1.-r,1.6);vec3 core=mix(vColor.rgb,vec3(1.),pow(max(0.,1.-r*4.),2.)*.65);gl_FragColor=vec4(core,vColor.a*glow);}`);
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.deleteShader(vs);gl.deleteShader(fs);
 const buffer=gl.createBuffer(),attributes=['aPosition','aSize','aColor'].map(name=>gl.getAttribLocation(program,name)),u=Object.fromEntries(['Eye','Right','Up','Forward','Viewport','MaxPoint'].map(k=>[k,gl.getUniformLocation(program,'u'+k)])),maxPoint=Math.max(1,gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]);
 let storage=new Float32Array(8*4096);const stats={particles:0,drawCalls:0};const colors=new Map();
 const rgb=color=>{const key=fxColor(color);if(!colors.has(key)){if(colors.size>128)colors.clear();colors.set(key,[1,3,5].map(i=>parseInt(key.slice(i,i+2),16)/255))}return colors.get(key)};
 function draw(camera,width,height,entities=[]){
  stats.particles=0;stats.drawCalls=0;if(!fxRuntime.particles.length&&!fxRuntime.rings.length&&!entities.some(o=>o.heroState?.shield>0))return;
  gl.useProgram(program);gl.uniform3fv(u.Eye,camera.eye);gl.uniform3fv(u.Right,camera.right);gl.uniform3fv(u.Up,camera.up);gl.uniform3fv(u.Forward,camera.forward);gl.uniform2f(u.Viewport,gl.drawingBufferWidth||width,gl.drawingBufferHeight||height);gl.uniform1f(u.MaxPoint,Math.min(128,maxPoint));gl.enable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthMask(false);
  for(const smoke of [false,true]){let cursor=0;
   const add=(x,y,z,size,color,alpha)=>{const px=x/64,py=z/64,pz=y/64;if((px-camera.eye[0])*camera.forward[0]+(py-camera.eye[1])*camera.forward[1]+(pz-camera.eye[2])*camera.forward[2]<=.1)return;if(cursor+8>storage.length)return;const c=rgb(color);storage.set([px,py,pz,size/64,...c,alpha],cursor);cursor+=8};
   for(const p of fxRuntime.particles){if(p.mode!=='3d'||(p.kind==='smoke')!==smoke)continue;const fade=1-p.age/p.life;add(p.x,p.y,p.z,p.size*5*(.65+fade*.4),p.color,fade*.9)}
   if(!smoke){
    for(const ring of fxRuntime.rings){if(ring.mode!=='3d')continue;const t=ring.age/ring.life,radius=ring.radius*t;for(let i=0;i<36;i++){const a=i/36*Math.PI*2;add(ring.x+Math.cos(a)*radius,ring.y+(ring.plane==='vertical'?0:Math.sin(a)*radius),ring.z+(ring.plane==='vertical'?Math.sin(a)*radius:0),9,ring.color,(1-t)*.8)}}
    for(const o of entities){if(!(o.heroState?.shield>0)||o.visible===false)continue;const c=heroCenter(o,'3d'),radius=Math.max(Number(o.w)||32,Number(o.depth3d)||32,(Number(o.h)||64)*.7)*.75;for(let plane=0;plane<3;plane++)for(let i=0;i<32;i++){const a=i/32*Math.PI*2+fxRuntime.clock*.4,cs=Math.cos(a)*radius,sn=Math.sin(a)*radius;add(c.x+(plane===0?0:cs),c.y+(plane===1?0:plane===0?cs:sn),c.z+(plane===2?0:sn),7,o.superhero?.color||'#64e9ff',.65)}}
   }
   if(!cursor)continue;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,storage.subarray(0,cursor),gl.DYNAMIC_DRAW);
   for(let i=0;i<attributes.length;i++){gl.enableVertexAttribArray(attributes[i]);gl.vertexAttribPointer(attributes[i],i===0?3:i===1?1:4,gl.FLOAT,false,32,i===0?0:i===1?12:16)}
   gl.blendFunc(gl.SRC_ALPHA,smoke?gl.ONE_MINUS_SRC_ALPHA:gl.ONE);gl.drawArrays(gl.POINTS,0,cursor/8);stats.particles+=cursor/8;stats.drawCalls++;
  }
  for(const a of attributes)gl.disableVertexAttribArray(a);gl.depthMask(true);gl.disable(gl.BLEND);
 }
 return {draw,stats,dispose(){gl.deleteBuffer(buffer);gl.deleteProgram(program);storage=new Float32Array(0)}};
}
