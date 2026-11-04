<template>
  <div v-if="visible" class="msg-mask" @click="emit('close')">
    <div ref="msgPanelRef" class="msg-panel" @click.stop>
      <canvas ref="commsCanvasRef" class="msg-space-canvas" aria-hidden="true"></canvas>
      <!-- 头部 -->
      <div class="msg-head">
        <div class="msg-head-title">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20.5 11.5a7.5 7.5 0 0 1-11 6.7L4 20l1.6-4.4a7.5 7.5 0 1 1 14.9-4.1z" />
            <path d="M9 11h6M9 14.5h3.5" />
          </svg>
          <span>消息中心</span>
          <span v-if="totalUnread > 0" class="msg-head-unread">{{ totalUnread > 99 ? '99+' : totalUnread }}</span>
        </div>
        <button class="msg-close" type="button" aria-label="关闭" @click="emit('close')">✕</button>
      </div>

      <div class="msg-body">
        <!-- 左侧会话列表 -->
        <aside class="msg-side">
          <div v-if="convLoading && !conversations.length" class="msg-tip">加载中...</div>
          <div v-else-if="!conversations.length" class="msg-tip">暂无会话</div>
          <button
            v-for="conv in conversations"
            :key="conv.id"
            class="msg-conv"
            :class="{ active: currentId === conv.id }"
            type="button"
            @click="selectConv(conv)"
          >
            <span class="msg-conv-avatar-wrap">
              <img v-if="conv.avatar" class="msg-conv-avatar" :src="conv.avatar" alt="" />
              <span v-else class="msg-conv-avatar msg-conv-avatar-empty">{{ (conv.name || 'U').slice(0, 1).toUpperCase() }}</span>
            </span>
            <span class="msg-conv-main">
              <span class="msg-conv-name">{{ conv.name }}</span>
              <span class="msg-conv-last">{{ conv.lastText || '暂无消息' }}</span>
            </span>
            <span v-if="conv.unread > 0" class="msg-conv-unread">{{ conv.unread > 99 ? '99+' : conv.unread }}</span>
          </button>
        </aside>

        <!-- 右侧聊天区 -->
        <section class="msg-main">
          <div class="msg-main-head">
            <span class="msg-main-title">{{ currentConv?.name || '请选择会话' }}</span>
          </div>
          <div ref="msgScrollRef" class="msg-scroll">
            <div v-if="!currentId" class="msg-tip">点击左侧会话开始聊天</div>
            <div v-else-if="msgLoading && !messages.length" class="msg-tip">加载中...</div>
            <div v-else-if="!messages.length" class="msg-tip">暂无消息，快来发一条吧</div>
            <div
              v-for="m in messages"
              :key="m.id"
              class="msg-item"
              :class="{ self: m.isSelf }"
            >
              <span class="msg-item-avatar-wrap">
                <img v-if="m.avatar" class="msg-item-avatar" :src="m.avatar" alt="" />
                <span v-else class="msg-item-avatar msg-item-avatar-empty">{{ (m.nick || (m.isSelf ? '我' : 'TA')).slice(0, 1).toUpperCase() }}</span>
              </span>
              <div class="msg-item-main">
                <span class="msg-item-nick">{{ m.isSelf ? '我' : m.nick }}</span>
                <div class="msg-bubble">{{ m.text }}</div>
              </div>
            </div>
          </div>
          <div class="msg-input-row">
            <input
              v-model="draft"
              class="msg-input"
              type="text"
              :disabled="!currentId"
              :placeholder="currentId ? '输入消息，回车发送' : '请先选择会话'"
              @keyup.enter="send"
            />
            <button
              class="msg-send-btn"
              type="button"
              :disabled="!currentId || !draft.trim() || sending"
              @click="send"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span>发送</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import * as THREE from 'three/src/Three.js';
import { TUIChatEngine } from '@tencentcloud/chat-uikit-engine-lite';
import { TUILogin } from '@tencentcloud/tui-core-lite';
import { resolveImageUrl } from '../config';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

interface ConvItem {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  lastText: string;
  lastTime: number;
  unread: number;
}

interface MsgItem {
  id: string;
  isSelf: boolean;
  nick: string;
  avatar: string;
  text: string;
  time: number;
}

function getChat(): any {
  const chatFromLogin = (TUILogin as any).getContext?.()?.chat;
  const chat = chatFromLogin || (TUIChatEngine as any)?.chat;
  if (!chat) {
    throw new Error('IM 尚未登录');
  }
  return chat;
}

