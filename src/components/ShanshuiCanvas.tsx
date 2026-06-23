// MODIFIED: 增加飞鸟系统
import React, { useRef, useEffect, useState } from "react";
import { AtmosphereConfig, TimeOfDay, InkStroke } from "../types";
import { shanshuiSynth } from "../utils/audio";

interface ShanshuiCanvasProps {
  config: AtmosphereConfig;
  inkStrokes: InkStroke[];
  onAddStroke: (stroke: InkStroke) => void;
  paintMode: boolean;
  brushColor: string;
  brushSize: number;
}

// Particle for the cloud flow effect with advanced path and morphing properties
interface MistParticle {
  layer: "far" | "near";
  pathPoints: { x: number; y: number; speedMultiplier: number }[];
  pathIndex: number;
  direction: number;
  baseRadiusX: number;
  baseRadiusY: number;
  baseAlpha: number;
  scalePhaseX: number;
  scalePhaseY: number;
  alphaPhase: number;
  speedScale: number;
  angle: number;
}

// Active ripple wave
interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

// BIRD: Particle representation for the ink wash flying bird
interface BirdParticle {
  tOffset: number;         // progress/time offset to space them in formation
  yOffset: number;         // vertical offset from center flight path
  size: number;            // bird physical wing size
  speedScale: number;      // wings flapping frequency scale factor
  wingPhaseOffset: number; // wings flapping initial phase offset
  depth: 1 | 2;            // 1 = front row (larger, darker), 2 = back row (smaller, softer)
}

interface FireflyParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  angleSpeed: number;
  amplitude: number;
  blinkOffset: number;
  blinkSpeed: number;
  isExploding?: boolean;
  explodeTimer?: number;
}

interface InkHaloParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number; // 0 to 1
  decay: number;
}

// GLOW: Glow particle representing divine glow of sacred peak template
interface GlowParticle {
  radius: number;
  angle: number;
  angularSpeed: number;
  yOffset: number;
  size: number;
  hue: number;
  pulsePhase: number;
  pulseSpeed: number;
  baseAlpha: number;
  driftY: number;
}

// GLOW: Descending mist particle representing falling divine energy (仙气下降)
interface DescendingParticle {
  relX: number;
  relY: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  alpha: number;
  life: number;
  decay: number;
  swayFreq: number;
  swayAmp: number;
  swayPhase: number;
}

interface KoiFish {
  x: number;
  y: number;
  speed: number;
  angle: number;
  turnSpeed: number;
  targetAngle: number;
  length: number;
  color: string;
  spotColor: string | null;
  swimPhase: number;
  wiggleSpeed: number;
}

interface Seagull {
  x: number;
  y: number;
  baseY: number;
  speed: number;
  direction: number; // 1 = right, -1 = left
  wingSpread: number;
  flyPhase: number;
  flySpeed: number;
  isDipping: boolean;
  dipCooldown: number;
  dipProgress: number;
}

interface GoldSpark {
  x: number;
  y: number;
  length: number;
  thickness: number;
  tilt: number;
  pulseSpeed: number;
  pulsePhase: number;
  driftVx: number;
}


// ENHANCED: MediaPipe Gesture Configuration Parameters
const MEDIAPIPE_GESTURE_CONFIG = {
  modelComplexity: 1,
  minDetectionConfidence: 0.58, // Adjusted min_detection_confidence for higher stability
  minTrackingConfidence: 0.58    // Adjusted min_tracking_confidence for smoother tracking
};

// ENHANCED: One Euro Filter for high-performance and smooth hand landmark coordinate filtering
class OneEuroFilter {
  private firstTime = true;
  private hatXPrev = 0;
  private dHatXPrev = 0;
  private tPrev = 0;

  constructor(
    private minCutoff: number = 1.0,
    private beta: number = 0.007,
    private dCutoff: number = 1.0
  ) {}

  filter(x: number, timestamp: number = performance.now()): number {
    if (this.firstTime) {
      this.firstTime = false;
      this.hatXPrev = x;
      this.dHatXPrev = 0;
      this.tPrev = timestamp;
      return x;
    }

    const dt = (timestamp - this.tPrev) / 1000.0;
    if (dt <= 0) return this.hatXPrev;

    this.tPrev = timestamp;
    const edxe = (x - this.hatXPrev) / dt;
    const alphaD = 1.0 / (1.0 + (1.0 / (2.0 * Math.PI * this.dCutoff * dt)));
    const dHatX = alphaD * edxe + (1.0 - alphaD) * this.dHatXPrev;
    this.dHatXPrev = dHatX;

    const cutoff = this.minCutoff + this.beta * Math.abs(dHatX);
    const alpha = 1.0 / (1.0 + (1.0 / (2.0 * Math.PI * cutoff * dt)));
    const hatX = alpha * x + (1.0 - alpha) * this.hatXPrev;
    this.hatXPrev = hatX;

    return hatX;
  }

  reset() {
    this.firstTime = true;
  }
}

// ENHANCED: Gesture Debouncer State Machine with Enter, Stay, and Exit thresholds
class GestureDebouncer {
  private activeFrames = 0;
  private inactiveFrames = 0;
  private currentState = false;

  constructor(
    private enterFrames: number = 5, // Enter threshold (frames to stabilize to true)
    private exitFrames: number = 5   // Exit threshold (frames to decay to false)
  ) {}

  update(rawVal: boolean): boolean {
    if (rawVal) {
      this.inactiveFrames = 0;
      this.activeFrames++;
      if (this.activeFrames >= this.enterFrames) {
        this.currentState = true;
      }
    } else {
      this.activeFrames = 0;
      this.inactiveFrames++;
      if (this.inactiveFrames >= this.exitFrames) {
        this.currentState = false;
      }
    }
    return this.currentState;
  }

  reset() {
    this.currentState = false;
    this.activeFrames = 0;
    this.inactiveFrames = 0;
  }
}


