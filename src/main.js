import * as THREE from 'three';
import './style.css';
import { animalIcon, icon } from './icons.js';
import { animal, groupAt, lump, panda } from './models.js';
import { landscape } from './landscape.js';
import { effects, shadow, sprite } from './effects.js';
import { createSound } from './sound.js';
import { canEnter, canRestore, chooseJump, friends, log, patches, riverEdge, start, surfaceHeight } from './world.js';

const $ = (selector) => document.querySelector(selector);
const game = $('.game');
const stage = $('#stage');
const help = $('#help-dialog');
const win = $('#win-dialog');
const sound = createSound();

document.querySelectorAll('[data-icon]').forEach((element) => {
  element.innerHTML = icon(element.dataset.icon);
});

const friendEntries = Object.entries(friends);
const party = $('#friends');
party.innerHTML = friendEntries.map(([type, friend]) =>
  `<button class="friend" type="button" data-friend="${type}" data-state="locked" style="--friend-color:${friend.color}"><span class="avatar">${animalIcon(type)}</span><span>${friend.species}</span><span class="badge" hidden>${icon('check')}</span></button>`
).join('');
$('#win-friends').innerHTML = friendEntries.map(([type, friend]) =>
  `<span class="avatar" style="--friend-color:${friend.color}">${animalIcon(type)}</span>`
).join('');

let toastTimer;
function notify(title, detail, emblem = 'sparkles') {
  const toast = $('#toast');
  const isAnimal = emblem in friends;
  toast.innerHTML = `<span class="toast-icon${isAnimal ? ' animal' : ''}">${isAnimal ? animalIcon(emblem) : icon(emblem)}</span><div><strong>${title}</strong><p>${detail}</p></div>`;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3100);
}

function showSound() {
  $('#sound').innerHTML = icon(sound.enabled ? 'sound' : 'muted');
  $('#sound').setAttribute('aria-pressed', String(sound.enabled));
  $('#sound').title = sound.enabled ? 'Mute sound (M)' : 'Turn on sound (M)';
}
showSound();

