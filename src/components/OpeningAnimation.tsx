import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// OPENING SEQUENCE PROPS
interface OpeningAnimationProps {
  onComplete: () => void;
}

export const OpeningAnimation: React.FC<OpeningAnimationProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fadeOpacity, setFadeOpacity] = useState<number>(0);
  const [isDone, setIsDone] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let localAnimateId: number;

    // WHITE_FIX (Step 1): Explicitly verify layout size fallback bounding inside iFrame containers
    let width = window.innerWidth || 800;
    let height = window.innerHeight || 600;
    if (width <= 0) width = 800;
    if (height <= 0) height = 600;

    // Create scene with beautiful solid classical rich rice-paper background color
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0ead8); // WHITE_FIX (Step 1)

    // Camera perspective with solid viewport aspect
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    camera.position.set(0, 0, 800); // Start front view
    camera.lookAt(0, 0, 0); // WHITE_FIX (Step 3)

    // WHITE_FIX (Step 1): WebGL Renderer clear parameters alignment
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor(0xf0ead8, 1.0); // Clear color matches background explicitly
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Direct DOM clearing before injection to avoid duplicate render canvases
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);

    // Explicit block layout sizing settings
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    // WHITE_FIX (Step 2): High-visibility, perfectly bright professional lighting arrays
    const ambientLight = new THREE.AmbientLight(0x404060, 0.85); // High ambient fill in bluish stone tones
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.25); // Crisp primary celestial light source
    dirLight.position.set(200, 500, 300);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Elegant traditional sunset glow fill light
    const fillLight = new THREE.DirectionalLight(0xd97706, 0.35); // Golden warm poetic wash
    fillLight.position.set(-400, 200, -200);
    scene.add(fillLight);

    // -------------------------------------------------------------
    // GENERATE DELICATE Parchment texture dynamically for 3D Scroll
    // -------------------------------------------------------------
    const canvasTexture = document.createElement("canvas");
    canvasTexture.width = 1024;
    canvasTexture.height = 512;
    const ctx = canvasTexture.getContext("2d");
    if (ctx) {
      // Background base paper color
      ctx.fillStyle = "#faf7ef";
      ctx.fillRect(0, 0, 1024, 512);

      // Ink halo/wash framing
      const grad = ctx.createRadialGradient(512, 256, 100, 512, 256, 500);
      grad.addColorStop(0, "rgba(250, 247, 239, 0)");
      grad.addColorStop(0.8, "rgba(215, 205, 185, 0.15)");
      grad.addColorStop(1, "rgba(180, 165, 140, 0.25)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // Watercolor raw noise patterns
      for (let i = 0; i < 24; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const r = Math.random() * 150 + 50;
        const gradSpot = ctx.createRadialGradient(x, y, 0, x, y, r);
        const intensity = Math.random() * 0.05 + 0.01;
        gradSpot.addColorStop(0, `rgba(40, 35, 30, ${intensity})`);
        gradSpot.addColorStop(1, "rgba(40, 35, 30, 0)");
        ctx.fillStyle = gradSpot;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Classic calligraphic border frames
      ctx.strokeStyle = "rgba(140, 120, 95, 0.22)";
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 30, 1024 - 60, 512 - 60);
      ctx.strokeStyle = "rgba(140, 120, 95, 0.12)";
      ctx.lineWidth = 1;
      ctx.strokeRect(35, 35, 1024 - 70, 512 - 70);
    }
    const parchmentTex = new THREE.CanvasTexture(canvasTexture);

    // Create central Scroll container to tilt easily
    const scrollGroup = new THREE.Group();
    scene.add(scrollGroup);

    // Scroll Paper dimensions
    const paperWidth = 860;
    const paperHeight = 360;

    // 1. Paper Plane mesh (middle)
    const paperGeom = new THREE.PlaneGeometry(paperWidth, paperHeight, 32, 16);
    const paperMat = new THREE.MeshStandardMaterial({
      color: 0xf3eee2, // WHITE_FIX (Step 2): Warm paper solid color fallback if mapping triggers failures
      map: parchmentTex,
      roughness: 0.95,
      metalness: 0.02,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });
    const paperMesh = new THREE.Mesh(paperGeom, paperMat);
    paperMesh.receiveShadow = true;
    // DEPTH: Shift scroll paper back on Z axis to prevent any standing mountain from penetrating
    paperMesh.position.set(-paperWidth / 2, 0, -220);
    scrollGroup.add(paperMesh);

    // 2. Left & Right Roller cylinders (wooden ends to represent ink scroll rollers)
    const rollerGeom = new THREE.CylinderGeometry(14, 14, paperHeight + 40, 24);
    const rollerMat = new THREE.MeshStandardMaterial({
      color: 0x47362a, // Rich Sandalwood / dark lacquered wood
      roughness: 0.5,
      metalness: 0.12,
    });
    
    const leftRoller = new THREE.Mesh(rollerGeom, rollerMat);
    leftRoller.castShadow = true;
    leftRoller.receiveShadow = true;
    scrollGroup.add(leftRoller);

    const rightRoller = leftRoller.clone();
    scrollGroup.add(rightRoller);

    // Set scroll group initial state: paper is scaled flat and rollers are closed at the left edge
    const halfWidth = paperWidth / 2;
    paperMesh.scale.x = 0.0001;
    leftRoller.position.set(-halfWidth, 0, 8 - 220);
    rightRoller.position.set(-halfWidth, 0, 8 - 220);

    // PLANE_MOUNTAIN: Dynamic procedural Chinese ink wash mountain canvas texture generator
    const createInkMountainTexture = (heightValue: number, idx: number, zVal: number) => {
      const canv = document.createElement("canvas");
      // Use generous vertical aspect to hold elegant landscape shapes
      canv.width = 256;
      canv.height = 512;
      const ctx2d = canv.getContext("2d");
      if (!ctx2d) return new THREE.CanvasTexture(canv);

      // Context transparency
      ctx2d.clearRect(0, 0, 256, 512);

      // DEPTH: Normalize Z-axis coordinate to range [0, 1]
      const normZ = Math.max(0.0, Math.min(1.0, (zVal + 200) / 400));

      // High-quality multi-layered ink washing: closer mountains are darker/crisper, further mountains are blurrier/lighter
      const layers = [
        { 
          alpha: 0.12 + normZ * 0.15, 
          offset: 18, 
          blur: Math.max(0, 10 - normZ * 8), 
          color: normZ > 0.4 ? "rgb(65, 65, 75)" : "rgb(150, 155, 165)" 
        },     // Atmospheric backdrop wash
        { 
          alpha: 0.25 + normZ * 0.20, 
          offset: 12, 
          blur: Math.max(0, 6 - normZ * 5), 
          color: normZ > 0.4 ? "rgb(55, 55, 63)" : "rgb(120, 125, 135)" 
        },     // Soft mid-ground body
        { 
          alpha: 0.45 + normZ * 0.25, 
          offset: 6,  
          blur: Math.max(0, 2 - normZ * 1.5), 
          color: normZ > 0.4 ? "rgb(42, 42, 48)" : "rgb(90, 95, 105)" 
        },     // Medium ridges definition
        { 
          alpha: 0.65 + normZ * 0.30, 
          offset: 0,  
          blur: 0, 
          color: normZ > 0.4 ? "rgb(25, 25, 28)" : "rgb(65, 70, 78)" 
        },     // Sharp foreground contours
      ];

      layers.forEach((layer, lIdx) => {
        ctx2d.fillStyle = layer.color;
        
        // Add subtle procedural variation per peak/layer to prevent uniform cloning
        const scaleFactor = 1.0 - (lIdx * 0.08);
        const randSeed = Math.sin(idx * 7.7 + lIdx * 3.1);
        const shiftX = randSeed * 12;
        const shiftY = Math.cos(idx * 4.3 + lIdx * 2.3) * 15;

        // Curve start & endpoints
        const leftX = 10 + layer.offset + shiftX;
        const rightX = 246 - layer.offset + shiftX;
        const peakX = 128 + randSeed * 18;
        const peakY = 60 + lIdx * 18 + shiftY;

        ctx2d.save();
        if (layer.blur > 0) {
          ctx2d.filter = `blur(${layer.blur}px)`;
        }
        ctx2d.globalAlpha = layer.alpha;

        ctx2d.beginPath();
        ctx2d.moveTo(leftX, 512);

        // Dynamic Bezier curves representing classical brush stroke aesthetics
        const cp1x = leftX + 45 * scaleFactor;
        const cp1y = 360 - lIdx * 15;
        const cp2x = peakX - 35 * scaleFactor;
        const cp2y = 180 + lIdx * 12;
        ctx2d.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, peakX - 12, peakY);

        // PLANE_MOUNTAIN: Flat/rounded platform at peak to convey space for architecture
        ctx2d.lineTo(peakX + 12, peakY);

        const cp3x = peakX + 35 * scaleFactor;
        const cp3y = 180 + lIdx * 12;
        const cp4x = rightX - 45 * scaleFactor;
        const cp4y = 360 - lIdx * 15;
        ctx2d.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, rightX, 512);

        ctx2d.closePath();
        ctx2d.fill();
        ctx2d.restore();
      });

      // DEPTH: Ambient atmospheric perspective fog layer overlay for far mountains
      if (normZ < 0.6) {
        const hazeOpacity = (1.0 - normZ) * 0.55; // Farther means denser mist
        ctx2d.save();
        const grad = ctx2d.createLinearGradient(0, 512, 0, 0);
        grad.addColorStop(0, `rgba(240, 243, 245, ${hazeOpacity})`); // Mist color
        grad.addColorStop(0.7, `rgba(240, 243, 245, ${hazeOpacity * 0.4})`);
        grad.addColorStop(1, `rgba(240, 243, 245, 0)`);
        
        ctx2d.globalCompositeOperation = "source-over";
        ctx2d.fillStyle = grad;
        ctx2d.fillRect(0, 0, 256, 512);
        ctx2d.restore();
      }

      const tex = new THREE.CanvasTexture(canv);
      tex.minFilter = THREE.LinearFilter;
      return tex;
    };

    // ---------------------------------------------------------------------------------
    // CREATE STANDING PLANE MOUNTAINS WITH INK TEXTURES
    // ---------------------------------------------------------------------------------
    interface CustomMountain {
      mesh: THREE.Mesh;
      initialX: number;
      targetX: number;
      z: number;
      peakHeight: number;
      delay: number;
      side: "left" | "right" | "main";
      triggerProgress: number; // DEPTH
    }

    // DEPTH: 8-mountain structured complex landscape layout satisfying space depth requirements
    const mConfigs = [
      { initX: -340, peakH: 220, z: 150,  delay: 0.00, side: "left"  as const }, // 1.近景左 (Z=150, 高)
      { initX: -240, peakH: 110, z: -120, delay: 0.15, side: "left"  as const }, // 2.远景左 (Z=-120, 低)
      { initX: -120, peakH: 170, z: 30,   delay: 0.30, side: "left"  as const }, // 3.中景左 (Z=30, 中)
      { initX: 0,    peakH: 290, z: 50,   delay: 0.45, side: "main"  as const }, // 4.主峰 (Z=50, 最高) [DEPTH.main_peak]
      { initX: 110,  peakH: 190, z: 20,   delay: 0.60, side: "right" as const }, // 5.中景右 (Z=20, 中高)
      { initX: 220,  peakH: 100, z: -150, delay: 0.72, side: "right" as const }, // 6.远景右 (Z=-150, 低)
      { initX: 320,  peakH: 210, z: 180,  delay: 0.84, side: "right" as const }, // 7.近景右 (Z=180, 高)
      { initX: 380,  peakH: 80,  z: -200, delay: 0.96, side: "right" as const }, // 8.最远山 (Z=-200, 最低)
    ];

    const mountains: CustomMountain[] = [];

    mConfigs.forEach((cfg, idx) => {
      const mountainH = Math.max(120, Math.min(280, cfg.peakH));
      const mountainW = Math.max(80, Math.min(160, mountainH * 0.55));

      // Generate plane mesh layout
      const planeGeom = new THREE.PlaneGeometry(mountainW, mountainH);
      
      // Shift pivot to bottom of the plane so rotations happen perfectly along the bottom anchor
      planeGeom.translate(0, mountainH / 2, 0);

      // High quality double-sided basic material
      const mountainMat = new THREE.MeshBasicMaterial({
        map: createInkMountainTexture(mountainH, idx, cfg.z), // DEPTH: Pass depth coordinates
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
        alphaTest: 0.05,
      });

      const mMesh = new THREE.Mesh(planeGeom, mountainMat);

      // DEPTH: Base line follows "近低远高" perspective structure
      // Near mountains are positioned lower down on the Y axis, far mountains are positioned higher up
      const mY = -paperHeight / 2 + 10 - (cfg.z / 200) * 16;
      mMesh.position.set(cfg.initX, mY, cfg.z);
      
      // Initialize horizontal flat rotation (lying flat/coplanar with scroll surface)
      mMesh.rotation.x = 0;
      mMesh.scale.set(0.0001, 0.0001, 0.0001); // Shrink out until unrolled
      scrollGroup.add(mMesh);

      const targetOffset = cfg.side === "left" ? -180 : (cfg.side === "right" ? 180 : 0);

      mountains.push({
        mesh: mMesh,
        initialX: cfg.initX,
        targetX: cfg.initX + targetOffset,
        z: cfg.z,
        peakHeight: cfg.peakH,
        delay: cfg.delay,
        side: cfg.side,
        // DEPTH: Sequential trigger points based systematically on unrolling progress (20% to 80%)
        triggerProgress: 0.2 + (idx / mConfigs.length) * 0.6,
      });
    });

    // Ease function
    const easeOutCubic = (x: number): number => {
      return 1 - Math.pow(1 - x, 3);
    };

    const startTime = performance.now();
    let loggedFirstFrame = false; // WHITE_FIX (Step 3): Log status once on the first active tick

    // -------------------------------------------------------------
    // ANIMATION TICK LOOP
    // -------------------------------------------------------------
    const animate = (timestamp: number) => {
      localAnimateId = requestAnimationFrame(animate);

      const elapsed = (timestamp - startTime) / 1000; // in seconds

      // WHITE_FIX (Step 3): Diagnostic Console logger once on scene open
      if (!loggedFirstFrame && elapsed > 0.01) {
        loggedFirstFrame = true;
        console.log("WHITE_FIX (Step 3) - 摄像机位置:", camera.position);
        console.log("WHITE_FIX (Step 3) - 物体数量:", scene.children.length);
        console.log("WHITE_FIX (Step 3) - Scroll Group 元素:", scrollGroup.children.length);
      }

      // ─────────────────────────────────────────────────────────────
      // 分镜 1: 卷轴出现与倾斜 (0s - 1.5s)
      // ─────────────────────────────────────────────────────────────
      if (elapsed <= 1.5) {
        const p = easeOutCubic(elapsed / 1.5);
        // Camera position pulling back
        const camZ = 800 + p * 400; // 800 -> 1200
        const camY = 0 - p * 200;   // 0 -> -200
        camera.position.set(0, camY, camZ);
        
        // Keep looking at center
        camera.lookAt(0, 0, 0);

        // Tilt the entire scroll
        const tiltAngle = -p * (Math.PI / 4); // 0 -> -45 degrees
        scrollGroup.rotation.x = tiltAngle;

        // Scroll is fully closed at initially flat state (Left-to-Right layout startup)
        paperMesh.scale.x = 0.0001;
        paperMesh.position.set(-halfWidth, 0, -220); // DEPTH: Position at left edge
        leftRoller.position.set(-halfWidth, 0, 8 - 220);
        rightRoller.position.set(-halfWidth, 0, 8 - 220);
      }

      // ─────────────────────────────────────────────────────────────
      // 分镜 2: 卷轴拉开与山体立起 (1.5s - 5.0s)
      // ─────────────────────────────────────────────────────────────
      if (elapsed > 1.5) {
        // Fix Camera state from scene 1 after completion
        if (elapsed <= 5.0) {
          camera.position.set(0, -200, 1200);
          camera.lookAt(0, 0, 0);
          scrollGroup.rotation.x = -Math.PI / 4;
        }

        const unrollDuration = 3.5; // From 1.5s to 5.0s
        const unrollElapsed = Math.min(elapsed - 1.5, unrollDuration);
        const unrollP = easeOutCubic(unrollElapsed / unrollDuration);

        // DEPTH & 滚动拉开: Control paper roll expansion scale horizontally (Left-to-Right unspooling)
        paperMesh.scale.x = Math.max(unrollP, 0.0001);
        paperMesh.position.x = -halfWidth * (1.0 - unrollP); // Slide paper center forward from left

        // DEPTH & 滚动拉开: Left roller is fixed, right roller slides to right edge
        leftRoller.position.set(-halfWidth, 0, 8 - 220);
        rightRoller.position.set(-halfWidth + paperWidth * unrollP, 0, 8 - 220);

        // Animate mountains unspooling & standing up
        mountains.forEach((m) => {
          // DEPTH & 滚动拉开: Check if scroll right roller has passed the mountain coordinates
          const paperUnrolledX = -halfWidth + paperWidth * unrollP;
          const isUncovered = m.initialX <= paperUnrolledX;

          if (unrollP >= m.triggerProgress && isUncovered) {
            // Mountain starts rising! Each starts with its own sequential offset based on triggerProgress
            const triggerElapsed = unrollDuration * m.triggerProgress;
            const riseElapsed = Math.max(0, unrollElapsed - triggerElapsed);
            
            const normZ = Math.max(0.0, Math.min(1.0, (m.z + 200) / 400));
            const riseDur = 0.8 - normZ * 0.3; // DEPTH: Near stands faster (0.5s), Far stands slower (0.8s)
            
            const riseP = easeOutCubic(Math.min(riseElapsed / riseDur, 1.0));
            
            // PLANE_MOUNTAIN & DEPTH: Stand up from coplanar 0deg to 45deg (Math.PI / 4)
            m.mesh.rotation.x = riseP * (Math.PI / 4);
            m.mesh.scale.set(1.0, 1.0, 1.0);

            // DEPTH: Slight forward Z push as mountain rises to increase unrolling spatial parallax
            if (elapsed <= 5.0) {
              m.mesh.position.x = m.initialX;
              m.mesh.position.z = m.z - (1.0 - riseP) * 15;
            }
          } else {
            // Invisible/flat before unrolled path reaches
            m.mesh.scale.set(0.0001, 0.0001, 0.0001);
            m.mesh.rotation.x = 0;
          }
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 分镜 3 & 4: 镜头向主峰推进 / 山体拉开 (5.0s - 7.5s & 6.0s - 8.0s)
      // ─────────────────────────────────────────────────────────────
      if (elapsed > 5.0) {
        const flyDuration = 2.5; // From 5.0s to 7.5s
        const flyElapsed = Math.min(elapsed - 5.0, flyDuration);
        
        // Accelerated pacing fly-through curve
        const t = flyElapsed / flyDuration;
        const flyP = t * t * 0.9 + t * 0.1; // Custom acceleration

        // Camera moves close to main mountain (0, -60, -60)
        // Camera starts at (0, -200, 1200) and targets (0, 10, 110)
        const curY = -200 + flyP * 210;
        const curZ = 1200 - flyP * 1140; // Closes right onto central peak
        camera.position.set(0, curY, curZ);

        // Keeps looking at main mount
        camera.lookAt(0, 0, -30);

        // Slowly tilt view angle to looking forward flat (0 degrees)
        const tiltX = -(Math.PI / 4) * (1.0 - flyP); 
        scrollGroup.rotation.x = tiltX;

        // Scene 4 Gate opens (6.0s - 8.0s) inside this window
        // Slide left and right mountains to construct cinematic fly-past depth
        if (elapsed > 6.0) {
          const gateDuration = 1.8;
          const gateElapsed = Math.min(elapsed - 6.0, gateDuration);
          const gateP = easeOutCubic(gateElapsed / gateDuration);

          mountains.forEach((m) => {
            if (m.side === "left") {
              m.mesh.position.x = m.initialX - gateP * 160;
            } else if (m.side === "right") {
              m.mesh.position.x = m.initialX + gateP * 160;
            } else {
              // Main mountain slides back slightly to deepen 3D camera parallax
              m.mesh.position.z = m.z - gateP * 90;
            }
          });
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 分镜 5: 白屏淡出切换 (7.5s - 8.5s)
      // ─────────────────────────────────────────────────────────────
      if (elapsed >= 7.5) {
        const whiteStart = 7.5;
        const whiteDur = 0.4;
        const holdDur = 0.25;
        const exitDur = 0.45;

        if (elapsed <= whiteStart + whiteDur) {
          // Fade white in: opacity 0 -> 1
          const ratio = (elapsed - whiteStart) / whiteDur;
          setFadeOpacity(Math.min(ratio, 1.0));
        } else if (elapsed <= whiteStart + whiteDur + holdDur) {
          // Hold white screen constant
          setFadeOpacity(1.0);
        } else if (elapsed <= whiteStart + whiteDur + holdDur + exitDur) {
          // Trigger the completion callback precisely at white peak hold
          if (!isDone) {
            setIsDone(true);
            onComplete();
          }
          // Fade white out: opacity 1 -> 0
          const ratio = (elapsed - (whiteStart + whiteDur + holdDur)) / exitDur;
          setFadeOpacity(Math.max(1.0 - ratio, 0.0));
        } else {
          // Fully ended. Just ensure opacity is 0
          setFadeOpacity(0.0);
          cancelAnimationFrame(localAnimateId);
        }
      }

      // WHITE_FIX (Step 6): Explicitly render the frame
      renderer.render(scene, camera);
    };

    localAnimateId = requestAnimationFrame(animate);

    // Responsive Canvas Resize handling
    const handleResize = () => {
      if (!containerRef.current) return;
      let w = window.innerWidth || 800;
      let h = window.innerHeight || 600;
      if (w <= 0) w = 800;
      if (h <= 0) h = 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // WHITE_FIX: Delayed resize trigger 180ms after container setup in sandbox environment
    const sizeTimer = setTimeout(() => {
      handleResize();
    }, 180);

    // Cleanup resources
    return () => {
      cancelAnimationFrame(localAnimateId);
      window.removeEventListener("resize", handleResize);
      clearTimeout(sizeTimer);
      if (renderer) {
        renderer.dispose();
      }
      // Clean up geometries and materials
      paperGeom.dispose();
      paperMat.dispose();
      rollerGeom.dispose();
      rollerMat.dispose();
      parchmentTex.dispose();
      mountains.forEach((m) => {
        m.mesh.geometry.dispose();
        if (Array.isArray(m.mesh.material)) {
          m.mesh.material.forEach((mat: any) => {
            if (mat.map) mat.map.dispose();
            mat.dispose();
          });
        } else {
          const mat = m.mesh.material as any;
          if (mat.map) mat.map.dispose();
          mat.dispose();
        }
        scrollGroup.remove(m.mesh);
      });
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [onComplete, isDone]);

  // Clean, high-contrast, beautiful container (z-index level matches expectations)
  return (
    <div 
      className="absolute inset-0 w-full h-full z-[100] cursor-none overflow-hidden select-none bg-[#f1ede2]"
      id="3d-scroll-opening-animation-container"
    >
      {/* GL Canvas Mount point with full dimensions */}
      <div 
        ref={containerRef} 
        className="w-full h-full absolute inset-0 block pointer-events-none" 
        id="opening-threejs-canvas-mount"
      />

      {/* Elegant Cinematic Fullscreen Flash Overlay */}
      <div 
        style={{ opacity: fadeOpacity }}
        className="absolute inset-0 bg-[#f0ead8] pointer-events-none transition-opacity duration-75 z-[110]"
        id="opening-white-flash-film"
      />

      {/* Floating minimalistic, zen typography intro title for the 3D sequence - beautifully cinematic */}
      <div 
        className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-center pointer-events-none z-[105]"
        id="cinematic-caption-group"
      >
        <span className="font-serif text-[18px] tracking-[0.25em] font-semibold text-stone-800 uppercase animate-pulse duration-[3000ms]">
          《感 物 造 境 · 昆 仑 谣》
        </span>
        <span className="font-serif text-[11px] tracking-[0.16em] text-stone-500 uppercase">
          心纳山河，笔随指卷 · 互动水墨古卷开卷中
        </span>
      </div>
    </div>
  );
};
