import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {playerModules} from '../js/core/player-modules.js';import {gameRuntimeFiles,gameBuildHtml} from '../js/core/game-build.js';
test('player transitive module closure contains no authoring entrypoints or ui directory',()=>{
 assert.ok(playerModules.includes('js/runtime/bootstrap.js'));assert.ok(playerModules.includes('js/core/play-session.js'));for(const file of playerModules)assert.ok(!file.startsWith('js/ui/')&&!['js/editor.js','js/core/scene.js','js/core/history.js','js/core/project-hub.js','js/core/input.js'].includes(file),file);
 const manifest=JSON.parse(readFileSync(new URL('../runtime-files.json',import.meta.url)));const files=gameRuntimeFiles(manifest.files,{project:{scenes:[]}});assert.ok(!files.includes('js/editor.js'));assert.ok(!files.some(f=>f.startsWith('js/ui/')));
});
test('export document is player-only, escapes project data and has no Hub or Inspector shell',()=>{
 const html=gameBuildHtml('editor template',{format:'warlike.game.v1',project:{title:'A < B',scenes:[]}});assert.ok(html.includes('A &lt; B'));assert.ok(html.includes('id="canvas3d"'));assert.ok(!/id="(?:hubOverlay|properties|history|projectPanel|hierarchyPanel)"/.test(html));assert.ok(!html.includes('src="./js/editor.js"'));assert.ok(html.includes('runtime-profiler.css'));
});
