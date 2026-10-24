import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Editor imports the history renderer it invokes before Hub startup',()=>{
 const editor=read('js/editor.js');
 assert.match(editor,/import\s*\{[^}]*\brenderHistory\b[^}]*\}\s*from\s*['"]\.\/core\/history\.js['"]/);
 assert.ok(editor.indexOf('initWorkspace();')<editor.indexOf('initHub();'));
 assert.ok(editor.includes('renderHistory();'));
});
test('Hub and Asset Browser markup exist and the 2D/3D asset catalogue is wired',()=>{
 const html=read('index.html'),workspace=read('js/ui/workspace.js');
 for(const id of ['hubOverlay','hubCreate','hubProjects','hubProjectName','hubProjectType','hubOpen','assetGrid','assetFolders','assetCategory']){
  assert.ok(html.includes('id="'+id+'"'),id+' must exist');
 }
 assert.match(workspace,/workspace\.mode==='3d'\?assets3d:catalog/);
 assert.match(workspace,/document\.addEventListener\('warlike:workspace'/);
});
test('named project Hub opens at startup',()=>{
 const editor=read('js/editor.js'),hub=read('js/core/project-hub.js');
 assert.match(editor,/\binitHub\(\)/);
 assert.match(hub,/modal\.hidden=false/);
});
