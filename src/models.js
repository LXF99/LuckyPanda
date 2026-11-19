import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const materials = new Map();
export function material(color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.94, flatShading: true, side: THREE.DoubleSide }));
  return materials.get(color);
}

const sphere = new THREE.IcosahedronGeometry(1, 1);
const round = new THREE.SphereGeometry(1, 14, 10);
const petal = new THREE.IcosahedronGeometry(1, 0);
const box = new THREE.BoxGeometry(1, 1, 1);
const cylinder = new THREE.CylinderGeometry(0.77, 1, 1, 7);
const cone = new THREE.CylinderGeometry(0.04, 1, 1, 7);
const spike = new THREE.ConeGeometry(1, 1, 3);
export const up = new THREE.Vector3(0, 1, 0);

export function mesh(parent, geometry, color, x, y, z, sx, sy, sz) {
  const object = new THREE.Mesh(geometry, typeof color === 'string' || typeof color === 'number' ? material(color) : color);
  object.position.set(x, y, z);
  object.scale.set(sx, sy, sz);
  parent.add(object);
  return object;
}

export const lump = (p, c, x, y, z, a, b, d) => mesh(p, sphere, c, x, y, z, a, b, d);
export const oval = (p, c, x, y, z, a, b, d) => mesh(p, round, c, x, y, z, a, b, d);
export const block = (p, c, x, y, z, a, b, d) => mesh(p, box, c, x, y, z, a, b, d);
export const pillar = (p, c, x, y, z, a, b, d) => mesh(p, cylinder, c, x, y, z, a, b, d);
export const peak = (p, c, x, y, z, a, b, d) => mesh(p, cone, c, x, y, z, a, b, d);

export function link(parent, color, from, to, width) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const center = a.clone().lerp(b, 0.5);
  const part = pillar(parent, color, center.x, center.y, center.z, width, a.distanceTo(b), width);
  part.quaternion.setFromUnitVectors(up, b.sub(a).normalize());
  return part;
}

export function groupAt(parent, x = 0, y = 0, z = 0) {
  const group = new THREE.Group();
  parent.add(group);
  group.position.set(x, y, z);
  return group;
}

export function randomSource(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const bakedMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: .94, flatShading: true, side: THREE.DoubleSide,
});

export function bake(source, castShadows = true) {
  source.updateMatrixWorld(true);
  const groups = new Map();
  source.traverse((part) => {
    if (!part.isMesh) return;
    const triangles = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
    triangles.applyMatrix4(part.matrixWorld);
    const color = part.material.isMeshStandardMaterial ? part.material.color : null;
    if (color) {
      const values = new Float32Array(triangles.attributes.position.count * 3);
      for (let i = 0; i < values.length; i += 3) color.toArray(values, i);
      triangles.setAttribute('color', new THREE.BufferAttribute(values, 3));
    }
    const key = color ? Boolean(castShadows && !part.userData.ground) : part.material;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(triangles);
  });
  const batch = new THREE.Group();
  for (const [key, geometries] of groups) {
    const surface = typeof key === 'boolean' ? bakedMaterial : key;
    const joined = new THREE.Mesh(mergeGeometries(geometries), surface);
    joined.castShadow = key === true;
    batch.add(joined);
    geometries.forEach((geometry) => geometry.dispose());
  }
  return batch;
}

const palettes = {
  jade: ['#649d64', '#8fbd73', '#a3c577', '#bbd589'],
  teal: ['#529778', '#70b08b', '#87ba90', '#98c698'],
  lime: ['#91a95d', '#b2cb73', '#cad480', '#d8df8c'],
  peach: ['#c77f6f', '#e5a084', '#efb391', '#f3c2a0'],
  lilac: ['#a591b5', '#b3a2c7', '#c5aece', '#d6bcd5'],
  fog: ['#899595', '#a3abaa', '#b4b8b2', '#c0c3be'],
};
export function tree(parent, x, z, size, palette, variant = 'round', seed = 1, base = 0) {
  const colors = palettes[palette];
  const bark = palette === 'fog' ? '#8e9090' : '#92745e';
  const tree = groupAt(parent, x, base, z);
  tree.scale.setScalar(size);
  tree.rotation.y = seed * 1.8;
  if (variant === 'pine') {
    pillar(tree, bark, 0, 0.94, 0, 0.18, 1.88, 0.18);
    for (let i = 0; i < 4; i++) {
      const w = 1.28 - i * 0.235;
      const branch = peak(tree, colors[i], 0, 1.65 + i * 0.64, 0, w, 1.48 - i * 0.08, w);
      branch.rotation.y = 0.5 + i * 0.24;
    }
  } else {
    link(tree, bark, [0, 0, 0], [0.2, 2.65, 0.03], 0.255);
    link(tree, bark, [0.08, 1.15, 0], [-0.85, 2.6, 0.28], 0.16);
    link(tree, '#a08568', [0.12, 1.56, 0.01], [0.93, 2.83, -0.01], 0.14);
    link(tree, bark, [0.14, 1.5, -0.02], [-0.15, 2.64, -0.7], 0.14);
    const crown = variant === 'tall' ? 1.33 : 1;
    const clouds = [[-0.84, 2.72, .19, .98, .86, .89], [.83, 2.94, .21, .98, .92, .92],
      [.03, 2.88, -.76, 1.12, .88, .89], [.14, 3.55, -.04, 1.24, 1.04, 1.07],
      [-.65, 3.49, -.27, .87, .85, .89], [.58, 3.74, -.23, .83, .72, .77]];
    clouds.forEach(([a, b, c, d, e, f], index) => {
      const top = lump(tree, colors[Math.min(3, Math.floor(index * .67))], a, b * crown, c, d, e * crown, f);
      top.rotation.y = index * 0.73;
    });
  }
  return tree;
}

