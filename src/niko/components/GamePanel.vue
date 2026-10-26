<template>
  <div v-if="visible" class="game-mask" @click="emit('close')">
    <div class="game-panel" @click.stop>
      <div class="game-panel-header">
        <span class="game-panel-title">游戏</span>
        <button class="game-panel-close" type="button" aria-label="关闭" @click="emit('close')">✕</button>
      </div>

      <!-- 推荐 Banner：有 recommend_game_info 时展示，点击直接进入 -->
      <div
        v-if="recommendGame && recommendGame.redirect_url"
        class="game-banner"
        @click="handleEnterUrl(recommendGame.redirect_url, recommendGame.game_title)"
      >
        <img
          v-if="resolveBannerImage(recommendGame)"
          class="game-banner-bg"
          :src="resolveBannerImage(recommendGame)"
          alt=""
          @error="hideBrokenBanner"
        />
        <div class="game-banner-fallback" v-else></div>
        <div class="game-banner-overlay">
          <span class="game-banner-tag">推荐</span>
          <div class="game-banner-info">
            <span class="game-banner-title">{{ recommendGame.game_title }}</span>
            <span class="game-banner-desc">{{ recommendGame.game_desc }}</span>
          </div>
          <span class="game-banner-enter">立即进入 →</span>
        </div>
      </div>

      <div class="game-grid">
        <div v-if="loading" class="game-hint">加载中...</div>
        <div v-else-if="!games.length" class="game-hint">暂无游戏</div>
        <div
          v-for="game in games"
          :key="game.game_id"
          class="game-cell"
          :class="{ active: String(selectedGameId) === String(game.game_id) }"
          @click="selectedGameId = game.game_id"
        >
          <img
            v-if="resolveGameIcon(game)"
            class="game-cell-icon"
            :src="resolveGameIcon(game)"
            alt=""
            @error="hideBrokenIcon"
          />
          <span v-else class="game-cell-icon game-cell-icon-empty">游</span>
          <span class="game-cell-name">{{ game.game_title }}</span>
          <span v-if="game.game_desc" class="game-cell-desc">{{ game.game_desc }}</span>
        </div>
      </div>

      <div class="game-panel-footer">
        <div class="game-selected">
          <img
            v-if="selectedGame && resolveGameIcon(selectedGame)"
            class="game-selected-icon"
            :src="resolveGameIcon(selectedGame)"
            alt=""
          />
          <span v-else class="game-selected-icon game-selected-icon-empty">游</span>
          <div class="game-selected-info">
            <span class="game-selected-name">
              {{ selectedGame ? selectedGame.game_title : '请选择游戏' }}
            </span>
            <span v-if="selectedGame?.game_desc" class="game-selected-desc">
              {{ selectedGame.game_desc }}
            </span>
          </div>
        </div>
        <button
          class="game-enter-btn"
          type="button"
          :disabled="!selectedGame || entering"
          @click="handleEnterSelected"
        >
          {{ entering ? '进入中...' : '进入游戏' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { TUIToast } from '@tencentcloud/uikit-base-component-vue3';
import { getGameList, type GameItem } from '../api/game';
import { resolveImageUrl } from '../config';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const games = ref<GameItem[]>([]);
const recommendGame = ref<GameItem | null>(null);
const selectedGameId = ref<string | number>('');
const loading = ref(false);
const entering = ref(false);

const selectedGame = computed(
  () => games.value.find((g) => String(g.game_id) === String(selectedGameId.value)) || null,
);

function resolveGameIcon(g: GameItem): string {
  return g.game_icon ? resolveImageUrl(g.game_icon) : '';
}
function resolveBannerImage(g: GameItem): string {
  return g.recommend_banner_image ? resolveImageUrl(g.recommend_banner_image) : '';
}

function hideBrokenIcon(event: Event) {
  const img = event.target as HTMLImageElement | null;
  if (img) {
    img.style.visibility = 'hidden';
  }
}
function hideBrokenBanner(event: Event) {
  const img = event.target as HTMLImageElement | null;
  if (img) {
    img.style.display = 'none';
  }
}

async function loadGames() {
  loading.value = true;
  selectedGameId.value = '';
  try {
    const data = await getGameList();
    games.value = data?.game_list ?? [];
    recommendGame.value = data?.recommend_game_info ?? null;
  } catch (error: any) {
    console.warn('[GamePanel] load games failed:', error?.message || error);
    games.value = [];
    recommendGame.value = null;
    TUIToast.error({ message: error?.message || '游戏列表加载失败' });
  } finally {
    loading.value = false;
  }
}

/** 通用：打开游戏 redirect_url（手机外形窗口，IPC: open-game-mobile） */
async function handleEnterUrl(url: string, title: string) {
  if (!url) {
    TUIToast.warning({ message: '该游戏暂不支持进入' });
    return;
  }
  entering.value = true;
  try {
    window.ipcRenderer?.send('open-game-mobile', { url, title });
    emit('close');
  } finally {
    entering.value = false;
  }
}

async function handleEnterSelected() {
  const game = selectedGame.value;
  if (!game) {
    TUIToast.warning({ message: '请选择游戏' });
    return;
  }
  await handleEnterUrl(game.redirect_url, game.game_title);
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      void loadGames();
    }
  },
);
</script>

