// Local DOM capture. Canvas snapshots are substituted before SVG rasterization.
let libraryPromise;
function loadCaptureLibrary(){
 if(globalThis.domtoimage)return Promise.resolve(globalThis.domtoimage);
 if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('../../vendor/dom-to-image-more/dom-to-image-more.min.js',import.meta.url).href;script.onload=()=>resolve(globalThis.domtoimage);script.onerror=()=>{script.remove();libraryPromise=null;reject(Error('Le module de capture ne peut pas être chargé.'))};document.head.append(script)});
 return libraryPromise;
}
export async function captureEditor(){
 const library=await loadCaptureLibrary(),snapshots=new WeakMap();let webglImage=null;
 const gl=document.getElementById('canvas3d');
 if(gl&&!gl.hidden&&gl.getBoundingClientRect().width){webglImage=await new Promise(resolve=>{const timer=setTimeout(()=>resolve(null),800);document.dispatchEvent(new CustomEvent('warlike:capture-frame',{detail:{resolve:data=>{clearTimeout(timer);resolve(data)}}}))})}
 for(const canvas of document.querySelectorAll('canvas')){if(!canvas.getBoundingClientRect().width||!canvas.getBoundingClientRect().height)continue;try{snapshots.set(canvas,canvas===gl&&webglImage?webglImage:canvas.toDataURL('image/png'))}catch{throw Error('Un canvas contient une image externe non capturable. Importe une capture PNG pour l’annoter.')}}
 const width=window.innerWidth,height=window.innerHeight;
 return library.toCanvas(document.documentElement,{
  width,height,pixelRatio:1,scale:1,bgcolor:getComputedStyle(document.body).backgroundColor||'#172332',cacheBust:false,disableEmbedFonts:true,httpTimeout:6000,
  imagePlaceholder:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz4=',
  filter:node=>{if(node.nodeType!==1)return true;if(['HEAD','SCRIPT','NOSCRIPT'].includes(node.tagName)||node.id==='annotationDialog')return false;if(node.tagName==='IMG'){const rect=node.getBoundingClientRect();if(rect.bottom<0||rect.top>height||rect.right<0||rect.left>width)return false}return getComputedStyle(node).display!=='none'},
  adjustClonedNode:(original,clone)=>{const data=snapshots.get(original);if(data&&clone.tagName==='IMG')clone.src=data;if(original.id==='annotateEditor'){clone.textContent='✎ Annoter';clone.removeAttribute('disabled')}},
  style:{margin:'0',overflow:'hidden',width:width+'px',height:height+'px'}
 });
}
