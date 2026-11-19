import test from 'node:test';
import assert from 'node:assert/strict';
import { moonGrove, canWalkInGrove } from '../src/moon-grove.js';

test('Mooncap Grove starts on land and gives each garden its own walkable approach', () => {
  assert.equal(canWalkInGrove(moonGrove.start.x, moonGrove.start.z), true);
  let previous = moonGrove.start;
  for (const patch of moonGrove.patches) {
    assert.equal(patch.height, 0);
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const x = previous.x + (patch.x - previous.x) * t;
      const z = previous.z + (patch.z - previous.z) * t;
      assert.equal(canWalkInGrove(x, z), true, `Path to ${patch.name} must stay on land`);
    }
    previous = patch;
  }
});

test('the grove keeps players out of its pond and inside the shoreline', () => {
  assert.equal(canWalkInGrove(moonGrove.pond.x, moonGrove.pond.z), false);
  assert.equal(canWalkInGrove(moonGrove.shore.x + moonGrove.shore.rx, moonGrove.shore.z), false);
  assert.equal(canWalkInGrove(moonGrove.shore.x, moonGrove.shore.z + moonGrove.shore.rz), false);
});
