import test from 'node:test';
import assert from 'node:assert/strict';
import {createComponent,validateComponent} from '../js/core/components-v2.js';
test('component templates are independent instances',()=>{const a=createComponent('MeshRenderer'),b=createComponent('MeshRenderer');a.color='#ffffff';assert.equal(b.color,'#54d6bb');assert.equal(validateComponent(a),null)});
test('physics component values are checked',()=>{const body=createComponent('Rigidbody');assert.equal(validateComponent(body),null);body.mass=0;assert.match(validateComponent(body),/Rigidbody/);const collider=createComponent('BoxCollider');collider.size=[1,-1,1];assert.match(validateComponent(collider),/BoxCollider/)});
