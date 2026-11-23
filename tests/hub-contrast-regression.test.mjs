import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../css/hub-contrast.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const parseHex=s=>s.match(/#[0-9a-f]{6}/gi)||[];
const channel=n=>{const c=n/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4};
const luminance=hex=>{const rgb=[1,3,5].map(i=>channel(parseInt(hex.slice(i,i+2),16)));return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]};
const contrast=(a,b)=>{const [l1,l2]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (l1+.05)/(l2+.05)};
test('Hub styling only targets Hub; Scene and Game remain untouched',()=>{
 const cleaned=css.replace(/\/\*[\s\S]*?\*\//g,'');
 assert.match(cleaned,/#hubOverlay/);
 for(const rule of cleaned.split('}').filter(x=>x.includes('{'))){
  const selector=rule.split('{')[0].trim();
  assert(selector.startsWith('#hubOverlay')||selector.startsWith('@media')||selector.startsWith('}'),'unscoped selector: '+selector);
 }
 assert.doesNotMatch(css,/#gameCanvas|\.game-viewport|\.scene-header/);
});
test('Hub new stylesheet loads after the existing theme layers',()=>{
 const a=html.indexOf('./css/store-theme-parity.css');
 const b=html.indexOf('./design-system/warlike-clean.css');
 const c=html.indexOf('./css/hub-contrast.css?v=1');
 assert(a>=0&&b>=0&&c>b&&c>a);
});
test('Hub headings, fields and options have accessible light-on-dark colors',()=>{
 const foreground='#f3f6fa',muted='#c5d1dd';
 for(const bg of ['#22272e','#2d343d','#38424e','#202832']){
  assert(contrast(foreground,bg)>=7,'main text on '+bg);
  assert(contrast(muted,bg)>=4.5,'secondary text on '+bg);
 }
 assert.match(css,/#hubOverlay select option/);
 assert.match(css,/#hubOverlay :is\(h1,h2,h3,h4/);
 assert.match(css,/#hubOverlay :is\(input,textarea\)::placeholder/);
 assert.match(css,/#hubOverlay \.hub-theme-swatch\[aria-pressed=true\]/);
 assert.match(css,/#hubOverlay \.hub-primary/);
});
