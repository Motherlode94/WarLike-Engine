// Image-space annotations: geometry is independent of editor zoom and display size.
export const annotationState={open:false};
export function imagePoint(clientX,clientY,rect,width,height){return {x:Math.max(0,Math.min(width,(clientX-rect.left)*width/Math.max(1,rect.width))),y:Math.max(0,Math.min(height,(clientY-rect.top)*height/Math.max(1,rect.height)))}}
export function arrowHead(from,to,width=4){const angle=Math.atan2(to.y-from.y,to.x-from.x),size=Math.max(12,width*4);return [{x:to.x-Math.cos(angle-Math.PI/6)*size,y:to.y-Math.sin(angle-Math.PI/6)*size},{x:to.x-Math.cos(angle+Math.PI/6)*size,y:to.y-Math.sin(angle+Math.PI/6)*size}]}
export function createAnnotationHistory(limit=200){
 let entries=[],future=[];
 return {get entries(){return entries},get canUndo(){return !!entries.length},get canRedo(){return !!future.length},add(item){if(visibleAnnotations(entries).length>=limit)throw Error(limit+' annotations maximum par capture.');entries=[...entries,structuredClone(item)].slice(-limit*2-1);future=[]},undo(){if(entries.length)future.push(entries.pop())},redo(){if(future.length)entries.push(future.pop())},clear(){if(entries.length){future=[];entries=[...entries,{type:'clear'}].slice(-limit*2-1)}},reset(){entries=[];future=[]}};
}
export function visibleAnnotations(entries){let start=0;for(let i=0;i<entries.length;i++)if(entries[i].type==='clear')start=i+1;return entries.slice(start)}
function textLines(ctx,text,maxWidth){const result=[];for(const line of String(text).split('\n')){let current='';for(const word of line.split(/\s+/)){const next=current?current+' '+word:word;if(current&&ctx.measureText(next).width>maxWidth){result.push(current);current=word}else current=next;while(ctx.measureText(current).width>maxWidth&&current.length>1){let i=current.length-1;while(i>1&&ctx.measureText(current.slice(0,i)).width>maxWidth)i--;result.push(current.slice(0,i));current=current.slice(i)}}result.push(current)}return result.slice(0,16)}
export function drawAnnotation(ctx,a,imageWidth,imageHeight){
 ctx.save();ctx.strokeStyle=a.color;ctx.fillStyle=a.color;ctx.lineWidth=a.width||4;ctx.lineCap='round';ctx.lineJoin='round';
 if(a.type==='ellipse'){const x=Math.min(a.from.x,a.to.x),y=Math.min(a.from.y,a.to.y);ctx.beginPath();ctx.ellipse(x+Math.abs(a.to.x-a.from.x)/2,y+Math.abs(a.to.y-a.from.y)/2,Math.max(.5,Math.abs(a.to.x-a.from.x)/2),Math.max(.5,Math.abs(a.to.y-a.from.y)/2),0,0,Math.PI*2);ctx.stroke()}
 else if(a.type==='arrow'){const [left,right]=arrowHead(a.from,a.to,a.width);ctx.beginPath();ctx.moveTo(a.from.x,a.from.y);ctx.lineTo(a.to.x,a.to.y);ctx.moveTo(left.x,left.y);ctx.lineTo(a.to.x,a.to.y);ctx.lineTo(right.x,right.y);ctx.stroke()}
 else if(a.type==='pen'){ctx.beginPath();a.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke()}
 else if(a.type==='note'){
  const font=Math.max(16,Math.min(32,Math.round(imageWidth/60))),pad=10,lineHeight=font*1.35,maxWidth=Math.min(340,Math.max(100,imageWidth-24));ctx.font='600 '+font+'px system-ui, sans-serif';ctx.textBaseline='top';const lines=textLines(ctx,a.text,maxWidth-pad*2),w=Math.min(maxWidth,Math.max(90,...lines.map(l=>ctx.measureText(l).width))+pad*2),h=lines.length*lineHeight+pad*2,x=Math.max(0,Math.min(a.from.x,imageWidth-w)),y=Math.max(0,Math.min(a.from.y,imageHeight-h));ctx.fillStyle='#142230f2';ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);ctx.fillStyle=a.color;lines.forEach((line,i)=>ctx.fillText(line,x+pad,y+pad+i*lineHeight,w-pad*2));
 }
 ctx.restore();
}
