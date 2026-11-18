// Radiance HDR (.hdr RGBE) decoder. Reject malformed/unbounded resources before allocation.
// Supports adaptive RLE and legacy flat RGBE, with the canonical +/-Y +/-X orientation.
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const readLine=(bytes,state)=>{
 const start=state.i;
 while(state.i<bytes.length&&bytes[state.i]!==10)state.i++;
 if(state.i>=bytes.length)throw Error('HDR header truncated');
 const line=new TextDecoder('ascii').decode(bytes.subarray(start,state.i++)).replace(/\r$/,'');
 return line;
};
export function decodeRadianceHdr(input,{maxPixels=4_194_304}={}){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 if(bytes.length<32||bytes.length>64*1024*1024)throw Error('HDR file size out of bounds');
 const state={i:0};
 const magic=readLine(bytes,state);
 if(!/^#\?(RADIANCE|RGBE)$/.test(magic))throw Error('Not Radiance HDR');
 let format=false;
 for(let n=0;n<64;n++){const line=readLine(bytes,state);if(line.startsWith('FORMAT='))format=line==='FORMAT=32-bit_rle_rgbe';if(!line)break}
 if(!format)throw Error('Only RGBE Radiance HDR is supported');
 const dimensions=readLine(bytes,state).match(/^([+-])Y\s+(\d+)\s+([+-])X\s+(\d+)$/);
 if(!dimensions)throw Error('Unsupported HDR orientation');
 const height=Number(dimensions[2]),width=Number(dimensions[4]);
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>maxPixels)throw Error('HDR dimensions too large');
 const output=new Float32Array(width*height*3);
 const write=(x,y,rgbe)=>{
  const ox=dimensions[3]==='+'?x:width-1-x,oy=dimensions[1]==='-'?y:height-1-y;
  const index=(oy*width+ox)*3,e=rgbe[3]?Math.pow(2,rgbe[3]-136):0;
  for(let c=0;c<3;c++)output[index+c]=rgbe[c]*e;
 };
 for(let y=0;y<height;y++){
  let row;
  if(width>=8&&width<=32767&&state.i+4<=bytes.length&&bytes[state.i]===2&&bytes[state.i+1]===2&&!(bytes[state.i+2]&128)){
   if(((bytes[state.i+2]<<8)|bytes[state.i+3])!==width)throw Error('Invalid HDR scanline width');
   state.i+=4;row=new Uint8Array(width*4);
   for(let c=0;c<4;c++){
    let x=0;
    while(x<width){
     if(state.i>=bytes.length)throw Error('HDR RLE truncated');
     const count=bytes[state.i++];
     if(count>128){const run=count-128;if(!run||x+run>width||state.i>=bytes.length)throw Error('Invalid HDR RLE run');row.fill(bytes[state.i++],c*width+x,c*width+x+run);x+=run}
     else{if(!count||x+count>width||state.i+count>bytes.length)throw Error('Invalid HDR RLE literal');row.set(bytes.subarray(state.i,state.i+count),c*width+x);state.i+=count;x+=count}
    }
   }
   for(let x=0;x<width;x++)write(x,y,[row[x],row[width+x],row[2*width+x],row[3*width+x]]);
  }else{
   if(state.i+width*4>bytes.length)throw Error('HDR pixels truncated');
   for(let x=0;x<width;x++){write(x,y,bytes.subarray(state.i,state.i+4));state.i+=4}
  }
 }
 return {width,height,data:output};
}
export function sampleEquirectHdr(hdr,direction){
 if(!hdr||!hdr.data||!Array.isArray(direction))throw Error('Invalid HDR sampling input');
 const [x,y,z]=direction;const r=Math.hypot(x,y,z)||1;
 const u=((Math.atan2(z,x)/(Math.PI*2)+.5)%1+1)%1;
 const v=clamp(Math.acos(clamp(y/r,-1,1))/Math.PI);
 const fx=u*hdr.width-.5,fy=v*hdr.height-.5;
 const x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0;
 const at=(xx,yy,c)=>hdr.data[(clamp(yy,0,hdr.height-1)*hdr.width+((xx%hdr.width)+hdr.width)%hdr.width)*3+c];
 return [0,1,2].map(c=>(1-ty)*((1-tx)*at(x0,y0,c)+tx*at(x0+1,y0,c))+ty*((1-tx)*at(x0,y0+1,c)+tx*at(x0+1,y0+1,c)));
}
