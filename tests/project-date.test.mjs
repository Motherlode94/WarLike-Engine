import test from 'node:test';
import assert from 'node:assert/strict';
import {projectDate} from '../js/core/project-date.js';

test('legacy missing or corrupt project dates remain readable without throwing',()=>{
 for(const value of [undefined,null,'',false,true,'not-a-date',Infinity,1e30]) assert.deepEqual(projectDate(value),{label:'—',dateTime:''});
});
test('project dates preserve valid numeric and ISO timestamps, including epoch zero',()=>{
 for(const value of [0,1794758400000,'2026-11-15T16:00:00Z']) {
  const result=projectDate(value);
  assert.equal(result.dateTime,new Date(value).toISOString());
  assert.ok(result.label.includes(String(new Date(value).getFullYear())));
 }
});
