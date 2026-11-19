import test from 'node:test';
import assert from 'node:assert/strict';
import {bindInspectorFold} from '../js/ui/inspector-folds.js';
function surface(storage,key,fallback=false){
 const card={open:false,isConnected:true,dataset:{},listeners:{},addEventListener(type,fn){this.listeners[type]=fn}},summary={listeners:{},addEventListener(type,fn){this.listeners[type]=fn}};
 bindInspectorFold(card,summary,key,fallback,storage);return {card,click:()=>summary.listeners.click({target:{closest(){return null}}})};
}
test('a fast property rerender keeps the just-opened panel before toggle is dispatched',()=>{
 let saved='{}';const storage={getItem:()=>saved,setItem(_,value){saved=value}},first=surface(storage,'project:1:joint2d');
 first.click();first.card.open=true;first.card.isConnected=false;
 const rebuilt=surface(storage,'project:1:joint2d');assert.equal(rebuilt.card.open,true);
 first.card.open=false;first.card.listeners.toggle();assert.equal(surface(storage,'project:1:joint2d').card.open,true);
});
test('independent card events merge preferences and malformed storage cannot touch project data',()=>{
 const values=new Map([['warlike.inspector.folds.v2','null'],['warlike.hub.project.old','legacy-data']]);
 const storage={getItem:k=>values.get(k),setItem(k,v){values.set(k,v)}};
 const a=surface(storage,'project:1:collider2d'),b=surface(storage,'project:1:joint2d');
 a.click();a.card.open=true;b.click();b.card.open=true;a.card.listeners.toggle();b.card.listeners.toggle();
 assert.equal(surface(storage,'project:1:collider2d').card.open,true);assert.equal(surface(storage,'project:1:joint2d').card.open,true);
 assert.equal(values.get('warlike.hub.project.old'),'legacy-data');assert.equal(surface(storage,'other:1:collider2d').card.open,false);
});
