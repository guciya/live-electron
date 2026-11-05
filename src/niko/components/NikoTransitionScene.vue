<template>
  <div
    class="niko-transition"
    :class="[`niko-transition--${variant}`, { 'is-fading': fadingOut }]"
  >
    <canvas ref="canvasEl" class="scene-canvas" aria-hidden="true"></canvas>
    <div class="scene-aurora" aria-hidden="true"></div>
    <div class="scene-noise" aria-hidden="true"></div>

    <header class="scene-header">
      <div class="scene-brand">
        <img src="../../assets/niko-logo.png" alt="Niko" />
        <div class="scene-brand-name">
          <strong>NIKO</strong>
          <span>LIVE STUDIO</span>
        </div>
      </div>
      <div class="scene-online">
        <i></i>
        <span>SYSTEM ONLINE</span>
      </div>
    </header>

    <main class="scene-main">
      <section class="scene-copy" aria-live="polite">
        <div class="scene-eyebrow">
          <span></span>
          {{ variant === 'welcome' ? 'WELCOME TO YOUR STAGE' : 'LIVE STUDIO INITIALIZING' }}
        </div>
        <h1 v-if="variant === 'welcome'">
          欢迎来到<br />
          <em>Niko 直播伴侣</em>
        </h1>
        <h1 v-else>
          直播工作台<br />
          <em>准备中</em>
        </h1>
        <p>{{ variant === 'welcome' ? '你的下一场高光直播，正在开启' : '正在连接画面、声音与直播信号' }}</p>
        <div class="scene-loading">
          <span class="scene-loading-spinner" aria-hidden="true"></span>
          <span>{{ variant === 'welcome' ? '正在进入直播中枢' : '正在准备你的直播舞台' }}</span>
          <span class="scene-loading-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        </div>
      </section>

      <div class="scene-core-label" aria-hidden="true">
        <span>LIVE</span>
        <small>{{ variant === 'welcome' ? 'BRAND READY' : 'BRAND ONLINE' }}</small>
      </div>
    </main>

    <footer class="scene-footer">
      <div class="scene-progress" aria-hidden="true"><span></span></div>
      <div class="scene-footer-meta">
        <span>{{ variant === 'welcome' ? 'IDENTITY VERIFIED' : 'AUDIO / VIDEO / SIGNAL' }}</span>
        <span class="scene-footer-status"><i></i> SECURE CONNECTION</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three/src/Three.js';

const props = withDefaults(defineProps<{
  variant?: 'welcome' | 'broadcast';
  fadingOut?: boolean;
}>(), {
  variant: 'welcome',
  fadingOut: false,
});

const canvasEl = ref<HTMLCanvasElement | null>(null);
let cleanupScene: (() => void) | null = null;

/**
 * 用 Canvas 生成「Niko 直播伴侣」立体字贴图。
 * 不依赖外部中文字体文件（TextGeometry 需要 typeface JSON，中文不可行），
 * 通过多层偏移绘制阴影 + 渐变正面模拟厚度，再贴到平面上做 3D 漂浮。
 */
function createBrandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  const text = 'Niko 直播伴侣';
  const fontOf = (size: number) => `700 ${size}px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let fontSize = 400;
  ctx.font = fontOf(fontSize);
  const maxWidth = canvas.width * 0.9;
  const measured = ctx.measureText(text).width;
  if (measured > maxWidth) {
    fontSize = Math.floor((fontSize * maxWidth) / measured);
    ctx.font = fontOf(fontSize);
  }

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // 厚度层：沿右下方向逐层堆叠，越靠后越暗，形成立体侧面
  const depth = 26;
  for (let i = depth; i >= 1; i -= 1) {
    const t = i / depth;
    ctx.fillStyle = `rgb(${Math.round(12 + t * 16)}, ${Math.round(28 + t * 50)}, ${Math.round(58 + t * 90)})`;
    ctx.fillText(text, cx + i * 2.6, cy + i * 2.1);
  }

  // 正面：冷白到冰蓝渐变 + 外发光
  const gradient = ctx.createLinearGradient(0, cy - fontSize * 0.5, 0, cy + fontSize * 0.5);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.55, '#e8f6ff');
  gradient.addColorStop(1, '#9fdcff');
  ctx.shadowColor = 'rgba(72, 200, 255, 0.85)';
  ctx.shadowBlur = 34;
  ctx.fillStyle = gradient;
  ctx.fillText(text, cx, cy);
  ctx.shadowBlur = 0;

  // 高光描边
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(190, 240, 255, 0.85)';
  ctx.strokeText(text, cx, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const primary = props.variant === 'welcome' ? 0x6688ff : 0x38cfff;
  const secondary = props.variant === 'welcome' ? 0xd36bff : 0x4878ff;
  const core = new THREE.Group();
  scene.add(core);

  const rings: Array<{ mesh: THREE.Mesh; speed: number; axis: 'x' | 'y' | 'z' }> = [];
  const ringConfigs = [
    { radius: 1.8, tube: 0.012, color: primary, opacity: 0.55, rotation: [1.08, 0.12, 0.15], speed: 0.18, axis: 'z' as const },
    { radius: 1.38, tube: 0.009, color: secondary, opacity: 0.5, rotation: [0.5, 0.85, 0.2], speed: -0.28, axis: 'y' as const },
    { radius: 0.96, tube: 0.014, color: 0x8eeeff, opacity: 0.72, rotation: [1.35, 0.1, 0.6], speed: 0.42, axis: 'z' as const },
  ];

  ringConfigs.forEach((config, index) => {
    const geometry = new THREE.TorusGeometry(config.radius, config.tube, 8, 180);
    const material = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: config.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
    core.add(ring);
    rings.push({ mesh: ring, speed: config.speed, axis: config.axis });

    const satellite = new THREE.Mesh(
      new THREE.SphereGeometry(index === 0 ? 0.055 : 0.035, 12, 12),
      new THREE.MeshBasicMaterial({ color: index === 1 ? secondary : 0xb8f6ff }),
    );
    satellite.position.set(config.radius, 0, 0);
    ring.add(satellite);
  });

  // 3D 品牌字「Niko 直播伴侣」：Canvas 立体贴图 + 多层平面制造真实厚度
  const brandTexture = createBrandTexture();
  const brandText = new THREE.Group();
  brandText.rotation.set(0.05, -0.12, 0);
  const brandWidth = 4.2;
  const brandHeight = brandWidth / 4;
  const brandDepth = 8;
  for (let i = brandDepth; i >= 1; i -= 1) {
    const backMaterial = new THREE.MeshBasicMaterial({
      map: brandTexture,
      color: new THREE.Color(0x16375f),
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const backMesh = new THREE.Mesh(new THREE.PlaneGeometry(brandWidth, brandHeight), backMaterial);
    backMesh.position.set(i * 0.02, -i * 0.016, -i * 0.02);
    brandText.add(backMesh);
  }
  const brandFace = new THREE.Mesh(
    new THREE.PlaneGeometry(brandWidth, brandHeight),
    new THREE.MeshBasicMaterial({
      map: brandTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  brandText.add(brandFace);
  core.add(brandText);

  const orbitCount = 240;
  const orbitPositions = new Float32Array(orbitCount * 3);
  for (let i = 0; i < orbitCount; i += 1) {
    const radius = 0.75 + Math.random() * 1.35;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    orbitPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    orbitPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    orbitPositions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const orbitGeometry = new THREE.BufferGeometry();
  orbitGeometry.setAttribute('position', new THREE.BufferAttribute(orbitPositions, 3));
  const orbitParticles = new THREE.Points(
    orbitGeometry,
    new THREE.PointsMaterial({
      color: 0xa4ddff,
      size: 0.026,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  core.add(orbitParticles);

  const starCount = 950;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const colorA = new THREE.Color(primary);
  const colorB = new THREE.Color(0xd8f4ff);
  for (let i = 0; i < starCount; i += 1) {
    starPositions[i * 3] = (Math.random() - 0.5) * 25;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 15;
    starPositions[i * 3 + 2] = -18 + Math.random() * 22;
    const color = colorA.clone().lerp(colorB, Math.random());
    starColors[i * 3] = color.r;
    starColors[i * 3 + 1] = color.g;
    starColors[i * 3 + 2] = color.b;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      size: 0.032,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(stars);

  const grid = new THREE.GridHelper(28, 36, primary, 0x183153);
  grid.position.set(0, -3.25, -4);
  const gridMaterial = grid.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.16;
  scene.add(grid);

  const pointer = { x: 0, y: 0 };
  const handlePointerMove = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('pointermove', handlePointerMove, { passive: true });

  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    if (width > 760) {
      core.position.set(2.35, 0.2, 0);
      brandText.scale.setScalar(1);
    } else {
      core.position.set(0, 1.45, -0.5);
      // 窄屏缩小字体，避免「Niko 直播伴侣」横向超出画面
      brandText.scale.setScalar(0.55);
    }
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const clock = new THREE.Clock();
  let elapsed = 0;
  let raf = 0;
  const animate = () => {
    const delta = Math.min(clock.getDelta(), 0.05);
    elapsed += delta;
    rings.forEach(({ mesh, speed, axis }) => {
      mesh.rotation[axis] += delta * speed;
    });
    // 字体轻微左右摆动 + 上下漂浮，保持正面可读
    brandText.rotation.y = -0.12 + Math.sin(elapsed * 0.55) * 0.14;
    brandText.rotation.x = 0.05 + Math.sin(elapsed * 0.38) * 0.035;
    brandText.position.y = Math.sin(elapsed * 1.4) * 0.05;
    orbitParticles.rotation.y += delta * 0.1;
    orbitParticles.rotation.z -= delta * 0.06;
    core.rotation.y += (pointer.x * 0.12 - core.rotation.y) * 0.025;
    core.rotation.x += (-pointer.y * 0.08 - core.rotation.x) * 0.025;
    camera.position.x += (pointer.x * 0.2 - camera.position.x) * 0.025;
    camera.position.y += (-pointer.y * 0.14 - camera.position.y) * 0.025;
    camera.lookAt(0, 0, 0);

    const positions = starGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < starCount; i += 1) {
      const zIndex = i * 3 + 2;
      positions[zIndex] += delta * 0.36;
      if (positions[zIndex] > 4) positions[zIndex] = -18;
    }
    starGeometry.attributes.position.needsUpdate = true;
    grid.position.z = -4 + (elapsed * 0.18) % 0.7;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  };
  animate();

  return () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    window.removeEventListener('pointermove', handlePointerMove);
    scene.traverse((object) => {
      const drawable = object as THREE.Mesh;
      drawable.geometry?.dispose?.();
      if (Array.isArray(drawable.material)) {
        drawable.material.forEach((material) => material.dispose());
      } else {
        drawable.material?.dispose?.();
      }
    });
    brandTexture.dispose();
    renderer.dispose();
  };
}

onMounted(() => {
  if (!canvasEl.value) return;
  try {
    cleanupScene = createScene(canvasEl.value);
  } catch (error) {
    console.error('[NikoTransitionScene] Three.js initialization failed:', error);
  }
});

onBeforeUnmount(() => {
  cleanupScene?.();
  cleanupScene = null;
});
</script>

<style lang="scss" scoped>
.niko-transition {
  --accent: #6f8cff;
  --accent-rgb: 111, 140, 255;
  --secondary: #d36bff;
  position: relative;
  width: 100vw;
  height: 100vh;
  min-height: 520px;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(circle at 72% 44%, rgba(var(--accent-rgb), 0.12), transparent 32%),
    radial-gradient(circle at 18% 18%, rgba(39, 82, 160, 0.13), transparent 38%),
    linear-gradient(135deg, #050916 0%, #070b19 48%, #03050d 100%);
  transition: opacity 0.3s ease;

  &.is-fading { opacity: 0; }
}

.niko-transition--broadcast {
  --accent: #48d7ff;
  --accent-rgb: 72, 215, 255;
  --secondary: #5d7cff;
}

.scene-canvas,
.scene-aurora,
.scene-noise {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.scene-aurora {
  background:
    linear-gradient(115deg, transparent 25%, rgba(var(--accent-rgb), 0.035) 48%, transparent 70%),
    radial-gradient(ellipse at 70% 100%, rgba(var(--accent-rgb), 0.09), transparent 48%);
  animation: aurora-shift 8s ease-in-out infinite alternate;
}

.scene-noise {
  opacity: 0.16;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.12'/%3E%3C/svg%3E");
  mix-blend-mode: soft-light;
}

.scene-header {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30px 42px;
  animation: scene-enter 0.8s ease-out both;
}

.scene-brand {
  display: flex;
  align-items: center;
  gap: 12px;

  img {
    width: 36px;
    height: 36px;
    border-radius: 11px;
    box-shadow: 0 0 24px rgba(var(--accent-rgb), 0.24);
  }
}

.scene-brand-name {
  display: flex;
  flex-direction: column;
  gap: 1px;

  strong { font-size: 17px; letter-spacing: 5px; line-height: 1.1; }
  span { color: rgba(210, 225, 255, 0.42); font-size: 8px; letter-spacing: 2.7px; }
}

.scene-online {
  display: flex;
  align-items: center;
  gap: 9px;
  color: rgba(211, 229, 255, 0.48);
  font: 9px/1 "SFMono-Regular", Consolas, monospace;
  letter-spacing: 2px;

  i,
  .scene-footer-status i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #65f5c2;
    box-shadow: 0 0 10px rgba(101, 245, 194, 0.8);
    animation: online-pulse 2s ease-in-out infinite;
  }
}

.scene-main { position: absolute; inset: 0; z-index: 1; }

.scene-copy {
  position: absolute;
  left: clamp(42px, 7vw, 96px);
  top: 48%;
  width: min(470px, 43vw);
  transform: translateY(-50%);
  animation: copy-enter 0.9s cubic-bezier(0.2, 0.75, 0.25, 1) 0.12s both;
}

.scene-eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 23px;
  color: var(--accent);
  font: 10px/1 "SFMono-Regular", Consolas, monospace;
  letter-spacing: 2.5px;

  span { width: 28px; height: 1px; background: var(--accent); box-shadow: 0 0 8px var(--accent); }
}

.scene-copy h1 {
  margin: 0;
  color: #f4f7ff;
  font-size: clamp(34px, 4.2vw, 58px);
  font-weight: 600;
  line-height: 1.28;
  letter-spacing: 1px;

  em {
    color: transparent;
    font-style: normal;
    background: linear-gradient(100deg, #fff 4%, var(--accent) 58%, var(--secondary));
    -webkit-background-clip: text;
    background-clip: text;
    filter: drop-shadow(0 0 22px rgba(var(--accent-rgb), 0.16));
  }
}

.scene-copy > p {
  margin: 22px 0 34px;
  color: rgba(215, 226, 248, 0.52);
  font-size: 14px;
  letter-spacing: 3px;
}

.scene-loading {
  display: flex;
  align-items: center;
  gap: 11px;
  color: rgba(229, 238, 255, 0.72);
  font-size: 12px;
  letter-spacing: 1px;
}

.scene-loading-spinner {
  width: 15px;
  height: 15px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: scene-spin 0.9s linear infinite;
}

.scene-loading-dots {
  display: flex;
  align-items: center;
  gap: 3px;

  i {
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: var(--accent);
    animation: dot-pulse 1.2s ease-in-out infinite;

    &:nth-child(2) { animation-delay: 0.16s; }
    &:nth-child(3) { animation-delay: 0.32s; }
  }
}

.scene-core-label {
  position: absolute;
  left: 73.5%;
  top: 47%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  transform: translate(-50%, 62px);
  color: rgba(255, 255, 255, 0.88);
  text-align: center;
  text-shadow: 0 0 18px rgba(var(--accent-rgb), 0.8);
  pointer-events: none;

  span { font-size: 17px; font-weight: 700; letter-spacing: 5px; padding-left: 5px; }
  small { color: rgba(210, 234, 255, 0.46); font: 6px/1 monospace; letter-spacing: 1.4px; white-space: nowrap; }
}

.scene-footer {
  position: absolute;
  z-index: 2;
  left: 42px;
  right: 42px;
  bottom: 32px;
  animation: scene-enter 0.8s ease-out 0.3s both;
}

.scene-progress {
  height: 1px;
  overflow: hidden;
  background: rgba(169, 197, 255, 0.09);

  span {
    display: block;
    width: 28%;
    height: 100%;
    background: linear-gradient(90deg, transparent, var(--accent), #fff, transparent);
    box-shadow: 0 0 10px var(--accent);
    animation: progress-travel 2.2s ease-in-out infinite;
  }
}

.scene-footer-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  color: rgba(196, 215, 246, 0.3);
  font: 8px/1 "SFMono-Regular", Consolas, monospace;
  letter-spacing: 2px;
}

.scene-footer-status { display: flex; align-items: center; gap: 8px; }
.scene-footer-status i { display: block; width: 4px; height: 4px; }

@keyframes scene-spin { to { transform: rotate(360deg); } }
@keyframes online-pulse { 50% { opacity: 0.35; box-shadow: 0 0 3px rgba(101, 245, 194, 0.3); } }
@keyframes dot-pulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
@keyframes aurora-shift { to { transform: translate3d(2%, -1%, 0) scale(1.05); opacity: 0.72; } }
@keyframes scene-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes copy-enter { from { opacity: 0; transform: translateY(calc(-50% + 20px)); } to { opacity: 1; transform: translateY(-50%); } }
@keyframes progress-travel { from { transform: translateX(-110%); } to { transform: translateX(460%); } }

@media (max-width: 760px) {
  .scene-header { padding: 24px; }
  .scene-online { display: none; }
  .scene-copy {
    left: 28px;
    right: 28px;
    top: auto;
    bottom: 112px;
    width: auto;
    transform: none;
    text-align: center;
    animation-name: mobile-copy-enter;
  }
  .scene-copy h1 { font-size: 34px; }
  .scene-copy > p { margin: 16px 0 22px; font-size: 12px; letter-spacing: 2px; }
  .scene-eyebrow, .scene-loading { justify-content: center; }
  .scene-core-label { left: 50%; top: 31%; }
  .scene-footer { left: 24px; right: 24px; bottom: 24px; }
  .scene-footer-meta { letter-spacing: 1px; }
  @keyframes mobile-copy-enter { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
}

@media (prefers-reduced-motion: reduce) {
  .scene-aurora,
  .scene-loading-spinner,
  .scene-loading-dots i,
  .scene-online i,
  .scene-footer-status i,
  .scene-progress span { animation: none; }
}
</style>
