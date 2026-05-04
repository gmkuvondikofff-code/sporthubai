import { useEffect, useRef, useState, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize2, Trophy } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

// Table dimensions (scaled units, not real-world)
const TABLE = { w: 4, l: 7, h: 0.1, netH: 0.4 };
const PADDLE = { w: 0.9, h: 0.9, t: 0.06 };
const BALL_R = 0.08;

const COUNTRIES = [
  { code: "UZ", flag: "🇺🇿", name: "Uzbekistan" },
  { code: "CN", flag: "🇨🇳", name: "China" },
  { code: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "KR", flag: "🇰🇷", name: "Korea" },
  { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "SE", flag: "🇸🇪", name: "Sweden" },
  { code: "BR", flag: "🇧🇷", name: "Brazil" },
];

interface GameState {
  ballPos: THREE.Vector3;
  ballVel: THREE.Vector3;
  playerX: number;
  playerZ: number;
  aiX: number;
  scorePlayer: number;
  scoreAI: number;
  bouncedOnPlayerSide: boolean;
  bouncedOnAISide: boolean;
  serving: "player" | "ai";
  paused: boolean;
}

function makeInitialState(serving: "player" | "ai" = "player"): GameState {
  return {
    ballPos: new THREE.Vector3(0, 1.2, serving === "player" ? TABLE.l / 2 - 0.5 : -TABLE.l / 2 + 0.5),
    ballVel: new THREE.Vector3(
      (Math.random() - 0.5) * 1.5,
      0,
      serving === "player" ? -3.2 : 3.2,
    ),
    playerX: 0,
    playerZ: TABLE.l / 2 - 0.4,
    aiX: 0,
    scorePlayer: 0,
    scoreAI: 0,
    bouncedOnPlayerSide: false,
    bouncedOnAISide: false,
    serving,
    paused: false,
  };
}

