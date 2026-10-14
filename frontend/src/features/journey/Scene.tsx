'use client';

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Edges, Line, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { clampProgress, type Participant, type Scenario } from './story';

interface SceneProps {
  progressRef: MutableRefObject<number>;
  training: number;
  role: Participant;
  scenario: Scenario;
  approved: boolean;
  reduced: boolean;
  onParticipant: (participant: Participant) => void;
}
const CORAL = '#ce775e';
const SAGE = '#a9b990';
const CREAM = '#f1f0e8';
const DARK = '#182d2c';

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}
function Fallback() {
  return (
    <div className="world-fallback" aria-hidden="true">
      <svg viewBox="0 0 600 520" fill="none">
        <rect x="35" y="40" width="525" height="430" rx="4" stroke="#8b9b79" />
        {[0, 1, 2, 3].map((row) => (
          <rect
            key={row}
            x="75"
            y={205 + row * 28}
            width="140"
            height="21"
            rx="3"
            fill="#ce775e"
            fillOpacity=".5"
            stroke="#bc6952"
          />
        ))}
        <path d="M216 245h75" stroke="#bc6952" strokeDasharray="4 5" />
        {[150, 230, 310].flatMap((y, i) =>
          [190, 270].map((end, j) => (
            <path key={`${i}-${j}`} d={`M320 ${y} 400 ${end} 480 230`} stroke="#859674" />
          )),
        )}
        {[150, 230, 310].map((y) => (
          <circle key={y} cx="320" cy={y} r="12" fill="#a9b990" />
        ))}
        {[190, 270].map((y) => (
          <circle key={y} cx="400" cy={y} r="12" fill="#a9b990" />
        ))}
        <circle cx="480" cy="230" r="12" fill="#a9b990" />
      </svg>
    </div>
  );
}

/** Cull whole stations past the fog plane, including line shaders that do not receive fog. */
function Station({
  position,
  children,
  scale = 1,
  rotation,
}: {
  position: [number, number, number];
  children: ReactNode;
  scale?: number;
  rotation?: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (!ref.current) return;
    const depth = camera.position.z - position[2];
    ref.current.visible = depth > -5 && depth < 29;
  });
  return (
    <group ref={ref} position={position} scale={scale} rotation={rotation}>
      {children}
    </group>
  );
}

