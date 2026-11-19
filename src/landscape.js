import * as THREE from 'three';
import { patches, riverEdge, cliff, log, ledgeDistance } from './world.js';
import { bake, block, fern, flower, grass, groupAt, link, lump, material, mesh, mushroom, oval, peak, pillar, randomSource, tree } from './models.js';

const TAU = Math.PI * 2;
const greens = ['#80a867', '#8ab473', '#a2bb72', '#709d70'];
const blossoms = ['#f2a6a8', '#ffe0a0', '#fff2dc', '#ceb4e5', '#8cc7dc'];
const stones = ['#b4ad96', '#c4bba3', '#9eaa9d', '#c5c8b4'];
const rand = randomSource(172);
const pick = (array) => array[Math.floor(rand() * array.length)];

export function flat(parent, points, y, color) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z));
  const plane = mesh(parent, new THREE.ShapeGeometry(shape), color, 0, y, 0, 1, 1, 1);
  plane.rotation.x = -Math.PI / 2;
  plane.userData.ground = true;
  return plane;
}

export function contour(x, z, rx, rz, count, phase = 0, wobble = .07) {
  return Array.from({ length: count }, (_, i) => {
    const a = i * TAU / count;
    const rad = 1 + wobble * Math.sin(a * 5 + phase) + wobble * .45 * Math.cos(a * 8 - phase);
    return [x + Math.cos(a) * rx * rad, z + Math.sin(a) * rz * rad];
  });
}

function rock(parent, x, y, z, size, color = pick(stones)) {
  const piece = lump(parent, color, x, y + size * .33, z, size * (.77 + rand() * .36), size * .65, size * (.69 + rand() * .3));
  piece.rotation.y = rand() * TAU;
  return piece;
}

export function ribbon(parent, centerPoints, halfWidth, y, color) {
  const spline = new THREE.CatmullRomCurve3(centerPoints.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const points = spline.getPoints(60);
  const left = [];
  const right = [];
  points.forEach((point, index) => {
    const direction = spline.getTangent(index / (points.length - 1));
    const width = halfWidth * (1 + .14 * Math.sin(index * .28) + .06 * Math.cos(index * .81));
    left.push([point.x + direction.z * width, point.z - direction.x * width]);
    right.push([point.x - direction.z * width, point.z + direction.x * width]);
  });
  return flat(parent, left.concat(right.reverse()), y, color);
}

function strata(parent, levels, colors) {
  const count = levels[0].points.length;
  for (let l = 0; l < levels.length - 1; l++) {
    const lower = levels[l];
    const upper = levels[l + 1];
    const vertices = [];
    const tint = [];
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      const a = [lower.points[i][0], lower.y, lower.points[i][1]];
      const b = [lower.points[j][0], lower.y, lower.points[j][1]];
      const c = [upper.points[j][0], upper.y, upper.points[j][1]];
      const d = [upper.points[i][0], upper.y, upper.points[i][1]];
      vertices.push(...a, ...b, ...d, ...b, ...c, ...d);
      for (const shade of [colors[l][i % colors[l].length], colors[l][(i + 1) % colors[l].length]]) {
        const { r, g, b } = new THREE.Color(shade);
        tint.push(r, g, b, r, g, b, r, g, b);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(tint, 3));
    geometry.computeVertexNormals();
    parent.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide })));
  }
}

function sign(parent, x, z, label, color, turn = 0, y = 0) {
  const pole = groupAt(parent, x, y, z);
  pole.rotation.y = turn;
  pillar(pole, '#98765d', 0, .52, 0, .069, 1.1, .067);
  const board = block(pole, color, 0, .93, .055, 1.12, .43, .105);
  board.rotation.z = -.042;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 32px Georgia';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff7e5';
  ctx.fillText(label, 128, 56);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const lettering = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const text = new THREE.Mesh(new THREE.PlaneGeometry(1.07, .42), lettering);
  text.position.set(0, .93, .12);
  text.rotation.z = -.042;
  pole.add(text);
}