function Table() {
  return (
    <group>
      {/* Table top */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[TABLE.w, TABLE.h, TABLE.l]} />
        <meshStandardMaterial color="#0d4f3c" />
      </mesh>
      {/* White lines border */}
      <mesh position={[0, TABLE.h / 2 + 0.001, 0]}>
        <ringGeometry args={[0, 0, 0]} />
        <meshBasicMaterial color="white" />
      </mesh>
      {[
        [0, TABLE.l / 2 - 0.02],
        [0, -TABLE.l / 2 + 0.02],
      ].map((p, i) => (
        <mesh key={"hl" + i} position={[0, TABLE.h / 2 + 0.002, p[1]]}>
          <boxGeometry args={[TABLE.w, 0.002, 0.04]} />
          <meshBasicMaterial color="white" />
        </mesh>
      ))}
      {[
        [TABLE.w / 2 - 0.02, 0],
        [-TABLE.w / 2 + 0.02, 0],
      ].map((p, i) => (
        <mesh key={"vl" + i} position={[p[0], TABLE.h / 2 + 0.002, 0]}>
          <boxGeometry args={[0.04, 0.002, TABLE.l]} />
          <meshBasicMaterial color="white" />
        </mesh>
      ))}
      {/* Center line */}
      <mesh position={[0, TABLE.h / 2 + 0.002, 0]}>
        <boxGeometry args={[0.02, 0.002, TABLE.l]} />
        <meshBasicMaterial color="white" />
      </mesh>
      {/* Net */}
      <mesh position={[0, TABLE.h / 2 + TABLE.netH / 2, 0]}>
        <boxGeometry args={[TABLE.w + 0.4, TABLE.netH, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.85} />
      </mesh>
      {/* Legs */}
      {[
        [TABLE.w / 2 - 0.1, TABLE.l / 2 - 0.1],
        [-TABLE.w / 2 + 0.1, TABLE.l / 2 - 0.1],
        [TABLE.w / 2 - 0.1, -TABLE.l / 2 + 0.1],
        [-TABLE.w / 2 + 0.1, -TABLE.l / 2 + 0.1],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], -1, p[1]]}>
          <boxGeometry args={[0.08, 2, 0.08]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
      {/* Floor */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0a0a12" />
      </mesh>
    </group>
  );
}

function Paddle({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[PADDLE.w / 2, PADDLE.w / 2, PADDLE.t, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -PADDLE.h / 2 - 0.1, 0]}>
        <boxGeometry args={[0.12, 0.3, 0.06]} />
        <meshStandardMaterial color="#3a2417" />
      </mesh>
    </group>
  );
}

interface SceneProps {
  stateRef: React.MutableRefObject<GameState>;
  onScore: (who: "player" | "ai") => void;
  pointerXRef: React.MutableRefObject<number>;
  difficulty: number;
}

function Scene({ stateRef, onScore, pointerXRef, difficulty }: SceneProps) {
  const ballRef = useRef<THREE.Mesh>(null!);
  const playerRef = useRef<THREE.Group>(null!);
  const aiRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.033);
    const s = stateRef.current;
    if (s.paused) return;

    // Player paddle follows pointer
    const targetX = THREE.MathUtils.clamp(pointerXRef.current * (TABLE.w / 2 + 0.4), -TABLE.w / 2 - 0.3, TABLE.w / 2 + 0.3);
    s.playerX = THREE.MathUtils.lerp(s.playerX, targetX, 0.25);

    // AI moves toward ball x
    const aiTargetX = THREE.MathUtils.clamp(s.ballPos.x, -TABLE.w / 2 - 0.2, TABLE.w / 2 + 0.2);
    s.aiX = THREE.MathUtils.lerp(s.aiX, aiTargetX, 0.04 + difficulty * 0.04);

    // Gravity & motion
    s.ballVel.y -= 9.8 * dt;
    s.ballPos.addScaledVector(s.ballVel, dt);

    // Bounce on table
    if (
      s.ballPos.y - BALL_R <= TABLE.h / 2 &&
      Math.abs(s.ballPos.x) < TABLE.w / 2 &&
      Math.abs(s.ballPos.z) < TABLE.l / 2
    ) {
      s.ballPos.y = TABLE.h / 2 + BALL_R;
      s.ballVel.y = Math.abs(s.ballVel.y) * 0.78;
      if (s.ballPos.z > 0) s.bouncedOnPlayerSide = true;
      else s.bouncedOnAISide = true;
    }

    // Net collision
    if (
      Math.abs(s.ballPos.z) < 0.04 &&
      s.ballPos.y < TABLE.h / 2 + TABLE.netH &&
      Math.abs(s.ballPos.x) < TABLE.w / 2 + 0.2
    ) {
      s.ballVel.z *= -0.3;
      s.ballVel.y *= 0.4;
    }

    // Player paddle hit
    const playerZ = TABLE.l / 2 - 0.3;
    if (
      s.ballVel.z > 0 &&
      s.ballPos.z >= playerZ - 0.1 &&
      s.ballPos.z <= playerZ + 0.2 &&
      Math.abs(s.ballPos.x - s.playerX) < PADDLE.w / 2 + BALL_R &&
      s.ballPos.y > TABLE.h / 2 &&
      s.ballPos.y < TABLE.h / 2 + 1.2
    ) {
      s.ballVel.z = -Math.abs(s.ballVel.z) * 1.05;
      s.ballVel.x += (s.ballPos.x - s.playerX) * 4;
      s.ballVel.y = Math.max(2.5, s.ballVel.y + 3);
      s.bouncedOnPlayerSide = false;
      s.bouncedOnAISide = false;
    }

    // AI paddle hit
    const aiZ = -TABLE.l / 2 + 0.3;
    if (
      s.ballVel.z < 0 &&
      s.ballPos.z <= aiZ + 0.1 &&
      s.ballPos.z >= aiZ - 0.2 &&
      Math.abs(s.ballPos.x - s.aiX) < PADDLE.w / 2 + BALL_R &&
      s.ballPos.y > TABLE.h / 2 &&
      s.ballPos.y < TABLE.h / 2 + 1.2
    ) {
      s.ballVel.z = Math.abs(s.ballVel.z) * (1 + difficulty * 0.05);
      s.ballVel.x = (Math.random() - 0.5) * 3 + (s.aiX - s.ballPos.x) * -2;
      s.ballVel.y = Math.max(2.5, 3 + Math.random() * 2);
      s.bouncedOnPlayerSide = false;
      s.bouncedOnAISide = false;
    }

    // Out of bounds → score
    const out =
      s.ballPos.y < -2 ||
      s.ballPos.z > TABLE.l / 2 + 1.5 ||
      s.ballPos.z < -TABLE.l / 2 - 1.5 ||
      Math.abs(s.ballPos.x) > TABLE.w / 2 + 2.5;

    if (out) {
      // Determine winner: who failed to make it land on opponent's side
      const playerScored = !s.bouncedOnAISide && s.ballPos.z < 0 ? false : s.ballPos.z < 0;
      const winner: "player" | "ai" = s.ballPos.z < 0 ? "player" : "ai";
      // simpler: ball going past player means AI scores; past AI means player scores
      onScore(winner);
      return;
    }

    // Apply transforms
    if (ballRef.current) ballRef.current.position.copy(s.ballPos);
    if (playerRef.current)
      playerRef.current.position.set(s.playerX, TABLE.h / 2 + 0.5, playerZ);
    if (aiRef.current) aiRef.current.position.set(s.aiX, TABLE.h / 2 + 0.5, aiZ);
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.1} castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={0.4} color="#ff6a3d" />
      <Table />
      <mesh ref={ballRef}>
        <sphereGeometry args={[BALL_R, 24, 24]} />
        <meshStandardMaterial color="#ffffff" emissive="#ff6a3d" emissiveIntensity={0.15} />
      </mesh>
      <group ref={playerRef} rotation={[Math.PI / 2.4, 0, 0]}>
        <Paddle position={[0, 0, 0]} color="#dc2626" />
      </group>
      <group ref={aiRef} rotation={[-Math.PI / 2.4, 0, Math.PI]}>
        <Paddle position={[0, 0, 0]} color="#1d4ed8" />
      </group>
    </>
  );
}

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 3.2, 6.5);
    camera.lookAt(0, 0.5, -1);
  }, [camera]);
  return null;
}

