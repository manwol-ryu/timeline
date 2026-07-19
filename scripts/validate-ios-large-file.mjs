import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const app = readFileSync(resolve(root, 'app.js'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  }
}

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert(start !== -1, `missing marker: ${startMarker}`);
  if (start === -1) return '';
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(end !== -1, `missing marker after ${startMarker}: ${endMarker}`);
  if (end === -1) return source.slice(start);
  return source.slice(start, end);
}

assert(app.includes('const IOS_IN_BROWSER_FASTSTART_MAX_BYTES'), 'iOS in-browser faststart size guard constant exists');
assert(app.includes('function shouldSkipInBrowserFaststart(file)'), 'iOS large-file faststart skip helper exists');
assert(app.includes('function shouldDeferAutoPlay(file)'), 'iOS large-file autoplay defer helper exists');
assert(app.includes("case 'ios-faststart-skipped'"), 'specific iOS faststart-skipped status message exists');
assert(app.includes('iPad에서는 브라우저 안에서 faststart를 가상 적용하지 않습니다'), 'status explains that iPad browser-side virtual faststart is skipped');

const getVideoBlobUrl = sourceBetween(app, 'async function getVideoBlobUrl(file', '// MP4 파일의 첫 부분을 읽어');
const skipIndex = getVideoBlobUrl.indexOf('shouldSkipInBrowserFaststart(file)');
const remuxIndex = getVideoBlobUrl.indexOf('makeFaststartBlobUrl(file');
assert(skipIndex !== -1, 'getVideoBlobUrl checks shouldSkipInBrowserFaststart');
assert(remuxIndex !== -1, 'getVideoBlobUrl still calls makeFaststartBlobUrl for supported files');
assert(skipIndex !== -1 && remuxIndex !== -1 && skipIndex < remuxIndex, 'iOS large-file skip happens before in-browser remux');
assert(getVideoBlobUrl.includes("status: 'ios-faststart-skipped'"), 'skip path returns status to preserve actionable message');

// 파일 선택과 드래그앤드롭이 공유하는 loadVideoFile이 안전 장치를 유지하는지 확인.
const loadVideoFile = sourceBetween(app, 'async function loadVideoFile(file)', 'function looksLikeVideoFile(');
assert(loadVideoFile.includes('try {'), 'loadVideoFile wraps video URL setup in try/catch');
assert(loadVideoFile.includes('catch (err)'), 'loadVideoFile catches URL setup failures');
assert(loadVideoFile.includes("status === 'ios-faststart-skipped'"), 'loadVideoFile reapplies skipped status after video.load() so loadstart does not overwrite it');
assert(loadVideoFile.includes('!shouldDeferAutoPlay(file)'), 'loadVideoFile skips automatic play() for iOS large files');

const changeHandler = sourceBetween(app, "videoInput.addEventListener('change'", '    });\n\n    setActiveTab');
assert(changeHandler.includes("videoInput.value = ''"), 'video input is reset so the same file can be selected again');
assert(changeHandler.includes('loadVideoFile(file)'), 'video input change handler delegates to shared loadVideoFile flow');

if (!process.exitCode) {
  console.log('PASS: iOS large-file registration safeguards are present');
}