function makePatch(scene, patch, index) {
  const { x, z, height: y, radius } = patch;
  const greyGround = new THREE.MeshStandardMaterial({ color: '#a1a198', side: THREE.DoubleSide, roughness: 1 });
  flat(scene, contour(x, z, radius * 1.04, radius * .97, 38, index), y + .017, '#cec9ae');
  flat(scene, contour(x, z, radius * .94, radius * .87, 37, index), y + .021, greyGround);
  const dormant = new THREE.Group();
  const bright = new THREE.Group();
  const rim = new THREE.Group();
  const cracks = new THREE.Group();
  for (let i = 0; i < 27; i++) {
    const a = (i + .22 * rand()) * TAU / 27;
    const r = radius * (.96 + rand() * .12);
    if (i % 4 !== 1) rock(rim, x + Math.cos(a) * r, y, z + Math.sin(a) * r * .93, .11 + rand() * .24, pick(['#b6b5a4', '#ccc6b2', '#969d96']));
  }
  for (let i = 0; i < 12; i++) {
    const a = rand() * TAU;
    const r = Math.sqrt(rand()) * radius * .82;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    grass(dormant, px, y + .025, pz, .42 + rand() * .44, pick(['#96998e', '#848b84', '#b6b5a7']), a);
    if (i % 2 === 0) {
      const offset = .23 + rand() * .21;
      ribbon(cracks, [[px - offset, pz - .08], [px, pz], [px + offset, pz + .25]], .016, y + .026, '#929489');
    }
  }
  for (let i = 0; i < 70; i++) {
    const a = rand() * TAU;
    const r = Math.sqrt(rand()) * radius * .88;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r * .94;
    grass(bright, px, .027, pz, .54 + rand() * .78, pick(greens), a);
    if (i % 3 === 0) flower(bright, px, .035, pz, .66 + rand() * .59, pick(blossoms), a);
  }
  const treeSpots = [
    [[-1.32,-1.25,.59], [.96,-1.49,.66]],
    [[-1.39,-1.14,.68], [1.11,-1.27,.57]],
    [[-1.39,-1.16,.65], [1.33,-1.17,.53]],
    [[1.35,-1.47,.68], [-1.24,-1.32,.51]],
    [[.62,-1.28,.74], [-1.17,-.94,.61]],
  ];
  treeSpots[index].forEach(([dx, dz, scale], i) => {
    tree(dormant, x + dx, z + dz, scale, 'fog', 'round', i + 2, y);
    tree(bright, x + dx, z + dz, scale, ['lime', 'peach', 'teal', 'jade', 'lilac'][(index + i) % 5], 'round', i + 2);
  });
  const sleeping = bake(dormant);
  const growth = bake(bright);
  growth.position.y = y;
  growth.scale.y = .015;
  growth.visible = false;
  scene.add(sleeping, growth, bake(rim));
  const cracked = bake(cracks);
  scene.add(cracked);
  return { patch, greyGround, sleeping, cracked, growth, grown: -1 };
}

