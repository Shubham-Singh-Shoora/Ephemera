'use client';

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Float, Line, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export interface SceneProps {
  chapter: number;
  copies: number;
  sealed: boolean;
  elapsed: number;
  motion: boolean;
  onDocumentClick: () => void;
}

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
    <div className="scene-fallback" aria-hidden="true">
      <div className="fallback-sheet">
        <span>ONE SMALL FILE</span>
        <i />
        <i />
        <i />
      </div>
      <div className="fallback-ring" />
    </div>
  );
}

function Paper({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color = '#f4eee3',
  onClick,
  ghost = false,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  ghost?: boolean;
}) {
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <RoundedBox args={[1.22, 1.65, 0.045]} radius={0.055} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          roughness={0.72}
          metalness={0.04}
          transparent
          opacity={ghost ? 0.7 : 1}
        />
      </RoundedBox>
      <mesh position={[-0.35, 0.51, 0.032]}>
        <circleGeometry args={[0.12, 30]} />
        <meshBasicMaterial color={ghost ? '#adaba0' : '#c56951'} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[i === 4 ? -0.15 : 0, 0.13 - i * 0.13, 0.03]}>
          <planeGeometry args={[i === 4 ? 0.56 : 0.85, 0.021]} />
          <meshBasicMaterial color={ghost ? '#c1bfb5' : '#989e8f'} />
        </mesh>
      ))}
      <mesh position={[0.38, 0.68, 0.028]} rotation={[0, 0, -Math.PI / 4]}>
        <planeGeometry args={[0.25, 0.25]} />
        <meshBasicMaterial color="#dbd9ca" />
      </mesh>
    </group>
  );
}