const conversations = ref<ConvItem[]>([]);
const currentId = ref('');
const messages = ref<MsgItem[]>([]);
const convLoading = ref(false);
const msgLoading = ref(false);
const sending = ref(false);
const draft = ref('');
const msgScrollRef = ref<HTMLElement | null>(null);

const currentConv = computed(() => conversations.value.find((c) => c.id === currentId.value));
const totalUnread = computed(() => conversations.value.reduce((sum, c) => sum + (c.unread || 0), 0));

const myUserId = computed(() => {
  try {
    const chat = getChat();
    return String(chat?.getMyUserID?.() || (TUIChatEngine as any)?.getMyUserID?.() || '');
  } catch {
    return '';
  }
});

function isC2C(raw: any): boolean {
  if (!raw) return false;
  const type = String(raw.type || '');
  const id = String(raw.conversationID || '');
  return type === 'C2C' || id.startsWith('C2C');
}

function mapConversation(raw: any): ConvItem | null {
  if (!raw || !isC2C(raw)) return null;
  const profile = raw.userProfile || {};
  const userId = String(profile.userID || String(raw.conversationID || '').replace(/^C2C/, ''));
  return {
    id: String(raw.conversationID || ''),
    userId,
    name: String(profile.nick || userId || '用户'),
    avatar: resolveImageUrl(String(profile.avatar || '')),
    lastText: String(raw.lastMessage?.messageForShow || ''),
    lastTime: Number(raw.lastMessage?.lastTime || 0) * 1000,
    unread: Number(raw.unreadCount || 0),
  };
}

async function loadConversations() {
  convLoading.value = true;
  try {
    const chat = getChat();
    const res = await chat.getConversationList();
    const list: any[] = res?.data?.conversationList || [];
    conversations.value = list
      .map(mapConversation)
      .filter((c): c is ConvItem => !!c);
  } catch (error) {
    console.warn('[MessageCenter] loadConversations failed:', error);
  } finally {
    convLoading.value = false;
  }
}

function mapMessage(raw: any): MsgItem | null {
  if (!raw) return null;
  const type = String(raw.type || '');
  if (type !== 'TIMTextElem') return null;
  const from = String(raw.from || '');
  return {
    id: String(raw.ID || `${raw.time}-${Math.random()}`),
    isSelf: from === myUserId.value,
    nick: String(raw.nick || from),
    avatar: resolveImageUrl(String(raw.avatar || '')),
    text: String(raw.payload?.text || ''),
    time: Number(raw.time || 0) * 1000,
  };
}

async function loadMessages() {
  if (!currentId.value) return;
  msgLoading.value = true;
  try {
    const chat = getChat();
    const res = await chat.getMessageList({ conversationID: currentId.value });
    const list: any[] = res?.data?.messageList || [];
    messages.value = list
      .map(mapMessage)
      .filter((m): m is MsgItem => !!m);
    scrollToBottom();
  } catch (error) {
    console.warn('[MessageCenter] loadMessages failed:', error);
  } finally {
    msgLoading.value = false;
  }
}

async function selectConv(conv: ConvItem) {
  if (currentId.value === conv.id) return;
  currentId.value = conv.id;
  messages.value = [];
  await loadMessages();
  try {
    await getChat().setMessageRead({ conversationID: conv.id });
    conv.unread = 0;
  } catch (error) {
    console.warn('[MessageCenter] setMessageRead failed:', error);
  }
}

async function send() {
  const text = draft.value.trim();
  if (!text || !currentId.value || sending.value) return;
  sending.value = true;
  try {
    const chat = getChat();
    const userId = currentId.value.replace(/^C2C/, '');
    const message = chat.createTextMessage({
      to: userId,
      conversationType: 'C2C',
      payload: { text },
    });
    const res = await chat.sendMessage(message);
    const sent = res?.data?.message || res?.data || {};
    messages.value.push({
      id: String(sent.ID || `${Date.now()}`),
      isSelf: true,
      nick: '我',
      avatar: '',
      text,
      time: Number(sent.time || 0) * 1000 || Date.now(),
    });
    draft.value = '';
    scrollToBottom();
  } catch (error) {
    console.warn('[MessageCenter] send failed:', error);
  } finally {
    sending.value = false;
  }
}

function onMessageReceived(event: any) {
  const list: any[] = event?.data || [];
  let needScroll = false;
  list.forEach((raw) => {
    const mapped = mapMessage(raw);
    if (!mapped) return;
    if (String(raw.conversationID || '') === currentId.value) {
      messages.value.push(mapped);
      needScroll = true;
    }
  });
  if (needScroll) scrollToBottom();
  // 任何会话有新消息都刷新会话列表（未读数 / 最新一条）
  loadConversations();
}

