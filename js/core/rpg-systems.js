// WarLike Studio: no-code dialogue, quest journal, inventory and interaction UI.
import {state} from './state.js';
export const rpg={inventory:{},quests:{},dialogue:null,notices:[],showInventory:false,showJournal:false};
export const questStatuses=['inactive','active','completed'];
export function resetRpg(){rpg.inventory={};rpg.quests={};rpg.dialogue=null;rpg.notices=[];rpg.showInventory=false;rpg.showJournal=false;refreshRpg()}
export function notice(msg){rpg.notices.push({text:String(msg).slice(0,150),expires:performance.now()+3500});if(rpg.notices.length>5)rpg.notices.shift();refreshRpg()}
export function giveItem(key,count=1){key=String(key||'item').slice(0,60);rpg.inventory[key]=Math.max(0,(rpg.inventory[key]||0)+Number(count||1));if(rpg.inventory[key]===0)delete rpg.inventory[key];refreshRpg()}
export function hasItem(key,count=1){return (rpg.inventory[key]||0)>=count}
export function startQuest(id,title,goal=1,description=''){id=String(id||'quest').slice(0,60);const current=rpg.quests[id];if(current?.status==='completed')return;rpg.quests[id]={id,title:String(title||id),description:String(description||''),goal:Math.max(1,Number(goal)||1),progress:current?.progress||0,status:'active'};notice('Quête : '+rpg.quests[id].title);refreshRpg()}
export function progressQuest(id,amount=1){const q=rpg.quests[id];if(!q||q.status!=='active')return;q.progress=Math.min(q.goal,q.progress+Math.max(1,Number(amount)||1));if(q.progress>=q.goal){q.status='completed';notice('Quête terminée : '+q.title)}refreshRpg()}
export function questStatus(id){return rpg.quests[id]?.status||'inactive'}
export function openDialogue(data){const lines=Array.isArray(data?.nodes)?data.nodes:[];if(!lines.length)return;rpg.dialogue={title:String(data.title||'Dialogue'),nodes:lines,index:0};refreshRpg()}
export function chooseDialogue(index){const d=rpg.dialogue;if(!d)return;const node=d.nodes[d.index];const choice=node?.choices?.[index];if(!choice)return;if(choice.item)giveItem(choice.item,1);if(choice.quest)startQuest(choice.quest,choice.questTitle||choice.quest,choice.goal||1);if(choice.progress)progressQuest(choice.progress,1);if(choice.next===null||choice.next===-1){rpg.dialogue=null}else{const next=Number(choice.next);if(Number.isInteger(next)&&next>=0&&next<d.nodes.length)d.index=next;else rpg.dialogue=null}refreshRpg()}
export function closeDialogue(){rpg.dialogue=null;refreshRpg()}
export function toggleInventory(){rpg.showInventory=!rpg.showInventory;refreshRpg()}
export function toggleJournal(){rpg.showJournal=!rpg.showJournal;refreshRpg()}
const el=id=>document.getElementById(id);
function addText(parent,tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;parent.append(e);return e}
export function refreshRpg(){
 const inventory=el('rpgInventory'),journal=el('rpgJournal'),dialogue=el('rpgDialogue');if(!inventory||!journal||!dialogue)return;
 inventory.hidden=!state.playing||!rpg.showInventory;journal.hidden=!state.playing||!rpg.showJournal;dialogue.hidden=!state.playing||!rpg.dialogue;
 inventory.replaceChildren();if(!inventory.hidden){addText(inventory,'h3','BACKPACK — INVENTORY');const entries=Object.entries(rpg.inventory);if(!entries.length)addText(inventory,'p','Inventaire vide');for(const [name,count] of entries)addText(inventory,'div',name+' × '+count,'rpg-item')}
 journal.replaceChildren();if(!journal.hidden){addText(journal,'h3','QUEST JOURNAL');const quests=Object.values(rpg.quests);if(!quests.length)addText(journal,'p','Aucune quête active');for(const q of quests){const card=document.createElement('div');card.className='rpg-quest';addText(card,'strong',q.title+' — '+q.status);addText(card,'small',q.description);addText(card,'span',q.progress+' / '+q.goal);journal.append(card)}}
 dialogue.replaceChildren();if(!dialogue.hidden){const d=rpg.dialogue,node=d.nodes[d.index];if(!node){closeDialogue();return}addText(dialogue,'h3',d.title);addText(dialogue,'p',String(node.text||''));for(const [i,choice] of (node.choices||[{text:'Terminer',next:-1}]).entries()){const b=document.createElement('button');b.textContent=(i+1)+'. '+choice.text;b.onclick=()=>chooseDialogue(i);dialogue.append(b)}const close=document.createElement('button');close.textContent='× Fermer';close.className='rpg-close';close.onclick=closeDialogue;dialogue.append(close)}
}
export function initializeRpgUi(){window.addEventListener('keydown',e=>{if(!state.playing||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const key=e.key.toLowerCase();if(key==='i'){e.preventDefault();toggleInventory()}if(key==='j'){e.preventDefault();toggleJournal()}if(key==='escape'){closeDialogue();rpg.showInventory=false;rpg.showJournal=false;refreshRpg()}if(rpg.dialogue&&/^[1-9]$/.test(key)){chooseDialogue(Number(key)-1)}});refreshRpg()}
