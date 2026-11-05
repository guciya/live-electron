<template>
  <div ref="hostRef" class="pk-status-svga" aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Parser, Player } from 'svgaplayerweb';
import startSvga from '../assets/role/pk_kaishi.svga';
import drawSvga from '../assets/role/pk_pingju.svga';
import winSvga from '../assets/role/pk_shengli.svga';
import loseSvga from '../assets/role/pk_shiabaisvga';

type PkStatusType = 'start' | 'draw' | 'win' | 'lose';

/** PK 状态动画：点击 PK 后的开始 / 平局 / 胜利 / 失败 */
const props = defineProps<{ type: PkStatusType }>();
const emit = defineEmits<{ (e: 'ended'): void }>();

const SVGA_SOURCES: Record<PkStatusType, string> = {
  start: startSvga,
  draw: drawSvga,
  win: winSvga,
  lose: loseSvga,
};

const hostRef = ref<HTMLDivElement | null>(null);
let player: Player | null = null;

onMounted(() => {
  const host = hostRef.value;
  if (!host) {
    emit('ended');
    return;
  }
  player = new Player(host);
  player.loops = 1;
  player.clearsAfterStop = true;
  player.setContentMode('AspectFit');
  player.onFinished(() => emit('ended'));
  const parser = new Parser();
  parser.load(
    SVGA_SOURCES[props.type],
    (videoItem) => {
      if (!player) {
        return;
      }
      player.setVideoItem(videoItem);
      player.startAnimation();
    },
    (error) => {
      console.warn('[NikoPK] SVGA 播放失败:', props.type, error);
      emit('ended');
    },
  );
});

onBeforeUnmount(() => {
  player?.stopAnimation(true);
  player = null;
});
</script>

<style scoped>
.pk-status-svga {
  position: absolute;
  inset: 0;
  z-index: 20;
  overflow: hidden;
  pointer-events: none;
}

.pk-status-svga :deep(canvas) {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