function onConversationUpdated() {
  loadConversations();
}

function scrollToBottom() {
  nextTick(() => {
    const el = msgScrollRef.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
}

interface FloatingBubble {
  group: THREE.Group;
  baseY: number;
  baseRotationX: number;
  baseRotationY: number;
  baseRotationZ: number;
  phase: number;
  speed: number;
}

interface OrbitLayer {
  group: THREE.Group;
  baseRotationZ: number;
  speed: number;
}

interface ParticleField {
  points: THREE.Points;
  speed: number;
}

interface SignalPacket {
  mesh: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  offset: number;
  speed: number;
}

const msgPanelRef = ref<HTMLElement | null>(null);
const commsCanvasRef = ref<HTMLCanvasElement | null>(null);
const commsPointer = new THREE.Vector2();
const commsPointerTarget = new THREE.Vector2();
const commsPacketPosition = new THREE.Vector3();
const commsBubbles: FloatingBubble[] = [];
const commsOrbits: OrbitLayer[] = [];
const commsParticleFields: ParticleField[] = [];
const commsPackets: SignalPacket[] = [];
let commsRenderer: THREE.WebGLRenderer | null = null;
let commsScene: THREE.Scene | null = null;
let commsCamera: THREE.PerspectiveCamera | null = null;
let commsRoot: THREE.Group | null = null;
let commsPanelElement: HTMLElement | null = null;
let commsResizeObserver: ResizeObserver | null = null;
let commsRaf = 0;
let commsLastFrame = 0;
let commsStartedAt = 0;

function createRoundedBubble(width: number, height: number, color: number, accent: number): THREE.Group {
  const group = new THREE.Group();
  const radius = Math.min(width, height) * 0.2;
  const left = -width / 2;
  const right = width / 2;
  const bottom = -height / 2;
  const top = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(left + radius, bottom);
  shape.lineTo(right - radius, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom + radius);
  shape.lineTo(right, top - radius);
  shape.quadraticCurveTo(right, top, right - radius, top);
  shape.lineTo(left + radius, top);
  shape.quadraticCurveTo(left, top, left, top - radius);
  shape.lineTo(left, bottom + radius);
  shape.quadraticCurveTo(left, bottom, left + radius, bottom);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.065,
    bevelThickness: 0.065,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -0.11);
  const glass = new THREE.MeshPhysicalMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.13,
    metalness: 0.08,
    roughness: 0.17,
    transmission: 0.38,
    thickness: 0.7,
    transparent: true,
    opacity: 0.8,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    depthWrite: false,
  });
  const bubble = new THREE.Mesh(geometry, glass);
  group.add(bubble);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 3), glass);
  tail.position.set(left + width * 0.25, bottom - 0.2, 0);
  tail.rotation.z = Math.PI;
  tail.scale.z = 0.35;
  group.add(tail);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 24),
    new THREE.LineBasicMaterial({
      color: 0xffd8f1,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  group.add(edges);

  [0.54, 0.38, 0.46].forEach((ratio, index) => {
    const lineWidth = width * ratio;
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(lineWidth, 0.065, 0.025),
      new THREE.MeshBasicMaterial({
        color: index === 1 ? accent : 0xffe8f7,
        transparent: true,
        opacity: index === 1 ? 0.72 : 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    line.position.set(left + width * 0.18 + lineWidth / 2, top - height * 0.3 - index * height * 0.2, 0.25);
    group.add(line);
  });
  return group;
}

function addFloatingBubble(
  width: number,
  height: number,
  color: number,
  accent: number,
  position: [number, number, number],
  rotation: [number, number, number],
  phase: number,
  speed: number,
) {
  if (!commsRoot) return;
  const group = createRoundedBubble(width, height, color, accent);
  group.position.set(...position);
  group.rotation.set(...rotation);
  commsRoot.add(group);
  commsBubbles.push({
    group,
    baseY: position[1],
    baseRotationX: rotation[0],
    baseRotationY: rotation[1],
    baseRotationZ: rotation[2],
    phase,
    speed,
  });
}

function addOrbit(radius: number, color: number, rotation: [number, number, number], speed: number, opacity: number) {
  if (!commsRoot) return;
  const group = new THREE.Group();
  group.rotation.set(...rotation);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.015, 6, 180),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  group.add(ring);

  const nodeGeometry = new THREE.SphereGeometry(0.075, 12, 10);
  const nodeMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  [0.15, 0.48, 0.78].forEach((progress, index) => {
    const angle = progress * Math.PI * 2;
    const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
    const size = index === 0 ? 1.35 : 0.8;
    node.scale.setScalar(size);
    node.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    group.add(node);
  });
  commsRoot.add(group);
  commsOrbits.push({ group, baseRotationZ: rotation[2], speed });
}

function createParticleField(count: number, size: number, opacity: number, seedValue: number): THREE.Points {
  let seed = seedValue;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color(0xff73ae), new THREE.Color(0xa981ff), new THREE.Color(0x63e6ef)];
  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    positions[offset] = (random() - 0.5) * 13;
    positions[offset + 1] = (random() - 0.5) * 9;
    positions[offset + 2] = (random() - 0.5) * 7 - 1;
    const color = palette[index % palette.length];
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
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
}

function addSignalConnection(points: THREE.Vector3[], color: number, offset: number, speed: number) {
  if (!commsRoot) return;
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 72, 0.012, 5, false),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  commsRoot.add(tube);
  const packet = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 10),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  commsRoot.add(packet);
  commsPackets.push({ mesh: packet, curve, offset, speed });
}

