<template>
  <canvas
    ref="canvasRef"
    class="page-three-backdrop"
    :class="{ 'page-three-backdrop--inline': mode === 'inline' }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three/src/Three.js';

export type PageThreeVariant = 'data' | 'rank' | 'level' | 'settings' | 'paid' | 'admin' | 'notice' | 'task';

const props = defineProps<{ variant: PageThreeVariant; mode?: 'page' | 'inline' }>();
const canvasRef = ref<HTMLCanvasElement | null>(null);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let root: THREE.Group | null = null;
let resizeObserver: ResizeObserver | null = null;
let aura: THREE.Mesh | null = null;
let auraTexture: THREE.Texture | null = null;
let raf = 0;
let lastFrame = 0;
let startedAt = 0;
const updaters: ((time: number) => void)[] = [];
const pointerTarget = { x: 0, y: 0 };
const pointer = { x: 0, y: 0 };
const ripples: { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; startedAt: number }[] = [];
let rootBaseX = 0;
let rootBaseY = 0;
let viewWidth = 1;
let viewHeight = 1;
let cursorHalo: THREE.Sprite | null = null;
let rippleClock = 0;
let rippleIndex = 0;

function handlePointerMove(event: PointerEvent) {
  pointerTarget.x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
  pointerTarget.y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
}

function resetPointer() {
  pointerTarget.x = 0;
  pointerTarget.y = 0;
}

function handlePointerDown(event: PointerEvent) {
  if (!ripples.length) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest?.('button, a, input, select, textarea, [role="button"], .section-action')) return;
  const ripple = ripples[rippleIndex];
  rippleIndex = (rippleIndex + 1) % ripples.length;
  ripple.mesh.position.x = pointerTarget.x * viewWidth * 0.34;
  ripple.mesh.position.z = -2 - pointerTarget.y * 2.2;
  ripple.startedAt = rippleClock;
}

function glowMaterial(color: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function bodyMaterial(color: number, opacity: number, wireframe = false): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.36,
    metalness: 0.6,
    roughness: 0.24,
    transparent: true,
    opacity,
    wireframe,
    depthWrite: false,
  });
}

function createDust(count: number, palette: number[], spread: [number, number, number], size: number, opacity: number): THREE.Points {
  let seed = 4177 + count;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const paletteColors = palette.map((color) => new THREE.Color(color));
  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    positions[offset] = (random() - 0.5) * spread[0];
    positions[offset + 1] = (random() - 0.5) * spread[1];
    positions[offset + 2] = (random() - 0.5) * spread[2];
    const color = paletteColors[index % paletteColors.length];
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
}

function addHalo(parent: THREE.Object3D, radius: number, color: number, opacity: number, rotation: [number, number, number]): THREE.Mesh {
  const halo = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.011, 6, 120), glowMaterial(color, opacity));
  halo.rotation.set(...rotation);
  parent.add(halo);
  return halo;
}

function buildData(focal: THREE.Group) {
  const bars: { mesh: THREE.Mesh; base: number; phase: number }[] = [];
  const heights = [0.5, 0.85, 1.2, 0.95, 1.45, 1.1];
  heights.forEach((height, index) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, height, 0.22), bodyMaterial(0x5eead4, 0.2));
    bar.position.set(-0.85 + index * 0.34, height / 2 - 0.75, (index - 2.5) * 0.06);
    focal.add(bar);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(bar.geometry as THREE.BufferGeometry),
      new THREE.LineBasicMaterial({ color: 0x9ff8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    bar.add(edges);
    bars.push({ mesh: bar, base: height, phase: index * 0.42 });
  });
  focal.add(addHalo(focal, 1.45, 0x60a5fa, 0.18, [1.35, 0, 0.15]));
  focal.add(addHalo(focal, 1.7, 0x5eead4, 0.1, [1.2, 0.4, -0.2]));
  focal.add(createDust(90, [0x5eead4, 0x60a5fa, 0xa78bfa], [9, 6, 4], 0.03, 0.4));
  updaters.push((time) => {
    bars.forEach((bar, index) => {
      const scale = 0.94 + Math.sin(time * 0.9 + bar.phase) * 0.1;
      bar.mesh.scale.y = scale;
      bar.mesh.position.y = bar.base / 2 - 0.75;
      bar.mesh.rotation.y = time * 0.08 + index * 0.02;
    });
    focal.rotation.y = Math.sin(time * 0.18) * 0.28;
    focal.rotation.x = Math.sin(time * 0.22) * 0.03;
  });
}

