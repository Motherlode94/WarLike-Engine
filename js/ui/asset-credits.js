export function assetCredits(asset){
 const node=document.createElement('div');node.className='asset-credits';
 const author=document.createElement('span');const license=(asset.license||'Licence à vérifier').replace(/\s*[·•—]\s*Kenney$/,'');author.textContent=(asset.author||'Source externe')+' · '+license;node.append(author);
 const pack=document.createElement('a');pack.textContent=asset.packName||asset.collection||'Voir la source';pack.href=asset.sourceUrl||'https://kenney.nl/assets';pack.target='_blank';pack.rel='noopener noreferrer';pack.title='Page du pack et licence';node.append(pack);
 return node;
}