function DataStack({
  position = [0, 0, 0],
  selected = false,
  onClick,
}: {
  position?: [number, number, number];
  selected?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <group position={position} rotation={[0.08, -0.35, -0.05]} onClick={onClick}>
      {[0, 1, 2, 3, 4].map((index) => (
        <group key={index} position={[0, index * 0.31 - 0.65, 0]}>
          <RoundedBox args={[1.8, 0.17, 1.3]} radius={0.06} smoothness={2}>
            <meshStandardMaterial
              color={index === 4 || selected ? CORAL : '#dec7b4'}
              roughness={0.55}
              metalness={0.06}
            />
            <Edges color="#8d5544" threshold={30} />
          </RoundedBox>
          {[0, 1, 2].map((dot) => (
            <mesh key={dot} position={[-0.6 + dot * 0.17, 0.005, 0.661]}>
              <circleGeometry args={[0.026, 8]} />
              <meshBasicMaterial color="#f8e9d6" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Model({
  position = [0, 0, 0],
  scale = 1,
  progress = 0,
  active = false,
  onClick,
}: {
  position?: [number, number, number];
  scale?: number;
  progress?: number;
  active?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}) {
  // A simplified input / hidden / output network, rather than an unrelated floating shape.
  const layers = useMemo(
    () =>
      [3, 5, 2].map((count, column) =>
        Array.from(
          { length: count },
          (_, row) =>
            new THREE.Vector3(
              (column - 1) * 1.3,
              (row - (count - 1) / 2) * 0.49,
              column === 1 ? -0.35 : 0.15,
            ),
        ),
      ),
    [],
  );
  const learned = clampProgress(progress / 100);
  return (
    <group position={position} scale={scale} onClick={onClick}>
      <group rotation={[0.12, -0.2, 0]}>
        <RoundedBox args={[3.45, 2.8, 0.16]} position={[0, 0, -0.55]} radius={0.1} smoothness={2}>
          <meshStandardMaterial color={SAGE} transparent opacity={0.09} depthWrite={false} />
          <Edges color="#879b79" />
        </RoundedBox>
        {layers
          .slice(0, -1)
          .flatMap((layer, column) =>
            layer.flatMap((from, row) =>
              layers[column + 1].map((to, nextRow) => (
                <Line
                  key={`${column}-${row}-${nextRow}`}
                  points={[from, to]}
                  color="#829970"
                  lineWidth={0.9 + learned * 0.4}
                  transparent
                  opacity={0.48 + learned * 0.35}
                />
              )),
            ),
          )}
        {layers.flatMap((layer, column) =>
          layer.map((node, row) => (
            <mesh key={`${column}-${row}`} position={node}>
              <sphereGeometry args={[0.115 + learned * 0.025, 12, 10]} />
              <meshStandardMaterial
                color={active ? '#d0dfb1' : SAGE}
                roughness={0.35}
                metalness={0.1}
                emissive={SAGE}
                emissiveIntensity={learned * 0.35}
              />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}

function Portal({
  position,
  scale = 1,
  color = '#a8b19c',
  depth = 0.7,
}: {
  position: [number, number, number];
  scale?: number;
  color?: string;
  depth?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <RoundedBox args={[0.11, 6.5, depth]} position={[-2.6, 0, 0]} radius={0.035} smoothness={2}>
        <meshStandardMaterial color={color} roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[0.11, 6.5, depth]} position={[2.6, 0, 0]} radius={0.035} smoothness={2}>
        <meshStandardMaterial color={color} roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[5.3, 0.11, depth]} position={[0, 3.2, 0]} radius={0.035} smoothness={2}>
        <meshStandardMaterial color={color} roughness={0.55} />
      </RoundedBox>
      <Line
        points={[
          [-2.6, -3.2, 0],
          [2.6, -3.2, 0],
        ]}
        color={color}
        lineWidth={1.2}
      />
      <Line
        points={[
          [-2.35, -3.2, -0.6],
          [-2.35, 2.95, -0.6],
          [2.35, 2.95, -0.6],
          [2.35, -3.2, -0.6],
        ]}
        color={color}
        lineWidth={0.7}
        transparent
        opacity={0.4}
      />
    </group>
  );
}

function Connection({
  start,
  end,
  color,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
}) {
  const points = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(...start),
        new THREE.Vector3(start[0], start[1] + 0.5, (start[2] + end[2]) / 2),
        new THREE.Vector3(...end),
      ]).getPoints(50),
    [start, end],
  );
  return <Line points={points} color={color} lineWidth={1.15} transparent opacity={0.65} />;
}

function Chamber({
  position,
  training,
  approved,
}: {
  position: [number, number, number];
  training: number;
  approved: boolean;
}) {
  const release = clampProgress((training - 90) / 10);
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[5.8, 4.8, 4.5]} />
        <meshStandardMaterial
          color="#8caaa2"
          transparent
          opacity={0.035}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
        <Edges color={approved ? '#bdcaa7' : '#819991'} />
      </mesh>
      <mesh position={[0, -2.4, 0]}>
        <boxGeometry args={[6.1, 0.12, 4.8]} />
        <meshStandardMaterial color="#35524b" roughness={0.65} metalness={0.15} />
      </mesh>
      <DataStack position={[-1.5, -1.3, 0]} selected />
      <Model
        position={[1.15 + release * 1.1, 0.4 + release * 0.3, release * 3]}
        scale={0.7}
        progress={training}
        active={training > 0}
      />
      <Connection start={[-1.4, -0.5, 0]} end={[1.2, 0.2, 0]} color={CORAL} />
      {/* Progress markers describe the job lifecycle; there are no decorative particles. */}
      {[0, 25, 75, 90].map((start, index) => (
        <mesh key={index} position={[-2.3 + index * 0.35, -2.2, 2.31]}>
          <boxGeometry args={[0.2, 0.06, 0.04]} />
          <meshBasicMaterial color={training >= start && approved ? SAGE : '#476259'} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((index) => (
        <Line
          key={index}
          points={[
            [-2.8, -2.3 + index * 1.53, 2.3],
            [-2.45, -2.3 + index * 1.53, 2.3],
          ]}
          color={SAGE}
        />
      ))}
    </group>
  );
}

const CAMERA_POSITIONS = [
  new THREE.Vector3(0, 1.2, 15),
  new THREE.Vector3(0, 1.2, -2),
  new THREE.Vector3(0, 1, -21),
  new THREE.Vector3(0, 0.8, -39),
  new THREE.Vector3(0, 1.2, -56),
  new THREE.Vector3(0, 1.1, -75),
];
const LOOK_POSITIONS = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -18),
  new THREE.Vector3(0, 0, -36),
  new THREE.Vector3(0, 0, -54),
  new THREE.Vector3(0, 0, -70),
  new THREE.Vector3(0, 0, -90),
];

function World(props: SceneProps) {
  const cameraPath = useMemo(
    () => new THREE.CatmullRomCurve3(CAMERA_POSITIONS, false, 'catmullrom', 0.3),
    [],
  );
  const lookPath = useMemo(
    () => new THREE.CatmullRomCurve3(LOOK_POSITIONS, false, 'catmullrom', 0.3),
    [],
  );
  const current = useRef(0);
  const point = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const bg = useMemo(() => new THREE.Color(CREAM), []);
  const cream = useMemo(() => new THREE.Color(CREAM), []);
  const dark = useMemo(() => new THREE.Color(DARK), []);
  useFrame(({ camera, scene, pointer, size }, delta) => {
    const target = props.progressRef.current;
    // Frame-rate independent easing: no discrete chapter swaps or wheel interception.
    current.current = props.reduced
      ? target
      : THREE.MathUtils.lerp(current.current, target, 1 - Math.exp(-Math.min(delta, 0.05) * 5));
    const t = clampProgress(current.current);
    const compact = size.width < 700;
    const cameraProgress = props.reduced ? Math.floor(t * 5 + 0.01) / 5 : t;
    cameraPath.getPoint(cameraProgress, point);
    lookPath.getPoint(cameraProgress, look);
    if (compact) {
      point.x += 2.8;
      look.x += 2.8;
      point.y += 1.7;
      look.y += 1.7;
    } else if (!props.reduced) {
      point.x += pointer.x * 0.12;
      point.y += pointer.y * 0.08;
    }
    camera.position.copy(point);
    camera.lookAt(look);
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== (compact ? 49 : 39)) {
      camera.fov = compact ? 49 : 39;
      camera.updateProjectionMatrix();
    }
    const blend =
      t < 0.39 ? 0 : t < 0.57 ? (t - 0.39) / 0.18 : t < 0.82 ? 1 : 1 - (t - 0.82) / 0.17;
    bg.copy(cream).lerp(dark, clampProgress(blend));
    if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(bg);
  });
  const pick = (role: Participant) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    props.onParticipant(role);
  };
  return (
    <>
      <fog attach="fog" args={[CREAM, 18, 29]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[4, 8, 12]} intensity={2.2} color="#fff4e3" />
      <directionalLight position={[-8, 3, -55]} intensity={2} color="#b8d1bd" />
      <pointLight position={[5, 6, -66]} intensity={45} distance={25} color="#cee1b9" />
      <Station position={[3.2, 0, 0]} rotation={[0, -0.23, -0.015]}>
        <Portal position={[0, 0, 0]} />
        <DataStack
          position={[-1.2, -0.9, 1]}
          selected={props.role === 'provider'}
          onClick={pick('provider')}
        />
        <Model position={[1.2, 0.7, -0.4]} scale={0.8} onClick={pick('trainer')} />
        <Connection start={[-1.2, -0.3, 1]} end={[1.2, 0.5, -0.4]} color={CORAL} />
        <mesh position={[0, -3.27, -1]}>
          <boxGeometry args={[5.3, 0.04, 4]} />
          <meshStandardMaterial color="#dedfd0" roughness={0.9} />
        </mesh>
      </Station>
      <Station position={[0, -1.1, -18]}>
        <DataStack
          position={[-1.6, -0.2, 0]}
          selected={props.role === 'provider'}
          onClick={pick('provider')}
        />
        <Model
          position={[1.6, 0.3, 0]}
          scale={0.8}
          active={props.role === 'trainer'}
          onClick={pick('trainer')}
        />
        <Connection start={[-1.6, 0, 0]} end={[1.6, 0.3, 0]} color={CORAL} />
      </Station>
      <Station position={[4.1, 2.35, -36]} rotation={[0, -0.3, 0]} scale={0.45}>
        <DataStack position={[-1.2, -0.5, 0]} selected />
        <Model position={[1.2, 0.6, 0]} scale={0.8} active />
        <Connection
          start={[-1.2, -0.2, 0]}
          end={[1.2, 0.6, 0]}
          color={props.scenario === 'request-data' ? SAGE : CORAL}
        />
      </Station>
      <Portal
        position={[0, 0, -54]}
        scale={0.32}
        color={props.approved ? SAGE : CORAL}
        depth={1.4}
      />
      <Station position={[3.5, 1.1, -70]} scale={0.64}>
        <Chamber position={[0, 0, 0]} training={props.training} approved={props.approved} />
      </Station>
      <Station position={[3.5, 0, -90]}>
        <Model scale={1.25} progress={100} active />
      </Station>
      {[-7, -3.5, 0, 3.5, 7].map((x) => (
        <Line
          key={x}
          points={[
            [x, -3.3, 8],
            [x, -3.3, -106],
          ]}
          color="#879886"
          transparent
          opacity={0.17}
          lineWidth={0.6}
        />
      ))}
      {Array.from({ length: 24 }, (_, index) => (
        <Line
          key={index}
          points={[
            [-9, -3.3, 8 - index * 5],
            [9, -3.3, 8 - index * 5],
          ]}
          color="#879886"
          transparent
          opacity={0.12}
          lineWidth={0.6}
        />
      ))}
      <Connection start={[3.1, -3.28, 5]} end={[0, -3.28, -106]} color={CORAL} />
    </>
  );
}

export default function Scene(props: SceneProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    setAvailable(Boolean(context));
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  if (available === false || lost) return <Fallback />;
  if (!available) return null;
  return (
    <SceneBoundary>
      <Canvas
        className="world-canvas"
        aria-hidden="true"
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.2, 15], fov: 39, near: 0.1, far: 65 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        frameloop={visible ? 'always' : 'never'}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener(
            'webglcontextlost',
            (event) => {
              if (!gl.domElement.isConnected) return;
              event.preventDefault();
              setLost(true);
            },
            { once: true },
          );
        }}
      >
        <Suspense fallback={null}>
          <World {...props} reduced={props.reduced || !visible} />
        </Suspense>
      </Canvas>
    </SceneBoundary>
  );
}
