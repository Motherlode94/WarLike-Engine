import {dataOperations,dataNodePorts,readableProperties} from '../core/blueprint-ports.js';
import {variableTypes,coerceVariable} from '../core/blueprint-types.js';
import {element,field,select,editTypedValue} from './blueprint-controls.js';
import {gameProject} from '../core/game-project.js';
export function editDataNode(host,node,change,{parameters=[]}={}){
 select(host,'Opération',node.op,Object.entries(dataOperations).map(([value,label])=>({value,label})),op=>{node.op=op;node.inputs={};if(op==='property')node.property='hp';if(op==='component')node.componentKind='stats';if(op==='entity')node.role='self';if(op==='variable'){node.scope='global';node.name=gameProject.variables[0]?.name||''}change()});
 select(host,'Type de donnée',node.valueType||'number',variableTypes,type=>{node.valueType=type;if(node.op==='constant')node.value=coerceVariable(type,node.value);change()});
 if(node.op==='constant')editTypedValue(host,'Valeur',node,'value',node.valueType||'number',change,{literalOnly:true});
 if(node.op==='variable'){
  select(host,'Portée',node.scope||'global',[{value:'global',label:'Globale'},{value:'local',label:'Locale'},{value:'parameter',label:'Paramètre'}],scope=>{node.scope=scope;change()});
  field(host,{key:'name',label:'Nom de la variable',type:'text'},node,change);
 }
 if(node.op==='entity'){
  select(host,'Objet source',node.role||'self',[{value:'self',label:'Cet objet'},{value:'player',label:'Le joueur'},{value:'id',label:'ID précis'}],role=>{node.role=role;change()});
  if(node.role==='id')field(host,{key:'entityId',label:'ID de l’objet',type:'number'},node,change);
 }
 if(node.op==='component')field(host,{key:'componentKind',label:'Type du composant · ex. stats, Health',type:'text'},node,change);
 if(node.op==='property'){
  select(host,'Source de la propriété',node.sourceType||'object',[{value:'object',label:'Objet'},{value:'component',label:'Composant'}],value=>{node.sourceType=value;change()});
  select(host,'Propriété',node.property||'hp',[...readableProperties],value=>{node.property=value;change()});
 }
 if(node.op==='vectorComponent')field(host,{key:'axis',label:'Coordonnée · 0 = X, 1 = Y, 2 = Z',type:'number',default:0},node,change);
 node.inputs??={};
 for(const port of dataNodePorts(node).inputs)editTypedValue(host,port.name+' · valeur sans câble',node.inputs,port.name,port.type,change,{parameters,literalOnly:true});
 host.append(element('p','bp-hint','Les prises colorées transportent des données. Relie une sortie à une entrée du même type. Les câbles d’exécution restent séparés.'));
}