export default function TTGame3D() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const stateRef = useRef<GameState>(makeInitialState("player"));
  const pointerXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);
  const [country] = useState(COUNTRIES[0]);
  const [opponent, setOpponent] = useState(() => COUNTRIES[1 + Math.floor(Math.random() * (COUNTRIES.length - 1))]);
  const [difficulty, setDifficulty] = useState(1);
  const [winner, setWinner] = useState<"player" | "ai" | null>(null);

  const handleScore = (who: "player" | "ai") => {
    const s = stateRef.current;
    if (who === "player") s.scorePlayer++;
    else s.scoreAI++;
    if (s.scorePlayer >= 11 || s.scoreAI >= 11) {
      setWinner(s.scorePlayer > s.scoreAI ? "player" : "ai");
      s.paused = true;
    } else {
      Object.assign(s, makeInitialState(who === "player" ? "ai" : "player"), {
        scorePlayer: s.scorePlayer,
        scoreAI: s.scoreAI,
      });
    }
    force((v) => v + 1);
  };

  const restart = () => {
    stateRef.current = makeInitialState("player");
    setWinner(null);
    setOpponent(COUNTRIES[1 + Math.floor(Math.random() * (COUNTRIES.length - 1))]);
    force((v) => v + 1);
  };

  const onPointer = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    pointerXRef.current = (x - 0.5) * 2; // -1..1
  };

  const goFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => {});
    // Try landscape on mobile
    // @ts-ignore
    if (screen.orientation && screen.orientation.lock) {
      // @ts-ignore
      screen.orientation.lock("landscape").catch(() => {});
    }
  };

  const s = stateRef.current;

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-hidden touch-none">
      <div
        className="absolute inset-0"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
      >
        <Canvas shadows camera={{ fov: 55 }}>
          <CameraRig />
          <Suspense fallback={null}>
            <Scene stateRef={stateRef} onScore={handleScore} pointerXRef={pointerXRef} difficulty={difficulty} />
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

        <Button
          variant="outline"
          size="sm"
          className="pointer-events-auto bg-background/40 backdrop-blur"
          onClick={goFullscreen}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
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

      <div className="absolute bottom-3 right-3 z-10 text-xs text-white/70 pointer-events-none max-w-[180px] text-right">
        {lang === "ru"
          ? "Двигайте пальцем/мышью влево-вправо чтобы управлять ракеткой"
          : lang === "en"
          ? "Drag finger/mouse left-right to move the paddle"
          : "Raketkani boshqarish uchun barmoq/sichqonni chap-o'ngga suring"}
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

    </div>
  );
}