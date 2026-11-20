import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, Line, OrbitControls, TransformControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, type Exit, type Stage, type Zone } from '../store';
import { getVenue, type Venue } from '../data/venues';
import { calcPlan, fmt } from '../lib/capacity';
import { centroid } from '../lib/geometry';

export const COLORS = {
  standing: '#4cc9f0',
  seated: '#b388ff',
  excluded: '#ff6b6b',
  stage: '#ffb84d',
  exit: '#3ddc97',
} as const;

/** 리포트용 스냅샷을 찍을 때 쓰는 렌더러 참조 */
export const glRef: { current: THREE.WebGLRenderer | null } = { current: null };

function isShown(o: THREE.Object3D | null): boolean {
  let c: THREE.Object3D | null = o;
  while (c) {
    if (!c.visible) return false;
    c = c.parent;
  }
  return true;
}

function isInside(o: THREE.Object3D, root: THREE.Object3D): boolean {
  let c: THREE.Object3D | null = o;
  while (c) {
    if (c === root) return true;
    c = c.parent;
  }
  return false;
}

function clipYOf(box: THREE.Box3, clip: number) {
  return clip >= 0.999 ? Infinity : box.min.y + (box.max.y - box.min.y) * clip;
}

function VenueModel({ venue }: { venue: Venue }) {
  const gltf = useGLTF(venue.model, false, true);
  // 캐시된 원본을 건드리지 않도록 마운트마다 복제해서 쓴다 (공연장을 바꿨다 돌아와도 다시 보이게)
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6), []);
  const clip = useStore((s) => s.clip);
  const setBounds = useStore((s) => s.setBounds);

  const box = useMemo(() => {
    scene.updateMatrixWorld(true);
    const tmp = new THREE.Box3();
    const c = new THREE.Vector3();
    if (venue.hideBeyond) {
      const all = new THREE.Box3().setFromObject(scene);
      const center = all.getCenter(new THREE.Vector3());
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        tmp.setFromObject(mesh);
        tmp.getCenter(c);
        if (Math.hypot(c.x - center.x, c.z - center.z) > venue.hideBeyond!) mesh.visible = false;
      });
    }
    const vis = new THREE.Box3();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (isShown(mesh)) {
        tmp.setFromObject(mesh);
        vis.union(tmp);
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        m.clippingPlanes = [plane];
        m.side = THREE.DoubleSide;
        m.needsUpdate = true;
      });
    });
    return vis;
  }, [scene, venue, plane]);

  useEffect(() => {
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    setBounds({ minY: box.min.y, maxY: box.max.y, center: [c.x, c.y, c.z], radius: size.length() / 2 });
  }, [box, setBounds]);

  useEffect(() => {
    const y = clipYOf(box, clip);
    plane.constant = Number.isFinite(y) ? y : 1e6;
  }, [clip, box, plane]);

  const firstHit = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const clipY = clipYOf(box, useStore.getState().clip);
    return e.intersections.find((i) => i.point.y <= clipY + 0.01 && isInside(i.object, scene) && isShown(i.object));
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5) return;
    const st = useStore.getState();
    const hit = firstHit(e);
    if (!hit) return;
    e.stopPropagation();
    const p = { x: hit.point.x, y: hit.point.y, z: hit.point.z };
    if (st.mode === 'draw') st.addDraftPoint(p);
    else if (st.mode === 'exit') st.addExit(p);
    else if (st.mode === 'place-stage') st.placeStage(p);
    else st.select(null);
  };

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const st = useStore.getState();
    if (st.mode !== 'draw' || !st.draft.length) return;
    const hit = firstHit(e);
    if (hit) st.setHover({ x: hit.point.x, y: hit.point.y, z: hit.point.z });
  };

  return <primitive object={scene} onClick={onClick} onPointerMove={onMove} />;
}

function CameraRig() {
  const bounds = useStore((s) => s.bounds);
  const topView = useStore((s) => s.topView);
  const nonce = useStore((s) => s.viewNonce);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;

  useEffect(() => {
    if (!bounds || !controls) return;
    const [cx, cy, cz] = bounds.center;
    const r = bounds.radius;
    if (topView) camera.position.set(cx, cy + r * 1.9, cz + 0.01);
    else camera.position.set(cx + r * 0.95, cy + r * 0.8, cz + r * 0.95);
    camera.near = Math.max(0.1, r / 400);
    camera.far = r * 30;
    camera.updateProjectionMatrix();
    controls.target.set(cx, topView ? bounds.minY : cy, cz);
    controls.update();
  }, [bounds, topView, nonce, controls, camera]);
  return null;
}

