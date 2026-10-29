// One source of truth for library totals, filtered results and visible page ranges.
export function uniqueAssets(records){const seen=new Set();return (Array.isArray(records)?records:[]).filter(a=>a&&typeof a.id==='string'&&!seen.has(a.id)&&seen.add(a.id))}
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filterAssetRecords(records,{query='',author='',category='',animated=false,categoryNames={}}={}){
 const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
 return uniqueAssets(records).filter(a=>(!author||a.author===author)&&(!category||a.category===category)&&(!animated||a.animationClips?.length>0)&&terms.every(t=>normalize([a.name,a.category,categoryNames[a.category],a.packName,a.author,a.id,a.url,a.filename].join(' ')).includes(t)));
}
export function paginateAssets(records,{page=1,size=48}={}){
 const total=records.length,perPage=Math.max(1,Math.min(192,Math.floor(Number(size)||48))),pages=Math.max(1,Math.ceil(total/perPage)),current=Math.max(1,Math.min(pages,Math.floor(Number(page)||1))),offset=(current-1)*perPage,items=records.slice(offset,offset+perPage);
 return {items,total,page:current,pages,size:perPage,start:total?offset+1:0,end:offset+items.length,visible:items.length};
}
