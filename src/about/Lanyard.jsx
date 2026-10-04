import React, { Suspense, use, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, useGLTF, useTexture } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useAfterPhysicsStep, useBeforePhysicsStep, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import { loadArtwork, makeBlueWeave, makeCardTexture } from './assets.js';

extend({ MeshLineGeometry, MeshLineMaterial });
const artworkPromise = loadArtwork();
useGLTF.preload('/lanyard/card.glb', false, false);
useTexture.preload('/lanyard/lanyard.png');
const CARD_HEIGHT_PX = 440;
const LACE_LENGTH_PX = 180;
const LACE_WIDTH_PX = 40;
const LACE_CORNER_RADIUS_PX = 5;
const HOLDER_LIFT = 0.025;
const RING_DEPTH_OFFSET = -0.02;
const MODEL_SCALE = 2.25;
// Original GLB card bounds: y = 0.0229051113 .. 1.0229052305.
const CARD_CENTER_Y = 0.5229051709 * MODEL_SCALE - 1.2;
const REST_Y = -CARD_CENTER_Y;
const SOCKET_Y = 1.56; // Top of the original chrome connector.
const PIXELS_PER_UNIT = CARD_HEIGHT_PX / MODEL_SCALE;
const SEGMENT_LENGTH = LACE_LENGTH_PX / PIXELS_PER_UNIT / 3;
const ANCHOR = REST_Y + SOCKET_Y + 3 * SEGMENT_LENGTH;
const CAMERA_Z = 16;
const bodyOptions = { type: 'dynamic', canSleep: true, colliders: false, linearDamping: 4, angularDamping: 4 };

function compileLace(shader, cornerRadius) {
  // Meshline compares projected floats to identify its end caps. Rounding can
  // misclassify the duplicated endpoint and produce a twisting/triangular tip.
  // The existing UVs identify those endpoints exactly, regardless of motion.
  shader.vertexShader = shader.vertexShader
    .replace('if (nextP == currentP)', 'if (uv.x == 1.0 || nextP == currentP)')
    .replace('else if (prevP == currentP)', 'else if (uv.x == 0.0 || prevP == currentP)');
  // Round only the two corners at the holder end (UV.x = 0). Derivatives
  // measure distance in screen pixels, keeping a CSS-sized radius as it moves.
  shader.uniforms.laceCornerRadius = cornerRadius;
  shader.fragmentShader = 'uniform float laceCornerRadius;\n' + shader.fragmentShader.replace(
    '#include <clipping_planes_fragment>',
    `#include <clipping_planes_fragment>
    vec2 laceEdgePx = vec2(
      min(vUV.y, 1.0 - vUV.y) / max(length(vec2(dFdx(vUV.y), dFdy(vUV.y))), 0.000001),
      vUV.x / max(length(vec2(dFdx(vUV.x), dFdy(vUV.x))), 0.000001)
    );
    float cornerDistance = length(max(vec2(laceCornerRadius) - laceEdgePx, vec2(0.0))) - laceCornerRadius;
    diffuseColor.a *= 1.0 - smoothstep(-0.5, 0.5, cornerDistance);
    if (diffuseColor.a <= 0.0) discard;`
  );
}

function layoutFor(size, mobile = false) {
  // Fit the complete hanging assembly on short/narrow screens without moving
  // the card's centre. At full size the original model projects to ~315 x 440.
  const fit = mobile ? 210 / CARD_HEIGHT_PX : Math.min(1, (size.height / 2 - 12) / (ANCHOR * PIXELS_PER_UNIT), (size.width - 32) / 315.22);
  const pixelsPerUnit = PIXELS_PER_UNIT * Math.max(0.1, fit);
  return { height: size.height / pixelsPerUnit, fit };
}

function syncView(state, reference, mobile) {
  const base = reference.getBoundingClientRect();
  const viewport = state.gl.domElement.getBoundingClientRect();
  if (!base.width || !base.height || !viewport.width || !viewport.height) return;
  // Keep Part 1's exact projection, rendering only the currently visible slice.
  // This extends coverage without a five-screen WebGL buffer or moving the rig.
  const { height } = layoutFor(base, mobile);
  const { camera } = state;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / (2 * CAMERA_Z)));
  camera.setViewOffset(base.width, base.height, viewport.left - base.left,
    viewport.top - base.top + (mobile ? base.height / 2 - 174 : 0), viewport.width, viewport.height);
}

function updatePointer(state, point) {
  const rect = state.gl.domElement.getBoundingClientRect();
  state.pointer.set((point.x - rect.left) / rect.width * 2 - 1, -(point.y - rect.top) / rect.height * 2 + 1);
}