function ZoneMesh({ zone, net, selected }: { zone: Zone; net: number; selected: boolean }) {
  const select = useStore((s) => s.select);
  const geom = useMemo(() => {
    const shape = new THREE.Shape();
    zone.points.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, -p.z) : shape.lineTo(p.x, -p.z)));
    return new THREE.ShapeGeometry(shape);
  }, [zone.points]);
  useEffect(() => () => geom.dispose(), [geom]);
  const color = COLORS[zone.kind];
  const pts = useMemo(
    () => [...zone.points, zone.points[0]].map((p) => new THREE.Vector3(p.x, zone.y + 0.14, p.z)),
    [zone.points, zone.y],
  );
  const c = centroid(zone.points);

  return (
    <group>
      <mesh
        geometry={geom}
        rotation-x={-Math.PI / 2}
        position={[0, zone.y + 0.12, 0]}
        renderOrder={2}
        onClick={(e) => {
          if (useStore.getState().mode !== 'view' || e.delta > 5) return;
          e.stopPropagation();
          select({ type: 'zone', id: zone.id });
        }}
      >
        <meshBasicMaterial
          color={color}
          transparent
          opacity={selected ? 0.55 : 0.33}
          depthWrite={false}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      <Line points={pts} color={color} lineWidth={selected ? 3.5 : 2} />
      <Html position={[c.x, zone.y + 0.8, c.z]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`tag zone-tag ${zone.kind}`}>
          <b>{zone.name}</b>
          <span>{zone.kind === 'seated' ? `${fmt(zone.seats)}석` : `${fmt(net)}㎡`}</span>
        </div>
      </Html>
    </group>
  );
}

function Zones() {
  const plan = useStore((s) => s.plan);
  const selected = useStore((s) => s.selected);
  const calc = useMemo(() => calcPlan(plan), [plan]);
  return (
    <>
      {calc.zones.map((c) => (
        <ZoneMesh key={c.zone.id} zone={c.zone} net={c.net} selected={selected?.type === 'zone' && selected.id === c.zone.id} />
      ))}
    </>
  );
}

function Draft() {
  const draft = useStore((s) => s.draft);
  const y = useStore((s) => s.draftY);
  const hover = useStore((s) => s.hover);
  const kind = useStore((s) => s.drawKind);
  const mode = useStore((s) => s.mode);
  const bounds = useStore((s) => s.bounds);
  if (mode !== 'draw' || !draft.length || y === null) return null;
  const r = Math.max(0.25, (bounds?.radius ?? 60) * 0.004);
  const pts = draft.map((p) => new THREE.Vector3(p.x, y + 0.18, p.z));
  if (hover) pts.push(new THREE.Vector3(hover.x, y + 0.18, hover.z));
  return (
    <group>
      {draft.map((p, i) => (
        <mesh key={i} position={[p.x, y + 0.18, p.z]}>
          <sphereGeometry args={[i === 0 ? r * 1.7 : r, 16, 12]} />
          <meshBasicMaterial color={i === 0 ? '#ffffff' : COLORS[kind]} />
        </mesh>
      ))}
      {pts.length >= 2 && <Line points={pts} color={COLORS[kind]} lineWidth={2} dashed dashSize={0.8} gapSize={0.5} />}
    </group>
  );
}

