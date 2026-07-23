// 안정성 리팩토링 불변식 검증.
// 실행: node scripts/validate-stability.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const app = readFileSync(resolve(root, 'app.js'), 'utf8');
const sw = readFileSync(resolve(root, 'sw.js'), 'utf8');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  }
}

// 1) 저장소 접근은 반드시 안전 래퍼(storage)를 거친다.
//    localStorage 직접 호출은 래퍼 내부(window.localStorage) 한 곳만 허용.
assert(app.includes('const storage = (() => {'), 'safe storage wrapper exists');
const directCalls = app.match(/(?<!window\.)localStorage\.(getItem|setItem|removeItem|key\(|clear\()/g) || [];
assert(directCalls.length === 0, `no direct localStorage calls outside the wrapper (found: ${directCalls.join(', ')})`);
const wrapperStart = app.indexOf('const storage = (() => {');
const wrapperEnd = app.indexOf('let segments = [];');
const outsideWrapper = app.slice(0, Math.max(0, wrapperStart)) + app.slice(wrapperEnd);
assert(!outsideWrapper.includes('window.localStorage'), 'window.localStorage is only referenced inside the wrapper');

// 2) 세그먼트 ID는 randomUUID 폴백이 있는 헬퍼로만 생성.
const genStart = app.indexOf('function generateSegmentId()');
assert(genStart !== -1, 'generateSegmentId helper exists');
const genEnd = app.indexOf('function normalizeSegment(');
const outsideGen = app.slice(0, Math.max(0, genStart)) + app.slice(genEnd);
assert(!outsideGen.includes('crypto.randomUUID('), 'crypto.randomUUID is only called inside generateSegmentId');

// 3) 동시 영상 로드 가드: 낡은 비동기 로드가 새 로드를 덮어쓰지 못한다.
assert(app.includes('let videoLoadToken = 0;'), 'video load token exists');
const tokenGuards = app.match(/loadToken !== videoLoadToken/g) || [];
assert(tokenGuards.length >= 3, 'stale load results are discarded after each await in loadVideoFile');
assert(app.includes('URL.revokeObjectURL(url);'), 'stale blob URL is revoked to avoid leaks');

// 4) iOS Safari 대비: pagehide에서도 디바운스 저장을 플러시한다.
assert(app.includes("window.addEventListener('pagehide', flushPendingLocalStorageSave)"), 'pagehide flush exists');

// 5) 저장 실패는 사용자에게 한 번 알린다.
assert(app.includes('function notifyPersistFailureOnce()'), 'persist failure notification exists');

// 6) JSON 백업에는 파생 필드(_searchIndex)가 새지 않는다.
const exportJson = app.slice(app.indexOf('function exportJson()'), app.indexOf('function importJsonFile('));
assert(exportJson.includes('cloneTimelineSegments()'), 'exportJson strips derived fields via cloneTimelineSegments');

// 7) 캐시 버전은 index.html(?v=)과 sw.js(CACHE_VERSION)가 항상 일치해야 한다.
const swVersion = (sw.match(/CACHE_VERSION = '([^']+)'/) || [])[1];
const htmlVersions = [...html.matchAll(/\?v=([\w-]+)/g)].map(m => m[1]);
assert(!!swVersion, 'sw.js declares CACHE_VERSION');
assert(htmlVersions.length >= 2, 'index.html versions both styles.css and app.js');
assert(htmlVersions.every(v => v === swVersion), `cache versions match (sw: ${swVersion}, html: ${htmlVersions.join(', ')})`);

if (!process.exitCode) {
  console.log('PASS: stability invariants hold');
}
