<template>
  <canvas ref="canvasRef" class="modal-three-scene" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three/src/Three.js';

export type ModalThreeVariant = 'profile' | 'follow' | 'live' | 'rank';

const props = defineProps<{ variant: ModalThreeVariant }>();
const canvasRef = ref<HTMLCanvasElement | null>(null);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let sceneRoot: THREE.Group | null = null;
let resizeObserver: ResizeObserver | null = null;
let raf = 0;
let lastFrame = 0;
let startedAt = 0;
const updaters: ((time: number) => void)[] = [];
const pointerTarget = { x: 0, y: 0 };
const pointer = { x: 0, y: 0 };

function handlePointerMove(event: PointerEvent) {
  pointerTarget.x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
  pointerTarget.y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
}

function resetPointer() {
  pointerTarget.x = 0;
  pointerTarget.y = 0;
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

function solidMaterial(color: number, opacity: number, wireframe = false): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.32,
    metalness: 0.58,
    roughness: 0.26,
    transparent: true,
    opacity,
    wireframe,
    depthWrite: false,
  });
}

function addRing(parent: THREE.Group, radius: number, color: number, opacity: number, rotation: [number, number, number]): THREE.Mesh {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 6, 128), glowMaterial(color, opacity));
  ring.rotation.set(...rotation);
  parent.add(ring);
  return ring;
}

function createParticles(
  count: number,
  palette: number[],
  spread: [number, number, number],
  size: number,
  opacity: number,
): THREE.Points {
  let seed = 931 + count;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const colorObjects = palette.map((color) => new THREE.Color(color));
  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    positions[offset] = (random() - 0.5) * spread[0];
    positions[offset + 1] = (random() - 0.5) * spread[1];
    positions[offset + 2] = (random() - 0.5) * spread[2] - 1;
    const color = colorObjects[index % colorObjects.length];
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

function buildProfileScene(root: THREE.Group) {
  const core = new THREE.Group();
  core.position.set(0, 1.2, -0.5);
  core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 2), solidMaterial(0x6f72ff, 0.13)));
  core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 1), solidMaterial(0x9fdcff, 0.34, true)));

  const rings = [
    addRing(core, 0.9, 0x6bdfff, 0.4, [1.05, 0.15, 0.2]),
    addRing(core, 1.08, 0x8d72ff, 0.3, [0.42, 0.8, -0.4]),
    addRing(core, 1.25, 0xff87c8, 0.17, [1.35, -0.35, 0.55]),
  ];
  const nodeGeometry = new THREE.SphereGeometry(0.055, 12, 10);
  const nodeMaterial = glowMaterial(0xc4f5ff, 0.9);
  [0.1, 0.42, 0.76].forEach((progress, index) => {
    const angle = progress * Math.PI * 2;
    const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
    node.position.set(Math.cos(angle) * 0.9, Math.sin(angle) * 0.9, 0);
    node.scale.setScalar(index === 0 ? 1.4 : 0.85);
    rings[0].add(node);
  });
  root.add(core);

  const particles = createParticles(90, [0x6bdfff, 0x8d72ff, 0xff87c8], [7, 5, 4], 0.035, 0.52);
  root.add(particles);
  updaters.push((time) => {
    core.rotation.y = time * 0.16;
    core.rotation.x = Math.sin(time * 0.32) * 0.09;
    core.position.y = 1.2 + Math.sin(time * 0.8) * 0.045;
    rings[1].rotation.z = -0.4 - time * 0.12;
    rings[2].rotation.z = 0.55 + time * 0.08;
    particles.rotation.y = time * 0.018;
  });
}