export const ShanshuiCanvas: React.FC<ShanshuiCanvasProps> = ({
  config,
  inkStrokes,
  onAddStroke,
  paintMode,
  brushColor,
  brushSize,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // States to keep track of dynamic elements
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [isNightMode, setIsNightMode] = useState(false);
  
  // Animation refs to bypass React re-render lag
  const stateRef = useRef({
    time: 0,
    mists: [] as MistParticle[],
    ripples: [] as Ripple[],
    birds: [] as BirdParticle[], // BIRD: Bird list
    flockT: 0, // BIRD: Overall bird flock progress
    glowParticles: [] as GlowParticle[], // GLOW: Sacred peak glow particles
    descendingParticles: [] as DescendingParticle[], // GLOW: Falling celestial mist particles
    noisePattern: null as CanvasPattern | null,
    horseNeckAngle: 0, // 0 = alert, 1 = drinking
    isHorseDrinking: false,
    horseTimer: 0,
    horseXOffset: 0,
    horseDirection: -1,
    activeDrawing: null as InkStroke | null,
    windPhase: 0,
    // Cached values to avoid redundant instantiation in render loop (Issue 2)
    cachedSkyGradient: null as CanvasGradient | null,
    cachedNightSkyGradient: null as CanvasGradient | null,
    cachedTimeOfDay: null as TimeOfDay | null,
    cachedHeight: 0,
    // Cached mountain coordinate values to avoid triple Math.sin overhead (Issue 1)
    mountainCache: {} as Record<string, number[]>,
    // Scrolling states for Route B long scroll experience (极简全屏长画卷)
    scrollOffset: 0,
    targetScrollOffset: 0,
    isDraggingScroll: false,
    dragStartX: 0,
    dragStartOffset: 0,
    dragMoveDistance: 0,
    lastDragX: 0,
    lastDragTime: 0,
    scrollVelocity: 0,
    isNightMode: false,
    fireflies: [] as FireflyParticle[],
    // SUN INTERACTIONS & TOSS PHYSICS
    sunX: undefined as number | undefined,
    sunY: undefined as number | undefined,
    sunVx: 0,
    sunVy: 0,
    isDraggingSun: false,
    isTossingSun: false,
    sunTargetX: 0,
    sunTargetY: 0,
    lastSunTargetX: 0,
    lastSunTargetY: 0,
    lastSunDragTime: 0,
    sunTossVx: 0,
    sunTossVy: 0,
    // HAND GESTURE TRACKING
    handX: undefined as number | undefined,
    handY: undefined as number | undefined,
    isPinching: false,
    handVisible: false,
    lastNightMode: false,
    isFist: false,
    isOpenPalm: false,
    isSwordFinger: false,
    forceDivineManifest: false,
    xiwangmuOpacity: 0,
    palaceOpacity: 0,
    wasFistLastFrame: false,
    // GESTURE SCROLLING PATH
    isGestureScrolling: false,
    gestureScrollStartX: 0,
    gestureScrollStartOffset: 0,
    lastHandX: undefined as number | undefined,
    lastHandTime: 0,
    handScrollVx: 0,
    gestureScrollDir: 0, // 0 = undecided, 1 = rightward, -1 = leftward
    gestureScrollPauseFrames: 0,
    mouseX: undefined as number | undefined,
    mouseY: undefined as number | undefined,
    mouseActive: false,
    // ENHANCED: Tracker for touch/click evasion coordinate
    koiEvasionPointer: null as { x: number; y: number; time: number; active: boolean } | null,
    inkHaloParticles: [] as InkHaloParticle[],
    dayKois: [] as KoiFish[],
    nightKois: [] as KoiFish[],
    daySeagulls: [] as Seagull[],
    nightSeagulls: [] as Seagull[],
    goldSparks: [] as GoldSpark[],
  });

  // Keep configuration in a ref so the animation loop always reads latest values
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Track size of parent container
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Make sure size is reasonable
        setDimensions({
          width: Math.max(640, Math.floor(width)),
          height: Math.max(400, Math.floor(height)),
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const [isHandPinching, setIsHandPinching] = useState(false);
  const [isHandFist, setIsHandFist] = useState(false);
  const [isHandOpen, setIsHandOpen] = useState(false);
  const [isHandSwordFinger, setIsHandSwordFinger] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // ENHANCED: Extra debugging and performance monitoring states
  const [debugFps, setDebugFps] = useState(60);
  const [debugHandFps, setDebugHandFps] = useState(0);
  const [gestureConfidence, setGestureConfidence] = useState<number | null>(null);

  // ENHANCED: Performance tracking refs to calculate dynamic render and camera FPS
  const perfRef = useRef({
    renderFrames: 0,
    lastRenderTime: performance.now(),
    handFrames: 0,
    lastHandTime: performance.now(),
  });

  // ENHANCED: Filter array instance for high-precision smoothing of each individual landmark
  const landmarkFiltersRef = useRef<{ x: OneEuroFilter; y: OneEuroFilter; z: OneEuroFilter }[]>([]);
  if (landmarkFiltersRef.current.length === 0) {
    landmarkFiltersRef.current = Array.from({ length: 21 }, () => ({
      x: new OneEuroFilter(1.0, 0.007, 1.0),
      y: new OneEuroFilter(1.0, 0.007, 1.0),
      z: new OneEuroFilter(1.0, 0.007, 1.0),
    }));
  }

  // ENHANCED: Gesture debouncers using state machine tracking
  const debouncersRef = useRef({
    pinch: new GestureDebouncer(5, 5),   // Enter: 5 frames, Exit: 5 frames
    fist: new GestureDebouncer(5, 5),    // Enter: 5 frames, Exit: 5 frames
    open: new GestureDebouncer(5, 5),    // Enter: 5 frames, Exit: 5 frames
    sword: new GestureDebouncer(5, 5),   // Enter: 5 frames, Exit: 5 frames
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cameraInstance: any = null;
    let handsInstance: any = null;
    let active = true;

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
      });
    };

    const initializeMediaPipe = async () => {
      try {
        // Prevent MediaPipe crash on non-HTTPS environments or browsers where mediaDevices API is disallowed/missing
        if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("您的运行环境非安全上下文或暂不支持摄像头，已自适应切换至鼠标/触控拖拽日月。");
        }

        // Load CDN scripts for MediaPipe Camera and Hands
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");

        if (!active) return;
        if (!(window as any).Hands || !(window as any).Camera) {
          throw new Error("手势识别库加载未就绪。请以鼠标/触控直接拖拽日月！");
        }

        // Initialize Hands Tracker
        const hands = new (window as any).Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        // ENHANCED: Parameter optimization using high-stability preset
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: MEDIAPIPE_GESTURE_CONFIG.modelComplexity,
          minDetectionConfidence: MEDIAPIPE_GESTURE_CONFIG.minDetectionConfidence,
          minTrackingConfidence: MEDIAPIPE_GESTURE_CONFIG.minTrackingConfidence
        });

        hands.onResults((results: any) => {
          if (!active) return;
          const s = stateRef.current;
          
          // ENHANCED: Real-time Camera Hand FPS monitor & Confidence gathering
          const perf = perfRef.current;
          perf.handFrames++;
          const handNow = performance.now();
          const elapsedHand = handNow - perf.lastHandTime;
          if (elapsedHand >= 1000) {
            setDebugHandFps(Math.round((perf.handFrames * 1000) / elapsedHand));
            perf.handFrames = 0;
            perf.lastHandTime = handNow;
          }

          if (results.multiHandedness && results.multiHandedness.length > 0) {
            const conf = results.multiHandedness[0].score;
            setGestureConfidence(conf);
          } else {
            setGestureConfidence(null);
          }

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const rawLandmarks = results.multiHandLandmarks[0];
            const filterTimestamp = performance.now();

            // ENHANCED: Data Filtering using One Euro Filter on all 21 key points
            const landmarks = rawLandmarks.map((lm: any, idx: number) => {
              const filters = landmarkFiltersRef.current[idx];
              if (!filters) return lm;
              return {
                x: filters.x.filter(lm.x, filterTimestamp),
                y: filters.y.filter(lm.y, filterTimestamp),
                z: filters.z.filter(lm.z, filterTimestamp),
              };
            });

            // 4: THUMB_TIP, 8: INDEX_FINGER_TIP
            const thumb = landmarks[4];
            const index = landmarks[8];
            const wrist = landmarks[0];
            if (!thumb || !index) return;

            // 1. 获取画布大小并更新手势位置，得到完美的画布/世界坐标
            const canvas = canvasRef.current;
            if (!canvas) return;
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            // 插值计算屏坐标并镜像翻转
            const targetX = (1 - (thumb.x + index.x) / 2) * canvasWidth;
            const targetY = ((thumb.y + index.y) / 2) * canvasHeight;

            // 带惯性的平滑算法
            s.handX = s.handX === undefined ? targetX : s.handX * 0.70 + targetX * 0.30;
            s.handY = s.handY === undefined ? targetY : s.handY * 0.70 + targetY * 0.30;
            s.handVisible = true;

            // 世界水平滚动卷轴空间坐标
            const worldX = s.handX + s.scrollOffset;
            const worldY = s.handY;

            // 2. 交互区域范围检测：分别计算食指指尖、大拇指指尖及手势中心点到当前活动日月（太阳/月亮）中心的距离
            // 这能完美确保无论用户用哪一根手指或任何手势接近日月，都能轻松无阻地触碰并开启捏合交互！
            const indexScreenX = (1 - index.x) * canvasWidth;
            const indexScreenY = index.y * canvasHeight;
            const indexWorldX = indexScreenX + s.scrollOffset;
            const indexWorldY = indexScreenY;

            const thumbScreenX = (1 - thumb.x) * canvasWidth;
            const thumbScreenY = thumb.y * canvasHeight;
            const thumbWorldX = thumbScreenX + s.scrollOffset;
            const thumbWorldY = thumbScreenY;

            const distIndexToSun = (s.sunX !== undefined && s.sunY !== undefined)
              ? Math.hypot(indexWorldX - s.sunX, indexWorldY - s.sunY)
              : 999999;

            const distThumbToSun = (s.sunX !== undefined && s.sunY !== undefined)
              ? Math.hypot(thumbWorldX - s.sunX, thumbWorldY - s.sunY)
              : 999999;

            const distCenterToSun = (s.sunX !== undefined && s.sunY !== undefined)
              ? Math.hypot(worldX - s.sunX, worldY - s.sunY)
              : 999999;

            const minDistanceToSun = Math.min(distIndexToSun, distThumbToSun, distCenterToSun);

            // 当任何一指或手势中心距离日月在 220px 范围以内，或者当前已经处于拖动日月的状态时，判定为日月拖放判定区
            const withinSunZone = minDistanceToSun <= 220 || s.isDraggingSun;

            // 3. 捏合手势判定 (食指与大拇指指尖聚拢)
            // 仅在属于日月的特定交互识别范围内，才会激活并允许检测捏合拖拽，给个灵敏宽松的高度容错阈值 (0.058)
            const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y, thumb.z - index.z);
            const rawPinching = dist < 0.058 && withinSunZone;
            
            // ENHANCED: Logic Debouncing via Pinch Gesture Debouncer state machine
            const arePinching = debouncersRef.current.pinch.update(rawPinching);

            // 4. 自适应手指伸展状态检测 (无视相机距离)与西王母剑指诀手势
            let extendedFingers = 0;
            let rawSwordFinger = false;
            if (wrist) {
              const checkExtended = (tipIdx: number, knuckleIdx: number) => {
                const tip = landmarks[tipIdx];
                const knuckle = landmarks[knuckleIdx];
                if (!tip || !knuckle) return false;
                const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y, tip.z - wrist.z);
                const dKnuckle = Math.hypot(knuckle.x - wrist.x, knuckle.y - wrist.y, knuckle.z - wrist.z);
                return dTip > dKnuckle * 1.15;
              };

              const idxExt = checkExtended(8, 5);
              const midExt = checkExtended(12, 9);
              const rngExt = checkExtended(16, 13);
              const pnkExt = checkExtended(20, 17);

              if (idxExt) extendedFingers++;   // 食指
              if (midExt) extendedFingers++;  // 中指
              if (rngExt) extendedFingers++; // 无名指
              if (pnkExt) extendedFingers++; // 小拇指

              // 剑指诀 (Sword Finger): 食指、中指伸展，无名指、小拇指卷曲收拢
              rawSwordFinger = idxExt && midExt && !rngExt && !pnkExt;
            }
            
            // ENHANCED: Logic Debouncing via Sword Finger Gesture Debouncer state machine
            const isCurrentlySwordFinger = debouncersRef.current.sword.update(rawSwordFinger);

            // 5. 交互防冲突核心：只有在远离日月（不在 180px 拖曳感应范围内）且不在进行拖动时，才会激活萤火虫交互与手掌推卷！
            let rawFist = false;
            let rawOpen = false;

            if (!withinSunZone && !s.isDraggingSun) {
              // 握拳 (Fist): 绝大多数手指聚拢 (伸展手指数 <= 1)
              rawFist = wrist !== undefined && extendedFingers <= 1;
              // 张开手掌 (Open Palm): 绝大多数手指张开 (伸展手指数 >= 3)
              rawOpen = wrist !== undefined && extendedFingers >= 3;
            }
            
            // ENHANCED: Logic Debouncing via Fist & Open Palm Gesture Debouncer state machines
            const isCurrentlyFist = debouncersRef.current.fist.update(rawFist);
            const isCurrentlyOpen = debouncersRef.current.open.update(rawOpen);

            // 更新动画状态帧
            s.wasFistLastFrame = s.isFist;
            s.isFist = isCurrentlyFist;
            s.isOpenPalm = isCurrentlyOpen;
            s.isSwordFinger = isCurrentlySwordFinger;

            setIsHandFist(isCurrentlyFist);
            setIsHandOpen(isCurrentlyOpen);
            setIsHandSwordFinger(isCurrentlySwordFinger);

            s.isPinching = arePinching;
            setIsHandPinching(arePinching);

            // 6. 手掌控制画卷左右移动交互 (Open Palm Gesture Scrolling & Friction Flick)
            const nowTime = performance.now();
            if (isCurrentlyOpen && s.handX !== undefined) {
              // 计算瞬时手掌水平运动速度 (手掌在画面中的速度)
              const dt = nowTime - s.lastHandTime;
              if (dt > 1 && s.lastHandX !== undefined) {
                const dxVal = s.handX - s.lastHandX;
                const instantVx = (dxVal / dt) * 16.666;
                s.handScrollVx = s.handScrollVx * 0.35 + instantVx * 0.65;
              }
              s.lastHandX = s.handX;
              s.lastHandTime = nowTime;

              // 启动和更新手势推卷
              if (!s.isGestureScrolling) {
                s.isGestureScrolling = true;
                s.gestureScrollStartX = s.handX;
                s.gestureScrollStartOffset = s.scrollOffset;
                s.gestureScrollDir = 0; // 重置识别方向
                s.gestureScrollPauseFrames = 0;
                s.targetScrollOffset = s.scrollOffset; // 强制同步以防止瞬闪跳跃
              } else {
                if (s.lastHandX !== undefined) {
                  let deltaX = s.handX - s.lastHandX;
                  const sensitivity = 3.2; // 提升平滑比例（原1.35，现3.2），显著增加移掌推卷距离
                  const virtualWidth = Math.max(2400, canvasWidth * 2.5);
                  const maxScrollOffset = Math.max(0, virtualWidth - canvasWidth);

                  // 1. 过滤极其低微的手部微跳/空气尘杂抖动
                  if (Math.abs(deltaX) < 0.4) {
                    deltaX = 0;
                  }

                  // 2. 锁定与管理主划扫方向
                  if (deltaX !== 0) {
                    if (s.gestureScrollDir === 0) {
                      // 给定一个有意识划扫的初始距离阈值（移动 > 1.2px）锁定主方向
                      if (Math.abs(deltaX) > 1.2) {
                        s.gestureScrollDir = deltaX > 0 ? 1 : -1;
                        s.gestureScrollPauseFrames = 0;
                      }
                    } else {
                      // 核心方向匹配逻辑
                      // 如果当前移动方向同向于主划扫方向，执行增量滚动并维持状态
                      if ((deltaX > 0 && s.gestureScrollDir === 1) || (deltaX < 0 && s.gestureScrollDir === -1)) {
                        s.gestureScrollPauseFrames = 0;
                      } else {
                        // 如果位移方向与最初确定的划扫方向相反（回位/缩手动作），则直接归零规避反弹拉扯！
                        deltaX = 0;
                      }
                    }
                  } else {
                    // 没有位移时，累加静止判定帧
                    s.gestureScrollPauseFrames = (s.gestureScrollPauseFrames || 0) + 1;
                    // 如果手势在原处悬停或静止超过12帧 (~200ms)，主动解锁当前方向，允许反向推卷
                    if (s.gestureScrollPauseFrames > 12) {
                      s.gestureScrollDir = 0;
                    }
                  }

                  // 3. 应用单帧过滤后的安全自适应滚动累加
                  if (deltaX !== 0) {
                    s.targetScrollOffset = Math.max(0, Math.min(maxScrollOffset, s.targetScrollOffset - deltaX * sensitivity));
                  }
                  s.scrollVelocity = 0; // 手势拖拽中锁定阻尼惯性
                }
              }
            } else {
              s.lastHandX = undefined;
              s.handScrollVx = s.handScrollVx * 0.82; // 阻尼微缩递减
              s.gestureScrollDir = 0;
              s.gestureScrollPauseFrames = 0;

              // 当手掌离开或闭合时，如果正在进行手掌推卷，将速度移交给卷轴的甩掷速度 (抛掷惯性滚动)
              if (s.isGestureScrolling) {
                s.isGestureScrolling = false;
                const sensitivity = 3.2; // 提升挥掌甩离速度灵敏度（原1.35，现3.2）
                if (Math.abs(s.handScrollVx) > 0.4) {
                  // 向右挥掌 dx > 0，页面向左移动 (scrollOffset减少)，故速度为负
                  s.scrollVelocity = -s.handScrollVx * sensitivity * 1.25; // 强化抛卷惯性阻尼滑行
                }
              }
            }

            if (arePinching) {
              if (!s.isDraggingSun && s.sunX !== undefined && s.sunY !== undefined) {
                // 如果用户已经开始捏合，并且任何一个指尖或手势中心处于日月较为宽大的判定圈内，则立刻开启拖拽
                if (minDistanceToSun <= 180) {
                  s.isDraggingSun = true;
                  s.isTossingSun = false;
                  s.sunTargetX = worldX;
                  s.sunTargetY = worldY;
                  s.lastSunTargetX = worldX;
                  s.lastSunTargetY = worldY;
                  s.lastSunDragTime = performance.now();
                  s.sunTossVx = 0;
                  s.sunTossVy = 0;
                  
                  if (configRef.current.soundscapesEnabled) {
                    shanshuiSynth.playPluck(330.00); // Exquisite pluck matching grab event
                  }
                }
              } else if (s.isDraggingSun) {
                s.sunTargetX = worldX;
                s.sunTargetY = worldY;

                const now = performance.now();
                const dt = now - s.lastSunDragTime;
                if (dt > 1) {
                  const vx = ((worldX - s.lastSunTargetX) / dt) * 16.666;
                  const vy = ((worldY - s.lastSunTargetY) / dt) * 16.666;
                  s.sunTossVx = s.sunTossVx * 0.45 + vx * 0.55;
                  s.sunTossVy = s.sunTossVy * 0.45 + vy * 0.55;
                }
                s.lastSunTargetX = worldX;
                s.lastSunTargetY = worldY;
                s.lastSunDragTime = now;
              }
            } else {
              // Pinch released
              if (s.isDraggingSun) {
                s.isDraggingSun = false;
                const speed = Math.hypot(s.sunTossVx, s.sunTossVy);
                if (speed > 2.8) {
                  s.isTossingSun = true;
                  s.sunVx = s.sunTossVx;
                  s.sunVy = s.sunTossVy;
                  if (configRef.current.soundscapesEnabled) {
                    shanshuiSynth.playPluck(440.00); // Shanshui toss sound
                  }
                } else {
                  s.isTossingSun = false;
                }
              }
            }
          } else {
            // Hand out of frame
            s.handVisible = false;
            s.isPinching = false;
            s.isFist = false;
            s.isOpenPalm = false;
            s.isGestureScrolling = false; // 结束手势滚动状态
            s.lastHandX = undefined;
            setIsHandPinching(false);
            setIsHandFist(false);
            setIsHandOpen(false);
            if (s.isDraggingSun) {
              s.isDraggingSun = false;
              const speed = Math.hypot(s.sunTossVx, s.sunTossVy);
              if (speed > 2.8) {
                s.isTossingSun = true;
                s.sunVx = s.sunTossVx;
                s.sunVy = s.sunTossVy;
                if (configRef.current.soundscapesEnabled) {
                  shanshuiSynth.playPluck(440.00);
                }
              } else {
                s.isTossingSun = false;
              }
            }
          }
        });

        handsInstance = hands;

        // Build hidden streaming video helper for web camera feeds
        const videoElement = document.createElement("video");
        videoElement.width = 320;
        videoElement.height = 240;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.muted = true;
        videoElement.style.position = "absolute";
        videoElement.style.width = "0px";
        videoElement.style.height = "0px";
        videoElement.style.opacity = "0";
        videoElement.style.pointerEvents = "none";
        document.body.appendChild(videoElement);
        videoRef.current = videoElement;

        // Initialize and trigger camera stream
        cameraInstance = new (window as any).Camera(videoElement, {
          onFrame: async () => {
            if (!active) return; // Prevent async processing frames after unmount
            if (videoElement.readyState >= 2) {
              try {
                await hands.send({ image: videoElement });
              } catch (e) {
                console.error("Hands detection error during frame pass:", e);
              }
            }
          },
          width: 320,
          height: 240
        });

        await cameraInstance.start();
        if (active) {
          setCameraActive(true);
        }
      } catch (err: any) {
        console.warn("MediaPipe initialization notice: falling back to mouse/touch drag.", err);
        if (active) {
          setCameraError(err?.message || "未检测到摄像头或无权限。您可通过点击鼠标或触控拖拽安全交互！");
        }
      }
    };

    initializeMediaPipe();

    return () => {
      active = false;
      if (handsInstance) {
        try {
          handsInstance.close();
        } catch (e) {
          console.warn("Hands tracker clean-up message:", e);
        }
      }
      if (cameraInstance) {
        try {
          cameraInstance.stop();
        } catch (e) {
          console.warn("Camera clean-up message:", e);
        }
      }
      if (videoRef.current) {
        try {
          videoRef.current.srcObject = null;
          videoRef.current.remove();
        } catch (e) {
          console.warn("Video element clean-up message:", e);
        }
        videoRef.current = null;
      }
    };
  }, []);

  // Set up mouse wheel and arrow keys listener for scrolling the handscroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      const scrollAmount = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const virtualWidth = Math.max(2400, dimensions.width * 2.5);
      const maxScroll = Math.max(0, virtualWidth - dimensions.width);
      s.targetScrollOffset = Math.max(0, Math.min(maxScroll, s.targetScrollOffset + scrollAmount * 1.2));
      s.scrollVelocity = scrollAmount * 0.12;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const virtualWidth = Math.max(2400, dimensions.width * 2.5);
      const maxScroll = Math.max(0, virtualWidth - dimensions.width);
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        s.targetScrollOffset = Math.max(0, Math.min(maxScroll, s.targetScrollOffset + 120));
        s.scrollVelocity = 8;
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        s.targetScrollOffset = Math.max(0, Math.min(maxScroll, s.targetScrollOffset - 120));
        s.scrollVelocity = -8;
      } else if (e.key === "t" || e.key === "T") {
        s.isNightMode = !s.isNightMode;
        setIsNightMode(s.isNightMode);
        
        // Play an elegant pluck sound effect to signify transition
        if (configRef.current.soundscapesEnabled) {
          shanshuiSynth.playPluck(s.isNightMode ? 146.83 : 220.00); // Low D3 pluck for night, higher A3/220Hz pluck for day
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dimensions.width]);

  // Set up background sound speed variations on wind speed change
  useEffect(() => {
    if (config.soundscapesEnabled) {
      shanshuiSynth.setWindSpeed(config.windSpeed);
    }
  }, [config.windSpeed, config.soundscapesEnabled]);

  // Handle user triggering horse drink animation from parent
  useEffect(() => {
    if (config.horseState === "drinking" && !stateRef.current.isHorseDrinking) {
      triggerHorseDrinking();
    }
  }, [config.horseState]);

  // Trigger horse drinking sequence
  const triggerHorseDrinking = () => {
    const s = stateRef.current;
    if (s.isHorseDrinking) return;
    s.isHorseDrinking = true;
    s.horseTimer = 0;
    
    // Play subtle guzheng pluck for focus
    if (configRef.current.soundscapesEnabled) {
      shanshuiSynth.playPluck(196.00); // Sol tone
    }
  };

  // Generate Cloud Mist Particles
  const initMists = (width: number, height: number) => {
    const particles: MistParticle[] = [];
    const count = 28; // Up to 30 as requested

    // Morphological paths helper following mountain ranges
    const getFarMountainElevation = (x: number) => {
      const wave1 = Math.sin(x * 0.0015) * 60;
      const wave2 = Math.sin(x * 0.0045 + 1.2) * 25;
      const wave3 = Math.cos(x * 0.009 + 2.0) * 10;
      return wave1 + wave2 + wave3;
    };

    const getMidMountainElevation = (x: number) => {
      const wave1 = Math.sin(x * 0.003 + 3.0) * 80;
      const wave2 = Math.sin(x * 0.008) * 20;
      const wave3 = Math.cos(x * 0.018 + 0.5) * 8;
      return wave1 + wave2 + wave3;
    };

    for (let i = 0; i < count; i++) {
      const layer = i % 2 === 0 ? "far" : "near";
      
      // Base characteristics based on layer
      let baseY = height * 0.22;
      let baseRadiusX = 140 + Math.random() * 80;
      let baseRadiusY = 32 + Math.random() * 12;
      let baseAlpha = 0.06 + Math.random() * 0.08;
      let speedScale = 0.06 + Math.random() * 0.05; // slow far clouds
      let direction = 1; // Far clouds always drift right

      if (layer === "near") {
        baseY = height * 0.42 + Math.random() * height * 0.12;
        baseRadiusX = 75 + Math.random() * 55;
        baseRadiusY = 20 + Math.random() * 10;
        baseAlpha = 0.14 + Math.random() * 0.12;
        speedScale = 0.22 + Math.random() * 0.18; // faster near water/lower hills
        direction = Math.random() > 0.45 ? 1 : -1; // near clouds drift both directions
      }

      const angle = (Math.random() * 14 - 7) * Math.PI / 180; // ±7 degrees angle variation

      // Pre-generate a 100% seamless repeating path across the horizontal viewport
      const startX = -280;
      const endX = width + 280;
      const pathPoints: { x: number; y: number; speedMultiplier: number }[] = [];
      
      // Loop and push points with 5px spacing
      for (let px = startX; px <= endX; px += 5) {
        // Curve following the mountain profile
        let elev = 0;
        let pathY = baseY;
        if (layer === "far") {
          elev = getFarMountainElevation(px);
          pathY -= elev * 0.38; // curve over peaks
        } else {
          elev = getMidMountainElevation(px);
          pathY -= elev * 0.24; // curve near mid hills
        }

        // Angle-based offset with periodic boundary guarantees starting and ending are identical
        const pct = (px - startX) / (endX - startX);
        const angleOffset = Math.sin(pct * 2 * Math.PI) * (45 * Math.sin(angle));
        pathY += angleOffset;

        // High peak slowing down effect: slower near mountain peaks (elevation is high)
        const normalizedElev = Math.max(-50, Math.min(100, elev));
        const peakFactor = (normalizedElev + 50) / 150; // 0 to 1
        const speedMultiplier = 1.0 - peakFactor * 0.42; // Up to 42% slowdown at peaks!

        pathPoints.push({ x: px, y: pathY, speedMultiplier });
      }

      // Choose a random starting index along the generated path
      const pathIndex = Math.floor(Math.random() * pathPoints.length);

      particles.push({
        layer,
        pathPoints,
        pathIndex,
        direction,
        baseRadiusX,
        baseRadiusY,
        baseAlpha,
        scalePhaseX: Math.random() * 100,
        scalePhaseY: Math.random() * 100,
        alphaPhase: Math.random() * 100,
        speedScale,
        angle,
      });
    }
    stateRef.current.mists = particles;
  };

  // BIRD: Initialize ink wash flying flock formation with modular group offsets
  const initBirds = () => {
    const list: BirdParticle[] = [];
    
    // First row (5 to 7 birds, closer and slightly larger)
    const firstRowCount = 6; 
    for (let i = 0; i < firstRowCount; i++) {
      // Space them out with slight progression offsets so they form a loose cluster or V-formation
      const tOffset = -0.05 + (i * 0.015) + (Math.random() * 0.008);
      const yOffset = -25 + (Math.sin(i) * 15) + (Math.random() * 8);
      const size = 0.85 + Math.random() * 0.2; 
      const speedScale = 0.85 + Math.random() * 0.25;
      const wingPhaseOffset = Math.random() * Math.PI * 2;
      list.push({
        tOffset,
        yOffset,
        size,
        speedScale,
        wingPhaseOffset,
        depth: 1,
      });
    }

    // Second row (3 to 5 birds, further behind and smaller/higher up)
    const secondRowCount = 4;
    for (let i = 0; i < secondRowCount; i++) {
      // Further behind in progression (delay by subtracting from tOffset)
      const tOffset = -0.12 + (i * 0.018) + (Math.random() * 0.008);
      const yOffset = -55 + (Math.cos(i) * 12) + (Math.random() * 6);
      const size = 0.45 + Math.random() * 0.12;
      const speedScale = 1.1 + Math.random() * 0.35; // Small birds flap faster
      const wingPhaseOffset = Math.random() * Math.PI * 2;
      list.push({
        tOffset,
        yOffset,
        size,
        speedScale,
        wingPhaseOffset,
        depth: 2,
      });
    }

    stateRef.current.birds = list;
    stateRef.current.flockT = 0.22; // Start visible on initial screen
  };

  // BIRD: Birds system object containing lifecycle states and drawing routines
  const Birds = {
    init: initBirds,
    updateAndDraw: (ctx: CanvasRenderingContext2D, height: number, virtualWidth: number) => {
      const s = stateRef.current;
      if (!s.birds || s.birds.length === 0) return;

      // Drifting speed of the flock, influenced lightly by ambient mist speed
      const baseSpeed = 0.00055 * (1.0 + configRef.current.mistSpeed * 0.45);
      s.flockT += baseSpeed;
      if (s.flockT >= 1.0) {
        s.flockT -= 1.0;
      }

      // Bezier curve height bounds: Starts at 0.32 height -> dips to ~0.69 height over water -> exits at 0.32 height
      const y0 = height * 0.32;
      const y_control = height * 1.06;
      const y2 = height * 0.32;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      s.birds.forEach((bird) => {
        // Compute wrapped progress for single bird
        const t = (s.flockT + bird.tOffset + 1.0) % 1.0;

        // Spread across horizontal width plus 200px offscreen buffers
        const startX = -200;
        const endX = virtualWidth + 200;
        const worldX = startX + t * (endX - startX);

        // Quadratic Bezier interpolation for Y coordinate
        const worldY = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y_control + t * t * y2 + bird.yOffset;

        // Wing flapping cycle
        const wingFactor = Math.sin(s.time * 8.5 * bird.speedScale + bird.wingPhaseOffset);

        // Adjust ink wash values based on depth (layer 1 vs layer 2)
        if (bird.depth === 1) {
          ctx.strokeStyle = "rgba(45, 45, 40, 0.68)";
          ctx.lineWidth = 1.6;
        } else {
          ctx.strokeStyle = "rgba(85, 85, 80, 0.46)";
          ctx.lineWidth = 0.95;
        }

        const sz = bird.size * 9.5; // Wingspan size

        // Left wing tip target
        const leftTipX = worldX - sz;
        const leftTipY = worldY - wingFactor * (sz * 0.38);

        // Right wing tip target
        const rightTipX = worldX + sz;
        const rightTipY = worldY - wingFactor * (sz * 0.38);

        ctx.beginPath();
        // Left wing ink wash stroke
        ctx.moveTo(worldX, worldY);
        ctx.quadraticCurveTo(
          worldX - sz * 0.5, worldY - sz * 0.35 - Math.max(0, wingFactor) * (sz * 0.12),
          leftTipX, leftTipY
        );

        // Right wing ink wash stroke
        ctx.moveTo(worldX, worldY);
        ctx.quadraticCurveTo(
          worldX + sz * 0.5, worldY - sz * 0.35 - Math.max(0, wingFactor) * (sz * 0.12),
          rightTipX, rightTipY
        );
        ctx.stroke();
      });

      ctx.restore();
    }
  };

  // FIREFLIES: Initialize 25+ independent particles in the lower half of the canvas
  const initFireflies = (virtualWidth: number, height: number) => {
    const list: FireflyParticle[] = [];
    const count = 110; // Increased to 110 for an incredibly lush, magical, star-filled night sky and water surface
    for (let i = 0; i < count; i++) {
      const baseX = Math.random() * virtualWidth;
      const baseY = height * (0.52 + Math.random() * 0.44); // water, grass, and trees area

      // Distribute sizes to have a highly rich, layered and natural atmosphere: 15% large, 55% medium, 30% small
      const pct = Math.random();
      let size = 1.2;
      if (pct < 0.15) {
        // Large majestic statement fireflies (perfect for dramatic blasts)
        size = 3.5 + Math.random() * 2.0;
      } else if (pct < 0.70) {
        // Medium shiny core fireflies
        size = 1.8 + Math.random() * 1.3;
      } else {
        // Small delicate sparkling starlet fireflies
        size = 0.6 + Math.random() * 0.8;
      }

      list.push({
        x: baseX,
        y: baseY,
        baseX,
        baseY,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.35,
        size,
        angle: Math.random() * Math.PI * 2,
        angleSpeed: 0.02 + Math.random() * 0.04,
        amplitude: 15 + Math.random() * 25,
        blinkOffset: Math.random() * Math.PI * 2,
        blinkSpeed: (2 * Math.PI) / (60 + Math.random() * 120), // 1 to 3 seconds cycle
      });
    }
    stateRef.current.fireflies = list;
  };

  // YUEYANG_LOU: KOIS: Initialize independent koi fish with Yueyang Lou specific colors
  const initKois = (virtualWidth: number, height: number) => {
    const horizonY = height * 0.62;
    const waterHeight = height - horizonY;

    // Day Kois (3 fish - vibrant colors: 橙红, 金色, 白底红斑)
    const dayList: KoiFish[] = [];
    const dayColors = ["#e06030", "#e8b820", "#f0e8d0"];
    const daySpotColors = [null, null, "#d04020"];

    for (let i = 0; i < 3; i++) {
      dayList.push({
        x: Math.random() * virtualWidth,
        y: horizonY + 20 + Math.random() * (waterHeight - 40),
        speed: 0.45 + Math.random() * 0.4,
        angle: Math.random() * Math.PI * 2,
        turnSpeed: 0.01 + Math.random() * 0.015,
        targetAngle: Math.random() * Math.PI * 2,
        length: 16 + Math.random() * 8,
        color: dayColors[i % dayColors.length],
        spotColor: daySpotColors[i % daySpotColors.length],
        swimPhase: Math.random() * Math.PI * 2,
        wiggleSpeed: 0.08 + Math.random() * 0.06
      });
    }

    // Night Kois (2 fish - night colors: 银灰, 淡金, 墨色)
    const nightList: KoiFish[] = [];
    const nightColors = ["#b0b8b8", "#c8a848", "#384038"];
    const nightSpotColors = [null, null, null];

    for (let i = 0; i < 2; i++) {
      nightList.push({
        x: Math.random() * virtualWidth,
        y: horizonY + 20 + Math.random() * (waterHeight - 40),
        speed: 0.35 + Math.random() * 0.3,
        angle: Math.random() * Math.PI * 2,
        turnSpeed: 0.008 + Math.random() * 0.012,
        targetAngle: Math.random() * Math.PI * 2,
        length: 15 + Math.random() * 6,
        color: nightColors[i % nightColors.length],
        spotColor: nightSpotColors[i % nightSpotColors.length],
        swimPhase: Math.random() * Math.PI * 2,
        wiggleSpeed: 0.06 + Math.random() * 0.04
      });
    }

    stateRef.current.dayKois = dayList;
    stateRef.current.nightKois = nightList;
  };

  // YUEYANG_LOU: SEAGULLS: Initialize sandgulls (6 in day, 8 in night) flying over water (low altitude)
  const initSeagulls = (virtualWidth: number, height: number) => {
    const horizonY = height * 0.62;

    // Day Sandgulls (6 birds)
    const dayGulls: Seagull[] = [];
    for (let i = 0; i < 6; i++) {
      const baseY = horizonY - (30 + Math.random() * 50); // low altitude: water above 30~80px
      dayGulls.push({
        x: Math.random() * virtualWidth,
        y: baseY,
        baseY,
        speed: 0.3 + Math.random() * 0.2, // 0.3 to 0.5 per frame
        direction: Math.random() > 0.5 ? 1 : -1,
        wingSpread: 9 + Math.random() * 5,
        flyPhase: Math.random() * Math.PI * 2,
        flySpeed: 0.02 + Math.random() * 0.02,
        isDipping: false,
        dipCooldown: 120 + Math.random() * 240,
        dipProgress: 0
      });
    }

    // Night Sandgulls (8 birds - slightly darker silver gray)
    const nightGulls: Seagull[] = [];
    for (let i = 0; i < 8; i++) {
      const baseY = horizonY - (30 + Math.random() * 50);
      nightGulls.push({
        x: Math.random() * virtualWidth,
        y: baseY,
        baseY,
        speed: 0.25 + Math.random() * 0.2,
        direction: Math.random() > 0.5 ? 1 : -1,
        wingSpread: 8 + Math.random() * 4,
        flyPhase: Math.random() * Math.PI * 2,
        flySpeed: 0.015 + Math.random() * 0.015,
        isDipping: false,
        dipCooldown: 180 + Math.random() * 300,
        dipProgress: 0
      });
    }

    stateRef.current.daySeagulls = dayGulls;
    stateRef.current.nightSeagulls = nightGulls;
  };

  // YUEYANG_LOU: GOLD SPARKS: Initialize 80 daytime glowing/pulsating golden sparks on lake
  const initGoldSparks = (virtualWidth: number, height: number) => {
    // FLOAT_LIGHT: Initialize horizontal linear gold sparks with density biased towards the sun's position fanning out downwards
    const horizonY = height * 0.62;
    const waterHeight = height - horizonY;
    const sparksList: GoldSpark[] = [];

    // The rest horizontal position of the sun during daytime is virtualWidth * 0.22
    const sunRestX = virtualWidth * 0.22;
    const sparkCount = 135; // 80~150 strips for highly dense visual reflection

    for (let i = 0; i < sparkCount; i++) {
      let x = 0;
      let y = 0;
      let foundX = false;
      while (!foundX) {
        y = horizonY + 15 + Math.random() * (waterHeight - 25);
        const depthFactor = (y - horizonY) / waterHeight;
        // CREATE A BEAUTIFUL FAN SHAPE SPREAD ENVELOPE: 10% upper depth to 30% lower depth
        const maxSpreadLimit = virtualWidth * (0.10 + depthFactor * 0.20);

        const candidateX = Math.random() * virtualWidth;
        const dx = Math.abs(candidateX - sunRestX);
        const distRatio = dx / maxSpreadLimit;

        if (distRatio <= 1.0) {
          // Rejection sampling: density is highest close to the central sun column (using power of 1.8 cubic decay)
          const prob = Math.pow(1.0 - distRatio, 1.8);
          if (Math.random() < prob) {
            x = candidateX;
            foundX = true;
          }
        } else {
          // Keep a tiny chance (4%) for sparse ambient horizontal gleams scattered on far shores
          if (Math.random() < 0.04) {
            x = candidateX;
            foundX = true;
          }
        }
      }

      sparksList.push({
        x,
        y,
        length: 8 + Math.random() * 17, // 8~25px
        thickness: 2 + Math.random() * 2, // 2~4px
        tilt: (Math.random() - 0.5) * 10 * (Math.PI / 180), // -5 to +5 degrees in radians
        pulseSpeed: 0.03 + Math.random() * 0.05,
        pulsePhase: Math.random() * Math.PI * 2,
        driftVx: 0.04 + Math.random() * 0.08 // slow wave drift speed
      });
    }

    stateRef.current.goldSparks = sparksList;
  };

  // GLOW: Initialize 75 glow particles hovering over the sacred peak top/center
  const initGlowParticles = () => {
    const list: GlowParticle[] = [];
    const count = 75; // GLOW: Particle count adjustable parameter for density control
    
    for (let i = 0; i < count; i++) {
      const speedDir = Math.random() > 0.4 ? 1 : -1;
      // Rotation speed corresponding to 10~15 seconds cycle: (2 * Math.PI) / (60 * (10 + Math.random() * 5))
      const angularSpeed = speedDir * ((2 * Math.PI) / (60 * (10 + Math.random() * 5)));
      
      list.push({
        radius: 35 + Math.random() * 85,          // Radius range 35~120px for radial span
        angle: Math.random() * Math.PI * 2,
        angularSpeed,
        yOffset: -30 - Math.random() * 70,         // Height offset above peak (30~100px)
        size: 2.5 + Math.random() * 6.5,           // Diameter range 2.5~9px for randomized sizes
        hue: (i * (360 / count)) % 360,            // Uniformly cover rainbow color frequencies
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.02,  // slow breath frequency
        baseAlpha: 0.25 + Math.random() * 0.35,     // 0.25~0.6 alpha transparency
        driftY: 0,
      });
    }
    stateRef.current.glowParticles = list;

    // GLOW: Initialize 25 falling/drifting仙气 (celestial mist) particles sliding down the slopes
    const decList: DescendingParticle[] = [];
    const decCount = 25;
    for (let i = 0; i < decCount; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      decList.push({
        relX: -15 + Math.random() * 30,
        relY: -20 + Math.random() * 20,
        vx: side * (0.15 + Math.random() * 0.45),
        vy: 0.3 + Math.random() * 0.55,
        size: 2.0 + Math.random() * 4.5,
        hue: (i * (360 / decCount)) % 360,
        alpha: 0.2 + Math.random() * 0.4,
        life: Math.random(), // Stagger initial lifetime
        decay: 0.003 + Math.random() * 0.005,
        swayFreq: 0.015 + Math.random() * 0.02,
        swayAmp: 0.8 + Math.random() * 1.6,
        swayPhase: Math.random() * Math.PI * 2,
      });
    }
    stateRef.current.descendingParticles = decList;
  };

  const updateAndDrawFireflies = (ctx: CanvasRenderingContext2D, virtualWidth: number, height: number) => {
    const s = stateRef.current;
    if (!s.fireflies || s.fireflies.length === 0) return;

    // Detect transition from Fist (握拳) to Open Palm (张开) for explosion trigger
    let triggerExplosion = false;
    if (s.handVisible && s.handX !== undefined && s.handY !== undefined) {
      if (s.wasFistLastFrame && s.isOpenPalm) {
        triggerExplosion = true;
        // Turn off wasFistLastFrame so we only trigger once per transition
        s.wasFistLastFrame = false;
        
        // Trigger multi-sensory Guzheng chime sweep
        if (configRef.current.soundscapesEnabled) {
          shanshuiSynth.playPluck(523.25); // high note C5
          setTimeout(() => shanshuiSynth.playPluck(587.33), 80); // high note D5
          setTimeout(() => shanshuiSynth.playPluck(783.99), 160); // high note G5
        }
      }
      
      // Also, if entering Fist transition (non-fist -> fist), trigger a deep, satisfying bass/pluck drone
      if (!s.wasFistLastFrame && s.isFist) {
        s.wasFistLastFrame = true; // prevent double triggers inside update loop
        if (configRef.current.soundscapesEnabled) {
          shanshuiSynth.playPluck(196.00); // deep G3 pluck resonance
        }
      }
    }

    // Apply radial blast forces
    if (triggerExplosion) {
      const handWorldX = s.handX! + s.scrollOffset;
      const handWorldY = s.handY!;
      s.fireflies.forEach((p) => {
        const dx = p.baseX - handWorldX;
        const dy = p.baseY - handWorldY;
        const dist = Math.hypot(dx, dy);
        
        // Explode radial vicinity - expanded to 1200px (covering half of the canvas width)
        if (dist < 1200) {
          p.isExploding = true;
          p.explodeTimer = 65; // 65 frames of high-velocity propagation and drifting decay
          
          const angle = dist > 0.1 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
          
          // Compute distance-dependent push force: extremely intense at the center, tapering off gradually towards the 1200px edge
          const proximityRatio = 1 - dist / 1200; // 1.0 (center) to 0.0 (edge)
          const baseForce = 4.5 + proximityRatio * 18.0; // 4.5 to 22.5 units of speed
          
          // Apply mass physics logic: smaller fireflies fly faster, larger fireflies have majestic momentum
          const massFactor = 2.0 / (p.size || 1.8);
          const force = (baseForce + Math.random() * 4.0) * Math.max(0.65, Math.min(1.75, massFactor));
          
          p.vx = Math.cos(angle) * force;
          p.vy = Math.sin(angle) * force;
        }
      });
    }

    ctx.save();
    s.fireflies.forEach((p) => {
      // Reduce lifetime of dynamic explosion timer
      if (p.isExploding && p.explodeTimer !== undefined) {
        p.explodeTimer--;
        if (p.explodeTimer <= 0) {
          p.isExploding = false;
        }
      }

      // Brownian motion drift (lessened or suspended during active gathering/blowing forces)
      let attracted = false;
      const isGathering = s.handVisible && s.handX !== undefined && s.handY !== undefined && s.isFist;

      if (!isGathering && !p.isExploding) {
        p.vx += (Math.random() - 0.5) * 0.07;
        p.vy += (Math.random() - 0.5) * 0.05;
      } else if (p.isExploding) {
        // Friction decay for blast speed so particles slow down gracefully (0.965 for long glide)
        p.vx *= 0.965;
        p.vy *= 0.965;
      }

      // 1. Hands Fist Attraction (聚拢力)
      if (isGathering) {
        attracted = true;
        p.isExploding = false; // interrupt any active explosions
        
        const handWorldX = s.handX! + s.scrollOffset;
        const handWorldY = s.handY!;
        const dx = handWorldX - p.baseX;
        const dy = handWorldY - p.baseY;
        const dist = Math.hypot(dx, dy);

        if (dist > 6) {
          // Strong inward gravitational pull (substantially boosted from 0.14 to 0.36)
          const pull = 0.36;
          p.vx += (dx / dist) * pull;
          p.vy += (dy / dist) * pull;

          // Intricate centrifugal spiral orbiting force (boosted from 0.10 to 0.18 for rapid swirling dynamics)
          const swirlForce = 0.18;
          p.vx += (-dy / dist) * swirlForce;
          p.vy += (dx / dist) * swirlForce;
        }
      }
      
      // Dynamic speed regulation depending on current motion state
      let speedLimit = 0.55;
      if (attracted) {
        speedLimit = 6.8; // Raised from 3.6 to 6.8 to support fast swift gathering motion
      } else if (p.isExploding) {
        speedLimit = 25.0; // Scaled up to support pristine high-speed shockwave explosions
      }

      const velocityMag = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (velocityMag > speedLimit) {
        p.vx = (p.vx / velocityMag) * speedLimit;
        p.vy = (p.vy / velocityMag) * speedLimit;
      }
      
      p.baseX += p.vx;
      p.baseY += p.vy;

      if (p.baseX < 0) p.baseX += virtualWidth;
      if (p.baseX > virtualWidth) p.baseX -= virtualWidth;
      
      if (p.baseY < height * 0.45) {
        p.baseY = height * 0.45;
        p.vy = Math.abs(p.vy) * 0.5;
      }
      if (p.baseY > height * 0.98) {
        p.baseY = height * 0.98;
        p.vy = -Math.abs(p.vy) * 0.5;
      }

      // Sinusoidal wavy wiggle path
      p.angle += p.angleSpeed;
      p.x = p.baseX + Math.sin(p.angle) * p.amplitude * 0.15;
      p.y = p.baseY + Math.cos(p.angle * 0.8) * p.amplitude * 0.08;

      if (p.x < 0) p.x += virtualWidth;
      if (p.x > virtualWidth) p.x -= virtualWidth;

      // Spark/blink phase calculations
      p.blinkOffset += p.blinkSpeed;
      let alpha = 0.05 + Math.max(0, Math.sin(p.blinkOffset)) * 0.85;

      // Increase brightness dramatically during explosion for maximum visual fireworks sensation
      if (p.isExploding && p.explodeTimer !== undefined) {
        // The closer to the start of the explosion, the brighter they shine
        const burstGlow = Math.min(1.0, p.explodeTimer / 45);
        alpha = Math.max(alpha, 0.45 + burstGlow * 0.55);
      }

      // Glow aura drawing (#ffdd77)
      ctx.beginPath();
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.2);
      grad.addColorStop(0, `rgba(255, 221, 119, ${alpha})`);
      grad.addColorStop(0.3, `rgba(255, 221, 119, ${alpha * 0.35})`);
      grad.addColorStop(1, "rgba(255, 221, 119, 0)");
      
      ctx.fillStyle = grad;
      ctx.arc(p.x, p.y, p.size * 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Sharp spark core
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 220, ${alpha * 0.9})`;
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  };

  // ENHANCED: KOIS: Helper method to update and render koi fish swimming gracefully with touch/click evasive steering
  const updateAndDrawKois = (ctx: CanvasRenderingContext2D, isNightMode: boolean, virtualWidth: number, height: number) => {
    const s = stateRef.current;
    const koisList = isNightMode ? s.nightKois : s.dayKois;
    if (!koisList || koisList.length === 0) return;

    const horizonY = height * 0.62;

    // Detect active or recent manual touch/click coordinate on water surface
    let evX: number | undefined = undefined;
    let evY: number | undefined = undefined;

    if (s.koiEvasionPointer) {
      const now = performance.now();
      const timeSinceLastUpdate = now - s.koiEvasionPointer.time;
      // Allow a smooth decay slide if touch was released within the last 1200ms
      if (s.koiEvasionPointer.active || timeSinceLastUpdate < 1200) {
        evX = s.koiEvasionPointer.x;
        evY = s.koiEvasionPointer.y;
      }
    }

    koisList.forEach((koi) => {
      let influence = 0;
      let targetEvasionAngle = koi.targetAngle;

      if (evX !== undefined && evY !== undefined) {
        const dx = koi.x - evX;
        const dy = koi.y - evY;
        const d = Math.hypot(dx, dy);
        const evasionRadius = 220; // Expanded sensing radius for better responsiveness

        if (d < evasionRadius) {
          // Compute interpolation factor based on proximity
          influence = Math.max(0, 1.0 - d / evasionRadius);

          // Get raw radial angle from the splash center to the koi
          const radialAngle = Math.atan2(dy, dx);

          // Compute tangential angles (clockwise/counter-clockwise relative to center)
          const angleCW = radialAngle + Math.PI / 2;
          const angleCCW = radialAngle - Math.PI / 2;

          // Intelligently choose the tangential heading closer to the koi's current posture/alignment
          const diffCW = Math.abs(Math.atan2(Math.sin(angleCW - koi.angle), Math.cos(angleCW - koi.angle)));
          const diffCCW = Math.abs(Math.atan2(Math.sin(angleCCW - koi.angle), Math.cos(angleCCW - koi.angle)));
          const bestTangentAngle = diffCW < diffCCW ? angleCW : angleCCW;

          // ENHANCED: Circular Arc Path (绕行圆弧轨迹)
          // Blends 75% tangential arc sweep and 25% radial push to create beautiful swirling, fluid detours
          targetEvasionAngle = bestTangentAngle * 0.75 + radialAngle * 0.25;
        }
      }

      // Smoothly blend steering target angle based on proximity
      let currentTurnSpeed = koi.turnSpeed;
      let currentSpeed = koi.speed;
      let currentWiggleSpeed = koi.wiggleSpeed;

      if (influence > 0) {
        // Linearly interpolate current target angle towards the evasive detour vector
        koi.targetAngle = Math.atan2(
          Math.sin(koi.targetAngle) * (1 - influence) + Math.sin(targetEvasionAngle) * influence,
          Math.cos(koi.targetAngle) * (1 - influence) + Math.cos(targetEvasionAngle) * influence
        );

        // Substantially speed up (3x to 4.5x) when evading
        currentSpeed = koi.speed + (1.8 + Math.random() * 0.6) * influence;

        // Elevate steering rate (turn quickly)
        currentTurnSpeed = koi.turnSpeed * (1 - influence) + 0.088 * influence;

        // Vibrate fins/tail rapidly during rapid escapes
        currentWiggleSpeed = koi.wiggleSpeed + (0.18 + Math.random() * 0.08) * influence;
      }

      // 1. Smoothly steer towards targetAngle
      const angleDiff = Math.atan2(Math.sin(koi.targetAngle - koi.angle), Math.cos(koi.targetAngle - koi.angle));
      koi.angle += angleDiff * currentTurnSpeed;

      // 2. Move forward
      koi.x += Math.cos(koi.angle) * currentSpeed;
      koi.y += Math.sin(koi.angle) * currentSpeed;

      // 3. Keep within the safe water region bounds
      const minY = horizonY + 15;
      const maxY = height - 15;

      if (koi.y < minY) {
        koi.y = minY;
        koi.targetAngle = Math.random() * Math.PI + 0.1; // Turn downwards
      } else if (koi.y > maxY) {
        koi.y = maxY;
        koi.targetAngle = -Math.random() * Math.PI - 0.1; // Turn upwards
      }

      // Virtual width wrapping with safe margin box
      if (koi.x < -80) {
        koi.x = virtualWidth + 80;
      } else if (koi.x > virtualWidth + 80) {
        koi.x = -80;
      }

      // 4. Randomly change target angle to simulate search pattern for grazing/exploring
      if (influence === 0 && Math.random() < 0.008) {
        koi.targetAngle = Math.random() * Math.PI * 2;
        koi.speed = (0.35 + Math.random() * 0.4) * (isNightMode ? 0.8 : 1.0);
      }

      // 5. Update swimming wiggle phase
      koi.swimPhase += currentWiggleSpeed;

      // 6. Draw this beautiful Koi!
      ctx.save();

      // Apply soft glow at night for a mystical look
      if (isNightMode) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(255, 230, 200, 0.45)";
      }

      // Translate and rotate around the koi's center position
      ctx.translate(koi.x, koi.y);
      ctx.rotate(koi.angle);

      // Draw pectoral fins first (so they sit below body)
      ctx.fillStyle = koi.color;
      ctx.globalAlpha = 0.5;

      const finWobble = Math.sin(koi.swimPhase) * 0.2;

      // Left pectoral fin
      ctx.beginPath();
      ctx.moveTo(koi.length * 0.1, -koi.length * 0.15);
      ctx.quadraticCurveTo(
        -koi.length * 0.2, -koi.length * 0.5 + finWobble * 5,
        -koi.length * 0.3, -koi.length * 0.4 + finWobble * 2
      );
      ctx.quadraticCurveTo(-koi.length * 0.1, -koi.length * 0.2, koi.length * 0.1, -koi.length * 0.15);
      ctx.closePath();
      ctx.fill();

      // Right pectoral fin
      ctx.beginPath();
      ctx.moveTo(koi.length * 0.1, koi.length * 0.15);
      ctx.quadraticCurveTo(
        -koi.length * 0.2, koi.length * 0.5 - finWobble * 5,
        -koi.length * 0.3, koi.length * 0.4 - finWobble * 2
      );
      ctx.quadraticCurveTo(-koi.length * 0.1, koi.length * 0.2, koi.length * 0.1, koi.length * 0.15);
      ctx.closePath();
      ctx.fill();

      // Draw the wavy wiggling tail section
      const tailAngle = Math.sin(koi.swimPhase) * 0.35;
      ctx.save();
      // Shift slightly backwards to start of tail
      ctx.translate(-koi.length * 0.3, 0);
      ctx.rotate(tailAngle);

      // Tail fin itself (flowing translucent fan shape)
      ctx.beginPath();
      ctx.fillStyle = koi.color;
      ctx.globalAlpha = 0.6;
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        -koi.length * 0.3, -koi.length * 0.25,
        -koi.length * 0.5, -koi.length * 0.45,
        -koi.length * 0.7, -koi.length * 0.35
      );
      ctx.quadraticCurveTo(-koi.length * 0.55, 0, -koi.length * 0.7, koi.length * 0.35);
      ctx.bezierCurveTo(
        -koi.length * 0.5, koi.length * 0.45,
        -koi.length * 0.3, koi.length * 0.25,
        0, 0
      );
      ctx.closePath();
      ctx.fill();

      ctx.restore(); // Restore from tail rotation

      // Draw the main body (streamlined teardrop/oval)
      ctx.beginPath();
      ctx.fillStyle = koi.color;
      ctx.globalAlpha = 0.85;
      ctx.ellipse(0, 0, koi.length * 0.6, koi.length * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw spots/pattern if they exist (classic koi markings)
      if (koi.spotColor) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = koi.spotColor;

        // Draw 2 abstract spots on the head and back
        ctx.beginPath();
        ctx.ellipse(koi.length * 0.15, -koi.length * 0.05, koi.length * 0.2, koi.length * 0.13, -0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(-koi.length * 0.15, koi.length * 0.03, koi.length * 0.22, koi.length * 0.1, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Draw two tiny deep-dark ink eyes at the front of head
      ctx.beginPath();
      ctx.fillStyle = "rgba(10, 10, 10, 0.9)";
      ctx.globalAlpha = 0.9;
      ctx.arc(koi.length * 0.48, -koi.length * 0.12, 1.3, 0, Math.PI * 2);
      ctx.arc(koi.length * 0.48, koi.length * 0.12, 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  };

  // YUEYANG_LOU: SEAGULLS: Update and render low-flying sandgulls
  const updateAndDrawSeagulls = (ctx: CanvasRenderingContext2D, isNightMode: boolean, virtualWidth: number, height: number) => {
    const s = stateRef.current;
    const gulls = isNightMode ? s.nightSeagulls : s.daySeagulls;
    if (!gulls || gulls.length === 0) return;

    const horizonY = height * 0.62;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    gulls.forEach((gull) => {
      // 1. Horizontal movement with wrapping
      gull.x += gull.speed * gull.direction;
      if (gull.direction === 1 && gull.x > virtualWidth + 50) {
        gull.x = -50;
      } else if (gull.direction === -1 && gull.x < -50) {
        gull.x = virtualWidth + 50;
      }

      // 2. Dip-and-rise AI behavior
      if (!gull.isDipping) {
        gull.dipCooldown--;
        if (gull.dipCooldown <= 0 && Math.random() < 0.006) {
          gull.isDipping = true;
          gull.dipProgress = 0;
        }
        // Gliding wavy height oscillation
        gull.y = gull.baseY + Math.sin(s.time * 2.0 + gull.x * 0.01) * 4;
      } else {
        gull.dipProgress += 0.02; // Speed of dipping curve
        const dipFactor = Math.sin(gull.dipProgress); // 0 -> 1 -> 0
        
        // Target Y reaches near water surface (horizonY - 5px) at peak
        const targetOffset = horizonY - 5 - gull.baseY;
        gull.y = gull.baseY + dipFactor * targetOffset;

        // Perform interactive ripple creation at bottom of the dip
        if (Math.abs(gull.dipProgress - Math.PI / 2) < 0.015) {
          // Trigger a beautiful water ripple exactly at the bird's touch down
          s.ripples.push({
            x: gull.x,
            y: horizonY + 2,
            radius: 1,
            maxRadius: 35 + Math.random() * 20,
            alpha: 0.5,
            speed: 0.8 + Math.random() * 0.6,
          });

          // Trigger interaction with Kois: Kois nearby are attracted to the splash!
          const activeKois = isNightMode ? s.nightKois : s.dayKois;
          activeKois.forEach((koi) => {
            const dx = koi.x - gull.x;
            const dy = koi.y - (horizonY + 2);
            const dist = Math.hypot(dx, dy);
            if (dist < 180) {
              // Steer towards the splash with excitement (increase speed)
              koi.targetAngle = Math.atan2(dy, dx) + Math.PI; // Steer towards (gull.x, horizonY + 2)
              koi.speed = 1.2 + Math.random() * 0.5; // Speed up
            }
          });
        }

        if (gull.dipProgress >= Math.PI) {
          gull.isDipping = false;
          gull.dipCooldown = 200 + Math.random() * 300;
        }
      }

      // 3. Wing flap phase
      gull.flyPhase += gull.flySpeed + (gull.isDipping ? 0.02 : 0);
      const wingFactor = Math.sin(gull.flyPhase * 8.0);

      // 4. Draw the sandgull in a gorgeous calligraphic double stroke or ink visual
      const sz = gull.wingSpread; // wing spread size
      const leftTipX = gull.x - sz;
      const leftTipY = gull.y - wingFactor * (sz * 0.35);
      const rightTipX = gull.x + sz;
      const rightTipY = gull.y - wingFactor * (sz * 0.35);

      // Shadow overlay if daylight to make them pop elegantly
      if (!isNightMode) {
        ctx.strokeStyle = "rgba(40, 45, 50, 0.45)"; // Soft ink bone structure under-shadow
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(gull.x, gull.y + 0.8);
        ctx.quadraticCurveTo(gull.x - sz * 0.5, gull.y + 0.8 - sz * 0.2, leftTipX, leftTipY + 0.8);
        ctx.moveTo(gull.x, gull.y + 0.8);
        ctx.quadraticCurveTo(gull.x + sz * 0.5, gull.y + 0.8 - sz * 0.2, rightTipX, rightTipY + 0.8);
        ctx.stroke();
      }

      // Main gull body & feather color (white/silver in day, silver gray at night)
      ctx.strokeStyle = isNightMode ? "rgba(120, 126, 132, 0.75)" : "rgba(248, 250, 252, 0.9)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(gull.x, gull.y);
      ctx.quadraticCurveTo(
        gull.x - sz * 0.5, gull.y - sz * 0.3 - Math.max(0, wingFactor) * (sz * 0.1),
        leftTipX, leftTipY
      );

      ctx.moveTo(gull.x, gull.y);
      ctx.quadraticCurveTo(
        gull.x + sz * 0.5, gull.y - sz * 0.3 - Math.max(0, wingFactor) * (sz * 0.1),
        rightTipX, rightTipY
      );
      ctx.stroke();

      // Delicate dark gray wingtips to represent traditional ink sandgull aesthetic
      ctx.fillStyle = isNightMode ? "rgba(40, 45, 50, 0.8)" : "rgba(60, 65, 70, 0.75)";
      ctx.beginPath();
      ctx.arc(leftTipX, leftTipY, 0.9, 0, Math.PI * 2);
      ctx.arc(rightTipX, rightTipY, 0.9, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  // YUEYANG_LOU: SPARKS: Golden shimmer sparkles on daytime water (浮光跃金)
  const updateAndDrawSparks = (ctx: CanvasRenderingContext2D, isNightMode: boolean, virtualWidth: number, height: number) => {
    if (isNightMode) return; // Only present in daytime/sunlit scenes
    const s = stateRef.current;
    if (!s.goldSparks || s.goldSparks.length === 0) return;

    const horizonY = height * 0.62;
    const waterHeight = height - horizonY;
    const currentConfig = configRef.current;

    ctx.save();

    // 1. Global overlay: very faint golden gradient over the whole water region to build isles "浮光"
    const floatGlowGrad = ctx.createLinearGradient(0, horizonY, 0, height);
    floatGlowGrad.addColorStop(0, "rgba(255, 230, 150, 0.05)");
    floatGlowGrad.addColorStop(1, "rgba(255, 200, 100, 0.15)");
    ctx.fillStyle = floatGlowGrad;
    ctx.fillRect(0, horizonY, virtualWidth, waterHeight);

    // FLOAT_LIGHT: 2. Render each independent golden light strip with wave and sun linkage
    s.goldSparks.forEach((p) => {
      // Slow drifting motion to simulate waves shifting
      const windSpeed = currentConfig.windSpeed || 1.0;
      p.x += p.driftVx * (1.0 + windSpeed * 1.5);

      // Wrap-around bounds relative to the sun (which follows s.sunX)
      const sunX = s.sunX !== undefined ? s.sunX : virtualWidth * 0.22;
      
      // Standardize wrapping inside virtualWidth to keep them in bounds
      if (p.x < 0) p.x += virtualWidth;
      else if (p.x > virtualWidth) p.x -= virtualWidth;

      // Keep them anchored relative to sun column
      let relativeX = p.x - sunX;
      const halfW = virtualWidth * 0.5;
      relativeX = ((relativeX + halfW) % virtualWidth + virtualWidth) % virtualWidth - halfW;
      const actualX = sunX + relativeX;

      // Interpolate wave factors down water depth
      const depthFactor = (p.y - horizonY) / waterHeight;

      // Check distance ratio to determine the proximity density with a FAN SHAPE SPREAD (10% water top to 30% water bottom)
      const dxToSun = Math.abs(actualX - sunX);
      const rangeLimit = virtualWidth * (0.10 + depthFactor * 0.20);
      
      // Completely hide if outside 30% maximum threshold
      if (dxToSun > rangeLimit) return;
      
      const proximityFactor = Math.max(0, 1.0 - dxToSun / rangeLimit);

      const wavelength = 200 + depthFactor * 200; // 200~400px
      const amplitude = 3.0 + (p.y % 3) * 1.0; // 3~5px
      const periodSeconds = 5.0 + ((p.y % 5) * 0.7); // 5~8s
      const speedMultiplier = (2 * Math.PI) / (periodSeconds * 0.9);
      const phase = s.time * speedMultiplier + p.y * 1.5;

      // Wave shifting offsets - strictly adhering to wave motion (2~4px amplitude)
      const waveShiftX = Math.cos((actualX / wavelength) * Math.PI * 2 + phase) * amplitude * 0.5 * windSpeed;
      const waveShiftY = Math.sin((actualX / wavelength) * Math.PI * 2 + phase) * (2.0 + depthFactor * 2.0); // 2px to 4px

      const drawX = actualX + waveShiftX;
      const drawY = p.y + waveShiftY;

      // Update pulse phase for brightness animation
      p.pulsePhase += p.pulseSpeed;
      const waveOsc = Math.sin(p.pulsePhase); // -1.0 to 1.0
      const brightness = 0.3 + (waveOsc + 1.0) * 0.5 * 0.5; // 0.3 to 0.8 transparency range

      // Combine dynamic brightness with proximity factor to solar column
      const finalAlpha = brightness * Math.pow(proximityFactor, 1.3);
      if (finalAlpha < 0.05) return; // Skip drawing near-invisible items

      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(p.tilt);

      // Create a nice linear gradient for the strip to fade out at ends
      const grad = ctx.createLinearGradient(-p.length / 2, 0, p.length / 2, 0);
      grad.addColorStop(0, "rgba(255, 170, 34, 0)"); // trans gold/orange
      grad.addColorStop(0.3, `rgba(255, 221, 68, ${finalAlpha})`); // solid gold core
      grad.addColorStop(0.7, `rgba(255, 221, 68, ${finalAlpha})`); // solid gold core
      grad.addColorStop(1, "rgba(255, 170, 34, 0)"); // trans gold/orange

      ctx.fillStyle = grad;
      ctx.shadowBlur = 3;
      ctx.shadowColor = "rgba(255, 170, 34, 0.85)";

      // Draw the beautiful linear horizontal strip
      ctx.beginPath();
      ctx.rect(-p.length / 2, -p.thickness / 2, p.length, p.thickness);
      ctx.fill();

      ctx.restore();
    });

    ctx.restore();
  };

  // YUEYANG_LOU: MOON REFLECTION: Draw a gorgeous underwater static sinking jade disc '静影沉璧'
  const drawMoonReflection = (ctx: CanvasRenderingContext2D, isNightMode: boolean, virtualWidth: number, height: number) => {
    if (!isNightMode) return; // Only visible in peaceful moonlit night
    const s = stateRef.current;
    const horizonY = height * 0.62;

    // Conforming to physical rules: Calculate mirrored coordinates aligned with sky Moon
    const refX = s.sunX !== undefined ? s.sunX : virtualWidth * 0.74;
    const refY = s.sunY !== undefined ? s.sunY : height * 0.15;

    let reflectedY = (s.sunY !== undefined)
      ? horizonY + (horizonY - refY) * 0.52
      : horizonY + (horizonY - refY) * 0.65;

    const baseRadius = 30;
    const paddingBottom = baseRadius + 15;
    const paddingTop = 6;
    if (reflectedY > height - paddingBottom) {
      reflectedY = height - paddingBottom;
    }
    if (reflectedY < horizonY + paddingTop) {
      reflectedY = horizonY + paddingTop;
    }

    // Dynamic wave / ripple distortion
    let distortX = 0;
    let distortY = 0;
    
    // Wave shimmer over time
    const wavePhase = s.time * 6.5 + reflectedY * 0.12;
    distortX += Math.sin(wavePhase) * 2.2;
    distortY += Math.cos(wavePhase * 0.8) * 0.6;

    // Add ripples distortion
    s.ripples.forEach((rp) => {
      const dx = refX - rp.x;
      const dy = reflectedY - rp.y;
      const dist = Math.hypot(dx, dy);
      const rDiff = dist - rp.radius;
      if (Math.abs(rDiff) < 30) {
        const factor = (1.0 - Math.abs(rDiff) / 30) * rp.strength;
        const angle = Math.atan2(dy, dx);
        distortX += Math.cos(angle) * factor * 2.2;
        distortY += Math.sin(angle) * factor * 0.8;
      }
    });

    // Outer & inner circle metrics for Jade Bi disk
    const outerRx = 28;
    const innerRx = 9.5;
    const perspectiveScale = 0.38; // 3.5:1 perspective compression ratio matching lake

    ctx.save();
    
    // Scale the canvas coordinate context vertically to conform to the 3D perspective projection rules
    ctx.translate(refX + distortX, reflectedY + distortY);
    ctx.scale(1.0, perspectiveScale);

    // 1. Darken water region surrounding the perspective jade reflection with compressed radial gradient
    const darkenGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
    darkenGrad.addColorStop(0, "rgba(5, 12, 28, 0.82)"); // Deep sapphire
    darkenGrad.addColorStop(0.4, "rgba(8, 15, 32, 0.45)");
    darkenGrad.addColorStop(1, "rgba(8, 15, 32, 0)");
    ctx.fillStyle = darkenGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.fill();

    // 2. Setup soft glowing outer shadow for the jade ring "沉璧"
    ctx.shadowBlur = 25;
    ctx.shadowColor = "rgba(224, 242, 254, 0.85)"; // Magical pale sky blue moonlit glow

    // 3. Draw the jade Bi-disk ring (Bi Disk is outer circle minus inner circle hole: evenodd winding)
    ctx.fillStyle = "rgba(235, 245, 253, 0.62)"; // Beautiful glowing white jade
    ctx.beginPath();
    ctx.arc(0, 0, outerRx, 0, Math.PI * 2, false); // Outer ring boundary
    ctx.arc(0, 0, innerRx, 0, Math.PI * 2, true);   // Subtractive inner ring hole
    ctx.closePath();
    ctx.fill("evenodd");

    // 4. Subtle jade concentric coordinate/vein detail (disabling raw shadow)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, (outerRx + innerRx) * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  // BIRD: Wrapper method to update and render birs gracefully
  const updateAndDrawBirds = (ctx: CanvasRenderingContext2D, height: number, virtualWidth: number) => {
    Birds.updateAndDraw(ctx, height, virtualWidth);
  };

  // Initialize once size is determined
  useEffect(() => {
    stateRef.current.mountainCache = {};
    stateRef.current.cachedSkyGradient = null;
    const virtualWidth = Math.max(2400, dimensions.width * 2.5);
    initMists(virtualWidth, dimensions.height);
    initBirds(); // BIRD: Call init
    initFireflies(virtualWidth, dimensions.height); // FIREFLIES: Call init
    initGlowParticles(); // GLOW: Initialize particles for the Sacred Peak
    initKois(virtualWidth, dimensions.height); // KOIS: Call init
    initSeagulls(virtualWidth, dimensions.height); // YUEYANG_LOU: Call init
    initGoldSparks(virtualWidth, dimensions.height); // YUEYANG_LOU: Call init
  }, [dimensions.width, dimensions.height]);

  const handleCanvasInteraction = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    isStart: boolean,
    isEnd: boolean,
    isMove: boolean
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get event coordinates relative to canvas bounding box
    const rect = canvas.getBoundingClientRect();
    const getCoords = () => {
      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      } else {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }
    };

    const coords = getCoords();
    if (!coords) return;

    const s = stateRef.current;
    s.mouseX = coords.x;
    s.mouseY = coords.y;
    s.mouseActive = !isEnd;

    // ENHANCED: Update water coordinate trigger for koi fish evasion response
    const horizon = dimensions.height * 0.62;
    const worldX = coords.x + s.scrollOffset;
    if (coords.y >= horizon - 20) {
      if (isStart || isMove) {
        s.koiEvasionPointer = {
          x: worldX,
          y: coords.y,
          time: performance.now(),
          active: true
        };
      }
    }
    if (isEnd && s.koiEvasionPointer) {
      s.koiEvasionPointer.active = false;
      s.koiEvasionPointer.time = performance.now(); // Record current release time for graceful deceleration decay
    }
    const currentConfig = configRef.current;

    const virtualWidth = Math.max(2400, dimensions.width * 2.5);
    const maxScrollOffset = Math.max(0, virtualWidth - dimensions.width);

    // A. BRUSH MODE: Painting custom calligraphy ink
    if (paintMode) {
      if (isStart) {
        s.activeDrawing = {
          id: Math.random().toString(),
          points: [{ x: coords.x + s.scrollOffset, y: coords.y, pressure: 1.0 }],
          color: brushColor,
          width: brushSize,
          alpha: 1.0,
        };
        if (currentConfig.soundscapesEnabled) {
          shanshuiSynth.playPluck(); // Harmonize paint with music plucks
        }
      } else if (isMove && s.activeDrawing) {
        const lastPt = s.activeDrawing.points[s.activeDrawing.points.length - 1];
        const worldX = coords.x + s.scrollOffset;
        const dist = Math.hypot(worldX - lastPt.x, coords.y - lastPt.y);
        if (dist > 3) {
          s.activeDrawing.points.push({ x: worldX, y: coords.y, pressure: 0.8 + Math.random() * 0.3 });
        }
      } else if (isEnd && s.activeDrawing) {
        onAddStroke(s.activeDrawing);
        s.activeDrawing = null;
      }
      return;
    }

    // B. WORLD NATURE INTERACTION MODE + SMOOTH DRAG SCROLLING (零UI长画卷滚动)
    if (isStart) {
      const worldX = coords.x + s.scrollOffset;
      const worldY = coords.y;

      // Check if user clicked on the Daytime Sun or Nighttime Moon (to start dragging)
      if (s.sunX !== undefined && s.sunY !== undefined) {
        const distToSun = Math.hypot(worldX - s.sunX, worldY - s.sunY);
        if (distToSun <= 45) { // Hitbox radius 45px
          s.isDraggingSun = true;
          s.isTossingSun = false;
          s.sunTargetX = worldX;
          s.sunTargetY = worldY;
          s.lastSunTargetX = worldX;
          s.lastSunTargetY = worldY;
          s.lastSunDragTime = performance.now();
          s.sunTossVx = 0;
          s.sunTossVy = 0;
          
          if (currentConfig.soundscapesEnabled) {
            shanshuiSynth.playPluck(330.00); // Grab sound: soft high E4 note
          }
          return; // Skip standard page scroll dragging
        }
      }

      s.isDraggingScroll = true;
      s.dragStartX = coords.x;
      s.dragStartOffset = s.scrollOffset;
      s.dragMoveDistance = 0;
      s.lastDragX = coords.x;
      s.lastDragTime = performance.now();
      s.scrollVelocity = 0;
    } else if (isMove) {
      if (s.isDraggingSun) {
        const worldX = coords.x + s.scrollOffset;
        const worldY = coords.y;
        s.sunTargetX = worldX;
        s.sunTargetY = worldY;

        const now = performance.now();
        const dt = now - s.lastSunDragTime;
        if (dt > 1) {
          const vx = ((worldX - s.lastSunTargetX) / dt) * 16.666;
          const vy = ((worldY - s.lastSunTargetY) / dt) * 16.666;
          s.sunTossVx = s.sunTossVx * 0.45 + vx * 0.55;
          s.sunTossVy = s.sunTossVy * 0.45 + vy * 0.55;
        }
        s.lastSunTargetX = worldX;
        s.lastSunTargetY = worldY;
        s.lastSunDragTime = now;
        return; // Skip standard page scroll dragging
      }

      if (s.isDraggingScroll) {
        const dx = coords.x - s.dragStartX;
        const walkDist = Math.abs(coords.x - s.lastDragX);
        s.dragMoveDistance += walkDist;

        // Pan scroll target
        s.targetScrollOffset = Math.max(0, Math.min(maxScrollOffset, s.dragStartOffset - dx));

        // Calculate throwing velocity on release
        const now = performance.now();
        const dt = now - s.lastDragTime;
        if (dt > 0) {
          const vx = ((s.lastDragX - coords.x) / dt) * 16.666;
          s.scrollVelocity = s.scrollVelocity * 0.35 + vx * 0.65;
        }
        s.lastDragX = coords.x;
        s.lastDragTime = now;
      }
    } else if (isEnd) {
      if (s.isDraggingSun) {
        s.isDraggingSun = false;

        const speed = Math.hypot(s.sunTossVx, s.sunTossVy);
        if (speed > 2.8) {
          s.isTossingSun = true;
          s.sunVx = s.sunTossVx;
          s.sunVy = s.sunTossVy;
          
          if (currentConfig.soundscapesEnabled) {
            shanshuiSynth.playPluck(440.00); // High whistle note (A4)
          }
        } else {
          s.isTossingSun = false;
        }
        return; // Exit
      }

      if (s.isDraggingScroll) {
        s.isDraggingScroll = false;

        // If it is a tiny tap instead of dragging, trigger nature ripples!
        if (s.dragMoveDistance < 8) {
          const worldX = coords.x + s.scrollOffset;

          // 1.5. Check if user clicked near the Sacred Peak top (Mount Kunlun / 西王母神山)
          const peakCenterX = virtualWidth * 0.48;
          const peakTopY = dimensions.height * 0.28;
          const dToPeak = Math.hypot(worldX - peakCenterX, coords.y - peakTopY);
          if (dToPeak < 135) {
            s.forceDivineManifest = !s.forceDivineManifest;
            if (currentConfig.soundscapesEnabled) {
              // Playing custom elegant pentatonic chime chord for Xiwangmu manifestation
              shanshuiSynth.playPluck(293.66); // D4 Pluck (Celestial bell)
              shanshuiSynth.playPluck(349.23); // F4 Pluck 
              shanshuiSynth.playPluck(440.00); // A4 Pluck
              shanshuiSynth.playPluck(587.33); // D5 Pluck
            }
            return;
          }

          // 1. Check if user clicked the horse bounding area (trigger drink animation)
          const horseXWorld = virtualWidth * 0.81 + s.horseXOffset;
          const horseY = dimensions.height * 0.77;
          const dToHorse = Math.hypot(worldX - horseXWorld, coords.y - horseY);

          if (dToHorse < 75) {
            triggerHorseDrinking();
            return;
          }

          // 2. Trigger ripples on lake click
          const horizon = dimensions.height * 0.62;
          if (coords.y >= horizon - 20) {
            s.ripples.push({
              x: worldX,
              y: coords.y,
              radius: 1,
              maxRadius: 80 + Math.random() * 120,
              alpha: 0.7,
              speed: 1.5 + Math.random() * 1.5,
            });

            // Play audio effects
            if (currentConfig.soundscapesEnabled) {
              shanshuiSynth.playWaterSplash();
              shanshuiSynth.playPluck(); // Ambient musical harmony
            }
          }
        }
      }
    }
  };

  // MAIN DRAWING LOOP (60fps requestAnimationFrame)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // ENHANCED: Update Render Frame Rate Tracker (FPS)
      const perf = perfRef.current;
      perf.renderFrames++;
      const nowTime = performance.now();
      const elapsedRender = nowTime - perf.lastRenderTime;
      if (elapsedRender >= 1000) {
        setDebugFps(Math.round((perf.renderFrames * 1000) / elapsedRender));
        perf.renderFrames = 0;
        perf.lastRenderTime = nowTime;
      }

      const { width, height } = dimensions;
      const currentConfig = configRef.current;
      const s = stateRef.current;

      // Lazily initialize the watercolor ink-grain noise pattern
      if (!s.noisePattern) {
        try {
          const noiseCanvas = document.createElement("canvas");
          noiseCanvas.width = 100;
          noiseCanvas.height = 100;
          const nCtx = noiseCanvas.getContext("2d");
          if (nCtx) {
            const imgData = nCtx.createImageData(100, 100);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              const val = Math.floor(Math.random() * 25); // Subtle dark ink particles
              data[i] = 120; // R
              data[i + 1] = 130; // G
              data[i + 2] = 140; // B
              data[i + 3] = val; // alpha/density of grain
            }
            nCtx.putImageData(imgData, 0, 0);
            s.noisePattern = ctx.createPattern(noiseCanvas, "repeat");
          }
        } catch (e) {
          console.error("Failed to generate noise texture", e);
        }
      }

      const virtualWidth = Math.max(2400, width * 2.5);
      const maxScrollOffset = Math.max(0, virtualWidth - width);

      // Inertial scrolling update
      if (!s.isDraggingScroll && Math.abs(s.scrollVelocity) > 0.05) {
        s.targetScrollOffset += s.scrollVelocity;
        s.scrollVelocity *= 0.94; // Deceleration/friction coeff

        if (s.targetScrollOffset < 0) {
          s.targetScrollOffset = 0;
          s.scrollVelocity = 0;
        } else if (s.targetScrollOffset > maxScrollOffset) {
          s.targetScrollOffset = maxScrollOffset;
          s.scrollVelocity = 0;
        }
      }

      s.scrollOffset += (s.targetScrollOffset - s.scrollOffset) * 0.12;
      s.scrollOffset = Math.max(0, Math.min(maxScrollOffset, s.scrollOffset));

      const scrollOffset = s.scrollOffset;

      // Ensure Sun/Moon coordinates are initialized matching the daytime/nighttime placement
      const sunRestX = isNightMode ? (virtualWidth * 0.74) : (virtualWidth * 0.22);
      const sunRestY = isNightMode ? (height * 0.15) : (height * 0.18);
      if (s.sunX === undefined || s.sunY === undefined) {
        s.sunX = sunRestX;
        s.sunY = sunRestY;
        s.lastNightMode = isNightMode;
      }

      // Record previous coordinates to check water contact transitions across all states
      let prevSunX = s.sunX;
      let prevSunY = s.sunY;

      // Teleport position smoothly when mode is toggled via keypress or external presets
      if (s.lastNightMode !== isNightMode) {
        s.sunX = sunRestX;
        s.sunY = sunRestY;
        s.sunVx = 0;
        s.sunVy = 0;
        s.isTossingSun = false;
        s.isDraggingSun = false;
        s.lastNightMode = isNightMode;
        
        // Match prevSunX and prevSunY too to avoid triggering a dynamic splash ripple during mode switch
        prevSunX = sunRestX;
        prevSunY = sunRestY;
      }

      // MODIFIED: 三足乌/玉兔 - Check Evade Logic
      let isEvading = false;
      let interX: number | undefined = undefined;
      let interY: number | undefined = undefined;

      if (s.handVisible && s.handX !== undefined && s.handY !== undefined) {
        interX = s.handX + s.scrollOffset;
        interY = s.handY;
      } else if (s.mouseActive && s.mouseX !== undefined && s.mouseY !== undefined) {
        interX = s.mouseX + s.scrollOffset;
        interY = s.mouseY;
      }

      if (!s.isDraggingSun && !s.isTossingSun && s.sunX !== undefined && s.sunY !== undefined && interX !== undefined && interY !== undefined) {
        const dist = Math.hypot(s.sunX - interX, s.sunY - interY);
        // User interaction intention (reduced detection distance to 80px for easier capture)
        if (dist < 80) {
          isEvading = true;
          const dx = s.sunX - interX;
          const dy = s.sunY - interY;
          const proximity = 1 - dist / 80; // 0 to 1
          const evadeSpeed = 3.2 * proximity; // Reduced from 8.0 to 3.2 px per frame to significantly slow down evasion
          
          const angle = dist > 0.1 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
          const pushX = Math.cos(angle) * evadeSpeed;
          const pushY = Math.sin(angle) * evadeSpeed;

          // Apply smooth responsive interpolation
          s.sunVx = s.sunVx * 0.7 + pushX * 0.3;
          s.sunVy = s.sunVy * 0.7 + pushY * 0.3;

          // Emit Ink-wash Glow Halo Particles (20-30 particles over the active session, 2-3 per frame)
          const particleCount = Math.floor(Math.random() * 2) + 2; 
          for (let pi = 0; pi < particleCount; pi++) {
            const pAngle = Math.random() * Math.PI * 2;
            const pSpeed = 0.5 + Math.random() * 3.5;
            s.inkHaloParticles.push({
              x: s.sunX,
              y: s.sunY,
              vx: Math.cos(pAngle) * pSpeed + s.sunVx * 0.5,
              vy: Math.sin(pAngle) * pSpeed + s.sunVy * 0.5,
              size: 3.0 + Math.random() * 7.0,
              color: isNightMode ? "rgba(96, 165, 250, 0.45)" : "rgba(212, 160, 48, 0.50)", // Light blue or Sanzuwu gold
              alpha: 0.85,
              life: 1.0,
              decay: 0.035 + Math.random() * 0.04, // Lifespan approx 0.5s
            });
          }
        }
      }

      // Physics Simulation Loop for the interactive, draggable Sun or Moon
      if (s.isDraggingSun) {
        // Drag mode: spring/lag update toward target coordinates to feel heavy and organic
        const k = 0.14;       // Spring stiffness
        const damping = 0.72; // Organic deceleration
        
        s.sunVx = (s.sunVx || 0) + (s.sunTargetX - s.sunX) * k;
        s.sunVx *= damping;
        s.sunX += s.sunVx;

        s.sunVy = (s.sunVy || 0) + (s.sunTargetY - s.sunY) * k;
        s.sunVy *= damping;
        s.sunY += s.sunVy;
      } else if (s.isTossingSun) {
        // Toss mode: free physical motion with gravity & air resistance
        const gravity = 0.35;        // Falling gravity
        const airResistance = 0.975; // Air friction
        
        s.sunVx *= airResistance;
        s.sunVy += gravity;
        s.sunVy *= airResistance;

        s.sunX += s.sunVx;
        s.sunY += s.sunVy;

        // Boundary detection triggers night mode / day mode transition:
        // x or y exits screen boundaries / top / bottom / world dimensions
        const isOffLeft = s.sunX < s.scrollOffset - 30;
        const isOffRight = s.sunX > s.scrollOffset + width + 30;
        const isOffTop = s.sunY < -30;
        const isOffBottom = s.sunY > height + 30;
        const isOffEnd = s.sunX < 0 || s.sunX > virtualWidth;
        
        if (isOffLeft || isOffRight || isOffTop || isOffBottom || isOffEnd) {
          s.isTossingSun = false;
          const nextNightMode = !isNightMode;
          s.isNightMode = nextNightMode;
          setIsNightMode(nextNightMode);
          s.lastNightMode = nextNightMode;
          
          if (currentConfig.soundscapesEnabled) {
            shanshuiSynth.playPluck(nextNightMode ? 146.83 : 220.00); // Low D3 pluck for night, higher A3 pluck for day
            shanshuiSynth.playWaterSplash();
          }
          
          // Reset sun/moon gracefully to its new rest position
          const nextRestX = nextNightMode ? (virtualWidth * 0.74) : (virtualWidth * 0.22);
          const nextRestY = nextNightMode ? (height * 0.15) : (height * 0.18);
          s.sunX = nextRestX;
          s.sunY = nextRestY;
          s.sunVx = 0;
          s.sunVy = 0;
          
          // Prevent water contact transition trigger during teleport/reset
          prevSunX = nextRestX;
          prevSunY = nextRestY;
        }
      } else {
        // Safe return spring rest coordinates when idle
        const springK = isEvading ? 0.012 : 0.08; // Reduce target pull during active evasion
        const springDamp = isEvading ? 0.95 : 0.76;
        s.sunVx = (s.sunVx || 0) + (sunRestX - s.sunX) * springK;
        s.sunVx *= springDamp;
        s.sunX += s.sunVx;

        s.sunVy = (s.sunVy || 0) + (sunRestY - s.sunY) * springK;
        s.sunVy *= springDamp;
        s.sunY += s.sunVy;
      }

      // MODIFIED: 三足乌/玉兔 - Limit coordinates in viewport boundaries only during active interaction (evading or dragging) so they don't stick to margins when scrolling normally
      if (s.sunX !== undefined && s.sunY !== undefined && (s.isDraggingSun || isEvading)) {
        // Clamp X coordinate to visible viewport bounds so the sun/moon is kept on screen during active evasion/dragging
        const minX = s.scrollOffset + 40;
        const maxX = s.scrollOffset + width - 40;
        if (s.sunX < minX) {
          s.sunX = minX;
          s.sunVx = Math.max(0, s.sunVx); // stop moving left
        } else if (s.sunX > maxX) {
          s.sunX = maxX;
          s.sunVx = Math.min(0, s.sunVx); // stop moving right
        }

        // Clamp Y coordinate (allow falling below water boundary when dragging/tossing, but clamp during active evasion/dragging)
        const minY = 40;
        const maxY = height * 0.58; // Just above water line (around height * 0.62)
        if (s.sunY < minY) {
          s.sunY = minY;
          s.sunVy = Math.max(0, s.sunVy);
        } else if (s.sunY > maxY && !s.isDraggingSun) { // only clamp to maxY when evading
          s.sunY = maxY;
          s.sunVy = Math.min(0, s.sunVy);
        }
      }

      // --- WATER CROSSING TRANSITION COLLISION SYSTEM ---
      const sunHorizonY = height * 0.62;
      if (s.sunX !== undefined && s.sunY !== undefined && prevSunY !== undefined) {
        // 1. Descending cross (Hitting water surface from above)
        if (s.sunY >= sunHorizonY && prevSunY < sunHorizonY) {
          // Spawn concentric, layered water splashes (层叠涟漪)
          for (let i = 0; i < 4; i++) {
            s.ripples.push({
              x: s.sunX,
              y: sunHorizonY,
              radius: -i * 12, // Staggered delay using negative radius
              maxRadius: 140 + i * 45 + Math.random() * 30,
              alpha: 0.95 - i * 0.15,
              speed: 1.8 + Math.random() * 0.5,
            });
          }
          if (currentConfig.soundscapesEnabled) {
            shanshuiSynth.playWaterSplash();
          }
        }
        // 2. Ascending cross (Coming back up or springing back)
        else if (s.sunY < sunHorizonY && prevSunY >= sunHorizonY) {
          for (let i = 0; i < 3; i++) {
            s.ripples.push({
              x: s.sunX,
              y: sunHorizonY,
              radius: -i * 10,
              maxRadius: 110 + i * 35 + Math.random() * 25,
              alpha: 0.85 - i * 0.15,
              speed: 1.6 + Math.random() * 0.4,
            });
          }
          if (currentConfig.soundscapesEnabled) {
            shanshuiSynth.playWaterSplash();
          }
        }
        // 3. Horizontal dragging ripples inside the water (extremely tactile)
        else if (s.isDraggingSun && s.sunY >= sunHorizonY && Math.abs(s.sunX - prevSunX) > 2.0 && Math.random() < 0.15) {
          s.ripples.push({
            x: s.sunX,
            y: sunHorizonY,
            radius: 1,
            maxRadius: 40 + Math.random() * 45,
            alpha: 0.40,
            speed: 1.1 + Math.random() * 0.4,
          });
        }
      }

      // Update timer parameters
      s.time += 0.015;
      s.windPhase += 0.01 + currentConfig.windSpeed * 0.04;

      // Pre-calculate expensive trigonometric values used multiple times across loops
      const cosWindAngle = Math.cos(currentConfig.windAngle);
      const sinWindAngle = Math.sin(currentConfig.windAngle);

      // --- 1. SET COLOR PALETTE BY TIME OF DAY (時辰雅色) ---
      let skyGradient = s.cachedSkyGradient;
      if (!skyGradient || s.cachedTimeOfDay !== currentConfig.timeOfDay || s.cachedHeight !== height) {
        skyGradient = ctx.createLinearGradient(0, 0, 0, height);
        switch (currentConfig.timeOfDay) {
          case TimeOfDay.DAWN: // 晨曦: 烟粉/晨雾灰
            skyGradient.addColorStop(0, "#cbd5e1");
            skyGradient.addColorStop(0.5, "#e2e8f0");
            skyGradient.addColorStop(1, "#f1f5f9");
            break;
          case TimeOfDay.NOON: // 午间: 宣纸微黄/浓重墨色 -> 改为暖色系淡米色/牙色
            skyGradient.addColorStop(0, "#ebdcb9");
            skyGradient.addColorStop(0.65, "#f5eedc");
            skyGradient.addColorStop(1, "#faf6ec");
            break;
          case TimeOfDay.GOLDEN: // 暮色: 琥珀金/落木紫
            skyGradient.addColorStop(0, "#e8d3ba");
            skyGradient.addColorStop(0.4, "#f3e1cb");
            skyGradient.addColorStop(1, "#f5ebe0");
            break;
          case TimeOfDay.NIGHT: // 烟夜: 深黛/乌墨
            skyGradient.addColorStop(0, "#0b131f");
            skyGradient.addColorStop(0.5, "#0f172a");
            skyGradient.addColorStop(1, "#1e293b");
            break;
        }
        s.cachedSkyGradient = skyGradient;
        s.cachedTimeOfDay = currentConfig.timeOfDay;
        s.cachedHeight = height;
      }

      let mountainColor1 = "rgba(43, 62, 70, 0.9)"; // Distant wash
      let mountainColor2 = "rgba(28, 41, 48, 0.9)"; // Mid wash
      let mountainColor3 = "rgba(18, 28, 32, 1.0)";  // Near land
      let landColor = "rgba(10, 16, 20, 1.0)";
      let mistColor = "rgba(240, 243, 245, 0.65)";
      let strokeColor = "rgba(15, 20, 25, 0.35)";
      let sunMoonColor = "rgba(255, 255, 255, 0.8)";
      let isNight = false;
      const horizonY = height * 0.62;

      // YUEYANG_LOU: Standardized water vertical gradients
      const dayWaterGrad = ctx.createLinearGradient(0, horizonY, 0, height);
      dayWaterGrad.addColorStop(0, "#c8d8c0"); // 上浅色与天空过渡
      dayWaterGrad.addColorStop(1, "#5a7a5a"); // 下深色碧波

      const nightWaterGrad = ctx.createLinearGradient(0, horizonY, 0, height);
      nightWaterGrad.addColorStop(0, "#1a2a3a"); // 上暗色与夜空过渡
      nightWaterGrad.addColorStop(1, "#0a1a1a"); // 下深部水底

      let waterColor: string | CanvasGradient = dayWaterGrad;

      switch (currentConfig.timeOfDay) {
        case TimeOfDay.DAWN: // 晨曦: 烟粉/晨雾灰
          mountainColor1 = "rgba(67, 85, 96, 0.75)";
          mountainColor2 = "rgba(45, 62, 71, 0.85)";
          mountainColor3 = "rgba(30, 44, 51, 1.0)";
          landColor = "rgba(21, 31, 36, 1.0)";
          mistColor = "rgba(248, 241, 244, 0.7)";
          waterColor = dayWaterGrad;
          sunMoonColor = "rgba(253, 186, 116, 0.4)"; // Soft peach sun
          break;
        case TimeOfDay.NOON: // 午间: 淡天青天空与暖调赭石/暖灰绿水面形成冷暖对比
          mountainColor1 = "rgba(120, 128, 115, 0.62)";
          mountainColor2 = "rgba(80, 88, 82, 0.85)";
          mountainColor3 = "rgba(35, 40, 36, 1.0)";
          landColor = "rgba(20, 24, 21, 1.0)";
          mistColor = "rgba(245, 242, 235, 0.85)";
          waterColor = dayWaterGrad;
          sunMoonColor = "rgba(242, 237, 222, 0.7)";
          break;
        case TimeOfDay.GOLDEN: // 暮色: 琥珀金/落木紫
          mountainColor1 = "rgba(102, 76, 85, 0.7)";
          mountainColor2 = "rgba(74, 52, 60, 0.85)";
          mountainColor3 = "rgba(41, 28, 33, 1.0)";
          landColor = "rgba(25, 16, 20, 1.0)";
          mistColor = "rgba(253, 244, 230, 0.65)";
          waterColor = dayWaterGrad;
          sunMoonColor = "rgba(251, 146, 60, 0.52)"; // Large slow sunset
          break;
        case TimeOfDay.NIGHT: // 烟夜: 深黛/乌墨
          isNight = true;
          mountainColor1 = "rgba(30, 41, 59, 0.6)";
          mountainColor2 = "rgba(15, 23, 42, 0.82)";
          mountainColor3 = "rgba(8, 10, 18, 1.0)";
          landColor = "rgba(2, 4, 8, 1.0)";
          mistColor = "rgba(200, 210, 225, 0.12)";
          waterColor = nightWaterGrad;
          strokeColor = "rgba(255, 255, 255, 0.1)";
          sunMoonColor = "rgba(254, 240, 138, 0.95)"; // Bright ink moon
          break;
      }

      // If Night mode is toggled, override color palette with custom night scroll elements (深蓝紫与暖灰风格)
      if (isNightMode) {
        isNight = true;
        if (!s.cachedNightSkyGradient || s.cachedHeight !== height) {
          const g = ctx.createLinearGradient(0, 0, 0, height);
          g.addColorStop(0, "#0e1528");
          g.addColorStop(0.45, "#1a253e");
          g.addColorStop(1, "#26324a");
          s.cachedNightSkyGradient = g;
        }
        skyGradient = s.cachedNightSkyGradient;

        mountainColor1 = "rgba(26, 32, 48, 0.80)"; // Far mountain base warm slate/deep blue wash
        mountainColor2 = "rgba(20, 28, 45, 0.92)"; // Mid mountain base: deep blue-purple charcoal
        mountainColor3 = "rgba(15, 23, 42, 1.0)";   // Near mountain base: solid deep blue-purple #0f172a
        landColor = "rgba(15, 23, 42, 1.0)";        // Clean deep blue-purple #0f172a for island spits (no pure black)
        mistColor = "rgba(160, 164, 176, 0.40)";    // Moonlit warm grey #a0a4b0 faint misty vapor
        waterColor = nightWaterGrad;
        strokeColor = "rgba(255, 255, 255, 0.1)";
        sunMoonColor = "rgba(253, 254, 210, 0.75)";
      }

      // Fill canvas background (sky)
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height);

      // Fill basic lake surface color matching sky gradient (uniform background)
      ctx.fillStyle = waterColor;
      ctx.fillRect(0, horizonY, width, height - horizonY);

      // Enter translated long horizontal handscroll workspace
      ctx.save();
      ctx.translate(-scrollOffset, 0);

      // --- 2. DRAW CELESTIAL SOURCE (Suns / Moons / Inscriptions) ---
      ctx.save();
      if (isNightMode) {
        // MODIFIED: 玉兔剪影 - Round Moon with beautiful Jade Rabbit silhouette inside
        const moonX = s.sunX !== undefined ? s.sunX : virtualWidth * 0.74;
        const moonY = s.sunY !== undefined ? s.sunY : height * 0.15;
        const r = 30;

        // Distinct elegant glowing moon aura (translucent Ivory (#ffe6aa) style)
        ctx.save();
        ctx.shadowColor = "rgba(255, 230, 170, 0.75)";
        ctx.shadowBlur = 45;
        const moonGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, r * 1.5);
        moonGrad.addColorStop(0, "rgba(255, 240, 205, 0.95)");
        moonGrad.addColorStop(0.35, "rgba(255, 230, 170, 0.80)");
        moonGrad.addColorStop(0.75, "rgba(255, 230, 170, 0.55)");
        moonGrad.addColorStop(1, "rgba(255, 230, 170, 0)");
        ctx.fillStyle = moonGrad;
        ctx.beginPath();
        ctx.arc(moonX, moonY, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw Jade Rabbit Silhouette (墨色 #1a1a2e)
        ctx.save();
        ctx.translate(moonX, moonY);

        const timeYutu = performance.now();
        const poundPhase = Math.sin(timeYutu * 0.003) * 0.5 + 0.5; // range 0 to 1
        const bodyBob = Math.sin(timeYutu * 0.003 + Math.PI / 2) * 1.0;

        ctx.fillStyle = "#1a1a2e";

        // Mortar (臼)
        ctx.beginPath();
        ctx.moveTo(6, 12);
        ctx.quadraticCurveTo(14, 12, 14, 18);
        ctx.quadraticCurveTo(8, 24, 0, 24);
        ctx.quadraticCurveTo(-2, 18, -2, 18);
        ctx.lineTo(6, 12);
        ctx.closePath();
        ctx.fill();

        // Mortar hollow
        ctx.fillStyle = "#2d2440";
        ctx.beginPath();
        ctx.ellipse(6, 14, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rabbit Feet/legs
        ctx.fillStyle = "#1a1a2e";
        ctx.beginPath();
        ctx.ellipse(-8, 20 + bodyBob * 0.2, 5, 3, Math.PI / 12, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.ellipse(-7, 10 + bodyBob, 8, 11, -Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.arc(-14, 16 + bodyBob, 3, 0, Math.PI * 2);
        ctx.fill();

        // Head
        const headY = -3 + bodyBob;
        ctx.beginPath();
        ctx.ellipse(-4, headY, 5, 4.5, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.save();
        ctx.translate(-5, headY - 2);
        ctx.beginPath();
        ctx.ellipse(-3, -7, 2, 6, -Math.PI / 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(1, -6, 1.8, 5.5, Math.PI / 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Pestle (药杵)
        const pestleY = 4 + poundPhase * 9;
        const pestleAngle = -Math.PI / 6;
        ctx.save();
        ctx.translate(5, pestleY);
        ctx.rotate(pestleAngle);
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(-2, -8, 3.5, 16);
        ctx.beginPath();
        ctx.arc(-0.25, -8, 1.75, 0, Math.PI * 2);
        ctx.arc(-0.25, 8, 1.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Arms holding pestle
        ctx.beginPath();
        ctx.moveTo(-3, 6 + bodyBob);
        ctx.quadraticCurveTo(0, 1 + pestleY * 0.5, 4, pestleY);
        ctx.lineTo(3, pestleY + 3);
        ctx.quadraticCurveTo(-1, 8 + bodyBob * 0.5, -4, 9 + bodyBob);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      } else {
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        if (isNight) {
          // Exquisite Chinese scroll crescent moon with halo
          ctx.shadowColor = "rgba(254, 240, 138, 0.4)";
          ctx.shadowBlur = 40;
          ctx.fillStyle = sunMoonColor;
          ctx.arc(virtualWidth * 0.72, height * 0.15, 20, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Bypassed: the interactive draggable Sun is drawn at the topmost layers (Step 11)
        }
      }
      ctx.restore();

      // --- 3. DYNAMIC SHAPE WATERFALL MOUNTAINS (青山重嶂) ---
      const getCachedMountain = (key: string, seedY: number, amplitude: number, freq: number) => {
        if (!s.mountainCache[key]) {
          const points: number[] = [];
          for (let x = 0; x <= virtualWidth + 10; x += 5) {
            const sinVal = Math.sin(x * freq + seedY) * amplitude;
            const noiseVal = Math.sin(x * 0.045 + seedY * 0.5) * (amplitude * 0.22);
            const extraVal = Math.sin(x * 0.002 + seedY) * (amplitude * 0.38);
            points.push(seedY + sinVal + noiseVal + extraVal);
          }
          s.mountainCache[key] = points;
        }
        return s.mountainCache[key];
      };

      // PEAK: Determine location and shape profile of the Sacred Peak (神山)
      const peakMidKey = isNightMode ? "night_mid" : "mid";
      const peakMidYRef = isNightMode ? horizonY - 90 : horizonY - 80;
      const peakMidAmpRef = isNightMode ? 120 : 100;
      const peakMidFreqRef = isNightMode ? 0.0031 : 0.0035;
      const peakMidPts = getCachedMountain(peakMidKey, peakMidYRef, peakMidAmpRef, peakMidFreqRef);

      let bestCenterX = virtualWidth * 0.48; // Fallback
      let insertPeak = true;
      
      if (peakMidPts && peakMidPts.length > 0) {
        let lowestElevY = -9999;
        const startIdx = Math.floor((virtualWidth * 0.45) / 5);
        const endIdx = Math.min(peakMidPts.length - 1, Math.floor((virtualWidth * 0.55) / 5));
        for (let idx = startIdx; idx <= endIdx; idx++) {
          if (peakMidPts[idx] > lowestElevY) {
            lowestElevY = peakMidPts[idx];
            bestCenterX = idx * 5;
          }
        }
      }

      const baseWidth = 260;
      const topWidth = 40;
      const peakY = height * 0.28;
      const leftBaseX = bestCenterX - baseWidth / 2;
      const rightBaseX = bestCenterX + baseWidth / 2;
      const topLeftX = bestCenterX - topWidth / 2;
      const topRightX = bestCenterX + topWidth / 2;
      
      const sacredPeakPoints: {x: number, y: number}[] = [];
      const peakStep = 2;
      
      for (let x = leftBaseX; x <= rightBaseX; x += peakStep) {
        let baseH = horizonY;
        let scale = 0;
        
        if (x < topLeftX) {
          const s = (x - leftBaseX) / (topLeftX - leftBaseX);
          const smoothS = s * s * (3 - 2 * s);
          baseH = horizonY - (horizonY - peakY) * smoothS;
          scale = Math.sin(s * Math.PI);
        } else if (x <= topRightX) {
          baseH = peakY;
          scale = 0;
        } else {
          const s = (rightBaseX - x) / (rightBaseX - topRightX);
          const smoothS = s * s * (3 - 2 * s);
          baseH = horizonY - (horizonY - peakY) * smoothS;
          scale = Math.sin(s * Math.PI);
        }
        
        const landscapeNoise = Math.sin(x * 0.08) * 5 + Math.sin(x * 0.02) * 11 + Math.cos(x * 0.005) * 6;
        const finalY = baseH + landscapeNoise * scale;
        
        sacredPeakPoints.push({ x, y: finalY });
      }
      if (sacredPeakPoints.length > 0 && sacredPeakPoints[sacredPeakPoints.length - 1].x < rightBaseX) {
        sacredPeakPoints.push({ x: rightBaseX, y: horizonY });
      }

      // GLOW: Helper function to draw the elegant hand-painted silhouette of Queen Mother of the West (西王母)
      const drawXiwangmuApparition = (ctx: CanvasRenderingContext2D, cx: number, cy: number, opacity: number) => {
        if (opacity <= 0) return;
        ctx.save();
        ctx.globalAlpha = opacity;
        
        // Outer ethereal background aura of Xiwangmu
        const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 65);
        glowGrad.addColorStop(0, "rgba(255, 235, 200, 0.22)");
        glowGrad.addColorStop(0.5, "rgba(240, 200, 255, 0.12)");
        glowGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 65, 0, Math.PI * 2);
        ctx.fill();

        // Divine Head Halo (Circular Backlight of Goddess)
        ctx.strokeStyle = "rgba(255, 240, 200, 0.38)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy - 35, 14, 0, Math.PI * 2);
        ctx.stroke();

        // Elegant Chinese goddess silhouette in a soft purple-grey to offer a mysterious feel and contrast with background skies
        ctx.fillStyle = isNightMode ? "rgba(168, 152, 184, 0.75)" : "rgba(138, 122, 154, 0.75)"; 
        ctx.strokeStyle = isNightMode ? "rgba(188, 172, 204, 0.85)" : "rgba(118, 102, 134, 0.65)";
        ctx.lineWidth = 1.0;
        
        ctx.beginPath();

        // 1. Crown / Sheng Headpiece (Traditional double-pin hairpin crown)
        ctx.moveTo(cx - 3, cy - 54);
        ctx.lineTo(cx + 3, cy - 54);
        ctx.lineTo(cx + 6, cy - 58); // Left tip
        ctx.lineTo(cx - 6, cy - 58); // Right tip
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Hair pin horizontal bar (金簪)
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy - 51);
        ctx.lineTo(cx + 15, cy - 51);
        ctx.stroke();

        // 2. High Hair Bun (Traditional high bun)
        ctx.beginPath();
        ctx.arc(cx, cy - 47, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 3. Head & Neck
        ctx.beginPath();
        ctx.arc(cx, cy - 35, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 4. Robes, shoulders, flowing ribbon (披帛) and sleeves
        ctx.beginPath();
        // Start from neck bottom
        ctx.moveTo(cx, cy - 30);
        
        // Left shoulder & sleeve
        ctx.bezierCurveTo(cx - 12, cy - 28, cx - 18, cy - 18, cx - 22, cy - 8);  // Shoulder curve
        ctx.bezierCurveTo(cx - 24, cy - 2, cx - 21, cy + 10, cx - 25, cy + 18); // Elegant drooping sleeves
        ctx.bezierCurveTo(cx - 15, cy + 16, cx - 12, cy + 5, cx - 8, cy - 5);   // Inner waist

        // Left knee / seated base
        ctx.bezierCurveTo(cx - 15, cy + 12, cx - 24, cy + 22, cx - 24, cy + 28);
        ctx.lineTo(cx + 24, cy + 28); // Seated base width
        
        // Right knee / seated base
        ctx.bezierCurveTo(cx + 24, cy + 22, cx + 15, cy + 12, cx + 8, cy - 5);
        
        // Right shoulder & sleeve
        ctx.bezierCurveTo(cx + 12, cy + 5, cx + 15, cy + 16, cx + 25, cy + 18); // Elegant drooping sleeves
        ctx.bezierCurveTo(cx + 21, cy + 10, cx + 24, cy - 2, cx + 22, cy - 8);
        ctx.bezierCurveTo(cx + 18, cy - 18, cx + 12, cy - 28, cx, cy - 30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 5. Holding a Ruyi or Whisker (手持玉如意/拂尘)
        ctx.beginPath();
        ctx.moveTo(cx, cy - 14);
        ctx.bezierCurveTo(cx - 8, cy - 16, cx - 12, cy - 22, cx - 14, cy - 24);
        ctx.strokeStyle = isNightMode ? "rgba(254, 240, 138, 0.5)" : "rgba(180, 140, 60, 0.4)";
        ctx.lineWidth = 1.3;
        ctx.stroke();

        // Ruyi Head (如意头) - glowing gold spark
        ctx.beginPath();
        ctx.fillStyle = isNightMode ? "rgba(254, 240, 138, 0.85)" : "rgba(217, 119, 6, 0.72)";
        ctx.arc(cx - 14, cy - 24, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 6. Floating Cloud Seat Base (坐于仙云之上)
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.strokeStyle = isNightMode ? "rgba(147, 197, 253, 0.35)" : "rgba(200, 200, 200, 0.38)";
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy + 28);
        ctx.bezierCurveTo(cx - 38, cy + 24, cx - 35, cy + 34, cx - 25, cy + 32);
        ctx.bezierCurveTo(cx - 15, cy + 30, cx - 5, cy + 38, cx, cy + 32);
        ctx.bezierCurveTo(cx + 5, cy + 38, cx + 15, cy + 30, cx + 25, cy + 32);
        ctx.bezierCurveTo(cx + 35, cy + 34, cx + 38, cy + 24, cx + 30, cy + 28);
        ctx.bezierCurveTo(cx + 20, cy + 24, cx - 20, cy + 24, cx - 30, cy + 28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // 7. Shimmering floating stars / Green Jade Birds (青鸟) around Her
        const pTime = s.time * 0.04;
        for (let i = 0; i < 2; i++) {
          const angle = pTime + i * Math.PI;
          const bx = cx + Math.cos(angle) * 32;
          const by = cy - 8 + Math.sin(angle * 1.5) * 16;
          
          ctx.beginPath();
          ctx.fillStyle = isNightMode ? "rgba(147, 197, 253, 0.82)" : "rgba(13, 148, 136, 0.65)";
          ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.beginPath();
          ctx.strokeStyle = isNightMode ? "rgba(147, 197, 253, 0.45)" : "rgba(13, 148, 136, 0.35)";
          ctx.lineWidth = 0.8;
          ctx.moveTo(bx, by);
          ctx.lineTo(bx - Math.cos(angle) * 6, by - Math.sin(angle * 1.5) * 4);
          ctx.stroke();
        }

        ctx.restore();
      };

      // GLOW: Helper function to draw the elegant hand-painted West Queen Mother's Palace (西王母宫)
      const drawXiwangmuPalace = (ctx: CanvasRenderingContext2D, cx: number, cy: number, opacity: number) => {
        if (opacity <= 0) return;
        ctx.save();
        ctx.globalAlpha = opacity;

        // 1. Surrounding Golden Light Dispersion (周围散出金光)
        const goldAura = ctx.createRadialGradient(cx, cy - 15, 0, cx, cy - 15, 75);
        goldAura.addColorStop(0, "rgba(251, 191, 36, 0.28)");
        goldAura.addColorStop(0.5, "rgba(245, 158, 11, 0.12)");
        goldAura.addColorStop(1, "rgba(251, 191, 36, 0)");
        ctx.fillStyle = goldAura;
        ctx.beginPath();
        ctx.arc(cx, cy - 15, 75, 0, Math.PI * 2);
        ctx.fill();

        // Radiating dynamic gold thin sunburst-like rays
        ctx.strokeStyle = "rgba(254, 240, 138, 0.35)";
        ctx.lineWidth = 0.8;
        const numRays = 16;
        const rayRotation = s.time * 0.006;
        for (let i = 0; i < numRays; i++) {
          const angle = (i * Math.PI * 2) / numRays + rayRotation;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 15);
          const length = 45 + Math.sin(s.time * 0.05 + i) * 12;
          ctx.lineTo(cx + Math.cos(angle) * length, cy - 15 + Math.sin(angle) * length);
          ctx.stroke();
        }

        // Float delicate gold shimmer sparks (金屑飞舞) around the palace
        for (let i = 0; i < 6; i++) {
          const sparkAngle = s.time * 0.02 + i * (Math.PI * 2 / 6);
          const dist = 30 + Math.sin(s.time * 0.03 + i * 2) * 15;
          const sx = cx + Math.cos(sparkAngle) * dist;
          const sy = cy - 20 + Math.sin(sparkAngle * 1.3) * 12;
          
          ctx.beginPath();
          ctx.fillStyle = "rgba(253, 224, 71, 0.85)"; // Bright yellow gold
          ctx.shadowColor = "rgba(251, 146, 60, 0.8)";
          ctx.shadowBlur = 4;
          ctx.arc(sx, sy, 1.8 + Math.sin(s.time * 0.08 + i) * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0; // Reset shadow

        // 2. Draw the Palace Outline (轮廓颜色可以是白色)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
        ctx.fillStyle = "rgba(15, 20, 25, 0.45)"; // Semi-transparent backing for structure visibility
        ctx.lineWidth = 1.3;

        // Base foundation/platform of the palace
        const baseW = 54;
        const baseH = 5;
        ctx.beginPath();
        ctx.rect(cx - baseW / 2, cy - baseH, baseW, baseH);
        ctx.fill();
        ctx.stroke();

        // Steps/Stairs leading up
        const stepsW = 16;
        ctx.beginPath();
        ctx.moveTo(cx - stepsW / 2, cy);
        ctx.lineTo(cx - stepsW / 2 + 2, cy - 3);
        ctx.lineTo(cx + stepsW / 2 - 2, cy - 3);
        ctx.lineTo(cx + stepsW / 2, cy);
        ctx.closePath();
        ctx.stroke();

        // Main pillars (4 pillars)
        const colH = 15;
        const colPositions = [-21, -8, 8, 21];
        ctx.beginPath();
        colPositions.forEach(offset => {
          ctx.moveTo(cx + offset, cy - baseH);
          ctx.lineTo(cx + offset, cy - baseH - colH);
        });
        ctx.stroke();

        // Palace Middle Arch / Portal (殿门)
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - baseH);
        ctx.lineTo(cx - 5, cy - baseH - 8);
        ctx.quadraticCurveTo(cx, cy - baseH - 12, cx + 5, cy - baseH - 8);
        ctx.lineTo(cx + 5, cy - baseH);
        ctx.stroke();

        // First Layer Roof / Lower Eaves
        const roof1W = 58;
        const r1y = cy - baseH - colH;
        ctx.beginPath();
        ctx.moveTo(cx - roof1W / 2, r1y + 1);
        ctx.quadraticCurveTo(cx - roof1W / 2 + 10, r1y - 3, cx, r1y - 4);
        ctx.quadraticCurveTo(cx + roof1W / 2 - 10, r1y - 3, cx + roof1W / 2, r1y + 1);
        // Upturned sweep tips (飞檐翘角)
        ctx.quadraticCurveTo(cx + roof1W / 2 - 2, r1y - 4, cx + roof1W / 2 - 6, r1y - 2);
        ctx.lineTo(cx - roof1W / 2 + 6, r1y - 2);
        ctx.quadraticCurveTo(cx - roof1W / 2 + 2, r1y - 4, cx - roof1W / 2, r1y + 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Upper Pavilion Layer
        const subW = 34;
        const subH = 10;
        const r2y = r1y - 4;
        ctx.beginPath();
        ctx.rect(cx - subW / 2, r2y - subH, subW, subH);
        ctx.fill();
        ctx.stroke();

        // Two upper columns
        ctx.beginPath();
        ctx.moveTo(cx - 10, r2y);
        ctx.lineTo(cx - 10, r2y - subH);
        ctx.moveTo(cx + 10, r2y);
        ctx.lineTo(cx + 10, r2y - subH);
        ctx.stroke();

        // Upper Grand Roof (飞檐重檐殿顶)
        const roof2W = 46;
        const topY = r2y - subH;
        ctx.beginPath();
        // Left swept-up corner tip
        ctx.moveTo(cx - roof2W / 2 - 2, topY - 5);
        ctx.quadraticCurveTo(cx - roof2W / 2 + 4, topY - 1, cx - roof2W / 2 + 8, topY - 1);
        ctx.lineTo(cx + roof2W / 2 - 8, topY - 1);
        ctx.quadraticCurveTo(cx + roof2W / 2 - 4, topY - 1, cx + roof2W / 2 + 2, topY - 5);
        ctx.quadraticCurveTo(cx + roof2W / 2 - 2, topY + 1, cx + roof2W / 2 - 6, topY);
        // Center spine slope
        ctx.lineTo(cx, topY - 9);
        ctx.lineTo(cx - roof2W / 2 + 6, topY);
        ctx.quadraticCurveTo(cx - roof2W / 2 + 2, topY + 1, cx - roof2W / 2 - 2, topY - 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Palace Plaque Text (匾额 "西王母宫" symbolized as a tiny golden emblem)
        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.rect(cx - 6, r2y - subH + 2, 12, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(138, 122, 154, 0.95)"; // Soft purple-grey text matching the mood
        ctx.font = "bold 4px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("宮", cx, r2y - subH + 6);

        // Core divine pearl on top (殿顶宝顶放光)
        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.arc(cx, topY - 12, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, topY - 12, 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(254, 240, 138, 0.45)";
        ctx.stroke();

        ctx.restore();
      };

      // GLOW: Draw the seven-colored divine glow and light column at the Sacred Peak (神山显灵效果)
      const drawDivineGlow = (centerX: number, centerY: number) => {
        // Transition daytime opacity gracefully
        const isTriggered = !isNightMode && (s.isSwordFinger || s.forceDivineManifest);
        if (isTriggered) {
          s.xiwangmuOpacity = Math.min(1.0, s.xiwangmuOpacity + 0.012); // smooth fade-in
        } else {
          s.xiwangmuOpacity = Math.max(0.0, s.xiwangmuOpacity - 0.016); // smooth fade-out
        }

        // Transition palace opacity gracefully in night mode
        const isPalaceTriggered = isNightMode && (s.isSwordFinger || s.forceDivineManifest);
        if (isPalaceTriggered) {
          s.palaceOpacity = Math.min(1.0, s.palaceOpacity + 0.012); // smooth fade-in
        } else {
          s.palaceOpacity = Math.max(0.0, s.palaceOpacity - 0.016); // smooth fade-out
        }

        // Master scale factor determined by time of day (fully interactive during day, steady beautiful glow at night)
        const masterOpacity = isNightMode ? 1.0 : s.xiwangmuOpacity;
        if (masterOpacity <= 0) {
          return;
        }

        ctx.save();
        
        // 1. Setup breathing animations
        // 3-5 seconds cycle (e.g. cycle speed = (2 * Math.PI) / (60 * 4) ≈ 0.026 rads per frame)
        const breathePhase = s.time * 0.026;
        const breatheRadMult = 1.0 + Math.sin(breathePhase) * 0.12;       // fluctuation ±12%
        const breatheAlphaMult = 0.9 + Math.sin(breathePhase * 1.5) * 0.1; // alpha fluctuation ±10%

        // Draw light column/spot first before halos to anchor the scene
        // Vertical light column from peak top rising high up to the sky
        ctx.save();
        const beamWidth = 24 * breatheRadMult;
        const vGrad = ctx.createLinearGradient(centerX, centerY, centerX, centerY - 280);
        const alphaBeam = 0.22 * breatheAlphaMult * masterOpacity;
        vGrad.addColorStop(0, `rgba(255, 255, 255, ${alphaBeam})`);
        vGrad.addColorStop(0.15, `rgba(255, 250, 230, ${alphaBeam * 0.8})`);
        vGrad.addColorStop(0.5, `rgba(235, 245, 255, ${alphaBeam * 0.45})`);
        vGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        
        ctx.beginPath();
        ctx.moveTo(centerX - beamWidth/2, centerY);
        ctx.lineTo(centerX + beamWidth/2, centerY);
        ctx.lineTo(centerX + beamWidth/4, centerY - 280);
        ctx.lineTo(centerX - beamWidth/4, centerY - 280);
        ctx.closePath();
        ctx.fillStyle = vGrad;
        ctx.fill();
        ctx.restore();

        // Use "screen" blend mode for soft ink glowing fusion
        ctx.globalCompositeOperation = "screen";

        // 2. Base concentric halos
        const drawHalo = (rad: number, colorStart: string, colorEnd: string, alpha: number) => {
          ctx.beginPath();
          const currentRad = rad * breatheRadMult;
          const currentAlpha = alpha * breatheAlphaMult * masterOpacity;
          const grad = ctx.createRadialGradient(centerX, centerY - 45, 0, centerX, centerY - 45, currentRad);
          grad.addColorStop(0, colorStart.replace("ALPHA", currentAlpha.toString()));
          grad.addColorStop(0.5, colorStart.replace("ALPHA", (currentAlpha * 0.35).toString()));
          grad.addColorStop(1, colorEnd);
          ctx.fillStyle = grad;
          
          // Render as a squashed horizontal ellipse for shanshui perspective
          ctx.ellipse(centerX, centerY - 45, currentRad, currentRad * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
        };

        // Draw shifting rich rainbow halo ("七彩渐变金霞" - soft, gentle, watercolor-like)
        const drawRainbowHalo = (rad: number, alpha: number) => {
          ctx.beginPath();
          const currentRad = rad * breatheRadMult;
          const currentAlpha = alpha * breatheAlphaMult;
          const grad = ctx.createRadialGradient(centerX, centerY - 50, currentRad * 0.15, centerX, centerY - 50, currentRad);
          const shift = s.time * 0.35; // Color rotation over frames
          grad.addColorStop(0, `hsla(${(shift) % 360}, 42%, 66%, ${currentAlpha * 0.72})`);
          grad.addColorStop(0.2, `hsla(${(shift + 60) % 360}, 42%, 66%, ${currentAlpha * 0.58})`);
          grad.addColorStop(0.4, `hsla(${(shift + 120) % 360}, 42%, 66%, ${currentAlpha * 0.45})`);
          grad.addColorStop(0.6, `hsla(${(shift + 180) % 360}, 42%, 66%, ${currentAlpha * 0.30})`);
          grad.addColorStop(0.8, `hsla(${(shift + 240) % 360}, 42%, 66%, ${currentAlpha * 0.12})`);
          grad.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = grad;
          ctx.ellipse(centerX, centerY - 50, currentRad, currentRad * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
        };

        // Inner golden core
        drawHalo(35, "rgba(255, 225, 155, ALPHA)", "rgba(255, 225, 155, 0)", 0.48);
        // Middle majestic watercolor shifting rainbow
        drawRainbowHalo(110, 0.36);
        // Outer light violet backdrop aura
        drawHalo(160, "rgba(230, 195, 255, ALPHA)", "rgba(230, 195, 255, 0)", 0.15);

        // 3. Update & render individual rotating rainbow particles
        const particles = s.glowParticles;
        if (particles && particles.length > 0) {
          particles.forEach(p => {
            // Update circular/spiral coordinate positions
            p.angle += p.angularSpeed;
            p.pulsePhase += p.pulseSpeed;
            
            // Radial breathing
            const currentRad = p.radius + Math.sin(p.pulsePhase) * 8;
            
            // Project polar coords to horizontal ellipse (squashed circular rings looks majestic)
            const pX = centerX + Math.cos(p.angle) * currentRad;
            // centerY matches the flat top edge, then offset by yOffset (which is -30 to -100)
            const pY = centerY + p.yOffset + Math.sin(p.angle) * currentRad * 0.22 + p.driftY;
            
            // Slow vertical hovering drift
            p.driftY = Math.sin(p.pulsePhase * 0.6) * 4;

            // Compute alpha and shifting hue
            const alpha = p.baseAlpha * (0.35 + 0.65 * Math.sin(p.pulsePhase)) * breatheAlphaMult * masterOpacity;
            const currentHue = (p.hue + s.time * 0.08) % 360;

            // Ink wash blending style using soft radial gradients per particle
            ctx.beginPath();
            const pSize = p.size * (0.85 + Math.sin(p.pulsePhase) * 0.15);
            const pGrad = ctx.createRadialGradient(pX, pY, 0, pX, pY, pSize * 2.2);
            pGrad.addColorStop(0, `hsla(${currentHue}, 42%, 72%, ${alpha})`);
            pGrad.addColorStop(0.3, `hsla(${currentHue}, 42%, 72%, ${alpha * 0.35})`);
            pGrad.addColorStop(1, `hsla(${currentHue}, 42%, 72%, 0)`);
            
            ctx.fillStyle = pGrad;
            ctx.arc(pX, pY, pSize * 2.2, 0, Math.PI * 2);
            ctx.fill();

            // Tiny sharp spark core in the center of primary glow
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            ctx.arc(pX, pY, pSize * 0.32, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // 4. Update & render falling celestial mist particles (仙气下降)
        const decParticles = s.descendingParticles;
        if (decParticles && decParticles.length > 0) {
          decParticles.forEach(dp => {
            // Deplete lifetime & advance sway
            dp.life -= dp.decay;
            dp.swayPhase += dp.swayFreq;

            // Shift coordinate offsets downwards & outwards
            dp.relY += dp.vy;
            const sway = Math.sin(dp.swayPhase) * dp.swayAmp;
            dp.relX += dp.vx + sway * 0.15;

            // Reset when faded or drifted past reasonable vertical bounds
            if (dp.life <= 0 || dp.relY > 210) {
              dp.life = 1.0;
              dp.relX = -12 + Math.random() * 24;
              dp.relY = -15 + Math.random() * 12;
              const side = Math.random() > 0.5 ? 1 : -1;
              dp.vx = side * (0.16 + Math.random() * 0.44);
              dp.vy = 0.32 + Math.random() * 0.58;
              dp.alpha = 0.22 + Math.random() * 0.38;
            }

            // Map absolute target locations
            const posX = centerX + dp.relX;
            const posY = centerY + dp.relY;

            const currentAlpha = dp.alpha * dp.life * breatheAlphaMult * masterOpacity;
            const particleHue = (dp.hue + s.time * 0.14) % 360;

            // Render cascading soft ink glow
            ctx.beginPath();
            const gr = ctx.createRadialGradient(posX, posY, 0, posX, posY, dp.size * 2.6);
            gr.addColorStop(0, `hsla(${particleHue}, 36%, 68%, ${currentAlpha})`);
            gr.addColorStop(0.4, `hsla(${particleHue}, 36%, 68%, ${currentAlpha * 0.3})`);
            gr.addColorStop(1, `hsla(${particleHue}, 36%, 68%, 0)`);

            ctx.fillStyle = gr;
            ctx.arc(posX, posY, dp.size * 2.6, 0, Math.PI * 2);
            ctx.fill();

            // Render hot inner core spark
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.72})`;
            ctx.arc(posX, posY, dp.size * 0.35, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // Draw Xiwangmu Apparition right in the center of the divine light column/halos!
        // As s.xiwangmuOpacity increases, she gracefully floats up from centerY and hovers.
        if (s.xiwangmuOpacity > 0) {
          const appY = centerY - 15 - (s.xiwangmuOpacity * 24) + Math.sin(s.time * 0.03) * 3.5;
          drawXiwangmuApparition(ctx, centerX, appY, s.xiwangmuOpacity);
        }

        // Draw Xiwangmu Palace right directly on the flat sacred peak top during night mode!
        if (isNightMode && s.palaceOpacity > 0) {
          drawXiwangmuPalace(ctx, centerX, centerY + 2, s.palaceOpacity);
        }

        ctx.restore();
      };

      const drawSacredPeak = () => {
        ctx.save();
        
        // Deep Charcoal ink base
        ctx.fillStyle = "rgba(20, 25, 30, 0.95)";
        ctx.beginPath();
        ctx.moveTo(leftBaseX, height);
        sacredPeakPoints.forEach(pt => {
          ctx.lineTo(pt.x, pt.y);
        });
        ctx.lineTo(rightBaseX, height);
        ctx.closePath();
        ctx.fill();

        const refX = (s.sunX !== undefined) ? s.sunX : (isNightMode ? virtualWidth * 0.74 : virtualWidth * 0.22);
        const isLightOnRight = refX > bestCenterX;

        // Dynamic gradient highlight overlay
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(leftBaseX, height);
        sacredPeakPoints.forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.lineTo(rightBaseX, height);
        ctx.closePath();
        ctx.clip();

        const hGrad = ctx.createLinearGradient(
          isLightOnRight ? rightBaseX : leftBaseX, horizonY,
          bestCenterX, peakY
        );
        hGrad.addColorStop(0, "rgba(180, 210, 220, 0.25)");
        hGrad.addColorStop(0.5, "rgba(180, 210, 220, 0.12)");
        hGrad.addColorStop(1, "rgba(180, 210, 220, 0.0)");

        ctx.fillStyle = hGrad;
        ctx.fill();
        ctx.restore();

        // Elegant hand-painted ridge line
        ctx.save();
        ctx.strokeStyle = "rgba(15, 20, 25, 0.8)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        sacredPeakPoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();

        // Glowing cyan highlight stroke adaptation
        ctx.save();
        ctx.strokeStyle = "rgba(180, 210, 220, 0.70)";
        ctx.lineWidth = 1.6;
        ctx.shadowColor = "rgba(180, 210, 220, 0.4)";
        ctx.shadowBlur = 4;
        ctx.beginPath();

        const litPoints = isLightOnRight 
          ? sacredPeakPoints.slice(Math.floor(sacredPeakPoints.length * 0.45)) 
          : sacredPeakPoints.slice(0, Math.floor(sacredPeakPoints.length * 0.55));

        litPoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();

        // GLOW: Invoke the seven-colored divine glow aura and pillar above the mountain flat top
        drawDivineGlow(bestCenterX, peakY);

        ctx.restore();
      };

      const drawMountainRange = (
        key: string,
        seedY: number, 
        amplitude: number, 
        freq: number, 
        fillColor: string, 
        isReflected = false,
        reflectionDisplacement = 0
      ) => {
        ctx.save();
        if (isReflected) {
          ctx.globalAlpha = isNight ? 0.2 : 0.35;
          ctx.translate(0, height * 1.24 + reflectionDisplacement);
          ctx.scale(1, -1);
        }
        
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        const pts = getCachedMountain(key, seedY, amplitude, freq);
        for (let idx = 0; idx < pts.length; idx++) {
          const x = idx * 5;
          if (x > virtualWidth) break;
          ctx.lineTo(x, pts[idx]);
        }
        
        ctx.lineTo(virtualWidth, height);
        ctx.closePath();
        ctx.fill();

        // 1. If Night Mode, overlay a semi-transparent linear gradient for moon highlight (面向月亮右侧山体淡青色高光)
        if (isNightMode && !isReflected) {
          ctx.save();
          // Clip to mountain shape so the highlight overlay doesn't spill
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let idx = 0; idx < pts.length; idx++) {
            const x = idx * 5;
            if (x > virtualWidth) break;
            ctx.lineTo(x, pts[idx]);
          }
          ctx.lineTo(virtualWidth, height);
          ctx.closePath();
          ctx.clip();

          // We create a linear gradient directed towards the moon's position (x ≈ virtualWidth * 0.74, height * 0.15)
          const slopeHighlight = ctx.createLinearGradient(0, seedY - amplitude, virtualWidth * 0.78, seedY + amplitude * 1.2);
          slopeHighlight.addColorStop(0, "rgba(15, 23, 42, 0)"); // dark side (#0f172a)
          slopeHighlight.addColorStop(0.3, "rgba(160, 164, 176, 0.02)"); // transition containing warm grey #a0a4b0
          slopeHighlight.addColorStop(0.74, "rgba(160, 164, 176, 0.35)"); // moonlit warm grey #a0a4b0 highlight
          slopeHighlight.addColorStop(1, "rgba(15, 23, 42, 0.12)"); // far-right shadow

          ctx.fillStyle = slopeHighlight;
          ctx.fill();
          ctx.restore();
        }

        // 2. Clear stroke contour line for mountain peak ridges (在山棱轮廓处增加淡青色高光线)
        if (isNightMode && !isReflected) {
          ctx.save();
          ctx.strokeStyle = "rgba(160, 164, 176, 0.65)"; // Warm grey #a0a4b0 highlight line
          ctx.lineWidth = 1.6;
          // Add subtle glow shadow to highlight line
          ctx.shadowBlur = 4;
          ctx.shadowColor = "rgba(160, 164, 176, 0.4)";
          
          ctx.beginPath();
          for (let idx = 0; idx < pts.length; idx++) {
            const x = idx * 5;
            if (x > virtualWidth) break;
            if (idx === 0) {
              ctx.moveTo(x, pts[idx]);
            } else {
              ctx.lineTo(x, pts[idx]);
            }
          }
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();
      };

      // Far Mountains
      if (isNightMode) {
        drawMountainRange("night_far", horizonY - 140, 95, 0.0016, mountainColor1);
      } else {
        drawMountainRange("far", horizonY - 160, 80, 0.002, mountainColor1);
      }
      
      // --- 4. CLOUD STREAMER SYSTEM: ELEMENT 1 (云雾浩渺) ---
      const drawClouds = (drawEven: boolean) => {
        ctx.save();
        ctx.fillStyle = mistColor;
        ctx.shadowColor = mistColor;
        ctx.shadowBlur = 25;

        // Influence cloud velocity using wind variables
        const currentWindForce = currentConfig.windSpeed * cosWindAngle;
        
        s.mists.forEach((mist, idx) => {
          if ((idx % 2 === 0) !== drawEven) return;

          // Compute moving step
          const baseSpeed = 1.6;
          const effectiveSpeed = baseSpeed * mist.speedScale * (1.0 + currentConfig.mistSpeed * 3.0);
          
          const pathLen = mist.pathPoints.length;
          // Wind pushes near clouds more strongly, far clouds lightly
          const windEffect = currentWindForce * (mist.layer === "near" ? 0.35 : 0.12);
          
          let moveAmt = (effectiveSpeed * 0.25 + windEffect * 0.12) * mist.direction;
          if (isNightMode) {
            moveAmt = -moveAmt * 0.5; // Speed halved and direction reversed in night mode
          }
          mist.pathIndex += moveAmt;

          // Wrap boundaries
          if (mist.pathIndex >= pathLen) {
            mist.pathIndex = mist.pathIndex % pathLen;
          } else if (mist.pathIndex < 0) {
            mist.pathIndex = (mist.pathIndex % pathLen) + pathLen;
          }

          // Interpolation calculation for smooth transition along path
          const idx1 = Math.floor(mist.pathIndex) % pathLen;
          const idx2 = (idx1 + 1) % pathLen;
          const t = mist.pathIndex - Math.floor(mist.pathIndex);

          const p1 = mist.pathPoints[idx1];
          const p2 = mist.pathPoints[idx2];
          
          if (!p1 || !p2) return;

          const x = p1.x + (p2.x - p1.x) * t;
          const y = p1.y + (p2.y - p1.y) * t;
          const speedMultiplier = p1.speedMultiplier + (p2.speedMultiplier - p1.speedMultiplier) * t;

          // Apply local terrain speed dampener
          mist.pathIndex += (speedMultiplier - 1.0) * moveAmt * 0.42;

          // Dynamic scale-pulsing and alpha-breathing
          const scaleX = 1.0 + Math.sin(s.time * 0.18 + mist.scalePhaseX) * 0.12;
          const scaleY = 1.0 + Math.cos(s.time * 0.15 + mist.scalePhaseY) * 0.10;
          let currentAlpha = Math.max(0.01, Math.min(0.9, mist.baseAlpha * (0.85 + Math.sin(s.time * 0.1 + mist.alphaPhase) * 0.15)));
          if (isNightMode) {
            currentAlpha *= 0.18; // Cloud mist transparency lowered even more (云雾透明度比白天变薄很多)
          }

          const rx = mist.baseRadiusX * scaleX;
          const ry = mist.baseRadiusY * scaleY;

          ctx.save();
          ctx.beginPath();
          ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
          ctx.clip();

          // 1. Solid base mist layer with watercolor feathering
          ctx.globalAlpha = currentAlpha * currentConfig.mistDensity;
          ctx.fillStyle = mistColor;
          ctx.shadowColor = mistColor;
          ctx.shadowBlur = 24;
          ctx.fill();

          // 2. Rolling soft watercolor ink-grains overlay
          if (s.noisePattern) {
            ctx.globalAlpha = currentAlpha * currentConfig.mistDensity * 0.35;
            ctx.translate(-s.time * 0.6, s.time * 0.15); // UV scroll vector
            ctx.fillStyle = s.noisePattern;
            ctx.fillRect(x - rx * 2 + s.time * 0.6, y - ry * 2 - s.time * 0.15, rx * 4, ry * 4);
          }
          ctx.restore();
        });
        ctx.restore();
      };

      // Draw distant clouds behind intermediate ridge (no allocation)
      drawClouds(true);

      // Midrange Mountains
      if (isNightMode) {
        drawMountainRange("night_mid", horizonY - 90, 120, 0.0031, mountainColor2);
      } else {
        drawMountainRange("mid", horizonY - 80, 100, 0.0035, mountainColor2);
      }

      // PEAK: Draw the Sacred Peak (神山)
      if (insertPeak) {
        drawSacredPeak();
      }

      // Draw fore-ground clouds for high altitude layering depth (no allocation)
      drawClouds(false);

      // Near Hills (Islet formations)
      if (isNightMode) {
        drawMountainRange("night_near", horizonY - 25, 110, 0.0044, mountainColor3);
      } else {
        drawMountainRange("near", horizonY - 20, 125, 0.005, mountainColor3);
      }

      // Distant Shoreline spits and brushwork
      ctx.fillStyle = landColor;
      ctx.beginPath();
      if (isNightMode) {
        // Rearranged shoreline spits (islets) at night to nicely support new willow locations (0.15, 0.52, 0.76)
        ctx.ellipse(virtualWidth * 0.12, horizonY + 2, virtualWidth * 0.14, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(virtualWidth * 0.48, horizonY + 9, virtualWidth * 0.12, 15, 0, 0, Math.PI * 2);
        ctx.ellipse(virtualWidth * 0.73, horizonY + 2, virtualWidth * 0.15, 11, 0, 0, Math.PI * 2);
        ctx.ellipse(virtualWidth * 0.89, horizonY + 12, virtualWidth * 0.14, 16, 0, 0, Math.PI * 2);
      } else {
        ctx.ellipse(virtualWidth * 0.18, horizonY, virtualWidth * 0.15, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(virtualWidth * 0.42, horizonY + 8, virtualWidth * 0.12, 14, 0, 0, Math.PI * 2);
        ctx.ellipse(virtualWidth * 0.68, horizonY - 4, virtualWidth * 0.18, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(virtualWidth * 0.88, horizonY + 12, virtualWidth * 0.14, 16, 0, 0, Math.PI * 2);
      }
      ctx.fill();

      // --- 5. WATER REFLECTIONS AND LAKE (镜水明澜) ---
      // Distort reflections underneath using current ripples
      const getReflectionDistortionAt = (x: number, yInLake: number) => {
        let distortion = 0;
        const targetY = yInLake + horizonY;
        
        // Sum up interference coordinates from active ripples (optimized with box filter + raw math)
        s.ripples.forEach((rp) => {
          const dx = x - rp.x;
          if (Math.abs(dx) > rp.radius + 30) return; // Fast early escape
          const dy = targetY - rp.y;
          if (Math.abs(dy) > rp.radius + 30) return; // Fast early escape
          
          const dist = Math.sqrt(dx * dx + dy * dy);
          const rDiff = dist - rp.radius;
          
          // If ripple boundary intersects coordinate, deform path using decaying cosine wave
          if (Math.abs(rDiff) < 30) {
            const waveFactor = (30 - Math.abs(rDiff)) / 30;
            distortion += Math.sin(rDiff * 0.6) * waveFactor * rp.alpha * 7;
          }
        });

        // Ambient wind current ripples
        distortion += Math.cos(x * 0.08 + s.time * 2.8) * (0.5 + currentConfig.windSpeed * 1.5);
        return distortion * (1.0 - (yInLake / height)); // Reduce distortion at profound depths
      };

      // Fill basic lake surface color matching sky gradient
      ctx.fillStyle = waterColor;
      ctx.fillRect(0, horizonY, virtualWidth, height - horizonY);

      // YUEYANG_LOU: Draw majestic large-scale wave bands ("上下天光，一碧万顷")
      ctx.save();
      const waveCount = 5;
      const waterHeight = height - horizonY;
      ctx.lineWidth = 1.3;
      for (let i = 0; i < waveCount; i++) {
        // Distribute wave channels down the water perspective y-depth
        const relativeY = 15 + (i + 1) * (waterHeight - 25) / (waveCount + 1);
        const y = horizonY + relativeY;

        // Wave lengths 200~400px, amplitudes 3~5px, slow 5~8s period (angular scale adjusted for s.time)
        const wavelength = 200 + i * 50; // 200 to 400px
        const amplitude = 3.0 + (i % 3) * 1.0; // 3 to 5px
        // Wave shift cycle 5~8 seconds
        const periodSeconds = 5.0 + (i * 0.7); // 5 to 8 seconds period
        const speedMultiplier = (2 * Math.PI) / (periodSeconds * 0.9); // scale wave cycle to s.time scale where 1 second approx 0.9 s.time units
        const phase = s.time * speedMultiplier + i * 1.5;

        ctx.strokeStyle = isNightMode 
          ? `rgba(130, 180, 255, ${0.04 + (1 - relativeY / waterHeight) * 0.05})` 
          : `rgba(240, 255, 240, ${0.14 + (1 - relativeY / waterHeight) * 0.16})`;

        ctx.beginPath();
        for (let x = 0; x <= virtualWidth; x += 15) {
          const waveY = y + Math.sin((x / wavelength) * Math.PI * 2 + phase) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, waveY);
          } else {
            ctx.lineTo(x, waveY);
          }
        }
        ctx.stroke();
      }
      ctx.restore();

      // Draw mirrored mountain reflections onto lake surface dynamically!
      ctx.save();
      ctx.globalAlpha = 1.0;
      
      // We will perform pixel-wise reflection distortion on a small scale OR
      // draw distorted reflection contours. Let's paint beautiful wavy reflection overlays.
      ctx.fillStyle = isNightMode ? "rgba(10, 20, 35, 0.45)" : "rgba(50, 50, 40, 0.5)";
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      
      // Reuse pre-generated Midrange mountain points!
      const midKey = isNightMode ? "night_mid" : "mid";
      const midYRef = isNightMode ? horizonY - 90 : horizonY - 80;
      const midAmpRef = isNightMode ? 120 : 100;
      const midFreqRef = isNightMode ? 0.0031 : 0.0035;
      
      const midPts = getCachedMountain(midKey, midYRef, midAmpRef, midFreqRef);
      for (let x = 0; x <= virtualWidth; x += 10) {
        const distort = getReflectionDistortionAt(x, 25);
        // Find cached point index (x / 5)
        const cacheIdx = Math.floor(x / 5);
        const mountainY = midPts[Math.min(cacheIdx, midPts.length - 1)];
        // Calculate mountain profile mirroring (offset from seedY)
        const sinVal = mountainY - midYRef;
        let pReflectedY = horizonY + (sinVal * 0.35) + distort;
        ctx.lineTo(x, pReflectedY);
      }
      ctx.lineTo(virtualWidth, horizonY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // PEAK: Sacred Peak Reflection (matching organic hand-drawn shapes with noise)
      if (insertPeak) {
        ctx.save();
        ctx.globalAlpha = isNightMode ? 0.35 : 0.45;
        ctx.fillStyle = isNightMode ? "rgba(10, 15, 25, 0.65)" : "rgba(20, 25, 30, 0.55)";
        ctx.beginPath();
        ctx.moveTo(leftBaseX, horizonY);
        
        sacredPeakPoints.forEach(pt => {
          const heightVal = horizonY - pt.y;
          const distort = getReflectionDistortionAt(pt.x, 20);
          const rxY = horizonY + (heightVal * 0.45) + distort;
          ctx.lineTo(pt.x, rxY);
        });
        
        ctx.lineTo(rightBaseX, horizonY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Mirror landscape/willows reflected base
      ctx.save();
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = isNightMode ? "rgba(10, 20, 35, 0.45)" : "rgba(50, 50, 40, 0.5)";
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      
      // Reuse pre-generated Near mountain points!
      const nearKey = isNightMode ? "night_near" : "near";
      const nearYRef = isNightMode ? horizonY - 25 : horizonY - 20;
      const nearAmpRef = isNightMode ? 110 : 125;
      const nearFreqRef = isNightMode ? 0.0044 : 0.005;
      
      const nearPts = getCachedMountain(nearKey, nearYRef, nearAmpRef, nearFreqRef);
      for (let x = 0; x <= virtualWidth; x += 8) {
        const distort = getReflectionDistortionAt(x, 15);
        // Find cached point index
        const cacheIdx = Math.floor(x / 5);
        const mountainY = nearPts[Math.min(cacheIdx, nearPts.length - 1)];
        // Calculate mountain profile mirroring (offset from seedY)
        const sinVal = mountainY - nearYRef;
        let pReflectedY = horizonY + (sinVal * 0.5) + distort;
        ctx.lineTo(x, pReflectedY);
      }
      ctx.lineTo(virtualWidth, horizonY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // --- 5.5 CELESTIAL SOURCE WATER REFLECTION (日月印水) ---
      ctx.save();
      const refX = (s.sunX !== undefined) ? s.sunX : (isNightMode ? virtualWidth * 0.74 : (isNight ? virtualWidth * 0.72 : virtualWidth * 0.22));
      const refY = (s.sunY !== undefined) ? s.sunY : (isNightMode ? height * 0.15 : (isNight ? height * 0.15 : height * 0.18));
      
      const baseRadius = (s.sunX !== undefined)
        ? 30
        : (isNightMode ? 30 : (isNight ? 20 : 25));

      // Calculate mirrored Y coordinate with perspective compression (0.52x vertical compression when draggable celestial is active to stay safely inside viewport)
      let reflectedY = (s.sunY !== undefined)
        ? horizonY + (horizonY - refY) * 0.52
        : horizonY + (horizonY - refY) * 0.65;

      // Keep reflection strictly within lake depth limit to prevent falling out-of-view
      const paddingBottom = baseRadius + 15;
      const paddingTop = 6;
      if (reflectedY > height - paddingBottom) {
        reflectedY = height - paddingBottom;
      }
      if (reflectedY < horizonY + paddingTop) {
        reflectedY = horizonY + paddingTop;
      }
      
      // Define a drawing style that mimics ink bleeding/distorting in water
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // 0. Draw the inverted moon shadow reflection (横向拉长的半透明浅黄椭圆月影)
      if (isNightMode) {
        ctx.save();
        ctx.fillStyle = "rgba(255, 230, 170, 0.25)";
        ctx.shadowColor = "rgba(255, 230, 170, 0.4)";
        ctx.shadowBlur = 20;
        
        ctx.beginPath();
        const distortVal = getReflectionDistortionAt(refX, reflectedY - horizonY);
        // Horizontally stretched: e.g. rx = 50px, ry = 14px
        ctx.ellipse(refX + distortVal * 1.5, reflectedY, 50, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 1. Draw vertical shimmering light column trail (水面微光余晖)
      for (let y = horizonY + 1; y < height; y += 3.5) {
        const depthInLake = y - horizonY;
        const distort = getReflectionDistortionAt(refX, depthInLake);
        
        // The column spreads out and fades as it goes down, peak brightness around reflectedY
        const distToBody = Math.abs(y - reflectedY);
        const intensityFactor = Math.max(0, 1.0 - distToBody / (baseRadius * 3.5));
        const trailWidth = (isNight ? 12 : 18) * (0.2 + intensityFactor * 0.8) * (1.0 - (y - horizonY) / (height - horizonY) * 0.4);
        
        if (trailWidth > 0.5) {
          // Add rhythmic shimmer based on wind speed and time
          const wavePhase = s.time * (6.0 + currentConfig.windSpeed * 4.0) + y * 0.12;
          const shimmer = 0.5 + Math.sin(wavePhase) * 0.35;
          ctx.globalAlpha = (isNight ? 0.38 : 0.24) * shimmer * (1.0 - (y - horizonY) / (height - horizonY) * 0.3);
          ctx.strokeStyle = sunMoonColor;
          ctx.lineWidth = 1.6;
          
          ctx.beginPath();
          ctx.moveTo(refX + distort * 1.6 - trailWidth, y);
          ctx.lineTo(refX + distort * 1.6 + trailWidth, y);
          ctx.stroke();
        }
      }

      // 2. Draw main reflected disk of Sun/Moon (水镜映轮) - Exclude in night mode because "静影沉璧" (drawMoonReflection) is already rendered beautifully
      if (!isNightMode) {
        const rx = baseRadius * 1.35;
        const ry = baseRadius * 0.38; // 3.5:1 perspective compression ratio
        
        for (let dy = -ry; dy <= ry; dy += 1.5) {
          const y = reflectedY + dy;
          if (y < horizonY || y > height) continue;
          
          const depthInLake = y - horizonY;
          const normY = dy / ry;
          const halfW = rx * Math.sqrt(Math.max(0, 1.0 - normY * normY));
          
          const distort = getReflectionDistortionAt(refX, depthInLake);
          const wavePhase = s.time * (8.0 + currentConfig.windSpeed * 5.0) + y * 0.2;
          const shimmer = 0.65 + Math.sin(wavePhase) * 0.25;
          
          ctx.globalAlpha = (isNight ? 0.68 : 0.42) * shimmer * (1.0 - Math.abs(normY) * 0.28);
          ctx.strokeStyle = sunMoonColor;
          ctx.lineWidth = 2.0;
          
          ctx.beginPath();
          ctx.moveTo(refX + distort * 1.8 - halfW, y);
          ctx.lineTo(refX + distort * 1.8 + halfW, y);
          ctx.stroke();
        }
      }
      ctx.restore();

      // --- 5.6 REGAL LAKE CURRENT MICRO-RIPPLES (镜波澄彻) ---
      if (isNightMode) {
        ctx.save();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = "rgba(180, 230, 250, 0.15)"; // Faint moonlit cyan-blue sheen across ripples
        
        // Horizontal wave drift with extreme slow cycle: 6.8 seconds
        const waveShift = Math.sin(s.time * (2 * Math.PI / 6.8)) * 25;
        // Vertical breathing phase with 7.5 seconds cycle
        const vertPhase = s.time * (2 * Math.PI / 7.5);

        const waveCount = 32;
        for (let i = 0; i < waveCount; i++) {
          // Deterministic seeding based on i to prevent chaotic flashing/jumping
          const seedX = (i * 149.3) % virtualWidth;
          const seedY = horizonY + 8 + ((i * 29.4) % (height - horizonY - 14));
          const depthFactor = (seedY - horizonY) / (height - horizonY);
          
          // Horizontal length expands down the perspective
          const waveLen = 25 + depthFactor * 75;
          const finalX = (seedX + waveShift) % virtualWidth;
          const finalY = seedY + Math.cos(vertPhase + i) * 1.2;

          ctx.beginPath();
          for (let vx = 0; vx <= waveLen; vx += 5) {
            const px = (finalX + vx) % virtualWidth;
            // Apply sinusoidal wavelets representing tiny localized lake crests
            const microWaveHeight = Math.sin(px * 0.16 + s.time * 1.5) * (0.5 + depthFactor * 1.1);
            if (vx === 0) {
              ctx.moveTo(px, finalY + microWaveHeight);
            } else {
              ctx.lineTo(px, finalY + microWaveHeight);
            }
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // --- 5.7 KOI FISH FREE SWIMMING SYSTEM (锦鲤漫游) ---
      // YUEYANG_LOU: Draw Moon Reflection (静影沉璧) and Golden Sparks (浮光跃金) under water
      drawMoonReflection(ctx, isNightMode, virtualWidth, height);
      updateAndDrawSparks(ctx, isNightMode, virtualWidth, height);

      // Draw the beautiful koi fish
      updateAndDrawKois(ctx, isNightMode, virtualWidth, height);

      // YUEYANG_LOU: Draw low-altitude sandgulls (沙鸥翔集) gliding and dipping over water
      updateAndDrawSeagulls(ctx, isNightMode, virtualWidth, height);

      // --- 6. SWAYING WILLOWS & REEDS ELEMENTS: ELEMENT 3 (杨柳依依) ---
      // Dynamic joint-angle wind math
      // Static configuration for morphological diversity of the three willow trees (prevents per-frame random calculations)
      const willowConfigs = [
        {
          // Index 0: Left-leaning trunk, wide branch spread, long and dense willow strings
          trunkLeanX: -28,       // Leans significantly left
          leftBranchX: -85,      // Wide left branch spread
          rightBranchX: 55,      // Wide right branch spread
          leftBranchY: -180,
          rightBranchY: -175,
          stringLengthL: 125,    // Long strings
          stringLengthR: 120,
          stringCountL: 9,       // High density
          stringCountR: 9,
        },
        {
          // Index 1: Right-leaning trunk, narrow branch spread, short and sparse willow strings
          trunkLeanX: 18,        // Leans clearly right
          leftBranchX: -45,      // Narrower left branch spread
          rightBranchX: 30,      // Narrower right branch spread
          leftBranchY: -155,
          rightBranchY: -165,
          stringLengthL: 75,     // Shorter strings
          stringLengthR: 80,
          stringCountL: 5,       // High sparsity
          stringCountR: 5,
        },
        {
          // Index 2: Upright trunk, medium/balanced branch spread, medium willow strings
          trunkLeanX: -4,        // Stands upright/straight
          leftBranchX: -60,      // Medium left spread
          rightBranchX: 42,      // Medium right spread
          leftBranchY: -170,
          rightBranchY: -175,
          stringLengthL: 100,    // Medium strings
          stringLengthR: 95,
          stringCountL: 7,       // Medium density
          stringCountR: 7,
        }
      ];

      // Detailed joints swaying simulation for dangling branches!
      const drawSwayingWillowStrings = (
        rootX: number, 
        rootY: number, 
        length: number, 
        count: number, 
        scale: number,
        overrideColor?: string
      ) => {
        ctx.save();
        const foliageColor = overrideColor || (isNightMode 
          ? "rgba(60, 53, 48, 0.88)" // Warm deep brown-grey for night mode
          : (currentConfig.timeOfDay === TimeOfDay.NIGHT 
            ? "rgba(16, 28, 36, 0.85)" 
            : "rgba(34, 58, 48, 0.85)"));
        
        ctx.strokeStyle = foliageColor;
        ctx.fillStyle = foliageColor;

        // Render multiple hanging vines with multi-segment joints
        for (let i = 0; i < count; i++) {
          // Fan out anchors around root coordinates
          const angleOffset = (i / (count - 1) - 0.5) * 1.6;
          const startX = rootX + Math.sin(angleOffset) * 20 * scale;
          const startY = rootY + Math.cos(angleOffset) * 10 * scale;

          let cx = startX;
          let cy = startY;
          
          ctx.lineWidth = 0.9 * scale;
          ctx.beginPath();
          ctx.moveTo(cx, cy);

          const segments = 6;
          const segLen = (length / segments) * scale;
          
          // Drag states for segments to make them sway dynamically
          const points: { x: number; y: number }[] = [{ x: cx, y: cy }];

          for (let j = 1; j <= segments; j++) {
            // Sway equation: Sine of time offsets + wind vector amplification
            const delay = j * 0.28;
            const cosWindPhaseDelay = Math.cos(s.windPhase - delay);
            // Align sway coordinate offset to directional orientation
            const swayAmp = (3.5 + Math.sin(s.time * 2.1 - delay + i) * 2.0) * currentConfig.windSpeed * (j * 1.1) * scale;
            const windOffset = cosWindAngle * (1.5 + currentConfig.windSpeed * 4.5) * (j * 1.5) * scale;
            
            cx += Math.sin(angleOffset + cosWindPhaseDelay * 0.1) * segLen + windOffset + cosWindPhaseDelay * swayAmp;
            cy += Math.cos(angleOffset) * segLen * 0.92;
            
            points.push({ x: cx, y: cy });
            ctx.lineTo(cx, cy);
          }
          ctx.stroke();

          // Render leafy drapes along joint lines (OPTIMIZED: No save/restore matrix translations)
          const leafSizeWidth = 4.2 * scale;
          const leafSizeHeight = 2.0 * scale;
          ctx.globalAlpha = 0.85;

          points.forEach((pt, k) => {
            if (k === 0) return;
            const prev = points[k - 1];

            // Paint canvas ellipse angle using pt center directly
            const angle = Math.atan2(pt.y - prev.y, pt.x - prev.x);
            const angleLeft = angle + Math.PI / 4;

            // Left leaf
            ctx.beginPath();
            ctx.ellipse(pt.x, pt.y, leafSizeWidth, leafSizeHeight, angleLeft, 0, Math.PI * 2);
            ctx.fill();

            // Right leaf (angleLeft - Math.PI / 2)
            ctx.beginPath();
            ctx.ellipse(pt.x, pt.y, leafSizeWidth, leafSizeHeight, angleLeft - Math.PI / 2, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        ctx.restore();
      };

      // Fully unified helper to draw a willow tree with custom morphology configuration
      const drawWillowTree = (
        bx: number, 
        by: number, 
        scale: number, 
        configIndex: number, 
        overrideColor?: string
      ) => {
        const conf = willowConfigs[configIndex];
        
        ctx.save();
        const defaultTrunkColor = isNightMode ? "rgba(58, 53, 48, 1.0)" : landColor; // Warm dark grey-brown in night mode
        ctx.strokeStyle = overrideColor || defaultTrunkColor;
        ctx.lineWidth = 14 * scale;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(bx, by);
        
        // Sway the trunk slightly based on wind
        const trunkSway = Math.cos(s.windPhase * 0.5) * (3 * scale) * currentConfig.windSpeed;
        
        // Quad curve for trunk curve utilizing lean configuration
        const midLeanX = conf.trunkLeanX * 0.66;
        const topLeanX = conf.trunkLeanX;
        
        ctx.quadraticCurveTo(
          bx + midLeanX * scale + trunkSway * 0.5, 
          by - 60 * scale, 
          bx + topLeanX * scale + trunkSway, 
          by - 120 * scale
        );
        ctx.stroke();

        // Branches
        ctx.lineWidth = 6 * scale;
        ctx.beginPath();
        ctx.moveTo(bx + topLeanX * scale + trunkSway, by - 120 * scale);
        
        // Left Branch splitting
        ctx.quadraticCurveTo(
          bx + (topLeanX - 25) * scale, 
          by - 150 * scale, 
          bx + conf.leftBranchX * scale + trunkSway * 1.5, 
          by + conf.leftBranchY * scale
        );
        ctx.moveTo(bx + topLeanX * scale + trunkSway, by - 120 * scale);
        
        // Right Branch splitting
        ctx.quadraticCurveTo(
          bx + (topLeanX + 15) * scale, 
          by - 145 * scale, 
          bx + conf.rightBranchX * scale + trunkSway * 1.2, 
          by + conf.rightBranchY * scale
        );
        ctx.stroke();
        ctx.restore();

        // Left branch strings
        drawSwayingWillowStrings(
          bx + conf.leftBranchX * scale, 
          by + conf.leftBranchY * scale, 
          conf.stringLengthL, 
          conf.stringCountL, 
          scale, 
          overrideColor
        );

        // Right branch strings
        drawSwayingWillowStrings(
          bx + conf.rightBranchX * scale, 
          by + conf.rightBranchY * scale, 
          conf.stringLengthR, 
          conf.stringCountR, 
          scale, 
          overrideColor
        );

        // Draw elegant soft pale yellow moonlight highlight seeds on tree crowns/tip areas (树梢针点黄光)
        if (isNightMode && !overrideColor) {
          ctx.save();
          ctx.fillStyle = "rgba(255, 238, 180, 0.85)"; // Pale warm yellow moon reflection highlight
          ctx.shadowBlur = 5;
          ctx.shadowColor = "#ffe6aa";
          
          const dots = [
            { x: bx + topLeanX * scale + trunkSway, y: by - 120 * scale },
            { x: bx + conf.leftBranchX * scale + trunkSway * 1.4, y: by + conf.leftBranchY * scale },
            { x: bx + conf.rightBranchX * scale + trunkSway * 1.15, y: by + conf.rightBranchY * scale },
            { x: bx + (topLeanX - 12) * scale + trunkSway * 1.05, y: by - 135 * scale },
            { x: bx + (topLeanX + 10) * scale + trunkSway * 1.05, y: by - 130 * scale },
          ];
          
          dots.forEach((dot) => {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, 2.0 * scale, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        }
      };

      // Big Willow (Left islet)
      const willowX1 = isNightMode ? virtualWidth * 0.15 : virtualWidth * 0.22;
      const willowY1 = isNightMode ? horizonY + 8 : horizonY + 5;
      const scale1 = isNightMode ? 0.85 : 1.0;
      const config1 = isNightMode ? 2 : 0;
      drawWillowTree(willowX1, willowY1, scale1, config1);

      // Sibling Willow (Middle islet)
      const willowX2 = isNightMode ? virtualWidth * 0.52 : virtualWidth * 0.45;
      const willowY2 = isNightMode ? horizonY + 14 : horizonY + 12;
      const scale2 = isNightMode ? 1.06 : 0.75;
      const config2 = isNightMode ? 0 : 1;
      drawWillowTree(willowX2, willowY2, scale2, config2);

      // Third Willow (Right islet spit)
      const willowX3 = isNightMode ? virtualWidth * 0.76 : virtualWidth * 0.68;
      const willowY3 = isNightMode ? horizonY + 6 : horizonY + 8;
      const scale3 = isNightMode ? 0.75 : 0.85;
      const config3 = isNightMode ? 1 : 2;
      drawWillowTree(willowX3, willowY3, scale3, config3);

      // --- Mirror Willow Reflections ---
      ctx.save();
      ctx.globalAlpha = 1.0;
      ctx.translate(0, horizonY * 2);
      ctx.scale(1, -1);
      
      // Distort slightly using horizontal sweep
      const refSway = Math.sin(s.time * 1.5) * 8 * currentConfig.windSpeed;
      ctx.translate(refSway, 0);

      const reflColor = isNightMode ? "rgba(10, 20, 35, 0.45)" : "rgba(50, 50, 40, 0.5)";

      // Willow 1 reflection
      drawWillowTree(willowX1, horizonY - (isNightMode ? 8 : 5), isNightMode ? 0.72 : 0.82, config1, reflColor);

      // Willow 2 reflection
      drawWillowTree(willowX2, horizonY - (isNightMode ? 14 : 12), isNightMode ? 0.88 : 0.62, config2, reflColor);

      // Willow 3 reflection
      drawWillowTree(willowX3, horizonY - (isNightMode ? 6 : 8), isNightMode ? 0.62 : 0.7, config3, reflColor);
      ctx.restore();

      // Shore rush / Grass on Left and Right islets (摇曳小草)
      const drawReeds = (bx: number, by: number, count: number, maxH: number) => {
        ctx.save();
        const grassColor = isNightMode || currentConfig.timeOfDay === TimeOfDay.NIGHT 
          ? "rgba(10, 20, 28, 0.9)" 
          : "rgba(22, 38, 28, 0.9)";
        ctx.strokeStyle = grassColor;
        ctx.fillStyle = grassColor;

        for (let i = 0; i < count; i++) {
          const rx = bx + (i - count / 2) * 4;
          const h = (maxH * 0.6) + Math.random() * (maxH * 0.5);
          
          // Bending math
          const delay = i * 0.15;
          const windSway = Math.sin(s.time * 2.8 - delay) * (2.5 * currentConfig.windSpeed);
          const windBend = Math.cos(currentConfig.windAngle) * (4 * currentConfig.windSpeed);

          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(rx, by);
          ctx.quadraticCurveTo(
            rx + windBend * 0.5, 
            by - h * 0.5, 
            rx + windBend + windSway, 
            by - h
          );
          ctx.stroke();
        }
        ctx.restore();
      };

      // Draw grasses on islets
      if (isNightMode) {
        // Aligned of islet locations and night willow trees (0.15, 0.52, 0.76)
        drawReeds(virtualWidth * 0.11, horizonY + 6, 12, 18);
        drawReeds(willowX1 + 12, horizonY + 8, 10, 14);
        drawReeds(willowX2 + 15, horizonY + 11, 8, 12);
        drawReeds(willowX3 + 10, horizonY + 9, 9, 15);
        drawReeds(virtualWidth * 0.66, horizonY + 14, 10, 16);
        drawReeds(virtualWidth * 0.92, horizonY + 12, 14, 18);
      } else {
        drawReeds(virtualWidth * 0.14, horizonY + 6, 12, 18);
        drawReeds(willowX1 + 15, horizonY + 8, 10, 14);
        drawReeds(willowX2 + 10, horizonY + 11, 8, 12);
        drawReeds(willowX3 + 12, horizonY + 9, 9, 15);
        drawReeds(virtualWidth * 0.62, horizonY + 14, 10, 16);
        drawReeds(virtualWidth * 0.92, horizonY + 12, 14, 18);
      }

      // --- 7. DYNAMIC WHITE HORSE: ELEMENT 2 (白马饮溪) ---
      // Position white horse dynamically rigged based on drinking/neck bend angle
      const runHorsePhysics = () => {
        // Handle walking / movement in grazing state (幽行悠步)
        if (currentConfig.horseState === "grazing" && !s.isHorseDrinking) {
          // Walk speed: update offset by walk direction
          const walkSpeed = 0.22;
          s.horseXOffset += s.horseDirection * walkSpeed;
          
          // Limits of walking shoreline: let it walk between -50px and +25px
          if (s.horseXOffset < -50) {
            s.horseXOffset = -50;
            s.horseDirection = 1; // Turn right
          } else if (s.horseXOffset > 25) {
            s.horseXOffset = 25;
            s.horseDirection = -1; // Turn left
          }
        } else if (currentConfig.horseState === "alert") {
          // Alert state: remain standing, slowly ease back to the original spot
          s.horseXOffset += (0 - s.horseXOffset) * 0.03;
        }

        // Handle drinking cycle timeline
        if (s.isHorseDrinking) {
          s.horseTimer += 1;
          
          if (s.horseTimer < 90) { 
            // Phase 1: Lowering neck (Takes 1.5 seconds at 60fps)
            s.horseNeckAngle += (1.0 - s.horseNeckAngle) * 0.05;
          } else if (s.horseTimer < 210) { 
            // Phase 2: Active drinking (Takes 2 seconds)
            s.horseNeckAngle = 1.0;
            
            // Continuous water ripples centered on horse muzzle!
            if (s.horseTimer % 35 === 0) { 
              const rippleX = (virtualWidth * 0.81 + s.horseXOffset) + 19 * 1.15 * s.horseDirection;
              const rippleY = horizonY + 12;
              s.ripples.push({
                x: rippleX,
                y: rippleY,
                radius: 1,
                maxRadius: 40 + Math.random() * 45,
                alpha: 0.6,
                speed: 1.0 + Math.random() * 0.5,
              });
              
              if (currentConfig.soundscapesEnabled) {
                shanshuiSynth.playWaterSplash();
              }
            }
          } else if (s.horseTimer < 300) { 
            // Phase 3: Lifting neck
            s.horseNeckAngle += (0.0 - s.horseNeckAngle) * 0.05;
          } else {
            // Finished sequence
            s.horseNeckAngle = 0.0;
            s.isHorseDrinking = false;
            s.horseTimer = 0;
          }
        } else {
          // Standing alert or idle grazing cycles
          const baseGrazingSway = Math.sin(s.time * 0.45) * 0.03;
          s.horseNeckAngle = Math.max(0, 0.02 + baseGrazingSway);
          
          // Randomly trigger drinking cycle occasionally to keep it alive
          if (Math.random() < 0.001) {
            triggerHorseDrinking();
          }
        }
      };

      runHorsePhysics();

      const drawHorse = (hx: number, hy: number, scale: number, isReflected = false) => {
         ctx.save();
         
         if (isReflected) {
           // Flip horse scale below waterline
           ctx.globalAlpha = isNight ? 0.15 : 0.28;
           ctx.translate(hx, hy + (horizonY - hy) * 2 - 2);
           ctx.scale(1, -1);
           // Wave reflection horizontal jitter
           const distort = getReflectionDistortionAt(hx, 15);
           ctx.translate(distort * 0.5, 0);
         } else {
           ctx.translate(hx, hy);
         }

         ctx.scale(s.horseDirection * scale, scale);

         // Dynamic leg swinging when walking (grazing state)
         let backLeftLegSwing = 0;
         let backRightLegSwing = 0;
         let frontLeftLegSwing = 0;
         let frontRightLegSwing = 0;
         
         if (currentConfig.horseState === "grazing" && !s.isHorseDrinking) {
           // Generate alternating swing angles for the 4 legs base walking animation
           const swingPhase = s.time * 7.5; 
           const swingAmp = 7.0; 
           backLeftLegSwing = Math.sin(swingPhase) * swingAmp;
           backRightLegSwing = -Math.sin(swingPhase) * swingAmp;
           frontLeftLegSwing = -Math.cos(swingPhase) * swingAmp;
           frontRightLegSwing = Math.cos(swingPhase) * swingAmp;
         }

         // Dynamic joint bone rigs offsets
         // Lower the neck base joint slightly and use a larger overall angle factor for a deeper bend
         const jointYShift = s.horseNeckAngle * 10;
         const jointXShift = s.horseNeckAngle * 2.5;
         const neckAngle = s.horseNeckAngle * 1.25; 
         const tailWag = Math.sin(s.time * 2.2) * 0.12 * (1.1 - currentConfig.windSpeed * 0.4);

         // Canvas Ink stroke stylings for the white horse
         ctx.strokeStyle = "rgba(40, 48, 55, 0.75)"; // Outlines
         ctx.fillStyle = isReflected ? "rgba(220, 225, 230, 0.58)" : "rgba(253, 253, 254, 0.98)";   // Soft porcelain white body
         ctx.lineWidth = 1.5;
         ctx.lineJoin = "round";
         ctx.lineCap = "round";

         // Draw body silhouette with subtle drop shadow wash
         if (!isReflected) {
           ctx.shadowColor = "rgba(50, 60, 70, 0.08)";
           ctx.shadowBlur = 8;
         }

         ctx.beginPath();
         
         // 1. HORSE LEG ANCHORS
         // Back Left Leg
         ctx.moveTo(-16, 2);
         ctx.quadraticCurveTo(-14 + backLeftLegSwing * 0.5, 15, -13 + backLeftLegSwing, 28);
         ctx.lineTo(-11 + backLeftLegSwing, 28);
         ctx.quadraticCurveTo(-12 + backLeftLegSwing * 0.5, 14, -10, 2);

         // Back Right Leg
         ctx.moveTo(-24, 2);
         ctx.quadraticCurveTo(-23 + backRightLegSwing * 0.5, 16, -21 + backRightLegSwing, 28);
         ctx.lineTo(-19 + backRightLegSwing, 28);
         ctx.quadraticCurveTo(-21 + backRightLegSwing * 0.5, 15, -17, 2);

         // Front Left Leg
         ctx.moveTo(12, 1);
         ctx.quadraticCurveTo(11 + frontLeftLegSwing * 0.5, 15, 13 + frontLeftLegSwing, 28);
         ctx.lineTo(15 + frontLeftLegSwing, 28);
         ctx.quadraticCurveTo(13 + frontLeftLegSwing * 0.5, 14, 16, 1);

         // Front Right Leg
         ctx.moveTo(4, 1);
         ctx.quadraticCurveTo(5 + frontRightLegSwing * 0.5, 16, 6 + frontRightLegSwing, 28);
         ctx.lineTo(8 + frontRightLegSwing, 28);
         ctx.quadraticCurveTo(7 + frontRightLegSwing * 0.5, 15, 9, 1);
         ctx.stroke();

         // 2. HORSE TORSO/BODY
         ctx.beginPath();
         ctx.moveTo(-24, -3); // Rear
         ctx.quadraticCurveTo(-26, -16, -18, -18); // Rump curve
         ctx.quadraticCurveTo(2, -19, 12, -14);    // Back ridge
         ctx.quadraticCurveTo(14, -5, 12, 2);      // Shoulder joint
         ctx.quadraticCurveTo(0, 4, -14, 3);       // Underbelly
         ctx.quadraticCurveTo(-25, 3, -24, -3);    // Flank
         ctx.closePath();
         ctx.fill();
         ctx.stroke();

         // 3. MOVABLE NECK AND HEAD (Rigged by neckAngle pivot!)
         ctx.save();
         ctx.translate(10 + jointXShift, -14 + jointYShift); // Joint coordinate anchor base sliding
         ctx.rotate(neckAngle);

        ctx.beginPath();
        ctx.moveTo(3, 4); // Throat latch
        // Bends organic long neck stroke
        ctx.quadraticCurveTo(10, -2, 17, -19); // Back of neck
        ctx.quadraticCurveTo(24, -22, 29, -21); // Forehead / poll line
        ctx.quadraticCurveTo(25, -13, 20, -11); // Muzzle end
        ctx.quadraticCurveTo(12, -7, 10, 4);    // Neck front
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw cute little traditional ink triangle ears which perk forward/back
        ctx.beginPath();
        ctx.moveTo(15, -19);
        ctx.lineTo(16, -24);
        ctx.lineTo(19, -21);
        ctx.closePath();
        ctx.fillStyle = isNight ? "#111827" : "#374151";
        ctx.fill();

        // Ink wash Mane
        ctx.beginPath();
        ctx.moveTo(3, -2);
        ctx.quadraticCurveTo(10, -8, 14, -17);
        ctx.strokeStyle = "rgba(100, 108, 115, 0.5)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        // 4. TAIL (Wags in the breeze!)
        ctx.save();
        ctx.translate(-24, -12);
        ctx.rotate(tailWag);
        ctx.strokeStyle = "rgba(110, 118, 125, 0.45)";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-10, 5, -8, 22);
        ctx.stroke();
        ctx.restore();

        ctx.restore();
      };

      // Draw Horse standing on right spit spit shore
      const horseXPos = virtualWidth * 0.81 + s.horseXOffset;
      const horseYPos = horizonY - 14;
      
      // Mirror water reflection first, so body overrides reflected base beautifully
      drawHorse(horseXPos, horseYPos, 1.15, true);
      drawHorse(horseXPos, horseYPos, 1.15, false);

      // BIRD: Draw ink wash bird flock flying across the sky
      updateAndDrawBirds(ctx, height, virtualWidth);

      // --- 9. ANIMATE INTERACTIVE RIPPLE WAVES (水华涟漪) ---
      ctx.save();
      ctx.lineWidth = 1.0;
      for (let idx = s.ripples.length - 1; idx >= 0; idx--) {
        const rp = s.ripples[idx];
        // Expand wave radius
        rp.radius += rp.speed;
        // Fade alpha with distance decay
        rp.alpha = (1.0 - rp.radius / rp.maxRadius) * 0.45;

        if (rp.radius >= rp.maxRadius) {
          s.ripples.splice(idx, 1);
          continue;
        }

        // Staggered delay handling: skip drawing if radius is not yet positive
        if (rp.radius <= 0) {
          continue;
        }

        // Draw elegant thin concentric ellipsis waves (perspectively squished!)
        ctx.strokeStyle = isNight 
          ? `rgba(255, 255, 255, ${rp.alpha})` 
          : `rgba(40, 50, 60, ${rp.alpha * 0.6})`;
        
        ctx.beginPath();
        // 3:1 aspect ratio mapping coordinates squishing for flat perspective of the lake!
        ctx.ellipse(rp.x, rp.y, rp.radius, rp.radius * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // --- 10. BRUSHWORK WRITING AND INK PAINT DRAWINGS (挥毫泼墨) ---
      // Draw users custom calligraphy strokes in real-time, fading them out with rice paper absorption
      ctx.save();
      for (let strokeIdx = inkStrokes.length - 1; strokeIdx >= 0; strokeIdx--) {
        const stroke = inkStrokes[strokeIdx];
        if (stroke.points.length < 2) continue;

        // Animate bleed diffusion over time to blend into rice paper
        stroke.alpha -= 0.0006 * (2.1 - currentConfig.mistDensity); // Vanishes slowly
        stroke.width += 0.015; // Ink spread

        if (stroke.alpha <= 0.01) {
          // Remove dead strokes
          inkStrokes.splice(strokeIdx, 1);
          continue;
        }

        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = stroke.alpha;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        // Paint calligraphy ink with organic pressure sensitivity!
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        
        for (let p = 1; p < stroke.points.length; p++) {
          const pt = stroke.points[p];
          ctx.lineWidth = stroke.width * pt.pressure;
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
        }
      }

      // Render active stroke drag in progress
      if (s.activeDrawing && s.activeDrawing.points.length >= 2) {
        ctx.strokeStyle = s.activeDrawing.color;
        ctx.globalAlpha = 1.0;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        
        ctx.beginPath();
        ctx.moveTo(s.activeDrawing.points[0].x, s.activeDrawing.points[0].y);
        for (let p = 1; p < s.activeDrawing.points.length; p++) {
          const pt = s.activeDrawing.points[p];
          ctx.lineWidth = s.activeDrawing.width * pt.pressure;
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
        }
      }
      ctx.restore();

      // --- 11. RED CALLIGRAPHY STAMP ACCENT (落款朱印) ---
      // Adds a highly immersive, beautiful visual red stamp signature in client-view margins
      ctx.save();
      ctx.globalAlpha = isNight ? 0.22 : 0.75;
      const stampX = virtualWidth * 0.94;
      const stampY = height * 0.12;
      ctx.fillStyle = "#dc2626"; // Vermillion stamp red
      ctx.fillRect(stampX, stampY, 16, 22);
      ctx.strokeStyle = isNight ? "rgba(0,0,0,0.5)" : "#f5f5f4";
      ctx.lineWidth = 1.0;
      ctx.strokeRect(stampX + 1, stampY + 1, 14, 20);

      // Tiny white ancient seal script indicator dots
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 6px serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText("墨", stampX + 8, stampY + 6);
      ctx.fillText("境", stampX + 8, stampY + 14);
      ctx.restore();

      // FIREFLIES: Draw independent floating fireflies hovering over water/grass surfaces in night mode
      if (isNightMode) {
        updateAndDrawFireflies(ctx, virtualWidth, height);
      }

      // --- 12. DRAW INTERACTIVE TOPMOST DAYTIME SUN ---
      if (!isNightMode && s.sunX !== undefined && s.sunY !== undefined) {
        // MODIFIED: 三足乌/玉兔 - Replacing circular sun with a beautifully animated golden Sanzuwu (Three-legged crow)
        ctx.save();
        
        // Soft glowing sun halo aura underneath the bird
        ctx.save();
        ctx.shadowColor = "rgba(253, 224, 71, 0.55)";
        ctx.shadowBlur = 40;
        const grad = ctx.createRadialGradient(s.sunX, s.sunY, 0, s.sunX, s.sunY, 40);
        grad.addColorStop(0, "rgba(255, 255, 230, 0.75)"); // Warm inner core
        grad.addColorStop(0.4, "rgba(254, 215, 170, 0.45)"); // Soft orange-yellow
        grad.addColorStop(1, "rgba(251, 146, 60, 0)");        // Outer dissipation
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.sunX, s.sunY, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Save position context for bird
        ctx.save();
        ctx.translate(s.sunX, s.sunY);

        // Dynamic flapping cycle using frame/time
        const timeFlap = performance.now();
        const flap = Math.sin(timeFlap * 0.005) * 12; // wings flapping

        ctx.strokeStyle = "rgba(20, 19, 16, 0.9)"; // Ink outline
        ctx.lineWidth = 1.8;

        // Draw Left Wing (Golden with ink-wash details)
        ctx.beginPath();
        ctx.fillStyle = "#d4a030";
        ctx.moveTo(0, -2);
        ctx.quadraticCurveTo(-15, -20 - flap, -32, -10 - flap / 2);
        ctx.quadraticCurveTo(-18, 5 - flap / 4, 0, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw Right Wing
        ctx.beginPath();
        ctx.fillStyle = "#d4a030";
        ctx.moveTo(0, -2);
        ctx.quadraticCurveTo(15, -20 - flap, 32, -10 - flap / 2);
        ctx.quadraticCurveTo(18, 5 - flap / 4, 0, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw Tail Feathers (Three elegant dangling ink-washed strands)
        ctx.fillStyle = "#d4a030";
        ctx.lineWidth = 1.2;
        // Tail center
        ctx.beginPath();
        ctx.moveTo(-3, 8);
        ctx.quadraticCurveTo(0, 24, 0, 32);
        ctx.quadraticCurveTo(3, 20, 3, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Left tail fork
        ctx.beginPath();
        ctx.moveTo(-4, 6);
        ctx.quadraticCurveTo(-10, 21, -12, 27);
        ctx.quadraticCurveTo(-5, 17, -1, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right tail fork
        ctx.beginPath();
        ctx.moveTo(4, 6);
        ctx.quadraticCurveTo(10, 21, 12, 27);
        ctx.quadraticCurveTo(5, 17, 1, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw Legs (Three distinct legs with claws!)
        ctx.strokeStyle = "rgba(20, 19, 16, 0.95)";
        ctx.lineWidth = 1.2;
        const legLength = 10;
        const legXOffsets = [-4, 0, 4];
        for (const lx of legXOffsets) {
          ctx.beginPath();
          ctx.moveTo(lx, 4);
          ctx.lineTo(lx - 1, 4 + legLength);
          ctx.stroke();

          // Small claw spurs
          ctx.beginPath();
          ctx.moveTo(lx - 1, 4 + legLength);
          ctx.lineTo(lx - 3, 4 + legLength + 2);
          ctx.moveTo(lx - 1, 4 + legLength);
          ctx.lineTo(lx - 1, 4 + legLength + 3);
          ctx.moveTo(lx - 1, 4 + legLength);
          ctx.lineTo(lx + 1, 4 + legLength + 1);
          ctx.stroke();
        }

        // Draw bird body torso
        ctx.beginPath();
        ctx.fillStyle = "#d4a030";
        ctx.lineWidth = 2.0;
        ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.arc(0, -9, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Red Crown / Crest
        ctx.fillStyle = "#dc2626"; // Vermillion red
        ctx.beginPath();
        ctx.arc(0, -14, 2, 0, Math.PI * 2);
        ctx.fill();

        // Beak pointing upward
        ctx.beginPath();
        ctx.strokeStyle = "rgba(20, 19, 16, 0.95)";
        ctx.lineWidth = 1.5;
        ctx.moveTo(0, -9);
        ctx.lineTo(0, -15);
        ctx.stroke();

        ctx.restore();

        // Scatter a few sparks / rays around the golden bird dynamically
        for (let i = 0; i < 4; i++) {
          const pAngle = (timeFlap * 0.001 + i * Math.PI / 2) % (Math.PI * 2);
          const pDist = 35 + Math.sin(timeFlap * 0.002 + i) * 10;
          const px = s.sunX + Math.cos(pAngle) * pDist;
          const py = s.sunY + Math.sin(pAngle) * pDist;
          const size = 1.5 + Math.sin(timeFlap * 0.01 + i) * 0.5;
          ctx.fillStyle = "rgba(253, 224, 71, 0.75)";
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // MODIFIED: 三足乌/玉兔 - Ensure Halo Particles update and draw in translated workspace
      if (s.inkHaloParticles && s.inkHaloParticles.length > 0) {
        for (let i = s.inkHaloParticles.length - 1; i >= 0; i--) {
          const p = s.inkHaloParticles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.94; // friction
          p.vy *= 0.94;
          p.life -= p.decay;

          if (p.life <= 0) {
            s.inkHaloParticles.splice(i, 1);
            continue;
          }

          ctx.save();
          const alpha = p.alpha * p.life;
          ctx.globalAlpha = alpha;

          const size = p.size * (1 + (1 - p.life) * 1.5);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = size * 1.2;

          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
          grad.addColorStop(0, p.color);
          const edgeColor = p.color.replace(/[\d\.]+\)$/, "0)");
          grad.addColorStop(1, edgeColor);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // Restore major handscroll translation context to return to screen coordinates
      ctx.restore();

      // --- 13. DRAW MULTI-SENSORY INK-WASH GESTURE POINTER (手势墨迹指示器) ---
      if (s.handVisible && s.handX !== undefined && s.handY !== undefined) {
        ctx.save();
        const isPinching = s.isPinching;
        const radius = isPinching ? 18 : 10;
        
        // Outer soft glowing ink aura
        const grad = ctx.createRadialGradient(s.handX, s.handY, 0, s.handX, s.handY, radius * 3.2);
        grad.addColorStop(0, isPinching ? "rgba(43, 40, 36, 0.45)" : "rgba(100, 95, 90, 0.22)");
        grad.addColorStop(1, "rgba(43, 40, 36, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.handX, s.handY, radius * 3.2, 0, Math.PI * 2);
        ctx.fill();

        // Ink drop bleeding center dot
        ctx.beginPath();
        ctx.fillStyle = isPinching ? "rgba(25, 25, 25, 0.82)" : "rgba(75, 75, 75, 0.60)";
        ctx.arc(s.handX, s.handY, radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Elegant incomplete Zen-enso calligraphy circle (禅圆)
        ctx.strokeStyle = isPinching ? "rgba(30, 30, 30, 0.72)" : "rgba(95, 95, 95, 0.38)";
        ctx.lineWidth = isPinching ? 2.6 : 1.4;
        ctx.beginPath();
        ctx.arc(s.handX, s.handY, radius, 0.15, Math.PI * 1.82);
        ctx.stroke();

        // If pinching the active sun or moon, overlay dynamic visual convergence beam lines
        if (s.isDraggingSun) {
          const sunScreenX = s.sunX - s.scrollOffset;
          const sunScreenY = s.sunY;
          ctx.strokeStyle = isNightMode ? "rgba(254, 240, 138, 0.35)" : "rgba(251, 146, 60, 0.45)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(s.handX, s.handY);
          ctx.lineTo(sunScreenX, sunScreenY);
          ctx.stroke();
        }

        ctx.restore();
      }

      // --- GLOBAL MOONLIGHT COLD TONE FILM OVERLAY (月光冷光滤镜覆盖) ---
      if (isNightMode) {
        ctx.save();
        ctx.fillStyle = "rgba(40, 90, 220, 0.045)"; // Extremely faint cold moonlight blue overlay
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // --- 8. SPRING LIGHT RAIN / MIST ATMOSPHERE (春雨蒙蒙) ---
      if (currentConfig.rainIntensity > 0) {
        ctx.save();
        ctx.strokeStyle = isNight ? "rgba(224, 231, 255, 0.38)" : "rgba(30, 41, 59, 0.28)";
        ctx.lineWidth = 1.1;
        
        // Influence dynamic rain stroke tilting angle based on wind
        const currentWindForce = currentConfig.windSpeed * cosWindAngle;
        const rainTilt = currentWindForce * 15;

        const rainCount = Math.floor(180 * currentConfig.rainIntensity);
        for (let r = 0; r < rainCount; r++) {
          // Fall in viewport coordinates
          const rx = (Math.sin(r * 45.2) * 0.5 + 0.5) * width;
          const ry = ((s.time * 550 + r * 31.7) % height);
          
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - rainTilt, ry + 22);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Call next cycle
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [dimensions, paintMode, brushColor, brushSize, inkStrokes, isNightMode]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-crosshair overflow-hidden bg-[#f5f2e9]"
      id="shanshui-canvas-container"
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        id="shanshui-canvas-element"
        className="block w-full h-full transition-all duration-300 pointer-events-auto"
        onMouseDown={(e) => handleCanvasInteraction(e, true, false, false)}
        onMouseMove={(e) => handleCanvasInteraction(e, false, false, true)}
        onMouseUp={(e) => handleCanvasInteraction(e, false, true, false)}
        onMouseLeave={(e) => handleCanvasInteraction(e, false, true, false)}
        onTouchStart={(e) => handleCanvasInteraction(e, true, false, false)}
        onTouchMove={(e) => handleCanvasInteraction(e, false, false, true)}
        onTouchEnd={(e) => handleCanvasInteraction(e, false, true, false)}
      />
    </div>
  );
};
