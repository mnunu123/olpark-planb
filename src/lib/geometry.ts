import polygonClipping from 'polygon-clipping';

export interface P2 {
  x: number;
  z: number;
}

type Pair = [number, number];
type Ring = Pair[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

function ringFrom(points: P2[]): Ring {
  const ring: Ring = points.map((p) => [p.x, p.z]);
  if (ring.length) ring.push([ring[0][0], ring[0][1]]);
  return ring;
}

function shoelace(ring: Ring): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

export function polygonArea(points: P2[]): number {
  if (points.length < 3) return 0;
  return shoelace(ringFrom(points));
}

function multiPolygonArea(mp: MultiPolygon): number {
  let total = 0;
  for (const poly of mp) {
    poly.forEach((ring, i) => {
      const a = shoelace(ring);
      total += i === 0 ? a : -a;
    });
  }
  return total;
}

/** points 다각형에서 cutouts(무대, 제외 구역)를 뺀 면적 */
export function netArea(points: P2[], cutouts: P2[][]): number {
  if (points.length < 3) return 0;
  const clips = cutouts.filter((c) => c.length >= 3).map((c) => [ringFrom(c)] as Polygon);
  if (!clips.length) return polygonArea(points);
  try {
    const subject: Polygon = [ringFrom(points)];
    const result = polygonClipping.difference(subject as any, ...(clips as any[])) as MultiPolygon;
    return multiPolygonArea(result);
  } catch {
    return polygonArea(points);
  }
}

export function centroid(points: P2[]): P2 {
  if (!points.length) return { x: 0, z: 0 };
  const s = points.reduce((acc, p) => ({ x: acc.x + p.x, z: acc.z + p.z }), { x: 0, z: 0 });
  return { x: s.x / points.length, z: s.z / points.length };
}

/** three.js의 rotation.y와 같은 방향으로 돌린 직사각형 네 꼭짓점 */
export function rectCorners(cx: number, cz: number, w: number, d: number, rot: number, offsetZ = 0): P2[] {
  const hw = w / 2;
  const hd = d / 2;
  const local: [number, number][] = [
    [-hw, -hd + offsetZ],
    [hw, -hd + offsetZ],
    [hw, hd + offsetZ],
    [-hw, hd + offsetZ],
  ];
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return local.map(([lx, lz]) => ({ x: cx + lx * c + lz * s, z: cz - lx * s + lz * c }));
}

export function distance2(a: P2, b: P2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