export function grass(parent, x, y, z, size, color, spin = 0) {
  const tuft = groupAt(parent, x, y, z);
  tuft.rotation.y = spin;
  tuft.scale.setScalar(size);
  for (let i = -1; i <= 1; i++) {
    const blade = mesh(tuft, spike, color, i * .095, 0.22 - Math.abs(i) * .038, Math.abs(i) * .018, .087, .48 - Math.abs(i) * .11, .06);
    blade.rotation.z = -i * .39;
  }
}

export function fern(parent, x, y, z, size, color, spin = 0) {
  const plant = groupAt(parent, x, y, z);
  plant.scale.setScalar(size);
  plant.rotation.y = spin;
  for (let i = 0; i < 5; i++) {
    const branch = groupAt(plant);
    branch.rotation.y = i * 1.25;
    for (let j = 1; j <= 4; j++) {
      const y = .09 + j * .083;
      const z = j * .14;
      for (const side of [-1, 1]) {
        const leaf = mesh(branch, petal, color, side * .091, y, z, .165 - j * .015, .045, .083);
        leaf.rotation.y = -side * .55;
        leaf.rotation.z = side * .33;
      }
    }
  }
}

export function flower(parent, x, y, z, size, color, rotation = 0) {
  const plant = groupAt(parent, x, y, z);
  plant.scale.setScalar(size);
  plant.rotation.y = rotation;
  pillar(plant, '#72955a', 0, .21, 0, .024, .44, .023);
  const leaf = lump(plant, '#99b765', -.08, .14, .025, .14, .033, .065);
  leaf.rotation.z = -.43;
  const bloom = groupAt(plant, 0, .44, 0);
  bloom.rotation.x = .26;
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    const leaf = mesh(bloom, petal, color, Math.sin(a) * .102, 0, Math.cos(a) * .102, .081, .046, .116);
    leaf.rotation.y = a;
  }
  lump(bloom, '#efb953', 0, .029, 0, .07, .041, .071);
}

export function mushroom(parent, x, y, z, size, color) {
  const shroom = groupAt(parent, x, y, z);
  shroom.scale.setScalar(size);
  pillar(shroom, '#f1dcc1', 0, .34, 0, .14, .69, .14).rotation.z = -.11;
  lump(shroom, '#e9c4a8', .04, .61, 0, .53, .11, .5);
  lump(shroom, color, .04, .74, 0, .59, .32, .55);
  for (const [a, b, c, width] of [[.03,.998,.03,.10], [.27,.938,.13,.076], [-.21,.91,.18,.077], [-.19,.953,-.12,.065], [.23,.933,-.21,.065]]) {
    lump(shroom, '#fff2d6', a, b, c, width, .034, width * .86);
  }
}

function face(head, z, height, space) {
  for (const side of [-1, 1]) {
    oval(head, '#342b3a', side * space, height, z, .044, .056, .031);
    oval(head, '#fffdf1', side * space - .012, height + .018, z + .024, .015, .016, .009);
  }
}

