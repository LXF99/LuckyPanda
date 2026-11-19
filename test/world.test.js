import test from 'node:test';
import assert from 'node:assert/strict';
import { patches, canEnter, canRestore, chooseJump, riverEdge } from '../src/world.js';

test('a seed can restore a nearby patch, but cannot bypass the terrain gates', () => {
  const [first, , bird, ledge, island] = patches;
  assert.equal(canRestore(first, first.x, first.z + 2.9, 0, 3), true);
  assert.equal(canRestore(first, first.x, first.z + 3.1, 0, 3), false);
  assert.equal(canRestore(bird, bird.x, bird.z + 2.5, 0, 3), false);
  assert.equal(canRestore(bird, bird.x, bird.z + 2.5, 0, 3, true), true);
  assert.equal(canRestore(ledge, ledge.x, ledge.z, 0, 3), false);
  assert.equal(canRestore(ledge, ledge.x, ledge.z, ledge.height, 0.1), true);
  assert.equal(canRestore(island, island.x, island.z, 0, 3), false);
});

test('the path opens with cleared logs, and the river stays out of walking range', () => {
  const bird = patches[2];
  assert.equal(canEnter(bird.x, bird.z, 0, false), false);
  assert.equal(canEnter(bird.x, bird.z, 0, true), true);
  assert.equal(canEnter(riverEdge(0) + 0.5, 0, 3, true), false);
});

test('a bunny boost requires a quick second press and can reach the mossy ledge', () => {
  const ledge = patches[3];
  assert.equal(chooseJump({ grounded: true, bunny: false, elapsed: 0 }), 'hop');
  assert.equal(chooseJump({ grounded: false, bunny: false, elapsed: 0.15 }), null);
  assert.equal(chooseJump({ grounded: false, bunny: true, elapsed: 0.6 }), null);
  assert.equal(chooseJump({ grounded: false, bunny: true, elapsed: 0.15 }), 'boost');
  assert.equal(chooseJump({ grounded: true, bunny: true, elapsed: 0.52 }), 'boost');
  assert.equal(chooseJump({ grounded: false, bunny: true, elapsed: 0.15, boosted: true }), null);
  assert.equal(canEnter(ledge.x, ledge.z, 0.55, true), false);
  assert.equal(canEnter(ledge.x, ledge.z, 1.5, true), true);
});