function Particles({ elapsed, motion }: { elapsed: number; motion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const particles = useMemo(
    () =>
      Array.from({ length: 72 }, (_, i) => {
        const theta = i * 2.399963;
        const radius = 0.6 + (i % 11) * 0.15;
        return {
          x: Math.cos(theta) * radius,
          y: Math.sin(theta) * radius,
          z: Math.sin(i * 1.7) * 1.2,
          scale: 0.015 + (i % 4) * 0.006,
        };
      }),
    [],
  );
  useFrame((_, delta) => {
    if (motion && group.current) group.current.rotation.y += delta * 0.025;
  });
  return (
    <group ref={group} visible={elapsed > 0.05}>
      {particles.map((p, i) => (
        <mesh
          key={i}
          position={[p.x * (1 + elapsed * 2), p.y * (1 + elapsed), p.z * (1 + elapsed)]}
          scale={p.scale * Math.sin(elapsed * Math.PI)}
        >
          <boxGeometry />
          <meshBasicMaterial
            color={i % 3 ? '#8a9a7b' : '#c5715b'}
            transparent
            opacity={1 - elapsed}
          />
        </mesh>
      ))}
    </group>
  );
}

function World(props: SceneProps & { touchLayout: boolean }) {
  const group = useRef<THREE.Group>(null);
  const mobile = props.touchLayout;
  const target = useMemo(
    () =>
      new THREE.Vector3(
        mobile
          ? 0
          : props.chapter === 2
            ? 1.35
            : props.chapter === 3
              ? -1.7
              : props.chapter === 0
                ? 0.65
                : 0,
        0,
        0,
      ),
    [props.chapter, mobile],
  );
  const fade = props.chapter === 4 ? 1 - props.elapsed / 100 : 1;
  const points = useMemo(
    () =>
      Array.from({ length: 100 }, (_, i) => {
        const angle = (i / 99) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * 2.05, -1.02, Math.sin(angle) * 1.5);
      }),
    [],
  );
  useFrame((_, delta) => {
    if (group.current) {
      if (props.motion) group.current.position.lerp(target, 1 - Math.exp(-delta * 3));
      else group.current.position.copy(target);
    }
  });
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    props.onDocumentClick();
  };
  return (
    <>
      <ambientLight intensity={1.7} />
      <directionalLight position={[3, 7, 5]} intensity={3} color="#fff7e6" />
      <directionalLight position={[-5, 2, -3]} intensity={2} color="#cadac1" />
      <group ref={group} scale={mobile ? 0.9 : 1}>
        <Float
          speed={props.motion ? 0.8 : 0}
          rotationIntensity={0.1}
          floatIntensity={0.2}
          floatingRange={[-0.05, 0.05]}
        >
          {props.chapter <= 1 ? (
            <group rotation={[0, -0.2, -0.13]}>
              <Paper
                position={[0, 0.12, 0]}
                rotation={[0.02, 0.1, -0.1]}
                scale={1.2}
                onClick={click}
              />
              {props.chapter === 1 &&
                Array.from({ length: props.copies - 1 }, (_, i) => {
                  const angle = (i / 7) * Math.PI * 2 + 0.3;
                  const destination: [number, number, number] = [
                    Math.cos(angle) * (1.7 + i * 0.1),
                    Math.sin(angle) * 0.8,
                    Math.sin(angle) * 1.8 - 0.3,
                  ];
                  return (
                    <group key={i}>
                      <Line
                        points={[[0, 0, 0], destination]}
                        color="#a8afa0"
                        lineWidth={1}
                        dashed
                        dashSize={0.045}
                        gapSize={0.08}
                      />
                      <Paper
                        position={destination}
                        rotation={[0.1 * i, angle * 0.3, -0.2 + i * 0.08]}
                        scale={0.6}
                        ghost
                        onClick={click}
                      />
                    </group>
                  );
                })}
              <Line
                points={points}
                color="#b6bdab"
                lineWidth={0.8}
                dashed
                dashSize={0.03}
                gapSize={0.09}
              />
            </group>
          ) : (
            <group>
              <group scale={Math.max(0.001, fade)} rotation={[0, -0.3, 0]}>
                <mesh position={[0, -0.85, 0]}>
                  <boxGeometry args={[2.35, 0.09, 1.9]} />
                  <meshStandardMaterial color="#94aa84" roughness={0.55} metalness={0.2} />
                </mesh>
                <mesh position={[-1.16, 0, 0]}>
                  <boxGeometry args={[0.035, 1.75, 1.9]} />
                  <meshPhysicalMaterial
                    color="#baceac"
                    transparent
                    opacity={0.23}
                    roughness={0.2}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
                <mesh position={[0, 0, -0.94]}>
                  <boxGeometry args={[2.35, 1.75, 0.035]} />
                  <meshPhysicalMaterial
                    color="#adc79c"
                    transparent
                    opacity={0.32}
                    roughness={0.2}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
                <Line
                  points={[
                    [-1.17, -0.8, 0.95],
                    [-1.17, 0.9, 0.95],
                    [1.17, 0.9, 0.95],
                    [1.17, -0.8, 0.95],
                    [-1.17, -0.8, 0.95],
                    [-1.17, -0.8, -0.95],
                    [-1.17, 0.9, -0.95],
                    [-1.17, 0.9, 0.95],
                  ]}
                  color="#899a77"
                  lineWidth={0.7}
                />
                <Line
                  points={[
                    [1.17, -0.8, 0.95],
                    [1.17, -0.8, -0.95],
                    [1.17, 0.9, -0.95],
                    [-1.17, 0.9, -0.95],
                  ]}
                  color="#899a77"
                  lineWidth={0.7}
                />
                <group
                  position={[0, props.chapter === 2 && !props.sealed ? 1.5 : 0.95, 0]}
                  rotation={[props.chapter === 2 && !props.sealed ? -0.15 : 0, 0, 0]}
                >
                  <mesh>
                    <boxGeometry args={[2.38, 0.05, 1.93]} />
                    <meshStandardMaterial
                      color="#cadbb8"
                      transparent
                      opacity={0.7}
                      roughness={0.55}
                    />
                  </mesh>
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.031, 0]}>
                    <ringGeometry args={[0.21, 0.225, 64]} />
                    <meshBasicMaterial color="#839273" />
                  </mesh>
                </group>
                <Paper
                  position={[0, 0.1, 0.13]}
                  rotation={[0, 0, -0.1]}
                  scale={0.76}
                  onClick={click}
                />
                {props.chapter === 3 && (
                  <mesh position={[0, -0.1, 0.9]}>
                    <planeGeometry args={[1.9, 0.2]} />
                    <meshBasicMaterial color="#d9e8aa" transparent opacity={0.55} />
                  </mesh>
                )}
              </group>
              <Particles
                elapsed={props.chapter === 4 ? props.elapsed / 100 : 0}
                motion={props.motion}
              />
              <Line
                points={points}
                color="#acb79f"
                lineWidth={0.8}
                dashed
                dashSize={0.03}
                gapSize={0.08}
              />
            </group>
          )}
        </Float>
      </group>
      {!mobile && props.chapter >= 2 && props.chapter <= 3 && (
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={0.7}
          maxPolarAngle={1.6}
          autoRotate={false}
        />
      )}
    </>
  );
}

export default function Scene(props: SceneProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [touchLayout, setTouchLayout] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px), (pointer: coarse)');
    const update = () => setTouchLayout(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    setAvailable(Boolean(context));
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  }, []);
  if (available === false) return <Fallback />;
  if (available === null)
    return (
      <div className="scene-preparing" aria-hidden="true">
        <span />
      </div>
    );
  return (
    <SceneBoundary>
      <Canvas
        aria-label="An interactive illustration of a document and its temporary room. The same actions are available as buttons."
        camera={{ position: [3.8, 2.5, 7.2], fov: 36 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        frameloop={props.motion ? 'always' : 'demand'}
        onCreated={({ gl }) => {
          gl.setClearColor('#f7f6f0', 0);
        }}
      >
        <Suspense fallback={null}>
          <World {...props} touchLayout={touchLayout} />
        </Suspense>
      </Canvas>
    </SceneBoundary>
  );
}