function createRenderer() {
  try {
    return new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch {
    stage.innerHTML = '<p class="paper" style="margin:245px auto 0;width:min(330px,90%);padding:16px;border-radius:14px">Lucky Panda needs WebGL 2 to draw its woods. Open the game in a browser with hardware acceleration enabled.</p>';
    return null;
  }
}

const renderer = createRenderer();
if (renderer) run(renderer);

function run(renderer) {
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Wildbloom Woods 3D game');
  stage.append(canvas);
  renderer.setClearColor('#d5ecd9');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d5eddf');
  scene.fog = new THREE.FogExp2('#d9ebdd', .0165);
  const camera = new THREE.PerspectiveCamera(44, 1, .1, 160);
  const sky = new THREE.HemisphereLight('#fff7df', '#b1bc9c', 1.04);
  scene.add(sky);
  const sun = new THREE.DirectionalLight('#fff0cd', 2.33);
  sun.position.set(-14, 27, 13);
  sun.target.position.set(1, 0, -2.8);
  sun.castShadow = true;
  sun.shadow.intensity = .80;
  sun.shadow.normalBias = .068;
  sun.shadow.bias = -.00018;
  sun.shadow.radius = 2.1;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.autoUpdate = false;
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 26, bottom: -26, near: 1, far: 72 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#cce6f1', .42);
  fill.position.set(6, 4, -7);
  scene.add(fill);

  const { sections, logs, ripples } = landscape(scene);
  scene.traverse((part) => { if (part.isMesh && part.material.isMeshStandardMaterial) part.receiveShadow = true; });
  const magic = effects(scene);
  const player = panda(scene);
  player.rig.scale.setScalar(1.13);
  const footprint = shadow(scene, 1.68, .31);
  const companions = Object.fromEntries(friendEntries.map(([type, info]) => {
    const model = animal(scene, type);
    model.rig.visible = false;
    const shade = shadow(scene, type === 'bear' ? 1.5 : 1.0, .27);
    shade.visible = false;
    return [type, { ...model, shade, info, state: 'locked', age: 0, joinTime: -10, yaw: .12 }];
  }));

  const seed = groupAt(scene);
  seed.visible = false;
  lump(seed, new THREE.MeshBasicMaterial({ color: '#fff0a0' }), 0, 0, 0, .102, .149, .102);
  sprite(seed, 'glow', '#ffe171').scale.setScalar(.68);
  const aimingRing = sprite(scene, 'star', '#fcffb7');
  aimingRing.visible = false;
  aimingRing.scale.setScalar(.55);

  const keys = new Set();
  const touches = new Map();
  const restored = new Set();
  let elapsed = 0;
  let jumpAt = -1;
  let boosted = false;
  let lift = 0;
  let logClearAt = -1;
  let wonAt = -1;
  let winShown = false;
  let lastPlant = -9;
  let bounceAt = -5;
  let launch = null;
  let aim = false;
  let aimPoint = null;
  let pointerAim = false;
  let lastMoveAt = -9;
  let footstep = 0;
  let yaw = -.30;
  const movement = new THREE.Vector2();
  const position = new THREE.Vector3(start.x, 0, start.z);
  const cameraGoal = new THREE.Vector3();
  const viewPoint = new THREE.Vector3();
  const cameraAnchor = position.clone();
  const projected = new THREE.Vector3();
  const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -patches[4].height);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const markerNode = $('#world-marker');
  const markerText = markerNode.querySelector('b');

  const isWith = (type) => companions[type].state === 'joined';
  const ground = () => surfaceHeight(position.x, position.z);
  const openPath = () => logClearAt >= 0;
  const aimingDistance = () => Math.hypot(position.x - patches[4].x, position.z - patches[4].z) < 12.5;

  function currentStep() {
    for (const [type, friend] of friendEntries) {
      const companion = companions[type];
      if (companion.state === 'waiting') {
        return {
          title: `Meet ${friend.name}`, detail: `Walk up to the ${friend.species.toLowerCase()} to make friends.`,
          x: friend.x, y: .12, z: friend.z, friend: true, radius: 1.06,
        };
      }
    }
    if (!restored.has('seedling')) return patchStep(0, 'Follow the golden trail to the grey patch.');
    if (!restored.has('clover')) return patchStep(1, 'Grow flowers in the hollow to find a bear.');
    if (!restored.has('fern')) {
      if (!openPath()) return { title: 'Open Fern Path', detail: 'Walk up to the logs with Bramble.', x: log.x, z: log.z + .83, y: .03, radius: 1.45 };
      return patchStep(2, 'Follow the open path to find a bird.', [{ x: log.x, z: -8.35 }]);
    }
    if (!restored.has('moss')) return patchStep(3, 'Double-tap jump while moving toward the ledge.', [{ x: 1.55, z: -4.6 }]);
    if (!restored.has('island')) {
      if (!aimingDistance() && !launch) return { title: 'Find the riverbank', detail: 'Follow the lights to a spot in seed-tossing range.', x: 6.55, z: -2.7, y: .03, radius: 1.35 };
      return patchStep(4, launch ? 'Watch your seed fly!' : 'Press E or tap Aim to toss a seed across.');
    }
    return { title: 'The woods are blooming!', detail: 'Explore with your new friends.' };
  }

  function patchStep(index, detail, waypoints = []) {
    const p = patches[index];
    return { title: p.name, detail, x: p.x, y: p.height + .035, z: p.z, radius: p.radius * .62, waypoints };
  }

  let shownStep;
  function showStep(step) {
    const label = step.title + step.detail;
    if (shownStep === label) return;
    shownStep = label;
    $('#objective').textContent = step.title;
    $('#objective-detail').textContent = step.detail;
    markerText.textContent = step.title;
  }

  function showParty() {
    for (const [type, info] of friendEntries) {
      const button = party.querySelector(`[data-friend="${type}"]`);
      const state = companions[type].state;
      button.dataset.state = state;
      button.querySelector('.badge').hidden = state !== 'joined';
      button.title = `${info.name} · ${info.ability}`;
      button.setAttribute('aria-label', `${info.name} the ${info.species}, ${state === 'waiting' ? 'ready to meet' : state === 'joined' ? info.ability : 'undiscovered'}`);
    }
    $('#friend-count').textContent = `${friendEntries.filter(([type]) => isWith(type)).length}/3`;
    $('#aim-shortcut').hidden = $('#touch-aim').hidden = !isWith('bird');
  }

  function showProgress() {
    $('#progress-number').textContent = `${restored.size} / ${patches.length}`;
    $('#progress').setAttribute('aria-valuenow', restored.size);
    $('#progress').innerHTML = patches.map((patch) => `<span class="${restored.has(patch.id) ? 'filled' : ''}"></span>`).join('');
  }

  function restore(section) {
    const p = section.patch;
    if (restored.has(p.id)) return;
    restored.add(p.id);
    section.grown = elapsed;
    section.sleeping.visible = section.cracked.visible = false;
    section.growth.visible = true;
    showProgress();
    magic.burst(p.x, p.height + .21, p.z, 38, 'star', p.radius * 1.32);
    sound.play('bloom');
    bounceAt = elapsed;
    if (p.friend) {
      const companion = companions[p.friend];
      const { info } = companion;
      companion.state = 'waiting';
      companion.age = 0;
      companion.rig.position.set(info.x, 0, info.z);
      companion.rig.visible = companion.shade.visible = true;
      showParty();
      notify(`${info.name} peeked out!`, `Walk up to meet the little ${info.species.toLowerCase()}.`, p.friend);
    } else {
      notify(`${p.name} is blooming!`, `${restored.size} of ${patches.length} patches restored.`, 'flower');
    }
    checkWin();
  }

  function befriend(type, friend) {
    friend.state = 'joined';
    friend.joinTime = elapsed;
    showParty();
    magic.burst(friend.rig.position.x, .66, friend.rig.position.z, 18, 'heart', .65);
    sound.play('friend');
    const prompts = { bunny: 'Double-tap jump for a big bunny bounce.', bear: 'Approach fallen logs and Bramble will clear them.', bird: 'Aim and toss seeds across the river.' };
    notify(`${friend.info.name} joined your party!`, prompts[type], type);
    bounceAt = elapsed;
    checkWin();
  }

  function checkWin() {
    if (wonAt >= 0 || restored.size !== patches.length || !friendEntries.every(([type]) => isWith(type))) return;
    wonAt = elapsed;
    sound.play('win');
    for (const [type] of friendEntries) companions[type].joinTime = elapsed;
    magic.burst(position.x, 1.1, position.z, 38, 'heart', 1.5);
  }

  const grassColor = new THREE.Color('#88ae70');
  const greyColor = new THREE.Color('#a1a198');
  function updateLand(dt) {
    for (const section of sections) {
      if (section.grown < 0) continue;
      const age = Math.min(1, (elapsed - section.grown) / .94);
      if (age >= 1 && section.growth.scale.y === 1) continue;
      section.growth.scale.y = 1 - Math.pow(1 - age, 3) * Math.cos(age * 6.9);
      section.greyGround.color.copy(greyColor).lerp(grassColor, age);
      sun.shadow.needsUpdate = true;
    }
    if (openPath() && logs.visible) {
      const progress = (elapsed - logClearAt) / .72;
      if (progress > 1) logs.visible = false;
      sun.shadow.needsUpdate = true;
      logs.position.z = log.z - progress * .48;
      logs.position.y = Math.sin(progress * Math.PI) * .62;
      logs.rotation.y = progress * .78;
      logs.scale.setScalar(Math.max(.001, 1 - progress * progress));
    }
    for (const { ripple, z } of ripples) {
      ripple.position.z = z + .18 * Math.sin(elapsed * .88 + z);
      ripple.material.opacity = .30 + Math.sin(elapsed * 1.25 + z) * .17;
    }
    if (isWith('bear') && !openPath() && Math.hypot(position.x - log.x, position.z - log.z) < 1.96) {
      logClearAt = elapsed;
      companions.bear.joinTime = elapsed;
      sound.play('clear');
      magic.burst(log.x, .57, log.z, 30, 'star', 2.7);
      notify('Bramble cleared the way!', 'Fern Hideaway is just up the path.', 'bear');
    }
    for (const section of sections) {
      if (!restored.has(section.patch.id) && canRestore(section.patch, position.x, position.z, position.y, section.patch.radius * .72, openPath())) restore(section);
    }
    if (launch) {
      launch.t = Math.min(1, launch.t + dt / .86);
      seed.position.copy(launch.from).lerp(launch.to, launch.t);
      seed.position.y += Math.sin(launch.t * Math.PI) * 3.45;
      seed.rotation.x += dt * 7;
      if (Math.random() < dt * 38) magic.burst(seed.position.x, seed.position.y, seed.position.z, 1, 'star', .04);
      if (launch.t === 1) {
        const island = patches[4];
        if (Math.hypot(launch.to.x - island.x, launch.to.z - island.z) <= island.radius + .25) restore(sections[4]);
        else {
          sound.play('miss');
          magic.burst(launch.to.x, .13, launch.to.z, 9, 'star', .34);
          notify('Almost!', 'Try aiming at the middle of Petal Island.', 'target');
        }
        seed.visible = false;
        launch = null;
      }
    }
  }

  function jump() {
    if (aim) {
      toss();
      return;
    }
    const grounded = position.y <= ground() + .052 && lift <= 0;
    const action = chooseJump({ grounded, bunny: isWith('bunny'), elapsed: elapsed - jumpAt, boosted });
    if (grounded && elapsed - lastPlant >= .35) {
      const nearby = sections.find(({ patch }) =>
        !restored.has(patch.id) && canRestore(patch, position.x, position.z, position.y, patch.radius + .55, openPath()));
      if (nearby) {
        lastPlant = elapsed;
        magic.burst(position.x, .32 + ground(), position.z, 12, 'star', .6);
        restore(nearby);
      } else {
        if (elapsed - lastPlant > .6) {
          lastPlant = elapsed;
          magic.burst(position.x, .22 + ground(), position.z, 8, 'glow', .57);
        }
        sound.play('hop');
      }
    }
    if (action === 'hop') {
      lift = 4.05;
      jumpAt = elapsed;
      boosted = false;
    }
    if (action === 'boost') {
      lift = 7.65;
      boosted = true;
      sound.play('boost');
      magic.burst(position.x, position.y + .23, position.z, 17, 'star', .64);
    }
  }

  function updatePlayer(dt) {
    const held = (code) => keys.has(code) || Array.from(touches.values()).includes(code);
    const x = Number(held('KeyD') || held('ArrowRight')) - Number(held('KeyA') || held('ArrowLeft'));
    const z = Number(held('KeyS') || held('ArrowDown')) - Number(held('KeyW') || held('ArrowUp'));
    const desired = new THREE.Vector2(x, z).normalize().multiplyScalar(5.3);
    movement.lerp(desired, 1 - Math.exp(-dt * (x || z ? 13 : 20)));
    if (desired.lengthSq() > 0) lastMoveAt = elapsed;
    if (lift || position.y > ground()) {
      lift -= dt * 16;
      position.y += lift * dt;
      if (position.y <= ground()) {
        position.y = ground();
        lift = 0;
      }
    }
    const nextX = position.x + movement.x * dt;
    const nextZ = position.z + movement.y * dt;
    if (canEnter(nextX, position.z, position.y, openPath())) position.x = nextX;
    if (canEnter(position.x, nextZ, position.y, openPath())) position.z = nextZ;
    const floor = ground();
    if (position.y < floor) {
      position.y = floor;
      if (lift < 0) lift = 0;
    }
    const speed = Math.min(1, movement.length() / 5.3);
    if (speed > .12) yaw = rotateTowards(yaw, Math.atan2(movement.x, movement.y), dt * 11);
    else if (elapsed - lastMoveAt > 1.05) yaw = rotateTowards(yaw, -.30, dt * 2.65);
    footstep += speed * dt * 13;
    const stride = Math.sin(footstep) * speed;
    const celebration = Math.max(0, 1 - (elapsed - bounceAt) * 1.45);
    player.rig.rotation.y = yaw;
    player.rig.position.copy(position);
    player.body.position.y = .027 + Math.abs(stride) * .065 + Math.sin(elapsed * 3.7) * .025 + Math.sin(celebration * Math.PI) * .24;
    player.body.rotation.z = stride * .038;
    player.head.rotation.x = -.028 + Math.sin(elapsed * 3.1) * .031 - Math.max(0, lift) * .026;
    player.head.rotation.z = Math.sin(elapsed * 2.9) * .045;
    player.scarf.rotation.z = stride * .065;
    for (let i = 0; i < 2; i++) {
      player.legs[i].rotation.x = stride * (.73 - i * 1.46);
      player.arms[i].rotation.x = stride * (-.49 + i * .98);
    }
    footprint.position.set(position.x, floor + .049, position.z);
    footprint.material.opacity = .32 / (1 + (position.y - floor) * 1.6);
  }

  function updateFriends(dt) {
    let order = 0;
    for (const [type] of friendEntries) {
      const buddy = companions[type];
      if (buddy.state === 'locked') continue;
      const p = buddy.rig.position;
      buddy.age += dt;
      const birdLift = type === 'bird' ? .62 : 0;
      if (buddy.state === 'waiting') {
        buddy.yaw = rotateTowards(buddy.yaw, Math.atan2(position.x - p.x, position.z - p.z), dt * 5);
        const pop = Math.sin(Math.min(1, buddy.age / .7) * Math.PI) * 1.18;
        p.y = surfaceHeight(p.x, p.z) + birdLift + pop + Math.abs(Math.sin(buddy.age * 4.55)) * .17;
        if (buddy.age > .38 && Math.hypot(p.x - position.x, p.z - position.z) < 1.28) befriend(type, buddy);
      } else {
        const index = order++;
        const side = index % 2 === 0 ? 1 : -1;
        const offset = .78 + index * .46;
        const desiredX = position.x + side * offset;
        const desiredZ = position.z + .92 + index * .44;
        const dx = desiredX - p.x;
        const dz = desiredZ - p.z;
        const d = Math.hypot(dx, dz);
        const close = d < .12;
        if (!close) {
          const advance = Math.min(d, dt * Math.min(8, d * 2.8));
          p.x += dx / d * advance;
          p.z += dz / d * advance;
          p.x = Math.min(riverEdge(p.z) - .25, p.x);
          if (d > .39) buddy.yaw = rotateTowards(buddy.yaw, Math.atan2(dx, dz), dt * 7);
        }
        if (elapsed - lastMoveAt > .7 && d < .6) buddy.yaw = rotateTowards(buddy.yaw, .12 * side, dt * 3.9);
        const hop = Math.abs(Math.sin(elapsed * (type === 'bunny' ? 7.9 : 5.9) + index * 1.41));
        p.y = surfaceHeight(p.x, p.z) + birdLift + (close ? .065 : .25) * hop + (type === 'bird' ? Math.sin(elapsed * 4) * .12 : 0);
      }
      const spin = (elapsed - buddy.joinTime) / .84;
      if (spin < 1) p.y += Math.sin(spin * Math.PI) * .39;
      buddy.rig.rotation.y = buddy.yaw + (spin < 1 ? spin * Math.PI * 2 : 0);
      buddy.body.scale.y = 1 + Math.sin(elapsed * 8.4 + order) * .05;
      buddy.head.rotation.z = Math.sin(elapsed * 4.5 + order) * .075;
      if (type === 'bird') {
        buddy.limbs.forEach((wing, i) => { wing.rotation.z = (i * 2 - 1) * (.36 + Math.sin(elapsed * 17) * .52); });
      }
      buddy.shade.position.set(p.x, surfaceHeight(p.x, p.z) + .051, p.z);
    }
  }

  function rotateTowards(current, target, rate) {
    const distance = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    return current + distance * (1 - Math.exp(-rate));
  }

  function drawCamera(dt) {
    const portrait = camera.aspect < .85;
    cameraAnchor.lerp(position, 1 - Math.exp(-dt * 3.8));
    const bank = isWith('bird') && !restored.has('island') && cameraAnchor.x > 3.7;
    const pan = aim ? (portrait ? 5.95 : 4.3) : bank ? 1.6 : 0;
    const viewY = portrait ? 15.3 : 12.4;
    const viewZ = portrait ? 19.7 : 17.4;
    cameraGoal.set(cameraAnchor.x + pan, viewY + cameraAnchor.y * .38, cameraAnchor.z + viewZ);
    camera.position.lerp(cameraGoal, 1 - Math.exp(-dt * 5));
    viewPoint.set(camera.position.x, .75 + cameraAnchor.y * .36, camera.position.z - viewZ - (portrait ? 4.9 : 5.55));
    camera.lookAt(viewPoint);
    camera.updateMatrixWorld();
  }

  function guideTrail(step) {
    if (!Number.isFinite(step.x) || aim || launch) return [];
    if (step.title === 'Petal Island') return [];
    const points = [];
    const origin = { x: position.x, z: position.z };
    let mid = step.waypoints?.[0];
    if (mid && (Math.hypot(mid.x - origin.x, mid.z - origin.z) < .45 ||
        (step.title === 'Fern Hideaway' && position.z < -8.65) ||
        (step.title === 'Mossy Lookout' && position.z < -4.7))) mid = null;
    if (position.z < -8.75 && position.x < -2.8 && step.title !== 'Fern Hideaway' && !step.friend) {
      mid = { x: log.x, z: -7.1 };
    }
    const destinations = mid ? [mid, step] : [step];
    let previous = origin;
    for (const next of destinations) {
      const distance = Math.hypot(next.x - previous.x, next.z - previous.z);
      const count = Math.ceil(distance / .72);
      for (let i = 1; i < count && points.length < 15; i++) {
        const t = i / count;
        const x = THREE.MathUtils.lerp(previous.x, next.x, t);
        const z = THREE.MathUtils.lerp(previous.z, next.z, t);
        points.push({ x, y: surfaceHeight(x, z) + .27, z });
      }
      previous = next;
    }
    return points;
  }

  function worldToScreen(x, y, z) {
    projected.set(x, y, z).project(camera);
    return {
      x: (projected.x + 1) * stage.clientWidth / 2,
      y: (1 - projected.y) * stage.clientHeight / 2,
      depth: projected.z,
    };
  }

  function showMarker(step) {
    if (!Number.isFinite(step.x)) {
      markerNode.hidden = true;
      return;
    }
    const label = worldToScreen(step.x, step.y + (step.friend ? 2.47 : 1.48), step.z);
    markerNode.hidden = label.depth > 1 || label.x < 52 || label.x > stage.clientWidth - 52 || label.y < 115 || label.y > stage.clientHeight - 61;
    if (markerNode.hidden) return;
    markerNode.style.left = `${label.x}px`;
    markerNode.style.top = `${label.y}px`;
  }

  function stopAiming() {
    aim = false;
    game.classList.remove('aiming');
    $('#aim-panel').hidden = $('#reticle').hidden = true;
    aimingRing.visible = false;
  }

  function toggleAim() {
    if (aim) {
      stopAiming();
      return;
    }
    if (!isWith('bird')) return;
    if (restored.has('island')) {
      notify('Petal Island is blooming!', 'Skye helped bring its flowers back.', 'bird');
      return;
    }
    if (launch) return;
    if (!aimingDistance()) {
      notify('A little closer to the river', 'Follow the golden trail to the riverbank.', 'target');
      return;
    }
    aim = true;
    pointerAim = false;
    aimPoint = new THREE.Vector3(patches[4].x, patches[4].height + .1, patches[4].z);
    game.classList.add('aiming');
    $('#aim-panel').hidden = false;
    $('#toast').classList.remove('visible');
    aimingRing.visible = true;
    aimingRing.position.set(patches[4].x, 1.38, patches[4].z);
  }

  function aimAt(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(mouse, camera);
    const groundHit = raycaster.ray.intersectPlane(aimPlane, new THREE.Vector3());
    const island = patches[4];
    const marker = worldToScreen(island.x, 1.26, island.z);
    const onMarker = Math.hypot(event.clientX - rect.left - marker.x, event.clientY - rect.top - marker.y) < 41;
    pointerAim = true;
    aimPoint = onMarker ? new THREE.Vector3(island.x, island.height + .1, island.z) : groundHit;
  }

  function showReticle() {
    if (!aim) return;
    const island = patches[4];
    const reticle = $('#reticle');
    const target = aimPoint && Math.hypot(aimPoint.x - island.x, aimPoint.z - island.z) <= island.radius + .25;
    const screen = worldToScreen(island.x, 1.26, island.z);
    reticle.hidden = !pointerAim && (screen.x < 0 || screen.x > stage.clientWidth || screen.y < 0 || screen.y > stage.clientHeight);
    reticle.classList.toggle('valid', Boolean(target));
    reticle.style.left = `${pointerAim ? (mouse.x + 1) * stage.clientWidth / 2 : screen.x}px`;
    reticle.style.top = `${pointerAim ? (1 - mouse.y) * stage.clientHeight / 2 : screen.y}px`;
    const hint = target ? 'Ready! Click, tap, or press Enter to toss.' : 'Aim at the island, then tap or click to toss.';
    if ($('#aim-hint').textContent !== hint) $('#aim-hint').textContent = hint;
  }

  function toss() {
    if (!aimPoint || !aimingDistance() || Math.hypot(aimPoint.x - position.x, aimPoint.z - position.z) > 15) {
      notify('Try aiming at Petal Island', 'Look for the grey flowers across the water.', 'target');
      return;
    }
    launch = { from: position.clone().add(new THREE.Vector3(.2, 1.05, 0)), to: aimPoint.clone(), t: 0 };
    seed.position.copy(launch.from);
    seed.visible = true;
    stopAiming();
    sound.play('launch');
  }

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    camera.aspect = w / h;
    camera.fov = camera.aspect < .85 ? 48 : camera.aspect > 1.9 ? 47 : 43;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, camera.aspect < .85 ? 1.5 : 1.7));
    renderer.setSize(w, h, false);
  }

  function reset() {
    restored.clear();
    elapsed = 0;
    jumpAt = -1;
    boosted = false;
    lift = 0;
    logClearAt = wonAt = -1;
    winShown = false;
    magic.reset();
    sun.shadow.needsUpdate = true;
    lastPlant = -9;
    bounceAt = -5;
    launch = null;
    lastMoveAt = -9;
    footstep = 0;
    yaw = -.30;
    position.set(start.x, 0, start.z);
    cameraAnchor.copy(position);
    movement.set(0, 0);
    seed.visible = false;
    logs.visible = true;
    logs.position.set(log.x, 0, log.z);
    logs.rotation.y = 0;
    logs.scale.setScalar(1);
    for (const section of sections) {
      section.grown = -1;
      section.greyGround.color.copy(greyColor);
      section.sleeping.visible = section.cracked.visible = true;
      section.growth.visible = false;
      section.growth.scale.y = .015;
    }
    for (const [type] of friendEntries) {
      const buddy = companions[type];
      buddy.state = 'locked';
      buddy.rig.visible = buddy.shade.visible = false;
      buddy.age = 0;
      buddy.joinTime = -10;
    }
    $('#toast').classList.remove('visible');
    stopAiming();
    keys.clear();
    touches.clear();
    showParty();
    showProgress();
    drawCamera(10);
    if (help.open) help.close();
    if (win.open) win.close();
    canvas.focus({ preventScroll: true });
  }

  function toggleSound() {
    sound.toggle();
    showSound();
  }

  function openHelp() {
    keys.clear();
    touches.clear();
    movement.set(0, 0);
    help.showModal();
  }

  const movementCodes = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
  window.addEventListener('keydown', (event) => {
    if (help.open || win.open || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'Escape') {
      if (aim) stopAiming();
      else openHelp();
      return;
    }
    if (movementCodes.includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
      sound.unlock();
      return;
    }
    if (event.repeat) return;
    if (event.code === 'KeyM') toggleSound();
    if (event.code === 'KeyE') toggleAim();
    if (event.code === 'Space' && !event.target.closest?.('button')) {
      event.preventDefault();
      sound.unlock();
      jump();
    }
    if (event.code === 'Enter' && aim && !event.target.closest?.('button')) {
      event.preventDefault();
      sound.unlock();
      toss();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    touches.clear();
  });
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointermove', (event) => { if (aim) aimAt(event); });
  canvas.addEventListener('pointerdown', (event) => {
    sound.unlock();
    canvas.focus({ preventScroll: true });
    if (aim && event.button === 0) {
      aimAt(event);
      toss();
    }
  });
  document.querySelectorAll('[data-move]').forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      sound.unlock();
      button.setPointerCapture(event.pointerId);
      touches.set(event.pointerId, button.dataset.move);
    });
    for (const type of ['pointerup','pointercancel','lostpointercapture']) {
      button.addEventListener(type, (event) => touches.delete(event.pointerId));
    }
  });

  $('#touch-hop').addEventListener('pointerdown', (event) => {
    event.preventDefault();
    sound.unlock();
    jump();
  });
  $('#touch-hop').addEventListener('click', (event) => {
    if (!event.detail) {
      sound.unlock();
      jump();
    }
  });
  for (const selector of ['#touch-aim','#aim-shortcut']) {
    $(selector).addEventListener('click', () => {
      sound.unlock();
      toggleAim();
      canvas.focus({ preventScroll: true });
    });
  }
  $('#aim-cancel').addEventListener('click', () => {
    stopAiming();
    canvas.focus({ preventScroll: true });
  });
  party.addEventListener('click', (event) => {
    const slot = event.target.closest('[data-friend]');
    if (!slot) return;
    const type = slot.dataset.friend;
    const buddy = companions[type];
    const { info } = buddy;
    if (buddy.state === 'locked') notify(info.species + ' Friend', 'Restore more patches to meet this friend.', type);
    if (buddy.state === 'waiting') notify(`Meet ${info.name}`, `Walk up to the ${info.species.toLowerCase()} to make friends.`, type);
    if (buddy.state === 'joined') notify(`${info.name} the ${info.species}`, info.ability, type);
    canvas.focus({ preventScroll: true });
  });
  $('#sound').addEventListener('click', () => {
    toggleSound();
    canvas.focus({ preventScroll: true });
  });
  $('#help').addEventListener('click', openHelp);
  $('#close-help').addEventListener('click', () => help.close());
  $('#keep-playing').addEventListener('click', () => win.close());
  for (const dialog of [help, win]) dialog.addEventListener('close', () => canvas.focus({ preventScroll: true }));
  document.querySelectorAll('[data-restart]').forEach((button) => button.addEventListener('click', reset));
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    notify('The woods need a moment', 'Reload the game to return to the forest.', 'sprout');
  });

  resize();
  reset();
  let lastFrame = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(.048, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    if (help.open || win.open) return;
    elapsed += dt;
    updatePlayer(dt);
    updateLand(dt);
    updateFriends(dt);
    drawCamera(dt);
    const step = currentStep();
    showStep(step);
    showMarker(step);
    showReticle();
    magic.update(dt, elapsed, Number.isFinite(step.x) ? step : null, guideTrail(step));
    renderer.render(scene, camera);
    if (!winShown && wonAt >= 0 && elapsed - wonAt >= .92) {
      winShown = true;
      keys.clear();
      touches.clear();
      movement.set(0, 0);
      win.showModal();
    }
  });
}