function buildRank(focal: THREE.Group) {
  const podium = new THREE.Group();
  [[-0.95, 0.42], [0, 0.68], [0.95, 0.32]].forEach(([x, height], index) => {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, height, 6, 1, true),
      bodyMaterial(index === 1 ? 0xffd479 : 0xff8fb0, 0.1),
    );
    pillar.position.set(x, -0.85 + height / 2, -0.15);
    podium.add(pillar);
    const cap = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 48), glowMaterial(0xffd479, 0.42));
    cap.rotation.x = Math.PI / 2;
    cap.position.set(x, -0.85 + height, -0.15);
    podium.add(cap);
  });
  focal.add(podium);

  const medal = new THREE.Group();
  medal.position.set(0, 0.55, 0.25);
  medal.add(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 12, 64), bodyMaterial(0xffd479, 0.34)));
  medal.add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 40), bodyMaterial(0xffe9b0, 0.18)));
  medal.rotation.x = 1.15;
  focal.add(medal);
  const rings = [
    addHalo(medal, 0.66, 0xffd479, 0.3, [0.4, 0.2, 0]),
    addHalo(medal, 0.86, 0xff7aa2, 0.16, [1.1, 0.6, 0.3]),
  ];
  focal.add(createDust(100, [0xffd479, 0xff9ebb, 0xfff0bd], [8, 6, 4], 0.033, 0.45));
  updaters.push((time) => {
    medal.rotation.z = Math.sin(time * 0.5) * 0.22;
    medal.position.y = 0.55 + Math.sin(time * 0.85) * 0.06;
    rings[0].rotation.z = time * 0.22;
    rings[1].rotation.z = -time * 0.16;
    focal.rotation.y = Math.sin(time * 0.2) * 0.2;
  });
}

function buildLevel(focal: THREE.Group) {
  const crystal = new THREE.Group();
  crystal.position.y = 0.35;
  crystal.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), bodyMaterial(0xffc861, 0.3)));
  crystal.children[0].scale.set(0.72, 1.45, 0.72);
  const inner = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 1), bodyMaterial(0xfff0c4, 0.24, true));
  inner.scale.set(0.7, 1.5, 0.7);
  crystal.add(inner);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 2.1, 18, 1, true), glowMaterial(0xffd479, 0.07));
  beam.position.y = -0.9;
  crystal.add(beam);
  const rings = [
    addHalo(crystal, 0.82, 0xffd479, 0.32, [1.4, 0.1, 0]),
    addHalo(crystal, 1.02, 0x7dd3fc, 0.18, [0.5, 0.9, -0.4]),
  ];
  const shards = [0, 2, 4].map((index) => {
    const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.12, 0), bodyMaterial(0xffe4a8, 0.34));
    const angle = (index / 6) * Math.PI * 2;
    shard.position.set(Math.cos(angle) * 0.95, Math.sin(angle) * 0.3 - 0.1, Math.sin(angle) * 0.5);
    crystal.add(shard);
    return { shard, angle };
  });
  focal.add(crystal);
  focal.add(createDust(100, [0xffd479, 0x7dd3fc, 0xfff0bd], [8, 7, 4], 0.033, 0.46));
  updaters.push((time) => {
    crystal.rotation.y = time * 0.22;
    crystal.position.y = 0.35 + Math.sin(time * 0.8) * 0.07;
    inner.rotation.y = -time * 0.3;
    rings[0].rotation.z = time * 0.14;
    rings[1].rotation.z = -0.4 - time * 0.1;
    shards.forEach(({ shard, angle }, index) => {
      const orbit = angle + time * 0.18;
      shard.position.set(Math.cos(orbit) * 0.95, Math.sin(time * 1.1 + index) * 0.25, Math.sin(orbit) * 0.5);
      shard.rotation.y = time * 0.6;
    });
  });
}