function CameraFit({ mobile, reference, pointer }) {
  const state = useThree();
  const { setEvents, invalidate } = state;
  useLayoutEffect(() => {
    setEvents({ compute: (event, current) => {
      pointer.current = { x: event.clientX, y: event.clientY };
      syncView(current, reference, mobile);
      updatePointer(current, pointer.current);
      current.raycaster.setFromCamera(current.pointer, current.camera);
    } });
    invalidate();
  }, [setEvents, invalidate, reference, mobile, pointer]);
  useFrame(() => {
    syncView(state, reference, mobile);
    // A held pointer may stay still while the visitor scrolls underneath it.
    if (pointer.current) updatePointer(state, pointer.current);
  }, -3);
  return null;
}

function Band({ entered, active, reduced, mobile, referenceSize, container }) {
  const images = use(artworkPromise);
  const fixed = useRef(), j1 = useRef(), j2 = useRef(), j3 = useRef(), card = useRef(), band = useRef();
  const cardModel = useRef();
  const assembly = useRef(), started = useRef(false), stepped = useRef(false), capture = useRef(null);
  const idle = useRef({ settled: 0, elapsed: 0 });
  const { nodes, materials } = useGLTF('/lanyard/card.glb', false, false);
  const referenceBand = useTexture('/lanyard/lanyard.png');
  const { gl, size, camera, scene, invalidate } = useThree();
  const laceCornerRadius = useMemo(() => ({ value: LACE_CORNER_RADIUS_PX * gl.getPixelRatio() }), [gl]);
  const { fit } = layoutFor(referenceSize, mobile);
  const [dragged, setDragged] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [compileError, setCompileError] = useState(null);
  const cardMap = useMemo(() => makeCardTexture(nodes.card.geometry, materials.base.map, images), [nodes, materials, images]);
  const weave = useMemo(() => makeBlueWeave(referenceBand), [referenceBand]);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(Array.from({ length: 5 }, () => new THREE.Vector3()), false, 'chordal'), []);
  const work = useMemo(() => ({ vec: new THREE.Vector3(), dir: new THREE.Vector3(), anchor: new THREE.Vector3(0, ANCHOR, 0),
    rotation: new THREE.Quaternion(), angles: new THREE.Euler(0, 0, 0, 'YXZ'), up: new THREE.Vector3(0, 1, 0) }), []);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], SEGMENT_LENGTH]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], SEGMENT_LENGTH]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], SEGMENT_LENGTH]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, SOCKET_Y, 0]]);
  useAfterPhysicsStep(() => { if (started.current) stepped.current = true; });
  useBeforePhysicsStep(() => {
    const motion = idle.current, body = card.current;
    if (!body || !started.current || !stepped.current || !active || !entered || reduced || dragged || hovered || capture.current) {
      motion.settled = motion.elapsed = 0;
      return;
    }
    const dt = 1 / 60;
    if (motion.settled < 1.5) {
      const position = body.translation(), velocity = body.linvel(), angular = body.angvel();
      const resting = Math.abs(position.y - REST_Y) < 0.06 && Math.hypot(position.x, position.z) < 0.12
        && Math.hypot(velocity.x, velocity.y, velocity.z) < 0.05
        && Math.hypot(angular.x, angular.y, angular.z) < 0.08;
      motion.settled = resting ? motion.settled + dt : 0;
      return;
    }
    // A faint, slowly varying breeze through the existing joints. Leave the
    // transforms, damping and drag velocities entirely under Rapier's control.
    motion.elapsed += dt;
    const t = motion.elapsed, ramp = Math.min(1, t / 2);
    const breeze = (Math.sin(t * 0.7) * 0.45 + Math.sin(t * 1.13) * 0.1) * ramp * ramp;
    body.applyImpulse({ x: breeze * body.mass() * dt, y: 0, z: 0 }, true);
  });

  function release() {
    const held = capture.current;
    capture.current = null;
    if (held?.element.hasPointerCapture(held.id)) held.element.releasePointerCapture(held.id);
    setDragged(null);
  }

  function settle(frontFacing = false) {
    if (!card.current) return;
    [j1, j2, j3].forEach((ref, i) => {
      ref.current.setTranslation({ x: 0, y: ANCHOR - (i + 1) * SEGMENT_LENGTH, z: 0 }, true);
      ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      ref.current.lerped = new THREE.Vector3(0, ANCHOR - (i + 1) * SEGMENT_LENGTH, 0);
    });
    const yaw = frontFacing ? 0 : work.angles.setFromQuaternion(work.rotation.copy(card.current.rotation())).y;
    card.current.setTranslation({ x: 0, y: REST_Y, z: 0 }, true);
    card.current.setRotation(work.rotation.setFromAxisAngle(work.up, yaw), true);
    card.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    card.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
    invalidate();
  }

  function beginEntrance() {
    if (!entered || !active || started.current || !card.current || !j3.current) return;
    started.current = true;
    if (reduced) { settle(true); return; }
    // Fold the rope upward within its actual joint limits. The assembly stays
    // hidden until the first simulated frame. Reusing the old offscreen pose
    // with a shorter rope would force Rapier to snap overstretched joints.
    const dropY = ANCHOR + 3 * SEGMENT_LENGTH * 0.96 - SOCKET_Y;
    const socketY = dropY + SOCKET_Y;
    [j1, j2, j3].forEach((ref, i) => {
      const position = { x: (i + 1) * 0.025, y: ANCHOR + (socketY - ANCHOR) * (i + 1) / 3, z: 0 };
      ref.current.setTranslation(position, true);
      ref.current.lerped = new THREE.Vector3().copy(position);
    });
    card.current.setTranslation({ x: 0.075, y: dropY, z: 0 }, true);
    card.current.setRotation(work.rotation.identity(), true);
    invalidate();
  }

  useEffect(() => {
    if (!active) {
      release();
      idle.current.settled = idle.current.elapsed = 0;
    }
  }, [active]);

  useEffect(() => {
    if (started.current && reduced) { release(); settle(true); }
  }, [reduced]);

  // Initialise BEFORE Rapier steps (-1), then expose the assembly only AFTER
  // Rapier has copied its simulated/interpolated transforms to the meshes.
  // Previously initialization ran alongside rendering, exposing the default
  // resting mesh for one frame while its physics body was already above it.
  useFrame(() => { beginEntrance(); }, -2);

  useEffect(() => {
    container.style.cursor = dragged ? 'var(--cursor-grabbing, grabbing)' : hovered ? 'var(--cursor-grab, grab)' : 'var(--cursor-arrow, auto)';
    return () => { container.style.cursor = ''; };
  }, [container, dragged, hovered]);

  useEffect(() => {
    let mounted = true;
    // Upload textures and compile the hidden model while the visitor is still
    // above About; the visibility trigger never waits on a timer.
    gl.initTexture(cardMap); gl.initTexture(weave);
    gl.compileAsync(assembly.current, camera, scene).catch(error => {
      if (mounted) setCompileError(error);
    });
    return () => { mounted = false; };
  }, [gl, camera, scene, cardMap, weave]);

  useEffect(() => {
    const up = () => { if (capture.current) release(); };
    // Keep touch scrolling outside the card; a touch on the card becomes a drag.
    const touch = event => { if (capture.current) event.preventDefault(); };
    container.addEventListener('touchstart', touch, { passive: false });
    container.addEventListener('touchmove', touch, { passive: false });
    container.addEventListener('pointercancel', up);
    window.addEventListener('pointerup', up);
    return () => {
      up();
      container.removeEventListener('touchstart', touch);
      container.removeEventListener('touchmove', touch);
      container.removeEventListener('pointercancel', up);
      window.removeEventListener('pointerup', up);
      cardMap.dispose(); weave.dispose();
    };
  }, [container, cardMap, weave]);

  useFrame((state, delta) => {
    if (!fixed.current || !band.current || !cardModel.current) return;
    laceCornerRadius.value = LACE_CORNER_RADIUS_PX * gl.getPixelRatio() * (mobile ? fit : 1);
    assembly.current.visible = started.current && stepped.current;
    if (dragged && active) {
      work.vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      work.dir.copy(work.vec).sub(state.camera.position).normalize();
      work.vec.add(work.dir.multiplyScalar(state.camera.position.length())).sub(dragged);
      [card, j1, j2, j3].forEach(ref => ref.current.wakeUp());
      card.current.setNextKinematicTranslation(work.vec);
    }
    [j1, j2].forEach(ref => {
      if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
      const distance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())));
      ref.current.lerped.lerp(ref.current.translation(), Math.min(1, delta * distance * 50));
    });
    // Match the holder's rendered (interpolated) socket, not the latest raw
    // physics joint position, which can lead the visible holder during motion.
    cardModel.current.parent.localToWorld(curve.points[0].set(0, SOCKET_Y, 0));
    band.current.worldToLocal(curve.points[0]);
    curve.points[1].copy(j2.current.lerped);
    curve.points[2].copy(j1.current.lerped);
    curve.points[3].copy(fixed.current.translation());
    // Continue the same lace mesh beyond the section edge so its end stays
    // hidden behind Tools, without changing the settled card or rope joints.
    curve.points[4].set(0, layoutFor(referenceSize, mobile).height / 2 + 0.05, 0);
    band.current.geometry.setPoints(curve.getPoints(mobile ? 16 : 32));
    if (active && entered && !reduced && !dragged && !card.current.isSleeping()) {
      const angular = card.current.angvel(), rotation = card.current.rotation();
      card.current.setAngvel({ x: angular.x, y: angular.y - rotation.y * 0.25, z: angular.z }, false);
    }
  });

  if (compileError) throw compileError;
  return <group ref={assembly} name="lanyard-assembly" visible={false}>
    <RigidBody ref={fixed} {...bodyOptions} type="fixed" position={[0, ANCHOR, 0]} />
    {[j1, j2, j3].map((ref, i) => <RigidBody key={i} ref={ref} {...bodyOptions} position={[0, ANCHOR - (i + 1) * SEGMENT_LENGTH, 0]}>
      <BallCollider args={[0.1]} />
    </RigidBody>)}
    <RigidBody ref={card} {...bodyOptions} name="lanyard-card-body" position={[0, REST_Y, 0]} type={dragged ? 'kinematicPosition' : 'dynamic'}>
      <CuboidCollider args={[0.8, 1.125, 0.01]} />
      <group ref={cardModel} scale={MODEL_SCALE} position={[0, -1.2, -0.05]} dispose={null}
        onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}
        onPointerUp={release}
        onPointerDown={event => {
          if (!entered || event.button !== 0) return;
          event.stopPropagation();
          capture.current = { element: event.target, id: event.pointerId };
          event.target.setPointerCapture(event.pointerId);
          setDragged(event.point.clone().sub(work.vec.copy(card.current.translation())));
        }}>
        <mesh name="lanyard-original-card" geometry={nodes.card.geometry}>
          <meshBasicMaterial map={cardMap} toneMapped={false} />
        </mesh>
        <mesh name="lanyard-original-clip" geometry={nodes.clip.geometry} position={[0, HOLDER_LIFT, RING_DEPTH_OFFSET]}>
          <meshStandardMaterial color="#e4eaf2" metalness={1} roughness={0.2} envMapIntensity={1.6} />
        </mesh>
        <mesh name="lanyard-original-clamp" geometry={nodes.clamp.geometry} position={[0, HOLDER_LIFT, 0]}>
          <meshStandardMaterial color="#e4eaf2" metalness={1} roughness={0.24} envMapIntensity={1.6} />
        </mesh>
      </group>
    </RigidBody>
    <mesh ref={band} name="lanyard-blue-band" frustumCulled={false}>
      <meshLineGeometry />
      <meshLineMaterial color="white" depthTest={true} alphaToCoverage onBeforeCompile={shader => compileLace(shader, laceCornerRadius)} resolution={[size.width, size.height]}
        useMap={1} map={weave} repeat={[-4, 1]} lineWidth={2 * CAMERA_Z * LACE_WIDTH_PX * fit / size.height} toneMapped={false} />
    </mesh>
  </group>;
}