function buildFollowScene(root: THREE.Group) {
  const constellation = new THREE.Group();
  const points = [
    [-3.1, 1.9, -1], [-1.45, 2.35, 0], [0.35, 1.55, -0.6], [2.35, 2.1, -1],
    [-2.55, 0.15, 0], [-0.55, 0.35, -0.8], [1.35, 0.15, 0], [3.05, -0.45, -1],
    [-1.8, -1.85, -1], [0.15, -1.45, 0], [2.15, -2.05, -0.5],
  ].map((point) => new THREE.Vector3(point[0], point[1], point[2]));
  const connections: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 5], [2, 6], [3, 6],
    [4, 5], [5, 6], [6, 7], [4, 8], [5, 9], [6, 9], [7, 10], [8, 9], [9, 10],
  ];
  const linePositions = new Float32Array(connections.length * 6);
  connections.forEach(([from, to], index) => {
    points[from].toArray(linePositions, index * 6);
    points[to].toArray(linePositions, index * 6 + 3);
  });
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  constellation.add(new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({
      color: 0x6f9fff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  ));

  const nodeGeometry = new THREE.IcosahedronGeometry(0.12, 1);
  const cyanMaterial = solidMaterial(0x62e6ed, 0.68);
  const violetMaterial = solidMaterial(0xa17cff, 0.62);
  const halos: THREE.Mesh[] = [];
  points.forEach((position, index) => {
    const node = new THREE.Mesh(nodeGeometry, index % 3 === 0 ? violetMaterial : cyanMaterial);
    node.position.copy(position);
    node.scale.setScalar(index % 4 === 0 ? 1.55 : 1);
    constellation.add(node);
    if (index % 3 === 0) {
      const halo = addRing(constellation, 0.26, index % 2 ? 0x62e6ed : 0xa17cff, 0.38, [0.5, 0.25, 0]);
      halo.position.copy(position);
      halos.push(halo);
    }
  });

  const pulses = [0, 5, 10, 15].map((connectionIndex, index) => {
    const [from, to] = connections[connectionIndex];
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 10, 8),
      glowMaterial(index % 2 ? 0xb490ff : 0x8fffff, 0.95),
    );
    constellation.add(mesh);
    return { mesh, from: points[from], to: points[to], offset: index * 0.23 };
  });
  root.add(constellation);
  const particles = createParticles(120, [0x62e6ed, 0x728fff, 0xa17cff], [10, 7, 5], 0.032, 0.42);
  root.add(particles);
  updaters.push((time) => {
    constellation.rotation.y = Math.sin(time * 0.16) * 0.12;
    constellation.rotation.x = Math.sin(time * 0.11) * 0.035;
    halos.forEach((halo, index) => {
      halo.rotation.z = time * (index % 2 ? -0.32 : 0.32);
      halo.scale.setScalar(1 + Math.sin(time * 1.2 + index) * 0.08);
    });
    pulses.forEach((pulse, index) => {
      const progress = (time * 0.11 + pulse.offset) % 1;
      pulse.mesh.position.lerpVectors(pulse.from, pulse.to, progress);
      pulse.mesh.scale.setScalar(0.8 + Math.sin(time * 2.4 + index) * 0.2);
    });
    particles.rotation.y = -time * 0.012;
  });
}

function buildLiveScene(root: THREE.Group) {
  const signal = new THREE.Group();
  const curves = [0, 1, 2].map((layer) => {
    const points = Array.from({ length: 11 }, (_, index) => {
      const x = -6 + index * 1.2;
      return new THREE.Vector3(x, Math.sin(index * 0.85 + layer * 1.4) * (0.42 + layer * 0.12), -0.6 - layer * 0.55);
    });
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    signal.add(new THREE.Mesh(
      new THREE.TubeGeometry(curve, 150, 0.012, 5, false),
      glowMaterial([0xff5f9e, 0x6fdcff, 0x9b7cff][layer], 0.32 - layer * 0.05),
    ));
    return curve;
  });

  const pulses = curves.map((curve, index) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 12, 10),
      glowMaterial([0xff9cc3, 0xa8f3ff, 0xc5b3ff][index], 0.95),
    );
    signal.add(mesh);
    return { mesh, curve, offset: index * 0.31 };
  });
  const core = new THREE.Group();
  core.position.set(3.7, 0, -1.2);
  core.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 1), solidMaterial(0xff6a9f, 0.18, true)));
  const coreRings = [
    addRing(core, 0.9, 0xff6a9f, 0.3, [0.9, 0.2, 0]),
    addRing(core, 1.18, 0x6fdcff, 0.2, [0.35, 0.9, 0.4]),
  ];
  signal.add(core);
  root.add(signal);
  const particles = createParticles(70, [0xff6a9f, 0x6fdcff, 0x9b7cff], [13, 3.2, 4], 0.04, 0.48);
  root.add(particles);
  updaters.push((time) => {
    signal.rotation.x = Math.sin(time * 0.22) * 0.055;
    core.rotation.y = time * 0.22;
    coreRings[0].rotation.z = time * 0.18;
    coreRings[1].rotation.z = -time * 0.13;
    pulses.forEach((pulse, index) => {
      const progress = (time * (0.055 + index * 0.012) + pulse.offset) % 1;
      pulse.mesh.position.copy(pulse.curve.getPointAt(progress));
      pulse.mesh.scale.setScalar(0.85 + Math.sin(time * 3 + index) * 0.2);
    });
    particles.position.x = Math.sin(time * 0.12) * 0.18;
  });
}