export function panda(parent) {
  const rig = groupAt(parent);
  const body = groupAt(rig);
  const fur = '#fff4db';
  const dark = '#524758';
  oval(body, dark, 0, .51, 0, .47, .52, .36);
  oval(body, fur, 0, .52, .17, .39, .39, .25);
  const legs = [-1, 1].map((s) => {
    const leg = groupAt(body, s * .225, .27, 0);
    oval(leg, dark, 0, -.115, .081, .173, .167, .25);
    oval(leg, '#827080', 0, -.164, .265, .079, .046, .027);
    return leg;
  });
  const arms = [-1, 1].map((s) => {
    const arm = groupAt(body, s * .39, .68, 0);
    const sleeve = oval(arm, dark, s * .08, -.16, .02, .145, .29, .165);
    sleeve.rotation.z = s * .29;
    return arm;
  });
  const head = groupAt(body, 0, 1.07, .035);
  oval(head, fur, 0, 0, 0, .64, .48, .49);
  for (const s of [-1, 1]) {
    oval(head, dark, s * .49, .31, -.035, .195, .194, .137);
    oval(head, '#98798a', s * .498, .325, .063, .091, .092, .036);
    const patch = oval(head, dark, s * .235, -.026, .415, .151, .177, .079);
    patch.rotation.z = s * .36;
    patch.rotation.y = s * .24;
    oval(head, '#ecb09e', s * .365, -.148, .364, .089, .043, .03).rotation.y = s * .35;
  }
  for (const s of [-1, 1]) {
    oval(head, '#2d2734', s * .235, .008, .492, .052, .067, .033);
    oval(head, '#fffbee', s * .235 - .017, .029, .52, .018, .021, .011);
  }
  oval(head, '#f8ebd6', 0, -.149, .431, .17, .129, .095);
  oval(head, '#514052', 0, -.099, .523, .062, .041, .031);
  for (const s of [-1, 1]) {
    oval(head, '#5d4657', s * .032, -.177, .516, .043, .015, .012).rotation.z = s * .25;
  }
  const scarf = groupAt(body, 0, .78, .03);
  oval(scarf, '#e2a54f', 0, 0, -.012, .416, .097, .35);
  oval(scarf, '#f5c564', -.259, -.007, .275, .12, .083, .075);
  const tail = lump(scarf, '#efb355', -.33, -.146, .276, .126, .215, .055);
  tail.rotation.z = -.31;
  // A broad leaf on the back reads as a tiny adventurer's cape.
  const cape = lump(body, '#79a66a', 0, .48, -.292, .303, .376, .11);
  cape.rotation.z = -.17;
  oval(body, '#afc97a', .005, .479, -.397, .025, .27, .013).rotation.z = -.17;
  const cap = groupAt(head, .015, .438, -.002);
  link(cap, '#639656', [0, -.02, 0], [0, .235, -.018], .038);
  for (const s of [-1, 1]) {
    const leaf = lump(cap, s === 1 ? '#94bb6a' : '#79a95d', s * .123, .21 + .045 * s, -.012, .174, .063, .099);
    leaf.rotation.z = s * .5;
  }
  return { rig, body, legs, arms, head, scarf };
}

export function animal(parent, type) {
  const rig = groupAt(parent);
  const body = groupAt(rig);
  const head = groupAt(body);
  const limbs = [];
  if (type === 'bunny') {
    oval(body, '#fff0e5', 0, .30, -.04, .31, .29, .34);
    oval(body, '#fff6e8', 0, .29, -.37, .13, .14, .133);
    oval(head, '#fff5e7', 0, .63, .05, .36, .30, .31);
    for (const s of [-1, 1]) {
      const ear = groupAt(head, s * .17, .94, .014);
      ear.rotation.z = -s * .20;
      oval(ear, '#fff1e6', 0, .153, 0, .094, .255, .080);
      oval(ear, '#ecabbd', 0, .175, .06, .047, .175, .028);
      limbs.push(oval(body, '#fae2da', s * .22, .11, .12, .12, .099, .18));
      oval(head, '#eea5b5', s * .21, .57, .302, .063, .029, .017);
    }
    face(head, .325, .646, .145);
    oval(head, '#b47789', 0, .581, .357, .04, .026, .023);
  } else if (type === 'bear') {
    oval(body, '#bd805a', 0, .46, -.035, .46, .44, .40);
    oval(body, '#eeb986', 0, .44, .238, .28, .30, .147);
    oval(head, '#ca8b60', 0, .94, .03, .455, .367, .366);
    oval(head, '#f6ce9f', 0, .839, .324, .202, .135, .114);
    for (const s of [-1, 1]) {
      oval(head, '#b67957', s * .347, 1.19, .034, .151, .151, .101);
      oval(head, '#e4a884', s * .36, 1.19, .108, .077, .081, .044);
      limbs.push(oval(body, '#a36d52', s * .265, .13, .16, .18, .139, .223));
      oval(body, '#bd805a', s * .411, .43, .154, .15, .225, .145).rotation.z = s * .33;
    }
    face(head, .359, .961, .17);
    oval(head, '#573d42', 0, .893, .426, .076, .049, .031);
  } else {
    oval(body, '#6aa9bd', 0, .237, 0, .224, .209, .242);
    oval(body, '#e2ece2', 0, .206, .151, .157, .143, .117);
    oval(head, '#79bcce', 0, .453, .052, .246, .208, .209);
    face(head, .229, .476, .112);
    lump(head, '#ebae65', 0, .419, .262, .076, .046, .095);
    for (const s of [-1, 1]) {
      const wing = oval(body, '#5097ad', s * .197, .246, -.025, .095, .133, .154);
      wing.rotation.z = s * .28;
      limbs.push(wing);
      oval(body, '#e5aa65', s * .082, .049, .069, .054, .037, .085);
      lump(head, '#5198ad', s * .047, .66, .011, .043, .103, .035).rotation.z = -s * .4;
    }
    lump(body, '#569ab1', 0, .225, -.245, .091, .081, .156).rotation.x = .37;
  }
  return { rig, body, head, limbs };
}
