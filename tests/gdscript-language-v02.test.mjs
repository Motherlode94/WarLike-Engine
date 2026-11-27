import test from 'node:test';import assert from 'node:assert/strict';import {compileGDScript,createWarScriptInstance,warScriptBuiltin} from '../script-editor/warscript.js';
const source=`class_name ScoreCounter
extends Node
@export var count: int = 0
func points(n: int) -> int:
    if n < 2:
        return 1
    elif n == 2:
        return 3
    else:
        return 5
func _ready():
    for i in range(4):
        count += points(i)
    while count < 12:
        count += 1
`;
test('typed methods, returns, elif, range and fields execute through bounded interpreter',()=>{const p=compileGDScript(source);assert.equal(p.ok,true,JSON.stringify(p.diagnostics));assert.equal(p.className,'ScoreCounter');const a=createWarScriptInstance(p,{call:warScriptBuiltin,read(){throw Error('Unexpected read')}});a.run('Start');assert.equal(a.fields.count,12);});
test('reject unsupported functions, unmatched else, huge range and empty nested body',()=>{for(const s of ['extends Node\nfunc _ready():\n    else:\n        pass','extends Node\nfunc _ready():\n    for i in range(5000):\n        pass','extends Node\nfunc _ready():\n    if true:\n        if true:\n    print("bad")','extends Node\nfunc f(x):\n    pass'])assert.equal(compileGDScript(s).ok,false,s);});
test('infinite loop hits the existing runtime budget',()=>{const p=compileGDScript('extends Node\nfunc _ready():\n    while true:\n        pass');assert.equal(p.ok,true,JSON.stringify(p.diagnostics));const a=createWarScriptInstance(p,{call:warScriptBuiltin});assert.throws(()=>a.run('Start'),/Budget/);});