import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Float, PresentationControls } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import Reveal from '../primitives/Reveal';
import useReducedMotion from '../hooks/useReducedMotion';
import useBreakpoint from '../../hooks/useBreakpoint';
import { IMG } from '../data';

const VARIANTS = [
  { id: 'ivory',   name: 'Ivory Cathedral', color: '#EFE7D8', metalness: 0.08, roughness: 0.48, thread: '#B24A60' },
  { id: 'wine',    name: 'Burgundy Couture', color: '#B24A60', metalness: 0.6,  roughness: 0.26, thread: '#E6C0C5' },
  { id: 'onyx',    name: 'Midnight Onyx',   color: '#1B1714', metalness: 0.45, roughness: 0.34, thread: '#C96A80' },
];

/** Rotationally-symmetric ballgown silhouette → LatheGeometry. */
function useGownGeometry() {
  return useMemo(() => {
    const pts = [
      [0.02, -1.75], [1.30, -1.72], [1.34, -1.5], [1.12, -1.05],
      [0.86, -0.6], [0.62, -0.12], [0.48, 0.18], [0.5, 0.5],
      [0.46, 0.82], [0.34, 1.08], [0.22, 1.26], [0.13, 1.4],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 96);
  }, []);
}

function Gown({ variant, hovered }) {
  const geo = useGownGeometry();
  const groupRef = useRef();
  const threadRef = useRef();

  useFrame((state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.22;
    if (threadRef.current) {
      const target = hovered ? 0.9 : 0.0;
      threadRef.current.material.opacity += (target - threadRef.current.material.opacity) * 0.12;
    }
  });

  return (
    <Float speed={1.1} rotationIntensity={0.15} floatIntensity={0.4} floatingRange={[-0.05, 0.08]}>
      <group ref={groupRef} position={[0, 0.15, 0]}>
        {/* gown body */}
        <mesh geometry={geo} castShadow>
          <meshStandardMaterial
            color={variant.color}
            metalness={variant.metalness}
            roughness={variant.roughness}
            side={THREE.DoubleSide}
            envMapIntensity={0.6}
          />
        </mesh>
        {/* embroidery — gold wireframe that blooms on hover */}
        <mesh ref={threadRef} geometry={geo} scale={1.008}>
          <meshBasicMaterial color={variant.thread} wireframe transparent opacity={0} />
        </mesh>
        {/* bodice gleam */}
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshStandardMaterial color={variant.thread} emissive={variant.thread} emissiveIntensity={0.6} metalness={1} roughness={0.2} />
        </mesh>
      </group>
    </Float>
  );
}

function Scene({ variant, hovered }) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <spotLight position={[4, 6, 5]} angle={0.4} penumbra={1} intensity={2.2} color="#fff6e0" castShadow />
      <spotLight position={[-5, 3, -2]} angle={0.5} penumbra={1} intensity={1.1} color="#B24A60" />
      <pointLight position={[0, -2, 4]} intensity={0.5} color="#C96A80" />
      <PresentationControls
        global
        polar={[-0.15, 0.25]}
        azimuth={[-0.9, 0.9]}
        config={{ mass: 1.4, tension: 220, friction: 26 }}
        snap={{ mass: 2, tension: 180 }}
      >
        <Gown variant={variant} hovered={hovered} />
      </PresentationControls>
      <ContactShadows position={[0, -1.85, 0]} opacity={0.55} scale={7} blur={2.6} far={3} color="#000000" />
    </>
  );
}

/**
 * Section 5 — Luxury Dress Collection. A 3D gown rotates on a turntable; drag
 * to spin, hover to bloom gold embroidery, switch materials below. Falls back
 * to a still frame under reduced motion (no GPU cost).
 */
