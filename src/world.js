export const start = { x: 0, z: 8.4 };

export const patches = [
  { id: 'seedling', name: 'Seedling Circle', x: 0, z: 2.4, height: 0, radius: 2.45, friend: 'bunny' },
  { id: 'clover', name: 'Clover Hollow', x: -7.6, z: -3.7, height: 0, radius: 2.55, friend: 'bear' },
  { id: 'fern', name: 'Fern Hideaway', x: -7.7, z: -13.5, height: 0, radius: 2.5, friend: 'bird' },
  { id: 'moss', name: 'Mossy Lookout', x: 1.3, z: -9, height: 1.43, radius: 2.65 },
  { id: 'island', name: 'Petal Island', x: 16.2, z: -3.1, height: 0.12, radius: 2.75 },
];

export const log = { x: -7.7, z: -8.05 };
export const cliff = { left: -13.1, right: -2.3, near: -7.55, far: -8.55, gap: 1.7 };
export const friends = {
  bunny: { name: 'Pip', species: 'Bunny', ability: 'Double-jump', color: '#f5b8cd', x: 1.45, z: 0.9 },
  bear: { name: 'Bramble', species: 'Bear', ability: 'Clears logs', color: '#f1ca88', x: -7.3, z: -5.1 },
  bird: { name: 'Skye', species: 'Bird', ability: 'Throws seeds', color: '#a9ddea', x: -6.6, z: -12.5 },
};

export const riverEdge = (z) => 9.2 + 0.92 * Math.sin(z * 0.22) + 0.43 * Math.sin(z * 0.43);
export const ledgeDistance = (x, z) => Math.hypot((x - patches[3].x) / 3.35, (z - patches[3].z) / 3.0);
export const surfaceHeight = (x, z) => ledgeDistance(x, z) < 1 ? patches[3].height : 0;

export function canEnter(x, z, feet, logCleared) {
  if (x < -13.05 || z > 15 || z < -18 || x > riverEdge(z) - 0.38) return false;
  if (!logCleared && z < cliff.near && x < cliff.right) return false;
  if (z < cliff.far && x > cliff.right - 0.55 && x < cliff.right + 0.05) return false;
  if (z < cliff.near && z > cliff.far && x < cliff.right &&
      (!logCleared || Math.abs(x - log.x) > cliff.gap - 0.22)) return false;
  return feet + 0.065 >= surfaceHeight(x, z);
}

export function canRestore(patch, x, z, feet, range, logCleared = false) {
  if (patch.id === 'island' || (patch.id === 'fern' && !logCleared)) return false;
  return Math.abs(patch.height - feet) < 0.28 && Math.hypot(patch.x - x, patch.z - z) <= range;
}

export function chooseJump({ grounded, bunny, elapsed, boosted }) {
  if (bunny && !boosted && elapsed <= 0.56) return 'boost';
  return grounded ? 'hop' : null;
}