export default function Lanyard({ entered, active, reduced, mobile, reference, container }) {
  const pointer = useRef(null);
  const [referenceSize, setReferenceSize] = useState(() => ({ width: reference.clientWidth, height: reference.clientHeight }));
  useLayoutEffect(() => {
    const measure = () => setReferenceSize({ width: reference.clientWidth, height: reference.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(reference);
    measure();
    return () => observer.disconnect();
  }, [reference]);
  // Retain the original drawing dimensions, including Meshline's aspect ratio.
  // Only the view's scroll offset changes as this window follows both sections.
  return createPortal(<div className="lanyard-coverage"><div className="lanyard-viewport" style={{ height: referenceSize.height }}>
    <Canvas camera={{ position: [0, 0, CAMERA_Z], fov: 24 }} dpr={[1, mobile ? 1.25 : 1.75]}
    frameloop={active ? 'always' : 'demand'} gl={{ alpha: true, antialias: true }}
    eventSource={container}
    style={{ touchAction: 'auto' }}
    onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    aria-label="Adrianne Apon's two-sided ID card. Drag to swing and turn it.">
    <CameraFit mobile={mobile} reference={reference} pointer={pointer} />
    <ambientLight intensity={Math.PI} />
    <Suspense fallback={null}>
      <Physics gravity={[0, -40, 0]} timeStep={1 / 60} paused={!active || !entered} updateLoop="follow" updatePriority={-1} numSolverIterations={8}>
        <Band entered={entered} active={active} reduced={reduced} mobile={mobile} referenceSize={referenceSize} container={container} />
      </Physics>
      <Environment resolution={128} frames={1} blur={0.75}>
        <color attach="background" args={['#737c8a']} />
        <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
      </Environment>
    </Suspense>
  </Canvas></div></div>, container);
}
