// Optional 2D asset preview: operates only on genuine sprite records from the bundled catalog.
export function setupSpritePreview({getAsset,install,resolveURL}){
 const $=id=>document.getElementById(id),dialog=$('spritePreview'),image=$('spritePreviewImage');
 if(!dialog||!image)return;
 let timer=null,asset=null,frame=0,playing=true;
 const stop=()=>{if(timer!==null){clearInterval(timer);timer=null}};
 const entries=()=>{const name=$('spriteAnimation').value;const paths=asset?.frames?.[name];return Array.isArray(paths)&&paths.length?paths:[asset.spriteUrl]};
 function showFrame(){if(!asset)return;const urls=entries(),src=resolveURL(urls[frame%urls.length]);if(src)image.src=src;$('spriteFrameCount').textContent=(frame%urls.length+1)+' / '+urls.length;}
 function play(){stop();if(!asset||!playing||entries().length<2)return;timer=setInterval(()=>{frame++;showFrame()},1000/Number($('spriteFps').value))}
 function open(a){stop();asset=a;frame=0;playing=true;$('spritePreviewTitle').textContent=a.name;$('spritePreviewDetails').textContent=(a.packName||a.pack)+' · '+a.width+' × '+a.height+' px · '+(a.license||'CC0');
  image.style.imageRendering=a.pixelArt?'pixelated':'auto';image.style.transform='scale(1)';$('spriteZoom').value='1';$('spriteFps').value='8';$('spriteFpsLabel').textContent='8 ips';$('spriteToggle').textContent='Pause';
  const select=$('spriteAnimation');select.replaceChildren();
  const clips=Object.entries(a.frames||{}).filter(([name,paths])=>Array.isArray(paths)&&paths.length&&paths.every(p=>resolveURL(p)));
  if(!clips.length)select.append(new Option('Image fixe',''));else clips.forEach(([name,paths])=>select.append(new Option(name+' · '+paths.length+' images',name)));
  select.disabled=!clips.length;$('spriteSource').href=a.sourceUrl||'https://kenney.nl/assets';
  showFrame();dialog.showModal();play();
 }
 $('spriteClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{stop();asset=null;image.removeAttribute('src')});
 $('spriteAnimation').onchange=()=>{frame=0;showFrame();play()};
 $('spriteFps').oninput=e=>{$('spriteFpsLabel').textContent=e.target.value+' ips';play()};
 $('spriteZoom').oninput=e=>{image.style.transform='scale('+e.target.value+')'};
 $('spriteToggle').onclick=()=>{playing=!playing;$('spriteToggle').textContent=playing?'Pause':'Lire';play()};
 $('spriteInstall').onclick=()=>{if(asset)install(asset);};
 return {open};
}