<style lang="scss" scoped>
.game-mask {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.75rem;
  background: radial-gradient(120% 120% at 100% 50%, rgba(43, 127, 255, 0.16), rgba(0, 0, 0, 0.55));
  backdrop-filter: blur(2px);
}

.game-panel {
  width: 23.5rem;
  max-height: 88%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #fff;
  border-radius: 1rem;
  background: linear-gradient(180deg, #26232b 0%, #19181d 100%);
  border: 1px solid rgba(43, 127, 255, 0.28);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.02) inset;
}

.game-panel-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem 0.625rem;
  background: linear-gradient(90deg, rgba(43, 127, 255, 0.2), rgba(43, 127, 255, 0.08) 55%, transparent);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .game-panel-title {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.02em;

    &::before {
      content: '';
      width: 0.25rem;
      height: 1rem;
      border-radius: 2px;
      background: linear-gradient(180deg, #6db3ff, #2b7fff);
      box-shadow: 0 0 10px rgba(43, 127, 255, 0.55);
    }
  }

  .game-panel-close {
    width: 1.625rem;
    height: 1.625rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    background: rgba(255, 255, 255, 0.06);
    border: none;
    border-radius: 50%;
    font-size: 0.75rem;
    transition: background 0.15s ease, color 0.15s ease;

    &:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.14);
    }
  }
}

/* ==================== 推荐 Banner ==================== */
.game-banner {
  flex: none;
  position: relative;
  height: 5.5rem;
  margin: 0.625rem 1rem 0;
  border-radius: 0.75rem;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(43, 127, 255, 0.3);
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(43, 127, 255, 0.35);
  }

  .game-banner-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .game-banner-fallback {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #2b7fff, #1d4ed8);
  }

  .game-banner-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0 0.875rem;
    background: linear-gradient(90deg, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.25) 60%, rgba(0, 0, 0, 0.05) 100%);
  }

  .game-banner-tag {
    flex: none;
    padding: 0.125rem 0.5rem;
    font-size: 0.625rem;
    font-weight: 700;
    color: #fff;
    border-radius: 0.25rem;
    background: linear-gradient(135deg, #6db3ff, #2b7fff);
    box-shadow: 0 2px 6px rgba(43, 127, 255, 0.5);
  }

  .game-banner-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .game-banner-title {
    font-size: 0.875rem;
    font-weight: 700;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .game-banner-desc {
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.75);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .game-banner-enter {
    flex: none;
    padding: 0.25rem 0.625rem;
    font-size: 0.6875rem;
    font-weight: 600;
    color: #fff;
    border-radius: 0.875rem;
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(4px);
  }
}

/* ==================== 游戏列表 ==================== */
.game-grid {
  flex: 1;
  min-height: 6rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-content: start;
  gap: 0.5rem;
  padding: 0.625rem 1rem 0.75rem;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.18);
  }

  .game-hint {
    grid-column: 1 / -1;
    padding: 2.25rem 0;
    font-size: 0.75rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.4);
  }

  .game-cell {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.625rem 0.375rem;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 0.75rem;
    background: rgba(255, 255, 255, 0.035);
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.14);
      transform: translateY(-1px);
    }

    &.active {
      border-color: rgba(96, 165, 250, 0.85);
      background: linear-gradient(180deg, rgba(43, 127, 255, 0.22), rgba(43, 127, 255, 0.1));
      box-shadow: 0 6px 18px rgba(43, 127, 255, 0.25), 0 0 0 1px rgba(96, 165, 250, 0.35) inset;
    }
  }

  .game-cell-icon {
    width: 3rem;
    height: 3rem;
    object-fit: contain;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
  }

  .game-cell-icon-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
  }

  .game-cell-name {
    max-width: 100%;
    font-size: 0.75rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .game-cell-desc {
    max-width: 100%;
    font-size: 0.625rem;
    color: rgba(255, 255, 255, 0.45);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* ==================== 底部操作栏 ==================== */
.game-panel-footer {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(0, 0, 0, 0.18);

  .game-selected {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .game-selected-icon {
    flex: none;
    width: 2rem;
    height: 2rem;
    object-fit: contain;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.06);
  }

  .game-selected-icon-empty {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .game-selected-info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .game-selected-name {
    min-width: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .game-selected-desc {
    font-size: 0.625rem;
    color: rgba(255, 255, 255, 0.45);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .game-enter-btn {
    flex: none;
    height: 2rem;
    padding: 0 1.5rem;
    font-size: 0.8125rem;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    border: none;
    border-radius: 1rem;
    background: linear-gradient(135deg, #6db3ff, #2b7fff);
    box-shadow: 0 6px 16px rgba(43, 127, 255, 0.4);
    transition: filter 0.15s ease, transform 0.15s ease;

    &:hover:not(:disabled) {
      filter: brightness(1.08);
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
    }
  }
}
</style>
