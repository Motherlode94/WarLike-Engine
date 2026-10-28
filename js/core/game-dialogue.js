let serial=0;
const signal=value=>typeof value==='string'?value.slice(0,60):'';
export function dialogueChoices(value){
 if(!Array.isArray(value))return [];
 return value.slice(0,6).filter(c=>c&&typeof c==='object'&&typeof c.label==='string'&&c.label.trim()).map(c=>({label:c.label.trim().slice(0,100),signal:signal(c.signal)}));
}
export function makeGameDialogue(value,{actorId=null,speaker=''}={}){
 return {id:'dialogue-'+Date.now().toString(36)+'-'+(++serial).toString(36),speaker:String(value.speaker||speaker).slice(0,80),text:String(value.value??value.text??'').slice(0,1200),signal:signal(value.signal)||'dialogue:closed',actorId:Number.isSafeInteger(actorId)?actorId:null,choices:dialogueChoices(value.choices)};
}
export function validGameDialogue(value){
 return value===null||!!value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.speaker==='string'&&value.speaker.length<=80&&typeof value.text==='string'&&value.text.length<=1200&&typeof value.signal==='string'&&value.signal.length<=60&&typeof value.id==='string'&&value.id.length<=80&&(value.actorId===null||Number.isSafeInteger(value.actorId)&&value.actorId>0)&&Array.isArray(value.choices)&&value.choices.length<=6&&value.choices.every(c=>c&&typeof c.label==='string'&&c.label.length>0&&c.label.length<=100&&typeof c.signal==='string'&&c.signal.length<=60);
}