export default function DressCollection() {
  const reduced = useReducedMotion();
  const isMobile = useBreakpoint() === 'mobile';
  // Skip the heavy WebGL scene on phones (GPU/battery) and reduced-motion — use the still image.
  const lite = reduced || isMobile;
  const [active, setActive] = useState(1);
  const [hovered, setHovered] = useState(false);
  const variant = VARIANTS[active];

  return (
    <section className="cine-section" style={{ position: 'relative', background: 'linear-gradient(180deg,var(--cine-wine-3),var(--cine-wine-5),var(--cine-wine-3))' }}>
      <div className="cine-container">
        <div style={{ textAlign: 'center', marginBottom: 'clamp(30px,5vh,56px)' }}>
          <Reveal variant="up"><span className="cine-eyebrow">The Atelier</span></Reveal>
          <Reveal variant="up" delay={0.1}>
            <h2 style={{ fontSize: 'clamp(2.2rem,5.5vw,4.6rem)', marginTop: 14 }}>
              Couture in <em className="cine-gold-text" style={{ fontStyle: 'italic' }}>Three Dimensions</em>
            </h2>
          </Reveal>
        </div>

        <Reveal variant="scale" duration={1.1}>
          <div
            className="cine-atelier-stage"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            data-cursor="hover"
          >
            {lite ? (
              <div className="cine-atelier-fallback">
                <img src={IMG.bride1} alt="Bridal gown" />
              </div>
            ) : (
              <Canvas shadows dpr={[1, 1.8]} camera={{ position: [0, 0.4, 5.2], fov: 42 }}
                gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}>
                <Suspense fallback={null}>
                  <Scene variant={variant} hovered={hovered} />
                </Suspense>
              </Canvas>
            )}
            <span className="cine-atelier-hint">{lite ? '' : 'Drag to rotate · hover for embroidery'}</span>
          </div>
        </Reveal>

        <div className="cine-atelier-switch">
          {VARIANTS.map((v, i) => (
            <button key={v.id} onClick={() => setActive(i)}
              className={`cine-swatch ${i === active ? 'is-active' : ''}`} data-cursor="hover"
              aria-pressed={i === active} aria-label={v.name}>
              <span style={{ background: v.color, boxShadow: `0 0 0 1px ${i === active ? 'var(--cine-gold)' : 'transparent'}` }} />
              <em>{v.name}</em>
            </button>
          ))}
        </div>
      </div>

      <motion.span aria-hidden style={{
        position: 'absolute', left: '50%', top: '46%', width: '46vw', height: '46vw',
        transform: 'translate(-50%,-50%)', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(var(--cine-gold-rgb),0.5), transparent 62%)', filter: 'blur(20px)',
      }} />

      <style>{`
        .cine-atelier-stage {
          position: relative; height: clamp(420px, 62vh, 660px);
          border-radius: 24px; overflow: hidden;
          background: radial-gradient(120% 100% at 50% 20%, rgba(255,255,255,0.04), transparent 60%);
          border: 1px solid var(--cine-glass-border);
        }
        .cine-atelier-stage canvas { touch-action: none; }
        .cine-atelier-fallback { position: absolute; inset: 0; }
        .cine-atelier-fallback img { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; }
        .cine-atelier-hint {
          position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
          font-family: var(--cine-sans); font-size: 0.68rem; letter-spacing: 0.24em;
          text-transform: uppercase; color: rgba(var(--cine-ivory-rgb),0.5);
        }
        .cine-atelier-switch { display: flex; justify-content: center; gap: 14px; margin-top: 30px; flex-wrap: wrap; }
        .cine-swatch {
          display: inline-flex; align-items: center; gap: 10px; padding: 9px 18px 9px 12px;
          border-radius: 100px; background: var(--cine-glass-bg); border: 1px solid var(--cine-glass-border);
          transition: border-color 0.3s ease, background 0.3s ease;
        }
        .cine-swatch span { width: 18px; height: 18px; border-radius: 50%; display: block; }
        .cine-swatch em { font-style: normal; font-family: var(--cine-sans); font-size: 0.78rem;
          letter-spacing: 0.08em; color: rgba(var(--cine-ivory-rgb),0.7); }
        .cine-swatch.is-active { border-color: rgba(var(--cine-gold-rgb),0.5); background: rgba(var(--cine-gold-rgb),0.08); }
        .cine-swatch.is-active em { color: #fff; }
      `}</style>
    </section>
  );
}