function buildSettings(focal: THREE.Group) {
  const rig = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 96), bodyMaterial(0x6ee7b7, 0.26));
  const middle = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 8, 72), glowMaterial(0x7dd3fc, 0.34));
  const nodes = Array.from({ length: 8 }, (_, index) => {
    const node = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), bodyMaterial(index % 2 ? 0x7dd3fc : 0x6ee7b7, 0.42));
    const angle = (index / 8) * Math.PI * 2;
    node.position.set(Math.cos(angle) * 0.72, Math.sin(angle) * 0.72, 0);
    outer.add(node);
    return node;
  });
  rig.add(outer);
  rig.add(middle);
  rig.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 6), bodyMaterial(0x9dfce0, 0.26)));
  const spokes = new THREE.Group();
  for (let index = 0; index < 4; index += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.012, 0.012), glowMaterial(0x6ee7b7, 0.2));
    spoke.rotation.z = (index / 4) * Math.PI;
    spokes.add(spoke);
  }
  rig.add(spokes);
  rig.rotation.x = 1.15;
  rig.position.y = 0.2;
  focal.add(rig);
  focal.add(addHalo(focal, 1.15, 0x6ee7b7, 0.12, [1.35, 0, 0.2]));
  focal.add(createDust(80, [0x6ee7b7, 0x7dd3fc, 0xc4b5fd], [9, 6, 4], 0.03, 0.4));
  updaters.push((time) => {
    outer.rotation.z = time * 0.35;
    middle.rotation.z = -time * 0.52;
    spokes.rotation.z = time * 0.28;
    nodes.forEach((node, index) => node.scale.setScalar(0.9 + Math.sin(time * 2 + index) * 0.25));
    rig.rotation.z = Math.sin(time * 0.4) * 0.18;
    focal.rotation.y = Math.sin(time * 0.16) * 0.24;
  });
}

function buildPaid(focal: THREE.Group) {
  const gate = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.045, 10, 96), bodyMaterial(0xffd479, 0.26));
  gate.rotation.y = 0.35;
  focal.add(gate);
  focal.add(addHalo(gate, 0.95, 0xffe9b0, 0.22, [0.2, 0, 0.4]));
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), bodyMaterial(0xfff0c4, 0.28));
  gem.position.y = 0.15;
  focal.add(gem);
  const gems = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 1), bodyMaterial(0xffd479, 0.24, true));
  gems.position.y = 0.15;
  focal.add(gems);
  const coins = Array.from({ length: 7 }, (_, index) => {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 20), bodyMaterial(0xffc861, 0.3));
    coin.rotation.x = Math.PI / 2;
    const angle = (index / 7) * Math.PI * 2;
    coin.position.set(Math.cos(angle) * 1.02, Math.sin(angle) * 0.45, Math.sin(angle) * 0.4);
    focal.add(coin);
    return { coin, angle };
  });
  focal.add(createDust(90, [0xffd479, 0xffb066, 0xfff0bd], [8, 5, 4], 0.032, 0.44));
  updaters.push((time) => {
    gate.rotation.z = time * 0.14;
    gem.rotation.y = time * 0.42;
    gems.rotation.y = -time * 0.3;
    coins.forEach(({ coin, angle }, index) => {
      const orbit = angle + time * 0.24;
      coin.position.set(Math.cos(orbit) * 1.02, Math.sin(time * 1.2 + index) * 0.35, Math.sin(orbit) * 0.4);
      coin.rotation.z = time * 0.8 + index;
    });
    focal.rotation.y = Math.sin(time * 0.18) * 0.18;
  });
}

