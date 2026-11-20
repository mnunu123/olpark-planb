// KSPO DOME 원본(DAE)에는 바닥 바깥쪽에 방위 글자(N·E·S·W) 메시 4개가 떨어져 있다.
// 장면 중심에서 일정 거리(기본 80m)보다 먼 메시 노드를 지우고 쓰지 않는 자원을 정리한다.
//
// 이 저장소의 의존성에는 넣지 않았다. 별도 폴더에서
//   npm i @gltf-transform/core @gltf-transform/functions
// 를 한 뒤 그 폴더에서 실행한다.
//   node strip-far-nodes.mjs in.glb out.glb [거리m]
import { NodeIO, getBounds } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';

const [src, dst, limitArg] = process.argv.slice(2);
const limit = Number(limitArg ?? 80);
const io = new NodeIO();
const doc = await io.read(src);
const root = doc.getRoot();
const sceneRoot = root.listScenes()[0].listChildren()[0];
const rb = getBounds(sceneRoot);
const cx = (rb.min[0] + rb.max[0]) / 2;
const cz = (rb.min[2] + rb.max[2]) / 2;

let removed = 0;
for (const n of root.listNodes()) {
  if (!n.getMesh() || n === sceneRoot) continue;
  let b;
  try {
    b = getBounds(n);
  } catch {
    continue;
  }
  const d = Math.hypot((b.min[0] + b.max[0]) / 2 - cx, (b.min[2] + b.max[2]) / 2 - cz);
  if (d > limit) {
    n.dispose();
    removed++;
  }
}
await doc.transform(prune());
await io.write(dst, doc);
console.log(`removed ${removed} nodes farther than ${limit}m`);