function resizeCommunicationScene() {
  if (!commsRenderer || !commsCamera || !commsPanelElement) return;
  const width = commsPanelElement.clientWidth;
  const height = commsPanelElement.clientHeight;
  if (!width || !height) return;
  commsRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  commsRenderer.setSize(width, height, false);
  commsCamera.aspect = width / height;
  commsCamera.updateProjectionMatrix();
  if (commsRoot) {
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(commsCamera.fov / 2)) * commsCamera.position.z;
    const visibleWidth = visibleHeight * commsCamera.aspect;
    const scale = THREE.MathUtils.clamp(Math.min(width / 1000, height / 700), 0.68, 1.05);
    commsRoot.scale.setScalar(scale);
    commsRoot.position.set(visibleWidth * 0.16, -visibleHeight * 0.025, 0);
  }
}

function onCommsPointerMove(event: PointerEvent) {
  if (!commsPanelElement) return;
  const rect = commsPanelElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  commsPointerTarget.set(
    ((event.clientX - rect.left) / rect.width - 0.5) * 2,
    -((event.clientY - rect.top) / rect.height - 0.5) * 2,
  );
}

function onCommsPointerLeave() {
  commsPointerTarget.set(0, 0);
}

function animateCommunicationScene(now: number) {
  commsRaf = 0;
  if (!props.visible || !commsRenderer || !commsScene || !commsCamera || !commsRoot) return;
  commsRaf = requestAnimationFrame(animateCommunicationScene);
  const frameInterval = 1000 / 30;
  const elapsed = now - commsLastFrame;
  if (elapsed < frameInterval) return;
  commsLastFrame = now - (elapsed % frameInterval);
  const time = (now - commsStartedAt) / 1000;

  commsPointer.lerp(commsPointerTarget, 0.08);
  commsRoot.rotation.y = commsPointer.x * 0.11 + Math.sin(time * 0.16) * 0.025;
  commsRoot.rotation.x = -commsPointer.y * 0.065 + Math.sin(time * 0.13) * 0.015;
  commsBubbles.forEach((bubble) => {
    bubble.group.position.y = bubble.baseY + Math.sin(time * bubble.speed + bubble.phase) * 0.16;
    bubble.group.rotation.x = bubble.baseRotationX + Math.sin(time * 0.42 + bubble.phase) * 0.035;
    bubble.group.rotation.y = bubble.baseRotationY + Math.sin(time * 0.35 + bubble.phase) * 0.075;
    bubble.group.rotation.z = bubble.baseRotationZ + Math.sin(time * 0.5 + bubble.phase) * 0.025;
  });
  commsOrbits.forEach((orbit) => {
    orbit.group.rotation.z = orbit.baseRotationZ + time * orbit.speed;
  });
  commsParticleFields.forEach((field, index) => {
    field.points.rotation.y = time * field.speed;
    field.points.rotation.x = Math.sin(time * 0.1 + index) * 0.045;
  });
  commsPackets.forEach((packet, index) => {
    const progress = (time * packet.speed + packet.offset) % 1;
    packet.mesh.position.copy(packet.curve.getPointAt(progress, commsPacketPosition));
    packet.mesh.scale.setScalar(0.85 + Math.sin(time * 3 + index) * 0.18);
  });
  commsRenderer.render(commsScene, commsCamera);
}

