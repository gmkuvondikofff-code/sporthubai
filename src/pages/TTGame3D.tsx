import { useEffect, useRef, useState, Suspense, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize2, RotateCw, Trophy, ChevronUp, ChevronDown } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

// Real-ish ITTF dimensions (meters). 1 unit = 1m.
const TABLE = {
  w: 1.525,            // width (X)
  l: 2.74,             // length (Z)
  surfaceY: 0.76,      // top surface height
  thickness: 0.04,
  netH: 0.1525,
};
const PADDLE = { r: 0.078, t: 0.012, handleH: 0.10 };
const BALL_R = 0.020; // 40mm

// ======= Realistic ping-pong physics constants =======
const BALL_MASS = 0.0027;                                           // kg (2.7g)
const BALL_AREA = Math.PI * BALL_R * BALL_R;                        // m²
const AIR_DENSITY = 1.225;                                          // kg/m³
const DRAG_CD = 0.47;                                               // sphere
// a_drag = -DRAG_K * |v| * v   (quadratic fluid drag)
const DRAG_K = (0.5 * AIR_DENSITY * DRAG_CD * BALL_AREA) / BALL_MASS;
// a_magnus = MAGNUS_K * (ω × v) — tuned for visible curves at realistic spin (~100 rad/s)
const MAGNUS_K = 0.0010;
const GRAVITY = 9.8;                                                // m/s²
const REST_TABLE = 0.80;                                            // ball-table coef of restitution
const REST_PADDLE = 0.78;                                           // ball-paddle coef of restitution
const TABLE_FRICTION = 0.35;                                        // tangential friction during bounce
const PADDLE_FRICTION = 0.55;                                       // rubber friction
const SPIN_DECAY = 0.5;                                             // s⁻¹ exponential decay
const PHYSICS_SUBSTEPS = 6;                                         // CCD: 6 substeps per frame @60fps ≈ 360Hz

// Player paddle Z range (own half only; cannot cross net)
const PLAYER_Z_MIN = 0.12;          // close to net
const PLAYER_Z_MAX = TABLE.l / 2 + 0.45; // behind own end

const COUNTRIES = [
  { code: "UZ", flag: "🇺🇿", name: "Uzbekistan", skill: 0.8 },
  { code: "CN", flag: "🇨🇳", name: "China", skill: 1.0 },
  { code: "JP", flag: "🇯🇵", name: "Japan", skill: 0.92 },
  { code: "DE", flag: "🇩🇪", name: "Germany", skill: 0.88 },
  { code: "KR", flag: "🇰🇷", name: "Korea", skill: 0.9 },
  { code: "FR", flag: "🇫🇷", name: "France", skill: 0.85 },
  { code: "SE", flag: "🇸🇪", name: "Sweden", skill: 0.87 },
  { code: "BR", flag: "🇧🇷", name: "Brazil", skill: 0.82 },
];

interface GameState {
  ballPos: THREE.Vector3;
  ballVel: THREE.Vector3;
  ballSpin: THREE.Vector3;    // angular velocity (rad/s) — full 3D spin vector
  // player paddle (kinematic)
  playerX: number;
  playerY: number;
  playerZ: number;
  playerPrev: THREE.Vector3;
  playerVel: THREE.Vector3;
  // ai
  aiX: number;
  aiZ: number;
  aiTargetX: number;
  aiTargetZ: number;
  aiSwingCooldown: number;
  // game
  scorePlayer: number;
  scoreAI: number;
  bouncedOnPlayerSide: boolean;
  bouncedOnAISide: boolean;
  hitByPlayerLast: boolean;
  hitByAILast: boolean;
  serving: "player" | "ai";
  paused: boolean;
  waitingForServe: boolean;  // ball is held stationary until user/AI launches it
  rallyStart: number;
  lastHitT: number;
}

function makeServeState(serving: "player" | "ai" = "player"): GameState {
  return {
    ballPos: new THREE.Vector3(
      (Math.random() - 0.5) * 0.4,
      TABLE.surfaceY + 0.22,
      serving === "player" ? TABLE.l / 2 - 0.15 : -TABLE.l / 2 + 0.15,
    ),
    ballVel: new THREE.Vector3(0, 0, 0),
    ballSpin: new THREE.Vector3(),
    playerX: 0,
    playerY: TABLE.surfaceY + 0.06,
    playerZ: TABLE.l / 2 + 0.25,
    playerPrev: new THREE.Vector3(0, TABLE.surfaceY + 0.06, TABLE.l / 2 + 0.25),
    playerVel: new THREE.Vector3(),
    aiX: 0,
    aiZ: -TABLE.l / 2 - 0.25,
    aiTargetX: 0,
    aiTargetZ: -TABLE.l / 2 - 0.25,
    aiSwingCooldown: 0,
    scorePlayer: 0,
    scoreAI: 0,
    bouncedOnPlayerSide: false,
    bouncedOnAISide: false,
    hitByPlayerLast: false,
    hitByAILast: false,
    serving,
    paused: false,
    waitingForServe: true,
    rallyStart: performance.now(),
    lastHitT: performance.now(),
  };
}

function resetForServe(s: GameState, serving: "player" | "ai") {
  const fresh = makeServeState(serving);
  fresh.scorePlayer = s.scorePlayer;
  fresh.scoreAI = s.scoreAI;
  Object.assign(s, fresh);
}