function buildRankScene(root: THREE.Group) {
  const trophy = new THREE.Group();
  trophy.position.set(0, 1.25, -0.8);
  trophy.scale.setScalar(0.78);
  const profile = [
    [0, -0.9], [0.42, -0.9], [0.45, -0.78], [0.16, -0.68], [0.13, -0.3],
    [0.36, -0.05], [0.5, 0.4], [0.45, 0.7], [0.38, 0.78], [0, 0.78],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  trophy.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 48), solidMaterial(0xffc861, 0.24)));
  trophy.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 24), solidMaterial(0xffe3a1, 0.22, true)));
  [-1, 1].forEach((side) => {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 8, 48), solidMaterial(0xffc861, 0.32));
    handle.position.set(side * 0.46, 0.35, 0);
    handle.scale.set(0.72, 1, 1);
    trophy.add(handle);
  });
  const rings = [
    addRing(trophy, 0.95, 0xffd479, 0.32, [1.15, 0.1, 0]),
    addRing(trophy, 1.2, 0xff7aa2, 0.18, [0.45, 0.85, -0.35]),
  ];
  root.add(trophy);

  const podium = new THREE.Group();
  [[-1.8, 0.65], [0, 1.05], [1.8, 0.48]].forEach(([x, height], index) => {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.62, height, 6, 1, true),
      solidMaterial(index === 1 ? 0xffc861 : 0xff7aa2, 0.07, true),
    );
    pillar.position.set(x, -2.15 + height / 2, -2);
    podium.add(pillar);
  });
  root.add(podium);
  const particles = createParticles(110, [0xffd479, 0xff9ebb, 0xfff0bd], [7, 6, 4], 0.04, 0.55);
  root.add(particles);
  updaters.push((time) => {
    trophy.rotation.y = time * 0.14;
    trophy.rotation.x = Math.sin(time * 0.3) * 0.035;
    trophy.position.y = 1.25 + Math.sin(time * 0.75) * 0.055;
    rings[0].rotation.z = time * 0.12;
    rings[1].rotation.z = -0.35 - time * 0.09;
    particles.rotation.y = time * 0.015;
  });
}

function resizeScene() {
  const canvas = canvasRef.value;
  if (!canvas || !renderer || !camera || !sceneRoot) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  const scale = THREE.MathUtils.clamp(Math.min(width / 620, height / 420), 0.72, 1.08);
  sceneRoot.scale.setScalar(scale);
  if (props.variant === 'live') {
    sceneRoot.scale.set(THREE.MathUtils.clamp(width / 760, 0.85, 1.5), 0.92, 1);
  }
}

function animateScene(now: number) {
  if (!renderer || !scene || !camera) return;
  raf = requestAnimationFrame(animateScene);
  if (now - lastFrame < 1000 / 30) return;
  lastFrame = now;
  const time = (now - startedAt) / 1000;
  updaters.forEach((update) => update(time));

  pointer.x += (pointerTarget.x - pointer.x) * 0.055;
  pointer.y += (pointerTarget.y - pointer.y) * 0.055;
  if (sceneRoot) {
    sceneRoot.rotation.y = pointer.x * 0.15;
    sceneRoot.rotation.x = -pointer.y * 0.1;
  }
  if (camera) {
    camera.position.x += (pointer.x * 0.32 - camera.position.x) * 0.05;
    camera.position.y += (-pointer.y * 0.2 - camera.position.y) * 0.05;
  }

  renderer.render(scene, camera);
}

function disposeScene() {
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('blur', resetPointer);
  if (scene) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse((object) => {
      const renderable = object as THREE.Object3D & {
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
      };
      if (renderable.geometry) geometries.add(renderable.geometry);
      if (Array.isArray(renderable.material)) {
        renderable.material.forEach((material) => materials.add(material));
      } else if (renderable.material) {
        materials.add(renderable.material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    scene.clear();
  }
  renderer?.dispose();
  renderer = null;
  scene = null;
  camera = null;
  sceneRoot = null;
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
    renderer.toneMappingExposure = 1.15;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    camera.position.set(0, 0, 8);
    sceneRoot = new THREE.Group();
    scene.add(sceneRoot);
    scene.add(new THREE.HemisphereLight(0xddeeff, 0x130b24, 1.5));
    const keyLight = new THREE.DirectionalLight(props.variant === 'rank' ? 0xffd79a : 0xb5d9ff, 2.2);
    keyLight.position.set(3, 5, 6);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(props.variant === 'live' ? 0xff5f9e : 0x8b6cff, 18, 20, 2);
    rimLight.position.set(-3, 1, 4);
    scene.add(rimLight);

    if (props.variant === 'profile') buildProfileScene(sceneRoot);
    if (props.variant === 'follow') buildFollowScene(sceneRoot);
    if (props.variant === 'live') buildLiveScene(sceneRoot);
    if (props.variant === 'rank') buildRankScene(sceneRoot);

    resizeObserver = new ResizeObserver(resizeScene);
    resizeObserver.observe(canvas);
    resizeScene();
    renderer.render(scene, camera);
    startedAt = performance.now();
    lastFrame = startedAt;
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('blur', resetPointer);
    raf = requestAnimationFrame(animateScene);
  } catch (error) {
    console.warn('[ModalThreeScene] WebGL scene unavailable:', error);
    disposeScene();
  }
});

onBeforeUnmount(disposeScene);
</script>

<style scoped>
.modal-three-scene {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