function disposeCommunicationScene() {
  if (commsRaf) {
    cancelAnimationFrame(commsRaf);
    commsRaf = 0;
  }
  commsResizeObserver?.disconnect();
  commsResizeObserver = null;
  window.removeEventListener('resize', resizeCommunicationScene);
  if (commsPanelElement) {
    commsPanelElement.removeEventListener('pointermove', onCommsPointerMove);
    commsPanelElement.removeEventListener('pointerleave', onCommsPointerLeave);
  }
  commsPanelElement = null;

  if (commsScene) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    commsScene.traverse((object) => {
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
    commsScene.clear();
  }
  commsRenderer?.dispose();
  commsRenderer = null;
  commsScene = null;
  commsCamera = null;
  commsRoot = null;
  commsBubbles.length = 0;
  commsOrbits.length = 0;
  commsParticleFields.length = 0;
  commsPackets.length = 0;
  commsPointer.set(0, 0);
  commsPointerTarget.set(0, 0);
}

function initCommunicationScene() {
  if (commsRenderer || !props.visible) return;
  const canvas = commsCanvasRef.value;
  const panel = msgPanelRef.value;
  if (!canvas || !panel) return;
  try {
    commsRenderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    commsRenderer.setClearColor(0x000000, 0);
    commsRenderer.outputColorSpace = THREE.SRGBColorSpace;
    commsRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    commsRenderer.toneMappingExposure = 1.2;
    commsScene = new THREE.Scene();
    commsCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    commsCamera.position.set(0, 0, 16);
    commsRoot = new THREE.Group();
    commsScene.add(commsRoot);
    commsPanelElement = panel;

    commsScene.add(new THREE.HemisphereLight(0xffe5f5, 0x140a28, 1.55));
    const keyLight = new THREE.DirectionalLight(0xffb4d5, 2.4);
    keyLight.position.set(3, 5, 7);
    commsScene.add(keyLight);
    const purpleLight = new THREE.PointLight(0x925cff, 30, 20, 2);
    purpleLight.position.set(-3, -1, 5);
    commsScene.add(purpleLight);
    const cyanLight = new THREE.PointLight(0x62e8f2, 20, 16, 2);
    cyanLight.position.set(5, 2, 2);
    commsScene.add(cyanLight);

    addFloatingBubble(3.5, 1.9, 0xb45b9e, 0x7ee8f1, [0.35, 0.25, 0.2], [-0.08, -0.24, -0.04], 0, 0.72);
    addFloatingBubble(2.15, 1.15, 0x6954ad, 0xff9cc9, [-2.15, 2.05, -1.1], [0.12, 0.34, -0.12], 1.8, 0.58);
    addFloatingBubble(2.3, 1.2, 0x9b4e87, 0xbca0ff, [2.35, -1.85, -0.8], [-0.14, -0.38, 0.1], 3.6, 0.64);

    addOrbit(4.15, 0xff6fae, [1.08, 0.18, 0.15], 0.055, 0.32);
    addOrbit(3.55, 0x9c78ff, [0.55, 0.85, -0.35], -0.075, 0.28);
    addOrbit(4.5, 0x62e6ed, [1.45, -0.42, 0.5], 0.038, 0.16);

    addSignalConnection([
      new THREE.Vector3(-2.2, 1.65, -0.7),
      new THREE.Vector3(-1.8, 0.5, 0.8),
      new THREE.Vector3(-0.9, -0.3, 0.7),
      new THREE.Vector3(-0.45, -0.25, 0.35),
    ], 0xff75b4, 0.1, 0.09);
    addSignalConnection([
      new THREE.Vector3(1.25, -0.35, 0.2),
      new THREE.Vector3(2.4, -0.2, 1),
      new THREE.Vector3(3.1, -0.9, 0.25),
      new THREE.Vector3(2.6, -1.45, -0.45),
    ], 0x9f83ff, 0.55, 0.075);
    addSignalConnection([
      new THREE.Vector3(-1.5, 1.75, -1),
      new THREE.Vector3(0.2, 3.1, -1.8),
      new THREE.Vector3(3.5, 1.25, -1.4),
      new THREE.Vector3(2.85, -1.45, -0.7),
    ], 0x62e6ed, 0.78, 0.055);

    const fineParticles = createParticleField(150, 0.045, 0.68, 741);
    const glowParticles = createParticleField(34, 0.09, 0.5, 1931);
    commsRoot.add(fineParticles, glowParticles);
    commsParticleFields.push(
      { points: fineParticles, speed: 0.018 },
      { points: glowParticles, speed: -0.026 },
    );

    panel.addEventListener('pointermove', onCommsPointerMove, { passive: true });
    panel.addEventListener('pointerleave', onCommsPointerLeave, { passive: true });
    window.addEventListener('resize', resizeCommunicationScene, { passive: true });
    commsResizeObserver = new ResizeObserver(() => resizeCommunicationScene());
    commsResizeObserver.observe(panel);
    resizeCommunicationScene();
    commsRenderer.render(commsScene, commsCamera);
    commsStartedAt = performance.now();
    commsLastFrame = commsStartedAt;
    commsRaf = requestAnimationFrame(animateCommunicationScene);
  } catch (error) {
    console.warn('[MessageCenter] communication scene unavailable:', error);
    disposeCommunicationScene();
  }
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      disposeCommunicationScene();
      return;
    }
    await nextTick();
    if (props.visible) initCommunicationScene();
  },
  { flush: 'post', immediate: true },
);

