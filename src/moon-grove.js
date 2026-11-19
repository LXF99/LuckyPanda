import * as THREE from 'three';
import { effects, sprite } from './effects.js';
import { flat, contour, ribbon } from './landscape.js';
import { bake, fern, flower, grass, groupAt, lump, mesh, mushroom, peak, pillar, randomSource, tree } from './models.js';

export const moonGrove = {
  start: { x: 0, z: 8.8 },
  shore: { x: -.8, z: -2, rx: 13.2, rz: 16 },
  pond: { x: 7.35, z: -6.85, rx: 3.85, rz: 4.1 },
  patches: [
    { id: 'mooncap', name: 'Mooncap Ring', x: -.85, z: 2.8, height: 0, radius: 2.5 },
    { id: 'starbell', name: 'Starbell Glade', x: -6.45, z: -3.5, height: 0, radius: 2.7 },
    { id: 'glowfern', name: 'Glowfern Rise', x: .85, z: -10.7, height: 0, radius: 2.55 },
  ],
};

export const sleepingSoil = '#686a88';
export const glowingSoil = '#6e9d91';

const ellipseDistance = (x, z, { x: cx, z: cz, rx, rz }) => Math.hypot((x - cx) / rx, (z - cz) / rz);

export function canWalkInGrove(x, z) {
  return ellipseDistance(x, z, moonGrove.shore) < .955 && ellipseDistance(x, z, moonGrove.pond) > 1.07;
}

const ring = new THREE.RingGeometry(.52, .56, 32);
const TAU = Math.PI * 2;
const palette = ['#d7a5ea', '#9fe3db', '#ffe1a6'];
const foliage = ['#68899b', '#798dbb', '#68a9a1', '#9d88bb'];

function moonPatch(scene, patch, index, random) {
  const { x, z, radius } = patch;
  const greyGround = new THREE.MeshStandardMaterial({ color: sleepingSoil, side: THREE.DoubleSide, roughness: .92, emissive: '#8fd8c6', emissiveIntensity: 0 });
  flat(scene, contour(x, z, radius, radius * .89, 30, index, .045), .022, '#8b83aa');
  flat(scene, contour(x, z, radius * .925, radius * .82, 32, index, .045), .029, greyGround);

  const sleeping = new THREE.Group();
  const growth = new THREE.Group();
  const rim = new THREE.Group();
  for (let i = 0; i < 21; i++) {
    const a = i * TAU / 21;
    const px = x + Math.cos(a) * radius;
    const pz = z + Math.sin(a) * (radius * .89);
    const size = .13 + random() * .16;
    lump(rim, i % 3 === 0 ? '#a3a0c5' : '#797dad', px, .07, pz, size, size * .65, size * .85).rotation.y = a;
  }
  for (let i = 0; i < 39; i++) {
    const a = random() * TAU;
    const r = Math.sqrt(random()) * radius * .83;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r * .86;
    if (i < 13) grass(sleeping, px, .025, pz, .48 + random() * .65, '#85839a', a);
    if (i % 2 === 0) flower(growth, px, .035, pz, .8 + random() * .56, palette[(i + index) % 3], a);
    grass(growth, px, .035, pz, .8 + random() * .45, foliage[(i + index) % 4], a);
  }
  for (const side of [-1, 1]) {
    mushroom(sleeping, x + side * 1.15, .025, z - .6, .59, '#76768e');
    mushroom(growth, x + side * 1.15, .025, z - .6, .72, palette[index]);
    fern(growth, x + side * .65, .025, z + .47, .87, '#8cc1ac', side);
  }

  const dormant = bake(sleeping, false);
  const bloom = bake(growth, false);
  const glow = sprite(bloom, 'glow', palette[index], .66);
  glow.position.set(x, 1.08, z - .37);
  glow.scale.setScalar(1.95);
  const cracks = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const px = x - .82 + i * .8;
    ribbon(cracks, [[px - .26, z + .63], [px, z + .39], [px + .16, z + .52]], .016, .036, '#4c4d6b');
  }
  const cracked = bake(cracks, false);
  bloom.visible = false;
  bloom.scale.y = .015;
  scene.add(dormant, bloom, cracked, bake(rim, false));
  return { patch, greyGround, sleeping: dormant, cracked, growth: bloom, grown: -1 };
}

function addSky(scene, random) {
  const crescent = new THREE.Shape();
  crescent.moveTo(.45, 1.68);
  crescent.bezierCurveTo(-.92, 1.74, -1.76, .61, -1.61, -.52);
  crescent.bezierCurveTo(-1.3, -1.9, .66, -2.05, 1.45, -.78);
  crescent.bezierCurveTo(-.42, -1.29, -.93, .77, .45, 1.68);
  const moon = groupAt(scene, -4.45, 5.1, -26);
  const halo = sprite(moon, 'glow', '#b7c9ff', .37);
  halo.material.blending = THREE.AdditiveBlending;
  halo.scale.setScalar(10);
  mesh(moon, new THREE.ShapeGeometry(crescent, 15), new THREE.MeshBasicMaterial({ color: '#fff2c4', fog: false, toneMapped: false }), 0, 0, .06, 1.12, 1.12, 1);
  for (let i = 0; i < 24; i++) {
    const star = sprite(scene, i % 5 === 0 ? 'star' : 'glow', i % 3 === 0 ? '#ffdba8' : '#cddaff', .56 + random() * .23);
    star.position.set(-38 + random() * 77, 4 + random() * 6.4, -35 - random() * 12);
    star.scale.setScalar(.21 + random() * .42);
  }
}