function buildAdmin(focal: THREE.Group) {
  const badge = new THREE.Group();
  const acute = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.14, 6), bodyMaterial(0x60a5fa, 0.16));
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 6), bodyMaterial(0x93c5fd, 0.3, true));
  badge.add(acute);
  badge.add(wire);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), bodyMaterial(0xbfdbfe, 0.32));
  badge.add(core);
  badge.rotation.x = 1.2;
  badge.rotation.z = 0.12;
  badge.position.y = 0.15;
  focal.add(badge);

  const satellites = Array.from({ length: 6 }, (_, index) => {
    const satellite = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), glowMaterial(0x93c5fd, 0.8));
    const angle = (index / 6) * Math.PI * 2;
    satellite.position.set(Math.cos(angle) * 0.95, Math.sin(angle) * 0.95, 0);
    focal.add(satellite);
    return { satellite, angle };
  });
  focal.add(addHalo(focal, 0.95, 0x60a5fa, 0.24, [1.3, 0.1, 0.2]));
  focal.add(createDust(80, [0x60a5fa, 0x93c5fd, 0x818cf8], [8, 6, 4], 0.03, 0.36));
  updaters.push((time) => {
    badge.rotation.y = time * 0.16;
    badge.position.y = 0.15 + Math.sin(time * 0.7) * 0.05;
    core.rotation.y = time * 0.5;
    satellites.forEach(({ satellite, angle }) => {
      const orbit = angle + time * 0.3;
      satellite.position.set(Math.cos(orbit) * 0.95, Math.sin(orbit) * 0.95, Math.sin(time * 1.4) * 0.15);
    });
    focal.rotation.y = Math.sin(time * 0.14) * 0.26;
  });
}

function buildNotice(focal: THREE.Group) {
  const rings = [0, 1, 2, 3].map((index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42 + index * 0.22, 0.012, 6, 96), glowMaterial(index % 2 ? 0xb39fff : 0xf472b6, 0.3 - index * 0.05));
    ring.rotation.x = 1.45;
    ring.position.y = 0.1;
    focal.add(ring);
    return ring;
  });
  const plane = new THREE.Group();
  plane.position.set(0, 0.1, 0.1);
  const wingA = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.52, 0.18, -0.24), new THREE.Vector3(0.18, -0.06, -0.1),
  ]), bodyMaterial(0xd8ccff, 0.4));
  const wingB = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.18, -0.06, -0.1), new THREE.Vector3(0.34, -0.3, -0.05),
  ]), bodyMaterial(0xffa8cd, 0.36));
  plane.add(wingA, wingB);
  focal.add(plane);
  focal.add(addHalo(focal, 1.1, 0xb39fff, 0.12, [1.35, 0, 0.14]));
  focal.add(createDust(95, [0xb39fff, 0xf472b6, 0x93c5fd], [9, 6, 4], 0.031, 0.42));
  updaters.push((time) => {
    plane.position.x = Math.sin(time * 0.5) * 0.5;
    plane.position.y = 0.1 + Math.sin(time * 0.8) * 0.12;
    plane.rotation.z = Math.sin(time * 0.5) * 0.18;
    plane.rotation.y = 0.5 + Math.sin(time * 0.3) * 0.2;
    rings.forEach((ring, index) => {
      const cycle = (time * 0.22 + index / 4) % 1;
      const scale = 0.9 + cycle * 1.5;
      ring.scale.setScalar(scale);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - cycle) * 0.34;
    });
    focal.rotation.y = Math.sin(time * 0.15) * 0.2;
  });
}

function buildTask(focal: THREE.Group) {
  const quest = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.07, 6), bodyMaterial(0x8b5cf6, 0.13));
  const plateWire = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.09, 6), bodyMaterial(0xd8b4fe, 0.28, true));
  quest.add(plate, plateWire);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), bodyMaterial(0xf0abfc, 0.36));
  core.position.y = 0.28;
  quest.add(core);

  const arcs = [
    { radius: 0.5, color: 0xf472b6, arc: Math.PI * 1.4, tilt: [1.2, 0, 0] },
    { radius: 0.72, color: 0x8b5cf6, arc: Math.PI * 1.1, tilt: [1.2, 0, 0.7] },
    { radius: 0.94, color: 0x93c5fd, arc: Math.PI * 0.85, tilt: [1.2, 0, -0.6] },
  ].map((config, index) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(config.radius, 0.019, 8, 72, config.arc),
      glowMaterial(config.color, 0.5 - index * 0.08),
    );
    arc.rotation.set(config.tilt[0], config.tilt[1], config.tilt[2]);
    arc.position.y = 0.22 - index * 0.05;
    quest.add(arc);
    return arc;
  });

  const nodes = Array.from({ length: 6 }, (_, index) => {
    const node = new THREE.Mesh(new THREE.TetrahedronGeometry(0.1, 0), bodyMaterial(index % 2 ? 0xf0abfc : 0xa5b4fc, 0.44));
    const angle = (index / 6) * Math.PI * 2;
    node.position.set(Math.cos(angle) * 1.02, 0.35 + Math.sin(angle) * 0.22, Math.sin(angle) * 0.3);
    quest.add(node);
    return { node, angle };
  });

  quest.rotation.z = 0.08;
  focal.add(quest);
  focal.add(addHalo(focal, 1.15, 0x8b5cf6, 0.14, [1.3, 0, 0.18]));
  focal.add(createDust(95, [0x8b5cf6, 0xf472b6, 0x93c5fd], [9, 6, 4], 0.031, 0.44));
  updaters.push((time) => {
    quest.rotation.y = time * 0.24;
    quest.position.y = 0.15 + Math.sin(time * 0.8) * 0.06;
    core.rotation.y = -time * 0.4;
    arcs[0].rotation.z = 0.3 + time * 0.2;
    arcs[1].rotation.z = 0.7 - time * 0.14;
    arcs[2].rotation.z = -0.6 + time * 0.1;
    nodes.forEach(({ node, angle }, index) => {
      const orbit = angle + time * 0.2;
      node.position.set(Math.cos(orbit) * 1.02, 0.35 + Math.sin(orbit) * 0.2, Math.sin(orbit) * 0.3);
      node.rotation.set(time * 0.5 + index, time * 0.35, 0);
    });
    focal.rotation.y = Math.sin(time * 0.17) * 0.22;
  });
}

function createAuraTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.42, 'rgba(255,255,255,0.24)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function resizeScene() {
  const canvas = canvasRef.value;
  if (!canvas || !renderer || !camera || !root) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z;
  viewHeight = visibleHeight;
  viewWidth = visibleHeight * camera.aspect;
  const inline = props.mode === 'inline';
  const compact = width < 900;
  if (inline) {
    const aspect = width / height;
    root.position.set(aspect * 1.02, 0.05, 0);
    root.scale.setScalar(THREE.MathUtils.clamp((height / 120) * 1.25, 0.9, 1.6));
    rootBaseX = root.position.x;
    rootBaseY = root.position.y;
    if (aura) {
      aura.position.set(aspect * 1.02, 0.1, -1);
      aura.scale.setScalar(THREE.MathUtils.clamp((height / 120) * 0.9, 0.6, 1.2));
    }
    return;
  }
  root.position.set(compact ? 1.6 : 2.55, compact ? -1.55 : -1.95, 0);
  root.scale.setScalar(THREE.MathUtils.clamp(Math.min(width / 760, height / 480), 0.7, 1.15));
  rootBaseX = root.position.x;
  rootBaseY = root.position.y;
  if (aura) {
    aura.position.set(compact ? 1.5 : 2.3, compact ? -1.35 : -1.65, -1.4);
    aura.scale.setScalar(THREE.MathUtils.clamp(Math.min(width / 900, height / 620), 0.75, 1.3));
  }
}

function animateScene(now: number) {
  if (!renderer || !scene || !camera) return;
  raf = requestAnimationFrame(animateScene);
  if (now - lastFrame < 1000 / 30) return;
  lastFrame = now;
  const time = (now - startedAt) / 1000;
  updaters.forEach((update) => update(time));

  pointer.x += (pointerTarget.x - pointer.x) * 0.06;
  pointer.y += (pointerTarget.y - pointer.y) * 0.06;
  rippleClock = time;
  if (root) {
    root.position.x = rootBaseX + pointer.x * 0.3;
    root.position.y = rootBaseY - pointer.y * 0.22;
    root.rotation.y = pointer.x * 0.1;
    root.rotation.x = -pointer.y * 0.06;
  }
  if (cursorHalo) {
    cursorHalo.position.x = pointer.x * viewWidth * 0.42;
    cursorHalo.position.y = -pointer.y * viewHeight * 0.36;
    cursorHalo.scale.setScalar(2.35 + Math.sin(time * 1.8) * 0.18);
  }
  ripples.forEach((ripple) => {
    const age = time - ripple.startedAt;
    if (age < 0 || age > 1.1) {
      ripple.material.opacity = 0;
      return;
    }
    const progress = age / 1.1;
    ripple.mesh.scale.setScalar(0.3 + progress * 3.4);
    ripple.material.opacity = 0.42 * (1 - progress);
  });

  renderer.render(scene, camera);
}