onBeforeUnmount(disposeCommunicationScene);

watch(() => props.visible, async (visible) => {
  if (visible) {
    try {
      const chat = getChat();
      chat.on('onMessageReceived', onMessageReceived);
      chat.on('onConversationListUpdated', onConversationUpdated);
    } catch (error) {
      console.warn('[MessageCenter] chat not ready:', error);
    }
    conversations.value = [];
    currentId.value = '';
    messages.value = [];
    draft.value = '';
    await loadConversations();
    const first = conversations.value[0];
    if (first) {
      await selectConv(first);
    }
  } else {
    try {
      const chat = getChat();
      chat.off('onMessageReceived', onMessageReceived);
      chat.off('onConversationListUpdated', onConversationUpdated);
    } catch {
      // ignore
    }
    currentId.value = '';
    messages.value = [];
    draft.value = '';
  }
});
</script>

<style lang="scss" scoped>
.msg-mask {
  position: absolute;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 68% 42%, rgba(126, 66, 153, 0.2), transparent 42%),
    rgba(5, 3, 14, 0.7);
  backdrop-filter: blur(9px) saturate(125%);
  animation: msgMaskIn 0.24s ease-out both;
}

.msg-panel {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  width: 64rem;
  height: 44rem;
  max-width: 94vw;
  max-height: 92vh;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(circle at 74% 42%, rgba(116, 67, 180, 0.18), transparent 43%),
    radial-gradient(circle at 88% 78%, rgba(255, 77, 148, 0.1), transparent 38%),
    linear-gradient(135deg, rgba(29, 19, 45, 0.94), rgba(10, 9, 24, 0.97));
  border: 1px solid rgba(255, 187, 224, 0.18);
  border-radius: 1.25rem;
  box-shadow:
    0 30px 100px rgba(0, 0, 0, 0.62),
    0 0 60px rgba(176, 73, 160, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(24px) saturate(135%);
  animation: msgPanelIn 0.46s cubic-bezier(0.16, 1, 0.3, 1) both;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    border-radius: inherit;
    background:
      linear-gradient(115deg, rgba(255, 255, 255, 0.075), transparent 20%, transparent 76%, rgba(170, 119, 255, 0.035)),
      linear-gradient(180deg, rgba(255, 179, 218, 0.025), transparent 30%);
  }
}

.msg-space-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.92;
}

.msg-head {
  position: relative;
  z-index: 2;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1.2rem;
  background: linear-gradient(180deg, rgba(28, 19, 45, 0.74), rgba(20, 15, 36, 0.5));
  border-bottom: 1px solid rgba(255, 194, 226, 0.1);
  backdrop-filter: blur(18px);
}

.msg-head-title {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  color: #ffc0dc;
  text-shadow: 0 0 20px rgba(255, 100, 169, 0.25);

  svg {
    filter: drop-shadow(0 0 7px rgba(255, 105, 174, 0.45));
  }
}

