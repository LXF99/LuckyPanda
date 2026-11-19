import * as THREE from 'three';
import { groupAt, lump, randomSource } from './models.js';

const textures = {};
function texture(name) {
  if (textures[name]) return textures[name];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const glow = context.createRadialGradient(32, 32, 3, 32, 32, 30);
  glow.addColorStop(0, '#ffffdd');
  glow.addColorStop(.37, '#fff6bf85');
  glow.addColorStop(1, '#ffffb100');
  context.fillStyle = glow;
  if (name !== 'heart') context.fillRect(0, 0, 64, 64);
  context.fillStyle = '#fffdf0';
  if (name === 'star') {
    context.beginPath();
    context.moveTo(32, 6);
    context.quadraticCurveTo(35, 27, 56, 32);
    context.quadraticCurveTo(35, 36, 32, 57);
    context.quadraticCurveTo(28, 36, 7, 32);
    context.quadraticCurveTo(28, 27, 32, 6);
    context.fill();
  } else if (name === 'heart') {
    context.beginPath();
    context.moveTo(32, 20);
    context.bezierCurveTo(45, 1, 68, 27, 32, 54);
    context.bezierCurveTo(-4, 27, 19, 1, 32, 20);
    context.fill();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  textures[name] = map;
  return map;
}

export function sprite(parent, name, color = '#ffffff', opacity = 1) {
  const object = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture(name), color, opacity, transparent: true, depthWrite: false, fog: true }));
  parent.add(object);
  return object;
}

export function effects(scene) {
  const random = randomSource(6813);
  const particles = [];
  const display = groupAt(scene);
  const trail = Array.from({ length: 15 }, (_, i) => sprite(scene, i % 3 === 1 ? 'star' : 'glow', '#ffdb79'));
  const seedMarker = sprite(display, 'star', '#fff0a1');
  const markerGlow = sprite(display, 'glow', '#ffd376', .82);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.63, .70, 48), new THREE.MeshBasicMaterial({ color: '#fff0b6', transparent: true, opacity: .6, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  display.add(ring);

  const fireflies = Array.from({ length: 36 }, () => {
    const dot = sprite(scene, 'glow', random() < .32 ? '#f6f8db' : '#fff3bf', .54);
    const x = -12 + random() * 24;
    const y = .5 + random() * 3.4;
    const z = 13 - random() * 31;
    const size = .07 + random() * .15;
    return { dot, x, y, z, size, phase: random() * 6.28 };
  });
  const butterflies = [[-3.6,6.4,'#f3c483'],[3.55,4.4,'#e7a5b7'],[6.5,-3.2,'#dbbfeb'],[-10.5,-5.65,'#f5c78a']].map(([x,z,color], i) => {
    const rig = groupAt(scene,x,.88,z);
    const wings = [-1,1].map((side) => {
      const hinge = groupAt(rig);
      lump(hinge,color,side*.11,0,-.032,.144,.027,.124);
      lump(hinge,'#fae8a4',side*.085,0,.082,.1,.022,.085);
      return hinge;
    });
    lump(rig,'#8f795e',0,.012,0,.026,.027,.128);
    return { x, z, rig, wings, phase:i*1.8 };
  });

  function burst(x, y, z, count, type = 'star', spread = 1) {
    for (let i = 0; i < count; i++) {
      if (particles.length >= 220) break;
      const palette = type === 'heart' ? ['#ffabc8','#f392ae','#ffc7d4'] : ['#fff4aa','#ffdf8d','#fdd2da','#d9f1ab','#f7ffda'];
      const dot = sprite(scene, type, palette[i % palette.length]);
      dot.position.set(x + (random()-.5) * spread, y + random() * .32, z + (random()-.5) * spread);
      const size = (type === 'heart' ? .17 : .10) + random() * .24;
      const life = .56 + random() * .86;
      particles.push({
        dot, size, life, ttl: life, spin: (random()-.5)*2.7,
        vx: (random()-.5)*2.65, vy: .45 + random()*2.45, vz: (random()-.5)*2.65,
      });
    }
  }

  function update(dt, time, marker, route) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.ttl -= dt;
      if (p.ttl <= 0) {
        scene.remove(p.dot);
        p.dot.material.dispose();
        particles.splice(i, 1);
        continue;
      }
      p.dot.position.x += p.vx * dt;
      p.dot.position.y += p.vy * dt;
      p.dot.position.z += p.vz * dt;
      p.vy -= dt * 1.16;
      p.dot.scale.setScalar(p.size * (.65 + .38 * Math.sin(p.ttl / p.life * Math.PI)));
      p.dot.material.opacity = Math.min(1, p.ttl * 2.5);
      p.dot.material.rotation += p.spin * dt;
    }
    display.visible = Boolean(marker);
    if (marker) {
      display.position.set(marker.x, marker.y, marker.z);
      ring.scale.setScalar(marker.radius || 1);
      ring.material.opacity = .53 + .16 * Math.sin(time * 2.3);
      const bob = .97 + Math.sin(time * 3.1) * .13;
      seedMarker.position.y = marker.friend ? 1.65 + bob * .28 : bob;
      seedMarker.scale.setScalar(.51 + .073 * Math.sin(time * 3.2));
      markerGlow.position.y = seedMarker.position.y;
      markerGlow.scale.setScalar(.95);
    }
    trail.forEach((dot, i) => {
      dot.visible = i < route.length;
      if (!dot.visible) return;
      const point = route[i];
      const wiggle = .12 * Math.sin(time * 2.8 + i * .82);
      dot.position.set(point.x, point.y + wiggle, point.z);
      const pulse = .5 + .5 * Math.sin(time * 5 - i*.76);
      dot.scale.setScalar(.32 + pulse*.20);
      dot.material.opacity = .55 + pulse*.4;
    });
    for (const { dot,x,y,z,size,phase } of fireflies) {
      dot.position.set(x + .34*Math.cos(time*.66 + phase), y + .27*Math.sin(time + phase), z + .42*Math.sin(time*.62 + phase));
      dot.scale.setScalar(size * (.76 + .27*Math.sin(time*1.45 + phase)));
    }
    for (const { x,z,rig,wings,phase } of butterflies) {
      const t = time*.54 + phase;
      rig.position.set(x + .81*Math.cos(t), 1.03 + .27*Math.sin(2*t), z + .59*Math.sin(t));
      rig.rotation.y = -t;
      for (let i=0;i<2;i++) wings[i].rotation.z = (i*2-1) * (.25 + .88 * Math.sin(time*16 + phase));
    }
  }

  function reset() {
    for (const { dot } of particles) {
      scene.remove(dot);
      dot.material.dispose();
    }
    particles.length = 0;
  }

  return { burst, update, reset };
}

export function shadow(scene, size, opacity = .22) {
  const sizePx = 64;
  if (!textures.shadow) {
    const map = document.createElement('canvas');
    map.width = map.height = sizePx;
    const ctx = map.getContext('2d');
    const soft = ctx.createRadialGradient(32, 32, 4, 32, 32, 31);
    soft.addColorStop(0, '#273b29cc');
    soft.addColorStop(.64, '#273b297a');
    soft.addColorStop(1, '#273b2900');
    ctx.fillStyle = soft;
    ctx.fillRect(0, 0, sizePx, sizePx);
    textures.shadow = new THREE.CanvasTexture(map);
  }
  const shape = new THREE.Mesh(new THREE.PlaneGeometry(size, size*.68), new THREE.MeshBasicMaterial({ map: textures.shadow, opacity, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  shape.rotation.x = -Math.PI/2;
  scene.add(shape);
  return shape;
}