function StageMesh({ st, selected }: { st: Stage; selected: boolean }) {
  const [obj, setObj] = useState<THREE.Group | null>(null);
  const mode = useStore((s) => s.mode);
  const tmode = useStore((s) => s.transformMode);
  const update = useStore((s) => s.updateStage);
  const select = useStore((s) => s.select);
  const emissive = selected ? '#6b3f00' : '#000000';

  return (
    <>
      <group
        ref={setObj}
        position={[st.x, st.y, st.z]}
        rotation={[0, st.rot, 0]}
        onClick={(e) => {
          if (useStore.getState().mode !== 'view' || e.delta > 5) return;
          e.stopPropagation();
          select({ type: 'stage', id: st.id });
        }}
      >
        <mesh position={[0, st.h / 2, 0]}>
          <boxGeometry args={[st.w, st.h, st.d]} />
          <meshStandardMaterial color={COLORS.stage} emissive={emissive} roughness={0.6} />
        </mesh>
        {st.preset === 'thrust' && st.rw > 0 && st.rd > 0 && (
          <mesh position={[0, st.h / 2, st.d / 2 + st.rd / 2]}>
            <boxGeometry args={[st.rw, st.h, st.rd]} />
            <meshStandardMaterial color={COLORS.stage} emissive={emissive} roughness={0.6} />
          </mesh>
        )}
        <mesh position={[0, st.h + 0.02, -st.d / 2 + 0.6]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[st.w * 0.9, 0.4]} />
          <meshBasicMaterial color="#3a2a10" />
        </mesh>
        <Html position={[0, st.h + 1.6, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="tag stage-tag">
            <b>무대</b>
            <span>
              {st.w}×{st.d}m
            </span>
          </div>
        </Html>
      </group>
      {selected && mode === 'view' && obj && (
        <TransformControls
          object={obj}
          mode={tmode}
          showX={tmode === 'translate'}
          showZ={tmode === 'translate'}
          showY={tmode === 'rotate'}
          size={0.9}
          onObjectChange={() => update(st.id, { x: obj.position.x, z: obj.position.z, rot: obj.rotation.y })}
        />
      )}
    </>
  );
}

function Stages() {
  const stages = useStore((s) => s.plan.stages);
  const selected = useStore((s) => s.selected);
  return (
    <>
      {stages.map((st) => (
        <StageMesh key={st.id} st={st} selected={selected?.type === 'stage' && selected.id === st.id} />
      ))}
    </>
  );
}

function ExitMarker({ ex, selected }: { ex: Exit; selected: boolean }) {
  const select = useStore((s) => s.select);
  return (
    <group position={[ex.x, ex.y, ex.z]}>
      <mesh
        position={[0, 1.1, 0]}
        onClick={(e) => {
          if (useStore.getState().mode !== 'view' || e.delta > 5) return;
          e.stopPropagation();
          select({ type: 'exit', id: ex.id });
        }}
      >
        <boxGeometry args={[Math.max(0.4, ex.width), 2.2, 0.35]} />
        <meshStandardMaterial color={COLORS.exit} emissive={selected ? '#0d5c3c' : '#000000'} transparent opacity={0.9} />
      </mesh>
      <Html position={[0, 3, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="tag exit-tag">
          <b>{ex.name}</b>
          <span>{ex.width}m</span>
        </div>
      </Html>
    </group>
  );
}

function Exits() {
  const exits = useStore((s) => s.plan.exits);
  const selected = useStore((s) => s.selected);
  return (
    <>
      {exits.map((ex) => (
        <ExitMarker key={ex.id} ex={ex} selected={selected?.type === 'exit' && selected.id === ex.id} />
      ))}
    </>
  );
}

function GlCapture() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    glRef.current = gl;
    gl.localClippingEnabled = true;
  }, [gl]);
  return null;
}

// 불러오는 중 표시는 캔버스 밖(App)에서 bounds로 판단해 띄운다. 캔버스 안 Html은 카메라 위치에 따라 화면 밖에 그려질 수 있다.
function Loading() {
  return null;
}

export default function VenueScene() {
  const venueId = useStore((s) => s.plan.venueId);
  const venue = getVenue(venueId);
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      camera={{ fov: 40, near: 0.5, far: 6000, position: [150, 120, 150] }}
      onPointerMissed={() => {
        if (useStore.getState().mode === 'view') useStore.getState().select(null);
      }}
    >
      <color attach="background" args={['#0f1218']} />
      <hemisphereLight args={['#ffffff', '#3a4250', 1.5]} />
      <directionalLight position={[90, 140, 70]} intensity={1.3} />
      <Suspense fallback={<Loading />}>
        <VenueModel key={venue.id} venue={venue} />
      </Suspense>
      <Zones />
      <Draft />
      <Stages />
      <Exits />
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI / 2 - 0.02} />
      <CameraRig />
      <GlCapture />
    </Canvas>
  );
}