.msg-head-unread {
  min-width: 1.2rem;
  height: 1.2rem;
  padding: 0 0.4rem;
  line-height: 1.2rem;
  font-size: 0.6875rem;
  text-align: center;
  color: #fff;
  background: linear-gradient(135deg, #ff6ba7, #e43f91);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  box-shadow: 0 0 16px rgba(255, 64, 143, 0.32);
}

.msg-close {
  width: 1.9rem;
  height: 1.9rem;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 0.6rem;
  color: rgba(255, 235, 247, 0.62);
  background: rgba(255, 255, 255, 0.035);
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.2s, background 0.2s, border-color 0.2s, transform 0.25s;

  &:hover {
    color: #fff;
    background: rgba(255, 102, 166, 0.15);
    border-color: rgba(255, 151, 197, 0.28);
    transform: rotate(90deg);
  }
}

.msg-body {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  min-height: 0;
}

.msg-side {
  flex: none;
  width: 18rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  overflow-y: auto;
  padding: 0.65rem;
  background: linear-gradient(105deg, rgba(12, 10, 27, 0.8), rgba(21, 14, 37, 0.57));
  border-right: 1px solid rgba(231, 190, 255, 0.1);
  backdrop-filter: blur(20px) saturate(125%);
  scrollbar-width: thin;
  scrollbar-color: rgba(219, 147, 209, 0.25) transparent;
}

.msg-conv {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.7rem 0.75rem;
  overflow: hidden;
  color: inherit;
  font: inherit;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0.85rem;
  cursor: pointer;
  transition: transform 0.22s, background 0.22s, border-color 0.22s, box-shadow 0.22s;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 28%;
    width: 0.16rem;
    height: 44%;
    background: linear-gradient(180deg, #ff9bc6, #a272ff);
    border-radius: 999px;
    box-shadow: 0 0 12px rgba(255, 108, 177, 0.55);
    opacity: 0;
    transform: scaleY(0.4);
    transition: opacity 0.2s, transform 0.25s;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.045);
    border-color: rgba(255, 255, 255, 0.06);
    transform: translateX(3px);
  }

  &.active {
    background: linear-gradient(105deg, rgba(255, 102, 166, 0.17), rgba(132, 91, 210, 0.12));
    border-color: rgba(255, 160, 204, 0.22);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      0 8px 24px rgba(8, 4, 20, 0.2);

    &::before {
      opacity: 1;
      transform: scaleY(1);
    }

    .msg-conv-avatar-wrap {
      box-shadow: 0 0 0 2px rgba(255, 142, 192, 0.45), 0 0 18px rgba(255, 91, 162, 0.2);
    }

    .msg-conv-name {
      color: #ffe4f1;
    }
  }
}

.msg-conv-avatar-wrap {
  flex: none;
  display: inline-flex;
  border-radius: 50%;
  transition: box-shadow 0.25s, transform 0.25s;
}

.msg-conv:hover .msg-conv-avatar-wrap {
  transform: scale(1.04);
}

.msg-conv-avatar {
  display: block;
  width: 2.55rem;
  height: 2.55rem;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 50%;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.msg-conv-avatar-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #7858d8, #ef6ca7);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
}

.msg-conv-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}

.msg-conv-name {
  overflow: hidden;
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  text-overflow: ellipsis;
  transition: color 0.2s;
}

.msg-conv-last {
  overflow: hidden;
  font-size: 0.6875rem;
  color: rgba(235, 218, 244, 0.43);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.msg-conv-unread {
  flex: none;
  min-width: 1.2rem;
  height: 1.2rem;
  padding: 0 0.35rem;
  line-height: 1.2rem;
  font-size: 0.6875rem;
  text-align: center;
  color: #fff;
  background: linear-gradient(135deg, #ff6ca9, #d9479c);
  border-radius: 999px;
  box-shadow: 0 0 14px rgba(255, 70, 151, 0.26);
}

.msg-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(17, 12, 34, 0.06), rgba(8, 8, 23, 0.16));
}

.msg-main-head {
  flex: none;
  padding: 0.85rem 1.25rem;
  background: rgba(20, 14, 36, 0.4);
  border-bottom: 1px solid rgba(229, 192, 255, 0.08);
  backdrop-filter: blur(12px);
}

.msg-main-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.015em;
  color: rgba(255, 244, 252, 0.92);
  text-shadow: 0 1px 8px rgba(7, 3, 18, 0.7);

  &::before {
    content: '';
    width: 0.4rem;
    height: 0.4rem;
    background: #7de7e8;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(91, 229, 234, 0.65);
  }
}

.msg-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.15rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  background: linear-gradient(90deg, rgba(11, 9, 26, 0.24), rgba(11, 9, 26, 0.025) 48%, rgba(11, 9, 26, 0.1));
  scrollbar-width: thin;
  scrollbar-color: rgba(219, 147, 209, 0.26) transparent;
}

.msg-tip {
  padding: 2rem 1rem;
  font-size: 0.8125rem;
  text-align: center;
  color: rgba(239, 221, 247, 0.48);
  text-shadow: 0 1px 8px rgba(5, 3, 15, 0.9);
}