function NetMesh() {
  // White net using a grid texture on a thin transparent plane.
  const tex = (() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 64;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 1.2;
    const cols = 48, rows = 12;
    for (let i = 0; i <= cols; i++) {
      const x = (i / cols) * c.width;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      const y = (j / rows) * c.height;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
    }
    // top & bottom white band
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, c.width, 4);
    ctx.fillRect(0, c.height - 4, c.width, 4);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  })();

  return (
    <group position={[0, TABLE.surfaceY + TABLE.netH / 2, 0]}>
      <mesh>
        <planeGeometry args={[TABLE.w + 0.30, TABLE.netH]} />
        <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} />
      </mesh>
      {/* posts */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (TABLE.w / 2 + 0.15), 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, TABLE.netH, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Table() {
  return (
    <group>
      {/* Table top */}
      <mesh position={[0, TABLE.surfaceY - TABLE.thickness / 2, 0]} receiveShadow>
        <boxGeometry args={[TABLE.w, TABLE.thickness, TABLE.l]} />
        <meshStandardMaterial color="#0a4a8f" roughness={0.55} metalness={0.05} />
      </mesh>
      {/* White outer lines */}
      {[
        { p: [0, 0, TABLE.l / 2 - 0.01], s: [TABLE.w, 0.002, 0.02] },
        { p: [0, 0, -TABLE.l / 2 + 0.01], s: [TABLE.w, 0.002, 0.02] },
        { p: [TABLE.w / 2 - 0.01, 0, 0], s: [0.02, 0.002, TABLE.l] },
        { p: [-TABLE.w / 2 + 0.01, 0, 0], s: [0.02, 0.002, TABLE.l] },
        { p: [0, 0, 0], s: [0.012, 0.002, TABLE.l] }, // center line for doubles look
      ].map((l, i) => (
        <mesh key={i} position={[l.p[0], TABLE.surfaceY + 0.001, l.p[2]]}>
          <boxGeometry args={[l.s[0], l.s[1], l.s[2]]} />
          <meshBasicMaterial color="white" />
        </mesh>
      ))}
      <NetMesh />
      {/* Legs */}
      {[
        [TABLE.w / 2 - 0.05, TABLE.l / 2 - 0.05],
        [-TABLE.w / 2 + 0.05, TABLE.l / 2 - 0.05],
        [TABLE.w / 2 - 0.05, -TABLE.l / 2 + 0.05],
        [-TABLE.w / 2 + 0.05, -TABLE.l / 2 + 0.05],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], TABLE.surfaceY / 2, p[1]]}>
          <boxGeometry args={[0.04, TABLE.surfaceY, 0.04]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}
      {/* Floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0b0d18" />
      </mesh>
      {/* Arena walls (subtle) */}
      <mesh position={[0, 3, -8]}>
        <planeGeometry args={[30, 6]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </group>
  );
}

function PaddleMesh({ color }: { color: string }) {
  return (
    <group>
      {/* Blade */}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[PADDLE.r, PADDLE.r, PADDLE.t, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* Rubber backside accent */}
      <mesh position={[0, 0, -PADDLE.t / 2 - 0.001]} rotation={[0, 0, 0]}>
        <circleGeometry args={[PADDLE.r * 0.97, 32]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, -PADDLE.r - PADDLE.handleH / 2 + 0.01, 0]} castShadow>
        <boxGeometry args={[0.028, PADDLE.handleH, 0.022]} />
        <meshStandardMaterial color="#3a2417" roughness={0.7} />
      </mesh>
      {/* Handle wraps */}
      {[0.02, -0.02].map((y, i) => (
        <mesh key={i} position={[0, -PADDLE.r - PADDLE.handleH / 2 + 0.01 + y, 0]}>
          <boxGeometry args={[0.03, 0.006, 0.024]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
      ))}
    </group>
  );
}

interface SceneProps {
  stateRef: React.MutableRefObject<GameState>;
  onScore: (who: "player" | "ai") => void;
  inputRef: React.MutableRefObject<{ x: number; y: number; z: number }>; // x:side, y:height, z:depth, all -1..1 (y: 0..1)
  difficulty: number; // 0..2
  opponentSkill: number;
  onUpdate: () => void;
  active: boolean;
}

function Scene({ stateRef, onScore, inputRef, difficulty, opponentSkill, onUpdate, active }: SceneProps) {
  const ballRef = useRef<THREE.Mesh>(null!);
  const ballShadowRef = useRef<THREE.Mesh>(null!);
  const playerRef = useRef<THREE.Group>(null!);
  const aiRef = useRef<THREE.Group>(null!);
  const trailRef = useRef<THREE.Line>(null!);
  const TRAIL_N = 32;
  const trailPositions = useMemo(() => new Float32Array(TRAIL_N * 3), []);
  const trailColors = useMemo(() => new Float32Array(TRAIL_N * 3), []);
  const lastUpdateUI = useRef(0);

  // Predict where the ball will cross a given Z plane (no air drag, simple gravity)
  const predictAtZ = (s: GameState, targetZ: number) => {
    if (Math.abs(s.ballVel.z) < 0.01) return null;
    const t = (targetZ - s.ballPos.z) / s.ballVel.z;
    if (t <= 0) return null;
    const x = s.ballPos.x + s.ballVel.x * t;
    const y = s.ballPos.y + s.ballVel.y * t - 0.5 * 9.8 * t * t;
    return { x, y, t };
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.025);
    const s = stateRef.current;
    if (s.paused || !active) return;

    // ======= INPUT → Player paddle target (X & Z) =======
    // input.x ∈ [-1,1] → paddle X across full court width
    // input.y ∈ [-1,1] → paddle Z forward/back on own half
    //   y = -1 → forward (toward net, Z ~ PLAYER_Z_MIN)
    //   y = +1 → backward (Z ~ PLAYER_Z_MAX)
    const targetX = THREE.MathUtils.clamp(inputRef.current.x * (TABLE.w / 2 + 0.35), -TABLE.w / 2 - 0.35, TABLE.w / 2 + 0.35);
    const zNorm = (inputRef.current.z + 1) / 2; // 0..1
    const targetZ = THREE.MathUtils.lerp(PLAYER_Z_MIN, PLAYER_Z_MAX, zNorm);
    // Free Y: paddle height above table (0..0.55m)
    const yLift = THREE.MathUtils.clamp(inputRef.current.y, 0, 1) * 0.55;

    s.playerPrev.set(s.playerX, s.playerY, s.playerZ);
    s.playerX = THREE.MathUtils.lerp(s.playerX, targetX, 0.35);
    s.playerZ = THREE.MathUtils.lerp(s.playerZ, targetZ, 0.30);
    // height oscillates slightly with z (player crouches when reaching forward)
    s.playerY = TABLE.surfaceY + 0.06 + (s.playerZ - PLAYER_Z_MIN) * 0.015 + yLift;
    s.playerVel.set(
      (s.playerX - s.playerPrev.x) / dt,
      (s.playerY - s.playerPrev.y) / dt,
      (s.playerZ - s.playerPrev.z) / dt,
    );

    // ======= Waiting-for-serve: ball is held stationary above server's paddle =======
    if (s.waitingForServe) {
      if (s.serving === "player") {
        s.ballPos.set(s.playerX, s.playerY + 0.18, s.playerZ - 0.05);
        s.ballVel.set(0, 0, 0);
        s.ballSpin.set(0, 0, 0);
        if (s.playerVel.z < -1.2) {
          // Launch serve — derive light topspin from upward swing
          s.ballVel.set(s.playerVel.x * 0.6, 1.6, -3.2 + s.playerVel.z * 0.4);
          // Topspin for ball moving -Z: ω.x < 0 (top surface moves with motion)
          s.ballSpin.set(-Math.max(0, s.playerVel.y) * 25 - 30, 0, 0);
          s.hitByPlayerLast = true;
          s.waitingForServe = false;
          s.lastHitT = performance.now();
        }
      } else {
        s.ballPos.set(s.aiX, TABLE.surfaceY + 0.22, s.aiZ + 0.05);
        s.ballVel.set(0, 0, 0);
        s.ballSpin.set(0, 0, 0);
        if (performance.now() - s.rallyStart > 800) {
          s.ballVel.set((Math.random() - 0.5) * 0.6, 1.6, 3.2);
          // Topspin for ball moving +Z: ω.x > 0
          s.ballSpin.set(30, 0, 0);
          s.hitByAILast = true;
          s.waitingForServe = false;
          s.lastHitT = performance.now();
        }
      }
    }

    // ======= AI movement (predictive) =======
    s.aiSwingCooldown = Math.max(0, s.aiSwingCooldown - dt);
    if (s.ballVel.z < 0) {
      // ball moving toward AI — predict where it will be at AI's hit plane
      const aiHitZ = -TABLE.l / 2 - 0.18;
      const pred = predictAtZ(s, aiHitZ);
      if (pred) {
        s.aiTargetX = THREE.MathUtils.clamp(pred.x, -TABLE.w / 2 - 0.3, TABLE.w / 2 + 0.3);
        // step back if ball is high & deep, forward if it's a short ball
        s.aiTargetZ = THREE.MathUtils.clamp(aiHitZ - Math.max(0, pred.y - TABLE.surfaceY - 0.2) * 0.3, -TABLE.l / 2 - 0.55, -TABLE.l / 2 - 0.05);
      }
    } else {
      // ball moving away — recover to ready position with slight bias
      s.aiTargetX = THREE.MathUtils.lerp(s.aiTargetX, s.ballPos.x * 0.4, 0.05);
      s.aiTargetZ = -TABLE.l / 2 - 0.30;
    }
    // Much slower AI movement → very easy
    const aiSpeed = 0.7 + difficulty * 0.45 + opponentSkill * 0.3; // m/s
    const dx = s.aiTargetX - s.aiX;
    const dz = s.aiTargetZ - s.aiZ;
    const distXZ = Math.hypot(dx, dz);
    if (distXZ > 0.001) {
      const step = Math.min(distXZ, aiSpeed * dt);
      s.aiX += (dx / distXZ) * step;
      s.aiZ += (dz / distXZ) * step;
    }

    const tableTopY = TABLE.surfaceY;

    // ======= Player paddle face normal (from current orientation) =======
    const tiltP = THREE.MathUtils.clamp(-s.playerVel.z * 0.15 + 0.5, 0.1, 1.2);
    const rollP = THREE.MathUtils.clamp(s.playerVel.x * 0.05, -0.4, 0.4);
    const playerNormal = new THREE.Vector3(0, 0, -1)
      .applyEuler(new THREE.Euler(tiltP, 0, rollP))
      .normalize();
    const playerCenter = new THREE.Vector3(s.playerX, s.playerY, s.playerZ);

    // ======= Substepped ball physics with CCD =======
    if (!s.waitingForServe) {
      const N = PHYSICS_SUBSTEPS;
      const dts = dt / N;
      const prevPos = new THREE.Vector3();
      const cross = new THREE.Vector3();
      const v = s.ballVel;
      const w = s.ballSpin;

      for (let step = 0; step < N; step++) {
        // ---- Forces ----
        // Gravity
        v.y -= GRAVITY * dts;
        // Quadratic drag: a = -DRAG_K * |v| * v
        const speed = v.length();
        if (speed > 1e-3) {
          const k = DRAG_K * speed * dts;
          v.x -= v.x * k;
          v.y -= v.y * k;
          v.z -= v.z * k;
        }
        // Magnus: a = MAGNUS_K * (ω × v)
        cross.crossVectors(w, v);
        v.x += MAGNUS_K * cross.x * dts;
        v.y += MAGNUS_K * cross.y * dts;
        v.z += MAGNUS_K * cross.z * dts;
        // Spin decay
        w.multiplyScalar(Math.exp(-SPIN_DECAY * dts));

        // ---- Integrate (with CCD via prev position) ----
        prevPos.copy(s.ballPos);
        s.ballPos.addScaledVector(v, dts);

        // ---- Table bounce CCD ----
        if (
          prevPos.y - BALL_R > tableTopY &&
          s.ballPos.y - BALL_R <= tableTopY &&
          v.y < 0
        ) {
          const dy = prevPos.y - s.ballPos.y;
          const t = dy > 1e-6 ? (prevPos.y - (tableTopY + BALL_R)) / dy : 1;
          const ix = prevPos.x + (s.ballPos.x - prevPos.x) * t;
          const iz = prevPos.z + (s.ballPos.z - prevPos.z) * t;
          if (Math.abs(ix) <= TABLE.w / 2 && Math.abs(iz) <= TABLE.l / 2) {
            s.ballPos.set(ix, tableTopY + BALL_R, iz);
            // Reflect normal velocity
            v.y = -v.y * REST_TABLE;
            // Surface velocity at contact: v_ball + ω × r_contact, r_contact=(0,-R,0)
            // (a,b,c) × (0,-R,0) = (c·R, 0, -a·R)
            const sv_x = v.x + w.z * BALL_R;
            const sv_z = v.z - w.x * BALL_R;
            // Friction impulse opposes slip → modifies tangential v AND spin
            v.x -= TABLE_FRICTION * sv_x * 0.5;
            v.z -= TABLE_FRICTION * sv_z * 0.5;
            // Spin reduction from friction (impulse couples back to ω)
            // Δω = -(2.5 * μ / R) * slip (sphere) — simplified
            w.x += TABLE_FRICTION * sv_z * 1.2;
            w.z -= TABLE_FRICTION * sv_x * 1.2;
            w.y *= 0.8;
            if (iz > 0) s.bouncedOnPlayerSide = true;
            else s.bouncedOnAISide = true;
          }
        }

        // ---- Net collision ----
        if (
          Math.abs(s.ballPos.z) < 0.025 &&
          s.ballPos.y < TABLE.surfaceY + TABLE.netH + BALL_R &&
          s.ballPos.y > TABLE.surfaceY &&
          Math.abs(s.ballPos.x) < TABLE.w / 2 + 0.1
        ) {
          const netScorer: "player" | "ai" =
            s.hitByPlayerLast ? "ai" : s.hitByAILast ? "player" : (s.serving === "player" ? "ai" : "player");
          onScore(netScorer);
          return;
        }

        // ---- Player paddle CCD (segment vs sphere around paddle center) ----
        // Approximate paddle as sphere (radius PADDLE.r) for collision; check if segment prev→cur passes within reach.
        const segDir = new THREE.Vector3().subVectors(s.ballPos, prevPos);
        const segLen = segDir.length();
        const toCenter = new THREE.Vector3().subVectors(playerCenter, prevPos);
        const tProj = segLen > 1e-6 ? THREE.MathUtils.clamp(toCenter.dot(segDir) / (segLen * segLen), 0, 1) : 0;
        const closest = new THREE.Vector3().copy(prevPos).addScaledVector(segDir, tProj);
        const dist = closest.distanceTo(playerCenter);
        const movingToward = v.z > 0; // ball traveling toward player (+Z)
        if (dist < PADDLE.r + BALL_R + 0.04 && movingToward) {
          // Snap ball just in front of paddle face (in +playerNormal direction relative to paddle, but ball comes from +Z)
          s.ballPos.copy(closest).addScaledVector(playerNormal, -(PADDLE.r + BALL_R) * 0.2);
          // ===== Velocity transfer (relative-velocity reflection with spin coupling) =====
          const vRel = new THREE.Vector3().subVectors(v, s.playerVel);
          const vn = vRel.dot(playerNormal);
          // Normal component reflected with restitution
          const vRelN = playerNormal.clone().multiplyScalar(vn);
          const vRelT = vRel.clone().sub(vRelN);
          // Apply restitution + tangential friction
          const vRelN2 = playerNormal.clone().multiplyScalar(-vn * REST_PADDLE);
          const vRelT2 = vRelT.clone().multiplyScalar(1 - PADDLE_FRICTION * 0.6);
          // Final velocity = paddle vel + reflected
          v.copy(s.playerVel).add(vRelN2).add(vRelT2);
          // Boost forward power so the ball makes it back across
          const boost = 1.0 + Math.max(0, -s.playerVel.z) * 0.10;
          v.multiplyScalar(boost);
          // Auto-aim assist: bias X toward AI a touch
          v.x += (s.aiX - s.playerX) * 0.4;
          // Cap absurd verticals so the ball stays in play
          v.y = THREE.MathUtils.clamp(v.y, -2.0, 3.5);

          // ===== Spin generation from tangential paddle velocity =====
          // Tangential paddle velocity (in paddle face plane)
          const vP = s.playerVel.clone();
          const vPn = playerNormal.clone().multiplyScalar(vP.dot(playerNormal));
          const vPt = vP.sub(vPn);
          // Contact point relative to ball center: r_contact = -n * R
          const rContact = playerNormal.clone().multiplyScalar(-BALL_R);
          // Solve ω × r = vPt → ω = (r × vPt) / |r|²
          const omegaContrib = new THREE.Vector3().crossVectors(rContact, vPt).divideScalar(BALL_R * BALL_R);
          // Couple new spin (mostly replace, keep a bit of old for continuity)
          w.lerp(omegaContrib, 0.85);
          // Clamp insane spin rates
          if (w.length() > 250) w.setLength(250);

          s.bouncedOnPlayerSide = false;
          s.bouncedOnAISide = false;
          s.hitByPlayerLast = true;
          s.hitByAILast = false;
          s.lastHitT = performance.now();
        }
      }
    }

    // ======= AI paddle collision =======
    if (!s.waitingForServe) {
      const aiHitZ = -TABLE.l / 2 - 0.18;
      // AI swings when ball is close to its hit plane
      const distZ = Math.abs(s.ballPos.z - s.aiZ);
      const closeX = Math.abs(s.ballPos.x - s.aiX) < PADDLE.r + 0.05;
      const heightOK = s.ballPos.y > TABLE.surfaceY - 0.05 && s.ballPos.y < TABLE.surfaceY + 1.0;
      if (s.ballVel.z < 0 && distZ < 0.07 && closeX && heightOK && s.aiSwingCooldown <= 0) {
        // Aim: place ball on player's half deliberately
        // Choose target X randomly biased away from player position
        const playerOffsetSign = s.playerX >= 0 ? -1 : 1;
        const aimX = THREE.MathUtils.clamp(playerOffsetSign * (0.3 + Math.random() * 0.35) * (TABLE.w / 2), -TABLE.w / 2 + 0.05, TABLE.w / 2 - 0.05);
        const aimZ = THREE.MathUtils.lerp(0.2, TABLE.l / 2 - 0.05, 0.3 + Math.random() * 0.6);
        // Solve approximate velocity to land at (aimX, surfaceY, aimZ) with apex height
        const apex = TABLE.surfaceY + 0.45 + Math.random() * 0.2;
        const y0 = s.ballPos.y;
        // Use projectile from current position to landing
        // Choose flight time scaled by difficulty (shorter = faster ball)
        // Easier AI: longer flight time → slower, more reachable balls
        // Make AI very simple: lower skill, longer flight time → easier to return
        const skill = 0.20 + opponentSkill * 0.15 + difficulty * 0.10;
        const flightT = THREE.MathUtils.clamp(0.95 / Math.max(0.3, skill), 0.75, 1.60);
        const vz = (aimZ - s.ballPos.z) / flightT;
        const vx = (aimX - s.ballPos.x) / flightT;
        // vy from y0 + vy*t - 0.5*g*t^2 = surfaceY + BALL_R, but allow rise then fall
        const vy = ((TABLE.surfaceY + BALL_R) - y0 + 0.5 * 9.8 * flightT * flightT) / flightT;
        s.ballVel.set(vx, vy, vz);
        // Much higher error → AI misses and gives easy balls
        const err = (1 - skill) * 2.2;
        s.ballVel.x += (Math.random() - 0.5) * err * 2.5;
        s.ballVel.z += (Math.random() - 0.5) * err * 2.0;
        s.ballVel.y = Math.min(s.ballVel.y, 2.2); // cap upward velocity
        // AI spin: bias topspin (ω.x > 0 for ball going +Z), occasional sidespin
        const spinMag = (40 + Math.random() * 60) * skill;
        s.ballSpin.set(
          spinMag * (Math.random() < 0.7 ? 1 : -0.5),     // mostly topspin
          (Math.random() - 0.5) * 30 * skill,              // small sidespin (ω.y)
          0,
        );
        s.bouncedOnPlayerSide = false;
        s.bouncedOnAISide = false;
        s.hitByPlayerLast = false;
        s.hitByAILast = true;
        s.aiSwingCooldown = 0.85;
        s.lastHitT = performance.now();
      }
    }

    // ======= Score detection =======
    let scorer: "player" | "ai" | null = null;
    if (!s.waitingForServe) {

    // Ball fell below surface beyond / off the table → use rules
    if (s.ballPos.y < TABLE.surfaceY - 0.5 || s.ballPos.z > TABLE.l / 2 + 1.5 || s.ballPos.z < -TABLE.l / 2 - 1.5 || Math.abs(s.ballPos.x) > TABLE.w / 2 + 1.8) {
      // Determine who failed
      if (s.hitByPlayerLast) {
        // player hit last: needs to bounce on AI side. If never bounced on AI side → AI scores.
        if (!s.bouncedOnAISide) scorer = "ai";
        else scorer = "player"; // AI failed to return
      } else if (s.hitByAILast) {
        if (!s.bouncedOnPlayerSide) scorer = "player";
        else scorer = "ai";
      } else {
        // serve fault
        scorer = s.serving === "player" ? "ai" : "player";
      }
    }

    if (scorer) {
      onScore(scorer);
      return;
    }
    }

    // ======= Apply transforms =======
    if (ballRef.current) ballRef.current.position.copy(s.ballPos);
    if (ballShadowRef.current) {
      ballShadowRef.current.position.set(s.ballPos.x, TABLE.surfaceY + 0.0015, s.ballPos.z);
      const onTable = Math.abs(s.ballPos.x) <= TABLE.w / 2 && Math.abs(s.ballPos.z) <= TABLE.l / 2;
      const heightAbove = Math.max(0, s.ballPos.y - TABLE.surfaceY);
      const scale = onTable ? Math.max(0.3, 1.6 - heightAbove * 1.0) : 0;
      ballShadowRef.current.scale.setScalar(scale);
    }
    if (playerRef.current) {
      playerRef.current.position.set(s.playerX, s.playerY, s.playerZ);
      // Tilt blade based on swing direction (forward swing → face down for topspin)
      const tilt = THREE.MathUtils.clamp(-s.playerVel.z * 0.15 + 0.5, 0.1, 1.2);
      playerRef.current.rotation.set(tilt, 0, THREE.MathUtils.clamp(s.playerVel.x * 0.05, -0.4, 0.4));
    }
    if (aiRef.current) {
      aiRef.current.position.set(s.aiX, TABLE.surfaceY + 0.18, s.aiZ);
      aiRef.current.rotation.set(-0.6, Math.PI, 0);
    }

    // ======= Spin-colored ball trail =======
    if (trailRef.current) {
      // Shift positions back, push current to head
      for (let i = TRAIL_N - 1; i > 0; i--) {
        trailPositions[i * 3]     = trailPositions[(i - 1) * 3];
        trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
        trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
      }
      trailPositions[0] = s.ballPos.x;
      trailPositions[1] = s.ballPos.y;
      trailPositions[2] = s.ballPos.z;
      // Color by dominant spin axis & magnitude
      const wMag = s.ballSpin.length();
      const intensity = Math.min(1, wMag / 120);
      // Topspin (ω.x same sign as -v.z direction means dive). Use ω.x + ball direction.
      // Heuristic: positive ω.x→red (top/back depending on motion), ω.y→green (side), ω.z→blue
      const ax = Math.abs(s.ballSpin.x);
      const ay = Math.abs(s.ballSpin.y);
      const az = Math.abs(s.ballSpin.z);
      let r = 1, g = 1, b = 1;
      if (intensity > 0.05) {
        if (ax >= ay && ax >= az) {
          // top/back spin — red for topspin (dives), blue for backspin (floats)
          const isTop = (s.ballSpin.x < 0 && s.ballVel.z < 0) || (s.ballSpin.x > 0 && s.ballVel.z > 0);
          if (isTop) { r = 1; g = 0.3; b = 0.2; } else { r = 0.3; g = 0.6; b = 1; }
        } else if (ay >= az) {
          r = 0.4; g = 1; b = 0.3; // sidespin → green
        } else {
          r = 1; g = 0.85; b = 0.2; // gyro spin → amber
        }
      }
      // Fade older points by interpolating toward white at low intensity
      const baseR = THREE.MathUtils.lerp(1, r, intensity);
      const baseG = THREE.MathUtils.lerp(1, g, intensity);
      const baseB = THREE.MathUtils.lerp(1, b, intensity);
      for (let i = 0; i < TRAIL_N; i++) {
        trailColors[i * 3]     = baseR;
        trailColors[i * 3 + 1] = baseG;
        trailColors[i * 3 + 2] = baseB;
      }
      const geom = trailRef.current.geometry as THREE.BufferGeometry;
      (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geom.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      // Hide trail entirely while waiting for serve
      trailRef.current.visible = !s.waitingForServe;
    }

    // throttle UI score updates
    const now = performance.now();
    if (now - lastUpdateUI.current > 200) {
      lastUpdateUI.current = now;
      onUpdate();
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-3, 4, -2]} intensity={0.4} color="#ff6a3d" />
      <Table />
      {/* Ball */}
      <mesh ref={ballRef} castShadow>
        <sphereGeometry args={[BALL_R, 24, 24]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      {/* Fake contact shadow on table */}
      <mesh ref={ballShadowRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[BALL_R * 1.6, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.35} />
      </mesh>
      <group ref={playerRef}>
        <PaddleMesh color="#dc2626" />
      </group>
      <group ref={aiRef}>
        <PaddleMesh color="#1d4ed8" />
      </group>
      {/* Spin-colored ball trail */}
      {/* @ts-ignore — r3f line element typing */}
      <line ref={trailRef as any}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trailPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[trailColors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.7} linewidth={2} />
      </line>
    </>
  );
}

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    // Behind player, slightly above, looking down the table
    camera.position.set(0, TABLE.surfaceY + 0.85, TABLE.l / 2 + 1.4);
    camera.lookAt(0, TABLE.surfaceY + 0.1, -0.4);
  }, [camera]);
  return null;
}