export function landscape(scene) {
  const fixed = new THREE.Group();
  const baseColor = '#a6b28b';
  const coast = Array.from({ length: 101 }, (_, i) => {
    const z = -92 + i * 1.2;
    return [riverEdge(z) + 0.05, z];
  });
  const bankShape = (offset) => coast.map(([x,z]) => [x + offset,z]).concat([[-83,28],[-83,-92]]);
  flat(scene, [[-96,-110], [98,-110], [98,75], [-96,75]], -.57, '#74bdc5');
  flat(scene, bankShape(.48), -.30, '#c6bfa1');
  flat(scene, bankShape(.30), -.16, '#daceaa');
  flat(scene, bankShape(0), 0, baseColor);
  flat(scene, [[-75,-110], [63,-110], [50,-79], [35,-67], [64,-46], [78,-30], [85,33], [64,43], [59,6], [51,-8], [40,-15], [32,-25], [26,-36], [23,-56], [11,-72], [-75,-78]], -.02, '#b5c79c');

  // The textures are drawn into the terrain as gentle, irregular color shapes.
  const terrainColors = ['#aab58f', '#a5b38a', '#a8b28d', '#b3ba93', '#b2bd96', '#a1af86', '#adba8e'];
  for (let i = 0; i < 105; i++) {
    const x = -24 + rand() * 33;
    const z = -38 + rand() * 59;
    const r = .29 + rand() * 2.6;
    if (x + r > riverEdge(z) - .4) continue;
    flat(fixed, contour(x, z, r, r * (.55 + rand() * .5), 7, i, .13), .001 + i * .000043, pick(terrainColors));
  }
  const pathColor = '#ddd0ac';
  ribbon(fixed, [[.6,15], [.2,10],[.25,7.1],[0,4.1],[-.15,2],[-2.6,-.6],[-6,-2.5],[-7.6,-4.6],[-7.7,-8.2],[-7.9,-11.6],[-7.7,-14.4]], .95, .008, pathColor);
  ribbon(fixed, [[-3,-.2], [.7,-2.4], [3.9,-2.8], [6.75,-2.7], [8.4,-3.25]], .77, .009, pathColor);
  ribbon(fixed, [[2,-2.35], [1.75,-4.4], [1.7,-6]], .63, .008, '#d8ccac');
  flat(fixed, contour(.14, 8.8, 3.45, 2.35, 32, 2), .011, '#adc18a');
  for (let i = 0; i < 55; i++) {
    const z = -38 + rand() * 62;
    const x = riverEdge(z) - (.21 + rand() * .61);
    if (z < 17 && z > -18) rock(fixed, x, -.09, z, .13 + rand() * .37, pick(['#c4bca2','#aeb4a3','#d1c7ab']));
    if (i % 2 === 0 && z > -22) {
      for (let j = 0; j < 4; j++) grass(fixed, x - rand() * .65, -.025, z + rand() * .52, .8 + rand() * .77, pick(['#94a969', '#80a073']), i);
    }
  }
  const ripples = [];
  const rippleGeometries = new THREE.Group();
  for (let i = 0; i < 93; i++) {
    const z = -42 + rand() * 68;
    const x = riverEdge(z) + .62 + rand() * 11.4;
    if (Math.hypot((x - 16.2) / 3.8, (z + 3.1) / 3.5) < 1.07) continue;
    const length = .28 + rand() * 1.5;
    ribbon(rippleGeometries, [[x - length * .52,z + .035],[x,z],[x + length *.49,z + .018]], .022 + rand() * .033, -.554, pick(['#a1d6d0','#b8e0d7','#7abeba','#cae8dd']));
    if (i % 10 === 0) {
      const ripple = oval(scene, new THREE.MeshBasicMaterial({ color: '#f1ffeb', transparent: true, opacity: .4 }), x, -.542, z, .43, .001, .037);
      ripples.push({ ripple, z });
    }
  }
  scene.add(bake(rippleGeometries));

  const island = patches[4];
  strata(scene, [
    { points: contour(island.x, island.z, 3.54, 3.3, 36, 2), y: -.57 },
    { points: contour(island.x, island.z, 3.52, 3.24, 36, 2), y: -.33 },
    { points: contour(island.x, island.z, 3.31, 3.03, 36, 2), y: island.height },
  ], [['#a2afa0','#bec1a4'], ['#c6bfa7','#d8caaa','#b4b29e']]);
  flat(scene, contour(island.x, island.z, 3.31, 3.03, 36, 2), island.height, '#b3bd9a');

  const ledge = patches[3];
  const ledgePoints = (scale) => contour(ledge.x, ledge.z, 3.37 * scale, 3.02 * scale, 42, .5, .015);
  strata(scene, [
    { points: ledgePoints(1.07), y: 0 },
    { points: ledgePoints(.99), y: .31 },
    { points: ledgePoints(1.025), y: .93 },
    { points: ledgePoints(1.0), y: ledge.height },
  ], [['#9f9e8d','#adac98','#b2ac98'], ['#979b90','#a1a697','#a6a99b'], ['#a8af91','#98a689','#b4b89c']]);
  flat(scene, ledgePoints(1), ledge.height, '#a4b58b');
  for (let i = 0; i < 45; i++) {
    const a = i * TAU / 45;
    const x = ledge.x + Math.cos(a) * 3.02;
    const z = ledge.z + Math.sin(a) * 2.7;
    grass(fixed, x, ledge.height, z, .52 + rand() * .61, pick(greens), a);
    if (i % 5 === 0) {
      rock(fixed, x, ledge.height -.05, z, .28 + rand() * .15, '#a8b392');
      fern(fixed,x,ledge.height,z,.38 + rand() * .3,'#86a971',a);
    }
  }

  // The bear opens the only low passage into the northwest hollow.
  for (let x = -13.25; x < -2.65; x += 1.04) {
    if (Math.abs(x - log.x) < 1.65) continue;
    const piece = rock(fixed, x, -.02, -8.08 + rand() * .27, 1.03 + rand() * .45, pick(['#929e91','#a1a89a','#a4ac97']));
    piece.scale.z *= .69;
    grass(fixed, x, 1.09, -8.12, .75, '#92ad79', x);
  }
  for (let z = -9.5; z > -18.5; z -= 1.1) {
    rock(fixed, -2.52, -.09, z, .85 + rand() * .33, '#a5ad9c').scale.z *= 1.28;
    if (z < -11) tree(fixed, -2.53 - rand() * .55, z - .29, .91 + rand() * .31, 'fog', 'pine', z);
  }
  const logs = groupAt(scene, log.x, 0, log.z);
  for (const [ox, oy, oz, spin, size] of [[0,.42,0,.12,1], [.07,.78,-.27,-.16,.77], [-.02,.28,.59,-.08,.79]]) {
    const trunk = groupAt(logs, ox, oy, oz);
    trunk.rotation.y = spin;
    trunk.scale.setScalar(size);
    link(trunk,'#8c8580',[-1.50,0,0],[1.50,0,0],.33).castShadow = true;
    for (const side of [-1,1]) {
      const end = pillar(trunk,'#c1ac90',side*1.485,0,0,.264,.05,.264);
      end.rotation.z = Math.PI/2;
      oval(trunk,'#ad997f',side*1.515,.012,0,.008,.177,.167);
      oval(trunk,'#c7b59a',side*1.524,.013,0,.008,.124,.118);
      oval(trunk,'#ad987e',side*1.533,.012,0,.008,.071,.066);
    }
    link(trunk,'#88817b',[.55,.19,0],[.83,.58,.12],.101);
    for (let i = -1; i <= 1; i++) lump(trunk,'#a3a08b',.27+i*.25,.24,.12,.17,.085,.105);
  }

  // A field of misty trees frames the active clearings.
  for (let i = 0; i < 135; i++) {
    const x = -52 + rand() * 111;
    const z = -68 + rand() * 47;
    const palette = pick(['jade','teal','teal','lime','peach','fog','fog','lilac']);
    if (x > riverEdge(z) -.65 && x < 32) continue;
    tree(fixed, x, z, .72 + rand() * 1.65, palette, rand() < .67 ? 'pine' : 'round', i);
  }
  for (const [x,z,s,p,kind] of [
    [-8.9,11.5,1.73,'peach','round'],[-10.9,5.5,1.42,'jade','tall'],[-10.7,8.6,1.34,'teal','pine'],
    [-12.9,12.6,1.66,'teal','pine'],[-8.9,14.6,1.24,'lime','pine'],[-5.9,13.6,1.22,'jade','pine'],
    [7.2,8.2,1.46,'lime','round'],[7.7,13.2,1.20,'teal','pine'],[8.85,10.5,1.31,'jade','pine'],
    [4.6,12.7,1.25,'peach','round'],[-11.7,-.7,1.33,'teal','round'],[-12,-5.1,1.22,'lime','pine'],
    [-10.7,-8.5,1.25,'fog','pine'],[-13.5,-10.9,1.44,'fog','tall'],[-12.6,-15.2,1.43,'teal','pine'],
    [-9.7,-17.5,1.19,'peach','tall'],[-5.1,-16.3,.99,'fog','pine'],[-.7,-16.3,1.08,'lime','tall'],
    [3.9,-15.7,1.15,'jade','pine'],[6.6,-12.4,1.23,'fog','tall'],[7.48,-6.8,.87,'teal','pine'],
    [6.9,1.4,.99,'jade','pine'],[7.8,4.2,1.39,'teal','pine'],[5.2,6.1,.78,'jade','pine'],
    [-5.6,4.5,1.12,'teal','pine'],[-6.8,1.4,1.01,'lime','round'],[-12.7,0.8,1.45,'jade','pine'],
    [-16,3,1.6,'teal','round'],[-15.5,9.2,1.83,'lime','pine'],[-17.2,5.2,1.89,'peach','round'],
    [26,-15,1.4,'teal','pine'],[28,-13,1.05,'peach','round'],[32,-12,1.45,'lime','round'],
  ]) {
    flat(fixed, contour(x, z, s * 1.09, s * .65, 13, z), .006, '#a1af8c');
    tree(fixed, x, z, s, p, kind, z);
  }

  for (let i = 0; i < 450; i++) {
    const x = -20 + rand() * 29.4;
    const z = -21 + rand() * 39;
    if (x > riverEdge(z) - .32 || ledgeDistance(x, z) < 1.13 ||
        patches.some((p) => Math.hypot(p.x - x, p.z - z) < p.radius + .22)) continue;
    const path = ((z > 2.0 && Math.abs(x) < 1.3) || (z < 0 && Math.abs(x + 7.7) < 1) ||
      (z > -3.9 && z < -1.5 && x > -1 && x < 8));
    if (path && rand() > .13) continue;
    const open = Math.abs(x) < 4.2 && z > 1 && z < 9;
    const g = z > 3 || Math.abs(x) > 9;
    grass(fixed, x, 0, z, .53 + rand() * (open ? .43 : 1.29), pick(g ? greens : ['#a5ac91','#94a589','#a8b097']), i);
    if (g && i % 5 === 0 && !path) flower(fixed, x + .19, 0, z + .15, .61 + rand() * .56, pick(blossoms), i);
    if (i % 17 === 0) rock(fixed, x + .12, -.025, z, .13 + rand() * .28);
    if (i % 49 === 0 && !open) fern(fixed, x, 0, z, .52 + rand() * .57, pick(greens), i);
  }

  const gardens = [[-3.43,7.52,'#f4afb4'],[2.53,7.61,'#fff4d9'],[-5.55,9.8,'#ffe0a0'],[4.02,10.76,'#c6a9e2'],[5.38,4.02,'#f0b0c1'],[-6.0,5.5,'#f3e6bc'],[-10.32,2.4,'#b8b1df'],[7.31,-1.05,'#f9e2a4']];
  for (const [x,z,color] of gardens) {
    fern(fixed, x + .47, 0, z + .28, .85, pick(greens), x);
    for (let i = 0; i < 7; i++) {
      flower(fixed, x + (rand()-.5)*1.3, 0, z + (rand()-.5)*.9, .66 + rand()*.72, color, i);
    }
  }
  for (const [x,z,s,c] of [[-4.4,10.65,1.25,'#d88376'],[-5.05,10.7,.77,'#e7a185'],[-4.6,11.53,.55,'#de9ea5'],[5.0,8.89,1.05,'#dc8e78'],[5.62,9.12,.66,'#d69b96'],[5.22,9.64,.54,'#e7a680'],[-3.42,3.95,.54,'#d9a189'],[-3.75,3.77,.39,'#d8aaa2'],[-10,1.9,.84,'#c8a0c8'],[7.8,-7.95,.73,'#c8a0c8']]) {
    mushroom(fixed,x,0,z,s,c);
  }
  for (const [x,z,s] of [[-4,10.26,.4],[5.31,8.45,.44],[-3.7,.8,.48],[3.9,-3.6,.56],[6,-5.8,.46],[-8.91,.78,.53],[-5.34,8.9,.49]]) {
    rock(fixed,x,0,z,s);
    fern(fixed,x+.36,0,z+.14,s*1.67,'#7fa86d',x);
  }
  sign(fixed, 6.68, -2.48, 'Petal Isle', '#9b7c5b', -.25);
  sign(fixed, -8.96, -6.77, 'Fern Path', '#9b8168', .26);
  sign(fixed, 3.53, -6.3, 'Lookout', '#9a8065', .31);
  scene.add(bake(fixed));

  const horizon = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const z = -78 - rand() * 23;
    const x = -118 + i * 13.9;
    peak(horizon, pick(['#a8c9ba','#b7cfbe','#a9c9b9','#b9d4c3']),x,2.4,z,12 + rand()*11,12+rand()*17,9+rand()*10);
  }
  for (let i = 0; i < 11; i++) {
    const x = -85 + i * 16;
    const y = 14 + rand() * 8;
    const z = -80 - rand() * 21;
    const cloud = groupAt(horizon,x,y,z);
    for (let j = 0; j < 4; j++) lump(cloud,'#f5f4da',(j-1.5)*2.7,Math.sin(j) * 1.35,rand()*1.5,2.8,1.17+rand()*.7,1.65);
  }
  scene.add(bake(horizon, false));

  return { sections: patches.map((patch, index) => makePatch(scene, patch, index)), logs, ripples };
}