function startLoop() {
  if (raf || !renderer) return;
  lastFrame = performance.now();
  raf = requestAnimationFrame(animateScene);
}

function stopLoop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

function onVisibilityChange() {
  if (document.hidden) stopLoop();
  else startLoop();
}

function disposeScene() {
  stopLoop();
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerdown', handlePointerDown);
  window.removeEventListener('blur', resetPointer);
  ripples.length = 0;
  cursorHalo = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  aura = null;
  auraTexture?.dispose();
  auraTexture = null;
  if (scene) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse((object) => {
      const renderable = object as THREE.Object3D & {
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
      };
      if (renderable.geometry) geometries.add(renderable.geometry);
      if (Array.isArray(renderable.material)) renderable.material.forEach((material) => materials.add(material));
      else if (renderable.material) materials.add(renderable.material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    scene.clear();
  }
  renderer?.dispose();
  renderer = null;
  scene = null;
  camera = null;
  root = null;
  updaters.length = 0;
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(0, 0, props.mode === 'inline' ? 5.2 : 9);
    root = new THREE.Group();
    scene.add(root);
    scene.add(new THREE.HemisphereLight(0xdfeaff, 0x120c1e, 1.6));
    const keyLight = new THREE.DirectionalLight(props.variant === 'rank' || props.variant === 'level' ? 0xffd79a : 0xb5d9ff, 2.1);
    keyLight.position.set(3, 5, 6);
    scene.add(keyLight);
    const accentColors: Record<PageThreeVariant, number> = {
      data: 0x5eead4,
      rank: 0xffd479,
      level: 0xffc861,
      settings: 0x6ee7b7,
      paid: 0xffc861,
      admin: 0x60a5fa,
      notice: 0xb39fff,
      task: 0x8b5cf6,
    };
    const accentLight = new THREE.PointLight(accentColors[props.variant], 16, 22, 2);
    accentLight.position.set(-2, 1, 4);
    scene.add(accentLight);

    const builders: Record<PageThreeVariant, (group: THREE.Group) => void> = {
      data: buildData,
      rank: buildRank,
      level: buildLevel,
      settings: buildSettings,
      paid: buildPaid,
      admin: buildAdmin,
      notice: buildNotice,
      task: buildTask,
    };
    builders[props.variant](root);

    const grid = new THREE.GridHelper(20, 26, accentColors[props.variant], accentColors[props.variant]);
    const gridMaterial = grid.material as THREE.LineBasicMaterial;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.07;
    gridMaterial.blending = THREE.AdditiveBlending;
    gridMaterial.depthWrite = false;
    grid.position.set(0, -2.55, -3);
    if (props.mode !== 'inline') scene.add(grid);

    auraTexture = createAuraTexture();
    aura = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 5.4),
      new THREE.MeshBasicMaterial({
        map: auraTexture,
        color: accentColors[props.variant],
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(aura);

    cursorHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: auraTexture,
        color: accentColors[props.variant],
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    );
    cursorHalo.scale.set(2.4, 2.4, 1);
    cursorHalo.position.z = -1.8;
    scene.add(cursorHalo);

    if (props.mode !== 'inline') {
      for (let index = 0; index < 2; index += 1) {
        const material = new THREE.MeshBasicMaterial({
          color: accentColors[props.variant],
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const ripple = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.014, 6, 96), material);
        ripple.rotation.x = -Math.PI / 2;
        ripple.position.set(0, -3.05, -2);
        scene.add(ripple);
        ripples.push({ mesh: ripple, material, startedAt: -10 });
      }
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('blur', resetPointer);

    resizeObserver = new ResizeObserver(resizeScene);
    resizeObserver.observe(canvas);
    resizeScene();
    renderer.render(scene, camera);
    startedAt = performance.now();
    document.addEventListener('visibilitychange', onVisibilityChange);
    startLoop();
  } catch (error) {
    console.warn('[PageThreeBackdrop] WebGL scene unavailable:', error);
    disposeScene();
  }
});

onBeforeUnmount(disposeScene);
</script>

<style scoped>
.page-three-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.page-three-backdrop--inline {
  position: absolute;
  z-index: 1;
}
</style>