export function createMoonGrove() {
  const random = randomSource(418);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#444671');
  scene.fog = new THREE.FogExp2(scene.background, .021);
  scene.add(new THREE.HemisphereLight('#dae0ff', '#7e6fa4', 1.4));
  const moonlight = new THREE.DirectionalLight('#ddd6ff', 1.66);
  moonlight.position.set(-8, 12, 6);
  const reflected = new THREE.DirectionalLight('#9be8e0', .44);
  reflected.position.set(8, 5, -8);
  scene.add(moonlight, reflected);
  addSky(scene, random);

  const fixed = new THREE.Group();
  const { shore, pond, patches } = moonGrove;
  const outline = ({ x, z, rx, rz }, size = 1) => contour(x, z, rx * size, rz * size, 66, 1, .014);
  flat(fixed, [[-105,-135],[105,-135],[105,55],[-105,55]], -.44, '#536f9d');
  flat(fixed, outline(shore, 1.024), -.2, '#8c86ba');
  flat(fixed, outline(shore), 0, '#7780a6');
  flat(fixed, outline(pond, 1.07), .015, '#9a98bd');
  flat(fixed, outline(pond), .019, '#568ba9');
  for (let i = 0; i < 22; i++) {
    const a = random() * TAU;
    const r = Math.sqrt(random()) * .82;
    const x = pond.x + Math.cos(a) * r * pond.rx;
    const z = pond.z + Math.sin(a) * r * pond.rz;
    if (i % 4 === 0) {
      pillar(fixed, '#79b9a8', x, .032, z, .32, .018, .24).rotation.y = a;
      if (i % 8 === 0) flower(fixed, x, -.145, z, .56, '#dcb1ed', a);
    }
    const width = .23 + random() * .45;
    ribbon(fixed, [[x - width,z],[x,z + .06],[x + width,z]], .023, .025, i % 3 === 0 ? '#9fcbd5' : '#75adc0');
  }

  const path = [[0,13],[0,8.8],[-.65,3],[-2.4,-.95],[-6.45,-3.5],[-4.1,-6.3],[.85,-10.7]];
  ribbon(fixed, path, .91, .012, '#aca6c4');
  ribbon(fixed, path, .63, .013, '#b7afc9');
  for (let i = 0; i < 28; i++) {
    const x = -13 + random() * 26;
    const z = -16 + random() * 28;
    if (!canWalkInGrove(x, z) || patches.some((patch) => Math.hypot(x - patch.x, z - patch.z) < patch.radius + 1)) continue;
    flat(fixed, contour(x, z, .39 + random() * 1.1, .48 + random() * .67, 9, i), .005 + i * .00007, i % 2 === 0 ? '#727ca2' : '#8285ad');
  }

  for (let i = 0; i < 37; i++) {
    const a = i * TAU / 37;
    const x = shore.x + Math.cos(a) * shore.rx * (.84 + random() * .11);
    const z = shore.z + Math.sin(a) * shore.rz * (.86 + random() * .10);
    const scale = .86 + random() * .76;
    if (z > 8 && Math.abs(x) < 2.4) continue;
    tree(fixed, x, z, scale, i % 3 === 0 ? 'lilac' : 'teal', i % 3 === 1 ? 'round' : 'pine', i);
  }
  for (const [x, z, size, color] of [[-6.4,7.9,1.48,'lilac'], [-7.5,3.8,1.1,'teal'], [5.8,6.9,1.44,'lilac'], [6.65,1.65,1.18,'teal'], [-3.8,-8.3,.93,'lilac'], [4.0,-11.7,1.09,'teal']]) {
    tree(fixed, x, z, size, color, 'round', x);
  }
  for (let i = 0; i < 105; i++) {
    const x = -13 + random() * 27;
    const z = -17 + random() * 30;
    if (!canWalkInGrove(x, z) || patches.some((patch) => Math.hypot(x - patch.x, z - patch.z) < patch.radius + .25)) continue;
    grass(fixed, x, 0, z, .73 + random() * .68, foliage[i % 4], i);
    if (i % 9 === 0) fern(fixed, x, 0, z, .6 + random() * .45, foliage[i % 4], i);
  }
  for (const [x,z,scale] of [[-3.65,8.15,1.05],[3.65,8.4,1.33],[-4.7,3.85,.66],[4.6,2.6,1.05],[-8.7,-1.35,.98],[2.65,-6.45,.77],[-3.05,-11.45,.88]]) {
    for (let j = 0; j < 3; j++) mushroom(fixed, x + (j - 1) * .6 * scale, 0, z + Math.sin(j) * .5, scale * (j === 0 ? 1 : .52), palette[j]);
    const lamp = sprite(scene, 'glow', palette[0], .37);
    lamp.position.set(x - .38, .72 * scale, z);
    lamp.scale.setScalar(2.1 * scale);
    const stone = lump(fixed, '#8185b0', x + .19, .1, z - .46, .48, .35, .47);
    stone.rotation.y = x;
  }
  for (let i = 0; i < 20; i++) {
    const z = -31 - random() * 19;
    const x = -49 + i * 5.1;
    peak(fixed, i % 2 === 0 ? '#7479a3' : '#686d96', x, .7, z, 5 + random() * 6, 5 + random() * 6, 5);
  }
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8;
    const x = pond.x + Math.cos(a) * 2.7;
    const z = pond.z + Math.sin(a) * 2.8;
    const ripple = mesh(fixed, ring, '#79a7c2', x, .032, z, .45, .18, 1);
    ripple.rotation.x = -Math.PI / 2;
  }
  scene.add(bake(fixed, false));
  const sections = patches.map((patch, index) => moonPatch(scene, patch, index, random));
  return { scene, sections, magic: effects(scene) };
}