.msg-item {
  display: flex;
  gap: 0.65rem;
  transform-origin: left center;
  animation: msgBubbleIn 0.36s cubic-bezier(0.16, 1, 0.3, 1) both;

  &.self {
    flex-direction: row-reverse;
    transform-origin: right center;

    .msg-item-main {
      align-items: flex-end;
    }

    .msg-bubble {
      color: #fff;
      background: linear-gradient(135deg, rgba(244, 100, 160, 0.9), rgba(139, 82, 198, 0.9));
      border-color: rgba(255, 190, 222, 0.3);
      border-radius: 0.95rem 0.28rem 0.95rem 0.95rem;
      box-shadow:
        0 9px 28px rgba(211, 64, 143, 0.18),
        inset 0 1px 0 rgba(255, 255, 255, 0.22);
    }
  }
}

.msg-item-avatar-wrap {
  flex: none;
}

.msg-item-avatar {
  display: block;
  width: 2.1rem;
  height: 2.1rem;
  border: 1px solid rgba(255, 205, 233, 0.18);
  border-radius: 50%;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 14px rgba(6, 3, 16, 0.28);
}

.msg-item-avatar-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #7858d8, #ed71ab);
}

.msg-item-main {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  max-width: 70%;
}

.msg-item-nick {
  font-size: 0.6875rem;
  color: rgba(237, 217, 246, 0.5);
  text-shadow: 0 1px 6px rgba(5, 3, 15, 0.9);
}

.msg-bubble {
  padding: 0.6rem 0.85rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: rgba(255, 250, 255, 0.94);
  background: linear-gradient(135deg, rgba(64, 47, 84, 0.82), rgba(30, 26, 51, 0.8));
  border: 1px solid rgba(222, 190, 255, 0.16);
  border-radius: 0.28rem 0.95rem 0.95rem 0.95rem;
  box-shadow:
    0 8px 26px rgba(5, 3, 15, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px) saturate(135%);
  word-break: break-word;
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: rgba(255, 190, 226, 0.25);
    box-shadow:
      0 11px 30px rgba(5, 3, 15, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.11);
    transform: translateY(-1px);
  }
}

.msg-input-row {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.9rem 1.1rem;
  background: linear-gradient(180deg, rgba(16, 12, 31, 0.72), rgba(12, 10, 26, 0.88));
  border-top: 1px solid rgba(242, 190, 226, 0.1);
  backdrop-filter: blur(22px) saturate(130%);
}

.msg-input {
  flex: 1;
  min-width: 0;
  height: 2.5rem;
  padding: 0 0.95rem;
  font-size: 0.8125rem;
  color: rgba(255, 250, 255, 0.95);
  caret-color: #ff8fbd;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(228, 196, 255, 0.13);
  border-radius: 0.75rem;
  outline: none;
  box-shadow: inset 0 1px 5px rgba(4, 2, 12, 0.14);
  transition: border-color 0.22s, background 0.22s, box-shadow 0.22s;

  &::placeholder {
    color: rgba(232, 215, 241, 0.34);
  }

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(236, 190, 226, 0.2);
  }

  &:focus {
    background: rgba(255, 255, 255, 0.075);
    border-color: rgba(255, 128, 182, 0.58);
    box-shadow: 0 0 0 3px rgba(255, 100, 167, 0.09), 0 0 22px rgba(179, 77, 167, 0.08);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.msg-send-btn {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  height: 2.5rem;
  padding: 0 1.15rem;
  overflow: hidden;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #fff;
  background: linear-gradient(125deg, #f568a4, #c453b1 56%, #8b67db);
  border: 1px solid rgba(255, 207, 232, 0.24);
  border-radius: 0.75rem;
  box-shadow:
    0 8px 24px rgba(224, 70, 151, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.22s, opacity 0.2s;

  &::before {
    content: '';
    position: absolute;
    top: -60%;
    left: -65%;
    width: 42%;
    height: 220%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
    transform: rotate(20deg);
    transition: left 0.55s ease;
  }

  svg,
  span {
    position: relative;
    z-index: 1;
  }

  &:hover:not(:disabled) {
    box-shadow:
      0 11px 30px rgba(231, 74, 158, 0.34),
      0 0 20px rgba(148, 100, 224, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);

    &::before {
      left: 125%;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(0.97);
  }

  &:disabled {
    opacity: 0.35;
    box-shadow: none;
    cursor: not-allowed;
  }
}

@keyframes msgMaskIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes msgPanelIn {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.975);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes msgBubbleIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 52rem) {
  .msg-side {
    width: 14rem;
    padding: 0.5rem;
  }

  .msg-conv {
    padding: 0.65rem;
  }

  .msg-scroll {
    padding: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .msg-mask,
  .msg-panel,
  .msg-item,
  .msg-mask *,
  .msg-mask *::before,
  .msg-mask *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