export default function TTGame3D() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const stateRef = useRef<GameState>(makeServeState("player"));
  const inputRef = useRef({ x: 0, y: 0, z: 0.6 }); // x: side, y: height, z: depth
  const containerRef = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);
  const [country] = useState(COUNTRIES[0]);
  const [opponent, setOpponent] = useState(() => COUNTRIES[1 + Math.floor(Math.random() * (COUNTRIES.length - 1))]);
  const [difficulty, setDifficulty] = useState(1);
  const [winner, setWinner] = useState<"player" | "ai" | null>(null);
  const [matchStarted, setMatchStarted] = useState(false);
  const [rotated, setRotated] = useState(false);

  const handleScore = (who: "player" | "ai") => {
    const s = stateRef.current;
    if (who === "player") s.scorePlayer++;
    else s.scoreAI++;
    if ((s.scorePlayer >= 11 || s.scoreAI >= 11) && Math.abs(s.scorePlayer - s.scoreAI) >= 2) {
      setWinner(s.scorePlayer > s.scoreAI ? "player" : "ai");
      s.paused = true;
    } else {
      // alternate serve every 2 points
      const total = s.scorePlayer + s.scoreAI;
      const serve: "player" | "ai" = Math.floor(total / 2) % 2 === 0 ? "player" : "ai";
      resetForServe(s, serve);
    }
    force((v) => v + 1);
  };

  const restart = () => {
    stateRef.current = makeServeState("player");
    setWinner(null);
    setOpponent(COUNTRIES[1 + Math.floor(Math.random() * (COUNTRIES.length - 1))]);
    setMatchStarted(false);
    force((v) => v + 1);
  };

  const onPointer = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    inputRef.current.x = (x - 0.5) * 2;       // side: -1..1
    // Right mouse / shift / 2nd touch → control vertical lift instead of depth
    const liftMode = e.shiftKey || e.buttons === 2 || (e as any).pointerType === "touch" && e.altKey;
    if (liftMode) {
      // top of screen = high lift
      inputRef.current.y = THREE.MathUtils.clamp(1 - y, 0, 1);
    } else {
      // depth: top of screen = forward (toward net = -1), bottom = back (+1)
      inputRef.current.z = (y - 0.5) * 2;
    }
  };

  // Keyboard controls (desktop)
  useEffect(() => {
    const keys = new Set<string>();
    const tick = () => {
      const speed = 0.05;
      if (keys.has("ArrowLeft") || keys.has("a")) inputRef.current.x = Math.max(-1, inputRef.current.x - speed);
      if (keys.has("ArrowRight") || keys.has("d")) inputRef.current.x = Math.min(1, inputRef.current.x + speed);
      if (keys.has("ArrowUp") || keys.has("w")) inputRef.current.z = Math.max(-1, inputRef.current.z - speed);
      if (keys.has("ArrowDown") || keys.has("s")) inputRef.current.z = Math.min(1, inputRef.current.z + speed);
      // Q/E or Space/Shift = paddle height (Y)
      if (keys.has("e") || keys.has(" ")) inputRef.current.y = Math.min(1, inputRef.current.y + speed);
      if (keys.has("q") || keys.has("Shift")) inputRef.current.y = Math.max(0, inputRef.current.y - speed);
    };
    const id = setInterval(tick, 16);
    const kd = (e: KeyboardEvent) => keys.add(e.key);
    const ku = (e: KeyboardEvent) => keys.delete(e.key);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { clearInterval(id); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, []);

  const goFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => {});
    // @ts-ignore
    if (screen.orientation && screen.orientation.lock) {
      // @ts-ignore
      screen.orientation.lock("landscape").catch(() => {});
    }
  };

  const startMatch = () => {
    setMatchStarted(true);
    // Attempt fullscreen + landscape lock for an immersive experience
    const el = containerRef.current;
    if (el && !document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    }
    // @ts-ignore
    if (screen.orientation && screen.orientation.lock) {
      // @ts-ignore
      screen.orientation.lock("landscape").catch(() => {
        // Fallback: CSS rotate for devices that won't honor lock
        if (window.innerHeight > window.innerWidth) setRotated(true);
      });
    } else if (window.innerHeight > window.innerWidth) {
      setRotated(true);
    }
  };

  const s = stateRef.current;

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-hidden touch-none">
      <div
        className="absolute inset-0"
        style={
          rotated
            ? {
                transform: "rotate(90deg)",
                transformOrigin: "center center",
                width: "100vh",
                height: "100vw",
                top: "calc((100vh - 100vw) / 2)",
                left: "calc((100vw - 100vh) / 2)",
              }
            : undefined
        }
      >
      <div
        className="absolute inset-0"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
      >
        <Canvas shadows camera={{ fov: 55 }}>
          <CameraRig />
          <Suspense fallback={null}>
            <Scene
              stateRef={stateRef}
              onScore={handleScore}
              inputRef={inputRef}
              difficulty={difficulty}
              opponentSkill={opponent.skill}
              onUpdate={() => force((v) => v + 1)}
              active={matchStarted && !winner}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* HUD */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <Button
          variant="outline"
          size="sm"
          className="pointer-events-auto bg-background/40 backdrop-blur"
          onClick={() => navigate("/tt-hub")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {lang === "ru" ? "Назад" : lang === "en" ? "Back" : "Orqaga"}
        </Button>

        <div className="glass-card rounded-xl px-4 py-2 flex items-center gap-4 text-foreground">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{country.flag}</span>
            <span className="font-display text-2xl font-bold tabular-nums">{s.scorePlayer}</span>
          </div>
          <span className="text-muted-foreground">:</span>
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl font-bold tabular-nums">{s.scoreAI}</span>
            <span className="text-2xl">{opponent.flag}</span>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <Button
            variant="outline"
            size="sm"
            className="bg-background/40 backdrop-blur"
            onClick={() => setRotated((v) => !v)}
            title="Rotate"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-background/40 backdrop-blur"
            onClick={goFullscreen}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Difficulty */}
      <div className="absolute bottom-3 left-3 z-10 flex gap-2 pointer-events-auto">
        {[0, 1, 2].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={difficulty === d ? "ember" : "outline"}
            className="bg-background/40 backdrop-blur"
            onClick={() => setDifficulty(d)}
          >
            {["Easy", "Medium", "Hard"][d]}
          </Button>
        ))}
      </div>

      <div className="absolute bottom-3 right-3 z-10 text-xs text-white/70 pointer-events-none max-w-[210px] text-right leading-snug">
        {lang === "ru"
          ? "Подача — свайп вперёд. ◀▶ сторона, ▲▼ глубина. Кнопки ↑↓ — высота ракетки."
          : lang === "en"
          ? "Swipe forward to serve. ◀▶ side, ▲▼ depth. ↑↓ buttons — paddle height."
          : "Podacha — oldinga harakat. ◀▶ yon, ▲▼ chuqurlik. ↑↓ tugmalari — raketka balandligi."}
      </div>

      {/* Paddle height controls (Y axis) */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2 pointer-events-auto">
        <Button
          size="icon"
          variant="outline"
          className="bg-background/40 backdrop-blur h-12 w-12"
          onPointerDown={() => { inputRef.current.y = Math.min(1, inputRef.current.y + 0.25); }}
          title="Up"
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
        <div className="text-[10px] text-white/70 text-center bg-background/40 backdrop-blur rounded px-1 py-0.5">
          Y: {Math.round(inputRef.current.y * 100)}%
        </div>
        <Button
          size="icon"
          variant="outline"
          className="bg-background/40 backdrop-blur h-12 w-12"
          onPointerDown={() => { inputRef.current.y = Math.max(0, inputRef.current.y - 0.25); }}
          title="Down"
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
      </div>
      </div>

      {/* Winner overlay */}
      {winner && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-8 text-center max-w-sm mx-4">
            <Trophy className="h-14 w-14 text-amber-500 mx-auto mb-3" />
            <h2 className="font-display text-3xl font-bold text-foreground mb-2">
              {winner === "player"
                ? lang === "ru" ? "Победа!" : lang === "en" ? "You win!" : "G'alaba!"
                : lang === "ru" ? "Поражение" : lang === "en" ? "You lose" : "Mag'lubiyat"}
            </h2>
            <p className="text-muted-foreground mb-5">
              {country.flag} {s.scorePlayer} : {s.scoreAI} {opponent.flag}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="ember" onClick={restart}>
                {lang === "ru" ? "Снова" : lang === "en" ? "Play again" : "Yana o'ynash"}
              </Button>
              <Button variant="outline" onClick={() => navigate("/tt-hub")}>
                {lang === "ru" ? "Выйти" : lang === "en" ? "Exit" : "Chiqish"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Championship Lobby — before match starts */}
      {!matchStarted && !winner && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 backdrop-blur-sm overflow-y-auto py-6">
          <div className="glass-card rounded-2xl p-6 max-w-2xl w-[92%] mx-4">
            <div className="text-center mb-5">
              <Trophy className="h-10 w-10 text-amber-500 mx-auto mb-2" />
              <h2 className="font-display text-2xl font-bold text-foreground">
                {lang === "ru" ? "Чемпионат стран" : lang === "en" ? "Country Championship" : "Davlatlar chempionati"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {lang === "ru" ? "Выберите соперника и начните матч (до 11)" : lang === "en" ? "Pick an opponent and start the match (first to 11)" : "Raqibni tanlang va o'yinni boshlang (11gacha)"}
              </p>
            </div>

            {/* Versus header */}
            <div className="flex items-center justify-around mb-5">
              <div className="text-center">
                <div className="text-5xl">{country.flag}</div>
                <div className="font-display font-bold text-foreground mt-1">{country.name}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {lang === "ru" ? "Вы" : lang === "en" ? "You" : "Siz"}
                </div>
              </div>
              <div className="font-display text-2xl text-primary font-bold">VS</div>
              <div className="text-center">
                <div className="text-5xl">{opponent.flag}</div>
                <div className="font-display font-bold text-foreground mt-1">{opponent.name}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {lang === "ru" ? "Соперник" : lang === "en" ? "Opponent" : "Raqib"} • ★ {opponent.skill.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Other participating countries */}
            <div>
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                {lang === "ru" ? "Участники турнира — нажмите чтобы сменить соперника" : lang === "en" ? "Tournament participants — tap to change opponent" : "Ishtirokchilar — raqibni o'zgartirish uchun bosing"}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {COUNTRIES.filter((c) => c.code !== "UZ").map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setOpponent(c)}
                    className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                      opponent.code === c.code
                        ? "border-primary bg-primary/15"
                        : "border-border bg-secondary/30 hover:border-primary/50"
                    }`}
                  >
                    <div className="text-2xl">{c.flag}</div>
                    <div className="text-[11px] text-foreground font-medium mt-1 truncate w-full text-center">{c.name}</div>
                    <div className="text-[9px] text-amber-500">★ {c.skill.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="mt-5">
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                {lang === "ru" ? "Сложность" : lang === "en" ? "Difficulty" : "Daraja"}
              </div>
              <div className="flex gap-2">
                {[0, 1, 2].map((d) => (
                  <Button key={d} size="sm" className="flex-1" variant={difficulty === d ? "ember" : "outline"} onClick={() => setDifficulty(d)}>
                    {["Easy", "Medium", "Hard"][d]}
                  </Button>
                ))}
              </div>
            </div>

            <Button variant="ember" className="w-full mt-5" size="lg" onClick={startMatch}>
              🏓 {lang === "ru" ? "Начать матч" : lang === "en" ? "Start match" : "Boshlash"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
