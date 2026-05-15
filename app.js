const videoInput = document.getElementById('videoInput');
const video = document.getElementById('videoPlayer');
const videoFrame = document.getElementById('videoFrame');
const timeBadge = document.getElementById('timeBadge');
const timelineBar = document.getElementById('timelineBar');
const timelineEmpty = document.getElementById('timelineEmpty');
const timelineBarCompact = document.getElementById('timelineBarCompact');
const timelineEmptyCompact = document.getElementById('timelineEmptyCompact');
const segmentsList = document.getElementById('segmentsList');
const segmentsEmpty = document.getElementById('segmentsEmpty');

const uploadCard = document.getElementById('uploadCard');
const fileInfoCard = document.getElementById('fileInfoCard');
const fileNameText = document.getElementById('fileName');
const fileDetailsText = document.getElementById('fileDetails');
const changeVideoButton = document.getElementById('changeVideo');
const convertVideoButton = document.getElementById('convertVideo');
const convertStatus = document.getElementById('convertStatus');
const videoLoadingStatus = document.getElementById('videoLoadingStatus');
const videoLoadingProgress = document.getElementById('videoLoadingProgress');
const videoLoadingProgressFill = document.getElementById('videoLoadingProgressFill');
const videoLoadingProgressPercent = document.getElementById('videoLoadingProgressPercent');
const videoLoadingProgressElapsed = document.getElementById('videoLoadingProgressElapsed');
const fileThumbnailWrap = document.getElementById('fileThumbnailWrap');
const fileThumbnailImg = document.getElementById('fileThumbnail');
const fullscreenButton = document.getElementById('fullscreenButton');
const segmentTitle = document.getElementById('segmentTitle');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const segmentTag = document.getElementById('segmentTag');
const segmentColor = document.getElementById('segmentColor');
const segmentNote = document.getElementById('segmentNote');
const saveButton = document.getElementById('saveSegment');
const cancelEditButton = document.getElementById('cancelEdit');
const formStatus = document.getElementById('formStatus');

const searchInput = document.getElementById('searchInput');
const copyNotesButton = document.getElementById('copyNotes');
const exportTxtButton = document.getElementById('exportTxt');
const exportJsonButton = document.getElementById('exportJson');
const importJsonButton = document.getElementById('importJson');
const importJsonInput = document.getElementById('importJsonInput');
const clearAllButton = document.getElementById('clearAll');
const jumpBackButton = document.getElementById('jumpBack');
const jumpForwardButton = document.getElementById('jumpForward');
const tabButtons = document.querySelectorAll('.tab-button');
const workspacePanels = document.querySelectorAll('.workspace-panel');

let segments = [];
let editingId = null;
let totalDuration = 0;
let selectedFileSize = 0;
let selectedFileName = '';
let currentVideoUrl = '';
let currentLoadedFile = null;
let currentLoadedFaststartActive = false;
const DEFAULT_VIDEO_ASPECT = '16 / 9';
const DEFAULT_SEGMENT_COLOR = '#3b82f6';
const STORAGE_KEY_PREFIX = 'timeline_data_';
const STORAGE_RECENT_FILE = 'timeline_recent_file';
const STORAGE_DEFAULT_COLOR = 'timeline_default_color';
const STORAGE_DARK_MODE = 'timeline_dark_mode';
const STORAGE_CLEAR_TITLE = 'timeline_clear_title';
const STORAGE_CLEAR_TAG = 'timeline_clear_tag';
const STORAGE_FULLSCREEN_MODE = 'timeline_fullscreen_mode';
const FULLSCREEN_MODE_DEFAULT = 'expand';
const STORAGE_PWA_HINT = 'timeline_pwa_hint';
const STORAGE_DESIGN = 'timeline_design';
const DESIGN_DEFAULT = 'default';
const VALID_DESIGNS = ['default', 'ipad', 'premiere'];
const STORAGE_FASTSTART_AUTO = 'timeline_faststart_auto';

let _premiereOriginalParents = null;
let premiereTimelineZoom = 8; // px per second (default)
const PREMIERE_TIMELINE_ZOOM_MIN = 0.5;
const PREMIERE_TIMELINE_ZOOM_MAX = 600;

function getDesign() {
    const stored = localStorage.getItem(STORAGE_DESIGN);
    return VALID_DESIGNS.includes(stored) ? stored : DESIGN_DEFAULT;
}

function setDesign(design) {
    if (!VALID_DESIGNS.includes(design)) return;
    localStorage.setItem(STORAGE_DESIGN, design);
    if (design === 'premiere') {
        toggleDarkMode(true);
        const darkToggle = document.getElementById('darkModeToggle');
        if (darkToggle) darkToggle.checked = true;
    }
    applyDesign();
}

function applyDesign() {
    const design = getDesign();
    const html = document.documentElement;
    const prev = html.getAttribute('data-design');

    if (prev === 'premiere' && design !== 'premiere' && _premiereOriginalParents) {
        for (const { node, parent, nextSibling } of _premiereOriginalParents) {
            parent.insertBefore(node, nextSibling);
        }
        _premiereOriginalParents = null;
    }

    if (design === DESIGN_DEFAULT) {
        html.removeAttribute('data-design');
    } else {
        html.setAttribute('data-design', design);
    }

    const zone = document.getElementById('premiereBottomZone');
    if (design === 'premiere' && zone && !_premiereOriginalParents) {
        zone.hidden = false;
        const movers = [
            document.getElementById('uploadCard'),
            document.getElementById('fileInfoCard'),
            document.getElementById('timelinePanel'),
        ].filter(Boolean);
        _premiereOriginalParents = movers.map(node => ({
            node,
            parent: node.parentNode,
            nextSibling: node.nextSibling,
        }));
        movers.forEach(node => zone.appendChild(node));
    } else if (design !== 'premiere' && zone) {
        zone.hidden = true;
    }

    movePremiereQuickAddButton(design === 'premiere');

    if (typeof renderPremiereTimeline === 'function') {
        renderPremiereTimeline();
    }
}

let _quickAddOriginalSlot = null;
function movePremiereQuickAddButton(toPremiere) {
    const quickBtn = document.getElementById('quickAddMemo');
    const saveBtn = document.getElementById('saveSegment');
    if (!quickBtn || !saveBtn) return;

    if (toPremiere) {
        if (!_quickAddOriginalSlot) {
            _quickAddOriginalSlot = {
                parent: quickBtn.parentNode,
                nextSibling: quickBtn.nextSibling,
                label: quickBtn.textContent,
            };
        }
        // saveSegment 바로 옆으로 이동
        saveBtn.parentNode.insertBefore(quickBtn, saveBtn.nextSibling);
        quickBtn.textContent = '빠른 추가';
        quickBtn.classList.remove('primary');
        quickBtn.classList.add('ghost');
    } else if (_quickAddOriginalSlot) {
        _quickAddOriginalSlot.parent.insertBefore(quickBtn, _quickAddOriginalSlot.nextSibling);
        quickBtn.textContent = _quickAddOriginalSlot.label || '현재 장면 메모 추가';
        quickBtn.classList.add('primary');
        quickBtn.classList.remove('ghost');
        _quickAddOriginalSlot = null;
    }
}

function isPremiereDesign() {
    return document.documentElement.getAttribute('data-design') === 'premiere';
}

function buildPremiereTimelineDom() {
    const view = document.createElement('div');
    view.id = 'premiereTimelineView';
    view.className = 'premiere-tl-view';
    view.innerHTML = `
        <div class="premiere-tl-toolbar">
            <button type="button" class="premiere-tl-import">📁 IMPORT</button>
            <button type="button" class="premiere-tl-export">⬇ EXPORT</button>
            <span class="premiere-tl-file" data-empty="파일이 선택되지 않음">파일이 선택되지 않음</span>
            <div class="premiere-tl-zoom">
                <button type="button" class="premiere-tl-zoom-btn" data-zoom="out" title="축소">−</button>
                <input type="range" class="premiere-tl-zoom-slider" min="0" max="100" value="20">
                <button type="button" class="premiere-tl-zoom-btn" data-zoom="in" title="확대">+</button>
                <button type="button" class="premiere-tl-zoom-btn" data-zoom="fit" title="전체보기">⤢</button>
                <span class="premiere-tl-zoom-level">8 px/s</span>
            </div>
        </div>
        <div class="premiere-tl-main">
            <div class="premiere-tl-tracks-area">
                <div class="premiere-tl-headers">
                    <div class="premiere-tl-header-spacer"></div>
                </div>
                <div class="premiere-tl-canvas">
                    <div class="premiere-tl-ruler"></div>
                    <div class="premiere-tl-playhead" hidden><div class="premiere-tl-playhead-head"></div></div>
                </div>
            </div>
            <aside class="premiere-tl-detail" hidden>
                <div class="premiere-tl-detail-header">
                    <span class="premiere-tl-detail-title">제목 없음</span>
                    <button type="button" class="premiere-tl-detail-close" aria-label="닫기">✕</button>
                </div>
                <div class="premiere-tl-detail-body">
                    <div class="premiere-tl-detail-time">--:-- ~ --:--</div>
                    <span class="premiere-tl-detail-tag" hidden></span>
                    <p class="premiere-tl-detail-note"></p>
                </div>
                <div class="premiere-tl-detail-actions">
                    <button type="button" class="ghost" data-action="seek">이동</button>
                    <button type="button" class="primary" data-action="play">재생</button>
                    <button type="button" class="ghost" data-action="edit">수정</button>
                    <button type="button" class="danger" data-action="delete">삭제</button>
                </div>
            </aside>
        </div>
    `;

    view.querySelector('.premiere-tl-import').addEventListener('click', () => {
        const input = document.getElementById('videoInput');
        if (input) input.click();
    });

    view.querySelector('.premiere-tl-export').addEventListener('click', () => {
        exportJson();
    });

    const zoomSlider = view.querySelector('.premiere-tl-zoom-slider');
    const zoomLevel = view.querySelector('.premiere-tl-zoom-level');

    function applyZoomFromSlider(val) {
        // 0~100 슬라이더를 로그 스케일로 PX_PER_SEC로 변환 (min은 동적으로 fit-to-view)
        const minZoom = getEffectiveMinZoom();
        const min = Math.log(minZoom);
        const max = Math.log(PREMIERE_TIMELINE_ZOOM_MAX);
        const t = Math.max(0, Math.min(100, Number(val))) / 100;
        premiereTimelineZoom = Math.exp(min + (max - min) * t);
        zoomLevel.textContent = `${premiereTimelineZoom.toFixed(1)} px/s`;
        renderPremiereTimeline();
    }

    function setZoomSliderFromValue() {
        const minZoom = getEffectiveMinZoom();
        const min = Math.log(minZoom);
        const max = Math.log(PREMIERE_TIMELINE_ZOOM_MAX);
        const t = (Math.log(premiereTimelineZoom) - min) / (max - min);
        zoomSlider.value = String(Math.max(0, Math.min(100, t * 100)));
    }

    zoomSlider.addEventListener('input', () => applyZoomFromSlider(zoomSlider.value));

    view.querySelectorAll('.premiere-tl-zoom-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.zoom;
            const minZoom = getEffectiveMinZoom();
            if (action === 'in') {
                premiereTimelineZoom = Math.min(PREMIERE_TIMELINE_ZOOM_MAX, premiereTimelineZoom * 1.5);
            } else if (action === 'out') {
                premiereTimelineZoom = Math.max(minZoom, premiereTimelineZoom / 1.5);
            } else if (action === 'fit') {
                premiereTimelineZoom = minZoom;
            }
            setZoomSliderFromValue();
            zoomLevel.textContent = `${premiereTimelineZoom.toFixed(1)} px/s`;
            renderPremiereTimeline();
        });
    });

    // 노출 가능: 외부에서도 슬라이더를 동기화하기 위해 view에 메서드 보관
    view._setZoomSliderFromValue = setZoomSliderFromValue;

    setZoomSliderFromValue();

    attachTimelineScrubHandlers(view);
    attachTimelineWheelZoom(view);

    const detail = view.querySelector('.premiere-tl-detail');
    view.querySelector('.premiere-tl-detail-close').addEventListener('click', () => {
        detail.hidden = true;
        view.querySelectorAll('.premiere-tl-clip.selected').forEach(c => c.classList.remove('selected'));
    });

    view.querySelector('.premiere-tl-detail-actions').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = detail.dataset.id;
        if (!id) return;
        const seg = segments.find(s => String(s.id) === String(id));
        if (!seg) return;
        const action = btn.dataset.action;
        if (action === 'seek' && Number.isFinite(seg.start)) {
            video.currentTime = seg.start;
        } else if (action === 'play' && Number.isFinite(seg.start)) {
            video.currentTime = seg.start;
            video.play();
        } else if (action === 'edit') {
            startEditing(seg.id);
            detail.hidden = true;
        } else if (action === 'delete') {
            if (!confirm('이 구간 메모를 삭제할까요?')) return;
            segments = segments.filter(item => item.id !== seg.id);
            finishEditing();
            renderAll();
            detail.hidden = true;
        }
    });

    return view;
}

function ensurePremiereTimelineView() {
    let view = document.getElementById('premiereTimelineView');
    if (!view) {
        const panel = document.getElementById('timelinePanel');
        if (!panel) return null;
        view = buildPremiereTimelineDom();
        panel.appendChild(view);
    }
    return view;
}

function formatBytesShort(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function normalizeColor(c) {
    return (c || DEFAULT_SEGMENT_COLOR).toLowerCase();
}

function segmentsOverlap(a, b) {
    return !(a.end <= b.start || a.start >= b.end);
}

// 색상 그룹별로 같은 줄에 배치하되, 겹치면 그 색상의 다음 줄로 push.
// 결과: [{ color, rows: [[seg, ...], [seg, ...]] }, ...] 를 평탄화한 트랙 배열
function computeMemoTracks(segs) {
    const colorOrder = [];
    const groups = new Map();
    segs.forEach(seg => {
        const color = normalizeColor(seg.color);
        if (!groups.has(color)) {
            groups.set(color, []);
            colorOrder.push(color);
        }
        groups.get(color).push(seg);
    });

    const tracks = [];
    for (const color of colorOrder) {
        const list = groups.get(color).slice().sort((a, b) => a.start - b.start);
        const rows = [];
        for (const seg of list) {
            let placed = false;
            for (const row of rows) {
                if (!row.some(other => segmentsOverlap(seg, other))) {
                    row.push(seg);
                    placed = true;
                    break;
                }
            }
            if (!placed) rows.push([seg]);
        }
        rows.forEach((rowSegs, rowIdx) => {
            tracks.push({ color, rowIdx, segments: rowSegs });
        });
    }
    return tracks;
}

function getTimelinePixelsPerSecond() {
    if (!Number.isFinite(totalDuration) || totalDuration <= 0) return 0;
    return premiereTimelineZoom;
}

function renderPremiereTimeline() {
    if (!isPremiereDesign()) return;
    const view = ensurePremiereTimelineView();
    if (!view) return;

    const fileLabel = view.querySelector('.premiere-tl-file');
    if (fileLabel) {
        const sizePart = selectedFileSize ? formatBytesShort(selectedFileSize) : '';
        const durPart = totalDuration > 0 ? formatTime(totalDuration) : '';
        const parts = [selectedFileName, sizePart, durPart].filter(Boolean);
        fileLabel.textContent = parts.length ? parts.join(' · ') : fileLabel.dataset.empty;
    }

    const zoomLabel = view.querySelector('.premiere-tl-zoom-level');
    if (zoomLabel) {
        zoomLabel.textContent = `${premiereTimelineZoom.toFixed(1)} px/s`;
    }

    const headersContainer = view.querySelector('.premiere-tl-headers');
    headersContainer.querySelectorAll('.premiere-tl-track-header').forEach(h => h.remove());

    const canvas = view.querySelector('.premiere-tl-canvas');
    canvas.querySelectorAll('.premiere-tl-track').forEach(t => t.remove());

    const ruler = canvas.querySelector('.premiere-tl-ruler');
    const playhead = canvas.querySelector('.premiere-tl-playhead');
    ruler.innerHTML = '';

    if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
        if (playhead) playhead.hidden = true;
        canvas.style.width = '';
        return;
    }

    const pxPerSec = getTimelinePixelsPerSecond();
    const totalWidthPx = Math.max(200, totalDuration * pxPerSec);
    canvas.style.width = `${totalWidthPx}px`;

    // 줌 레벨에 따라 눈금 간격을 적절히 결정
    const tickInterval = pickRulerTickInterval(totalDuration, pxPerSec);
    for (let t = 0; t <= totalDuration + 0.001; t += tickInterval) {
        const tick = document.createElement('span');
        tick.className = 'premiere-tl-ruler-tick';
        tick.style.left = `${t * pxPerSec}px`;
        tick.textContent = formatTime(t);
        ruler.appendChild(tick);
    }

    const v1Header = document.createElement('div');
    v1Header.className = 'premiere-tl-track-header';
    v1Header.textContent = 'V1';
    headersContainer.appendChild(v1Header);

    const v1Track = document.createElement('div');
    v1Track.className = 'premiere-tl-track v1';
    v1Track.style.width = `${totalWidthPx}px`;
    canvas.insertBefore(v1Track, playhead);

    const v1Clip = document.createElement('div');
    v1Clip.className = 'premiere-tl-clip v1-clip';
    v1Clip.style.left = '0px';
    v1Clip.style.width = `${totalWidthPx}px`;
    const v1ClipLabel = document.createElement('span');
    v1ClipLabel.textContent = selectedFileName ? selectedFileName : 'main video';
    v1Clip.appendChild(v1ClipLabel);
    v1Track.appendChild(v1Clip);

    const tracks = computeMemoTracks(segments);
    tracks.forEach((track) => {
        const header = document.createElement('div');
        header.className = 'premiere-tl-track-header memo';
        const dot = document.createElement('span');
        dot.className = 'premiere-tl-track-color-dot';
        dot.style.background = track.color;
        header.appendChild(dot);
        headersContainer.appendChild(header);

        const trackEl = document.createElement('div');
        trackEl.className = 'premiere-tl-track memo';
        trackEl.style.width = `${totalWidthPx}px`;
        canvas.insertBefore(trackEl, playhead);

        track.segments.forEach(seg => {
            if (!Number.isFinite(seg.start) || !Number.isFinite(seg.end)) return;
            const startPx = Math.max(0, seg.start * pxPerSec);
            const widthPx = Math.max(6, (seg.end - seg.start) * pxPerSec);

            const clip = document.createElement('div');
            clip.className = 'premiere-tl-clip memo-clip';
            clip.style.left = `${startPx}px`;
            clip.style.width = `${widthPx}px`;
            if (seg.color) {
                clip.style.background = seg.color;
                clip.style.borderColor = 'rgba(0,0,0,0.5)';
            }
            clip.dataset.id = seg.id;
            clip.title = `${seg.title || '제목 없음'} (${formatTime(seg.start)} ~ ${formatTime(seg.end)})`;
            const titleSpan = document.createElement('span');
            titleSpan.textContent = seg.title || '제목 없음';
            clip.appendChild(titleSpan);
            const handleLeft = document.createElement('span');
            handleLeft.className = 'premiere-tl-clip-handle premiere-tl-clip-handle-left';
            handleLeft.dataset.handle = 'left';
            const handleRight = document.createElement('span');
            handleRight.className = 'premiere-tl-clip-handle premiere-tl-clip-handle-right';
            handleRight.dataset.handle = 'right';
            clip.appendChild(handleLeft);
            clip.appendChild(handleRight);
            clip.addEventListener('click', (e) => {
                if (e.target.dataset && e.target.dataset.handle) return;
                if (clip.dataset.dragHappened === '1') {
                    delete clip.dataset.dragHappened;
                    return;
                }
                e.stopPropagation();
                view.querySelectorAll('.premiere-tl-clip.selected').forEach(c => c.classList.remove('selected'));
                clip.classList.add('selected');
                openPremiereClipDetail(seg.id);
            });
            attachClipDragHandlers(clip, seg);
            trackEl.appendChild(clip);
        });
    });

    updatePremierePlayhead();
}

function pickRulerTickInterval(duration, pxPerSec) {
    // 한 눈금이 적어도 60px이 되도록 간격을 고른다
    const minPx = 60;
    const candidates = [
        1 / 60, 1 / 30, 1 / 10, 0.5, 1, 2, 5, 10, 15, 30,
        60, 120, 300, 600, 1800, 3600
    ];
    for (const c of candidates) {
        if (c * pxPerSec >= minPx) return c;
    }
    return Math.max(duration / 8, 1);
}

function openPremiereClipDetail(segId) {
    const view = document.getElementById('premiereTimelineView');
    if (!view) return;
    const seg = segments.find(s => s.id === segId);
    if (!seg) return;
    const detail = view.querySelector('.premiere-tl-detail');
    detail.hidden = false;
    detail.dataset.id = String(seg.id);
    detail.querySelector('.premiere-tl-detail-title').textContent = seg.title || '제목 없음';
    detail.querySelector('.premiere-tl-detail-time').textContent =
        `${formatTime(seg.start)} ~ ${formatTime(seg.end)}`;
    detail.querySelector('.premiere-tl-detail-note').textContent = seg.note || '작성된 메모가 없습니다.';
    const tagEl = detail.querySelector('.premiere-tl-detail-tag');
    if (seg.tag) {
        tagEl.textContent = `#${seg.tag}`;
        tagEl.hidden = false;
    } else {
        tagEl.hidden = true;
    }
}

// timeupdate마다 호출되는 hot path. querySelector 두 번을 매 프레임마다
// 새로 돌면 메인 쓰레드 부담이 누적돼, rate 변경 시 디코더와 메인 쓰레드가
// 경쟁할 때 멈춤이 길어진다. DOM 노드를 캐시해 호출 비용을 최소화.
let cachedPremierePlayhead = null;
function getPremierePlayhead() {
    if (cachedPremierePlayhead && cachedPremierePlayhead.isConnected) {
        return cachedPremierePlayhead;
    }
    const view = document.getElementById('premiereTimelineView');
    cachedPremierePlayhead = view ? view.querySelector('.premiere-tl-playhead') : null;
    return cachedPremierePlayhead;
}

function updatePremierePlayhead() {
    if (!isPremiereDesign()) return;
    const playhead = getPremierePlayhead();
    if (!playhead) return;
    if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
        playhead.hidden = true;
        return;
    }
    playhead.hidden = false;
    // 스크러빙 중에는 드래그 핸들러가 플레이헤드 위치를 직접 갱신하므로
    // timeupdate(이전 currentTime)로 덮어써서 뒤로 튀는 현상을 막는다.
    if (playhead.classList.contains('is-scrubbing')) return;
    const pxPerSec = getTimelinePixelsPerSecond();
    const px = Math.max(0, (video.currentTime || 0) * pxPerSec);
    playhead.style.left = `${px}px`;
}

function attachTimelineScrubHandlers(view) {
    const ruler = view.querySelector('.premiere-tl-ruler');
    const canvas = view.querySelector('.premiere-tl-canvas');
    const playhead = view.querySelector('.premiere-tl-playhead');
    const playheadHead = view.querySelector('.premiere-tl-playhead-head');

    // 빠른 드래그 중 pointermove마다 video.currentTime을 쓰면 iOS Safari에서
    // 시킹 요청이 누적·충돌해 영상이 멈추거나 중간 위치로 되돌아간다.
    // 플레이헤드 UI는 즉시 갱신하고, 실제 currentTime 갱신은 rAF로 묶어 최신 값만 적용.
    let pendingSeekTime = null;
    let seekRafId = 0;
    let waitingForSeeked = false;

    function applySeekImmediate(target) {
        if (Math.abs(target - (video.currentTime || 0)) < 0.05) return;
        try {
            if (typeof video.fastSeek === 'function') video.fastSeek(target);
            else video.currentTime = target;
        } catch (_) {}
    }

    function flushPendingSeek() {
        seekRafId = 0;
        if (pendingSeekTime === null) return;
        // 이전 시킹이 아직 진행 중이면 완료를 기다렸다가 다시 시도.
        // (iOS Safari는 시킹 중에 새 시킹을 받으면 둘 다 무시될 수 있다.)
        if (video.seeking) {
            if (!waitingForSeeked) {
                waitingForSeeked = true;
                video.addEventListener('seeked', () => {
                    waitingForSeeked = false;
                    if (pendingSeekTime !== null && !seekRafId) {
                        seekRafId = requestAnimationFrame(flushPendingSeek);
                    }
                }, { once: true });
            }
            return;
        }
        const target = pendingSeekTime;
        pendingSeekTime = null;
        applySeekImmediate(target);
    }

    function seekFromClientX(clientX) {
        const pxPerSec = getTimelinePixelsPerSecond();
        if (!pxPerSec || !Number.isFinite(totalDuration) || totalDuration <= 0) return;
        const rect = canvas.getBoundingClientRect();
        const localX = clientX - rect.left;
        const t = Math.max(0, Math.min(totalDuration, localX / pxPerSec));
        if (!Number.isFinite(t)) return;
        // 플레이헤드는 즉시 위치 이동 (드래그 반응성 유지).
        if (playhead) {
            playhead.hidden = false;
            playhead.style.left = `${Math.max(0, t * pxPerSec)}px`;
        }
        pendingSeekTime = t;
        if (!seekRafId) {
            seekRafId = requestAnimationFrame(flushPendingSeek);
        }
    }

    function finalizeScrub() {
        // 보류 중인 rAF 시킹이 있으면 즉시 적용해, 손을 떼자마자
        // 마지막 위치로 시킹이 시작되도록 한다.
        if (seekRafId) {
            cancelAnimationFrame(seekRafId);
            flushPendingSeek();
        }
        // 시킹이 완료될 때까지 playhead의 is-scrubbing을 유지해
        // 도중 발생하는 timeupdate(예전 currentTime)로 인한
        // 잠깐의 위치 되감김을 방지한다.
        if (video.seeking) {
            video.addEventListener('seeked', () => {
                playhead?.classList.remove('is-scrubbing');
            }, { once: true });
        } else {
            playhead?.classList.remove('is-scrubbing');
        }
    }

    function makeScrubHandler(target) {
        let scrubbing = false;
        let wasPlaying = false;

        target.addEventListener('pointerdown', (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            // 클립 위에서는 시킹 비활성화 (클립 드래그가 우선)
            if (e.target.closest('.premiere-tl-clip')) return;
            scrubbing = true;
            wasPlaying = !video.paused;
            if (wasPlaying) video.pause();
            target.setPointerCapture?.(e.pointerId);
            ruler?.classList.add('is-scrubbing');
            playhead?.classList.add('is-scrubbing');
            seekFromClientX(e.clientX);
            e.preventDefault();
        });

        target.addEventListener('pointermove', (e) => {
            if (!scrubbing) return;
            seekFromClientX(e.clientX);
        });

        function endScrub(e) {
            if (!scrubbing) return;
            scrubbing = false;
            target.releasePointerCapture?.(e.pointerId);
            ruler?.classList.remove('is-scrubbing');
            finalizeScrub();
            if (wasPlaying) video.play().catch(() => {});
        }
        target.addEventListener('pointerup', endScrub);
        target.addEventListener('pointercancel', endScrub);
    }

    // 룰러는 canvas의 자식이므로 canvas에만 핸들러를 달면 충분 (이벤트 버블링)
    if (canvas) makeScrubHandler(canvas);

    // playhead head의 별도 드래그 핸들러
    if (playheadHead) {
        let dragging = false;
        let wasPlaying = false;
        playheadHead.addEventListener('pointerdown', (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            dragging = true;
            wasPlaying = !video.paused;
            if (wasPlaying) video.pause();
            playheadHead.setPointerCapture?.(e.pointerId);
            playhead?.classList.add('is-scrubbing');
            e.stopPropagation();
            e.preventDefault();
        });
        playheadHead.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            seekFromClientX(e.clientX);
        });
        function endHeadDrag(e) {
            if (!dragging) return;
            dragging = false;
            playheadHead.releasePointerCapture?.(e.pointerId);
            finalizeScrub();
            if (wasPlaying) video.play().catch(() => {});
        }
        playheadHead.addEventListener('pointerup', endHeadDrag);
        playheadHead.addEventListener('pointercancel', endHeadDrag);
    }
}

function attachTimelineWheelZoom(view) {
    const tracksArea = view.querySelector('.premiere-tl-tracks-area');
    if (!tracksArea) return;

    tracksArea.addEventListener('wheel', (e) => {
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.2 : (1 / 1.2);

        // 마우스 위치를 기준으로 줌 (해당 위치의 시간이 그대로 유지되도록 스크롤 조정)
        const rect = tracksArea.getBoundingClientRect();
        const headerW = view.querySelector('.premiere-tl-headers')?.offsetWidth || 0;
        const localX = e.clientX - rect.left - headerW + tracksArea.scrollLeft;
        const oldPxPerSec = getTimelinePixelsPerSecond() || premiereTimelineZoom;
        const focusTime = oldPxPerSec > 0 ? localX / oldPxPerSec : 0;

        const minZoom = getEffectiveMinZoom();
        const maxZoom = PREMIERE_TIMELINE_ZOOM_MAX;
        premiereTimelineZoom = Math.max(minZoom, Math.min(maxZoom, premiereTimelineZoom * factor));

        renderPremiereTimeline();

        const newPxPerSec = getTimelinePixelsPerSecond();
        const newLocalX = focusTime * newPxPerSec;
        tracksArea.scrollLeft = newLocalX - (e.clientX - rect.left - headerW);
    }, { passive: false });
}

function autoFitPremiereTimeline() {
    const view = document.getElementById('premiereTimelineView');
    if (!view || !isPremiereDesign() || totalDuration <= 0) return;
    // 현재 줌이 effective min보다 작으면 fit으로 설정
    const minZoom = getEffectiveMinZoom();
    if (premiereTimelineZoom < minZoom * 1.001 || premiereTimelineZoom < 1) {
        premiereTimelineZoom = minZoom;
        if (view._setZoomSliderFromValue) view._setZoomSliderFromValue();
    }
}

function getEffectiveMinZoom() {
    const view = document.getElementById('premiereTimelineView');
    if (!view || !Number.isFinite(totalDuration) || totalDuration <= 0) {
        return PREMIERE_TIMELINE_ZOOM_MIN;
    }
    const tracksArea = view.querySelector('.premiere-tl-tracks-area');
    const headers = view.querySelector('.premiere-tl-headers');
    if (!tracksArea || !headers) return PREMIERE_TIMELINE_ZOOM_MIN;
    const availW = Math.max(100, tracksArea.clientWidth - headers.offsetWidth - 8);
    return Math.max(0.01, availW / totalDuration);
}

function attachClipDragHandlers(clip, seg) {
    let dragMode = null; // 'move' | 'left' | 'right'
    let dragStartX = 0;
    let origStart = 0;
    let origEnd = 0;
    let pxPerSec = 1;

    function onPointerDown(e) {
        if (e.button !== undefined && e.button !== 0) return;
        const handleType = e.target?.dataset?.handle;
        dragMode = handleType === 'left' ? 'left'
            : handleType === 'right' ? 'right'
            : 'move';
        dragStartX = e.clientX;
        origStart = seg.start;
        origEnd = seg.end;
        pxPerSec = getTimelinePixelsPerSecond() || 1;
        clip.classList.add('is-dragging');
        clip.setPointerCapture?.(e.pointerId);
        e.stopPropagation();
        e.preventDefault();
    }

    function onPointerMove(e) {
        if (!dragMode) return;
        const deltaSec = (e.clientX - dragStartX) / pxPerSec;
        if (Math.abs(e.clientX - dragStartX) > 3) {
            clip.dataset.dragHappened = '1';
        }
        let newStart = origStart;
        let newEnd = origEnd;
        if (dragMode === 'move') {
            const dur = origEnd - origStart;
            newStart = Math.max(0, origStart + deltaSec);
            newEnd = newStart + dur;
            if (totalDuration > 0 && newEnd > totalDuration) {
                newEnd = totalDuration;
                newStart = newEnd - dur;
            }
        } else if (dragMode === 'left') {
            newStart = Math.max(0, Math.min(origEnd - 0.1, origStart + deltaSec));
        } else if (dragMode === 'right') {
            newEnd = Math.max(origStart + 0.1, origEnd + deltaSec);
            if (totalDuration > 0) newEnd = Math.min(totalDuration, newEnd);
        }
        seg.start = newStart;
        seg.end = newEnd;
        const startPx = Math.max(0, newStart * pxPerSec);
        const widthPx = Math.max(6, (newEnd - newStart) * pxPerSec);
        clip.style.left = `${startPx}px`;
        clip.style.width = `${widthPx}px`;
    }

    function onPointerUp(e) {
        if (!dragMode) return;
        const wasDrag = clip.dataset.dragHappened === '1';
        dragMode = null;
        clip.classList.remove('is-dragging');
        clip.releasePointerCapture?.(e.pointerId);
        // click 이벤트가 먼저 발생할 시간을 줘서 dragHappened 플래그를 검사할 수 있게 함
        setTimeout(() => {
            if (wasDrag) saveToLocalStorage();
            renderAll();
        }, 0);
    }

    clip.addEventListener('pointerdown', onPointerDown);
    clip.addEventListener('pointermove', onPointerMove);
    clip.addEventListener('pointerup', onPointerUp);
    clip.addEventListener('pointercancel', onPointerUp);
}

function isPwaHintEnabled() {
    const stored = localStorage.getItem(STORAGE_PWA_HINT);
    return stored === null ? true : stored === 'true';
}

function setPwaHintEnabled(enabled) {
    localStorage.setItem(STORAGE_PWA_HINT, enabled ? 'true' : 'false');
}

function isInStandalone() {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }
    if (window.navigator && window.navigator.standalone === true) {
        return true;
    }
    return false;
}
const LARGE_FILE_WARNING_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const IOS_IN_BROWSER_FASTSTART_MAX_BYTES = 2 * 1024 * 1024 * 1024; // iPad Safari에서 큰 가상 Blob 생성을 피하는 안전선
const SLOW_LOAD_THRESHOLD_MS = 15000;
let videoLoadingTimer = null;
let videoLoadingStartedAt = 0;
let videoLoadingElapsedTimer = null;
let videoLoadingProgressIndeterminate = false;

function showVideoLoadingProgress() {
    if (!videoLoadingProgress) return;
    videoLoadingProgress.hidden = false;
    videoLoadingProgressIndeterminate = true;
    videoLoadingProgressFill.classList.add('is-indeterminate');
    videoLoadingProgressFill.style.width = '0%';
    videoLoadingProgressPercent.textContent = '분석 중...';
    videoLoadingStartedAt = Date.now();
    videoLoadingProgressElapsed.textContent = '0초 경과';
    clearInterval(videoLoadingElapsedTimer);
    videoLoadingElapsedTimer = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - videoLoadingStartedAt) / 1000);
        videoLoadingProgressElapsed.textContent = `${elapsedSec}초 경과`;
    }, 250);
}

function updateVideoLoadingProgress() {
    if (!videoLoadingProgress || videoLoadingProgress.hidden) return;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    if (!video.buffered || video.buffered.length === 0) return;

    let bufferedSec = 0;
    for (let i = 0; i < video.buffered.length; i++) {
        bufferedSec += video.buffered.end(i) - video.buffered.start(i);
    }
    const pct = Math.max(0, Math.min(100, (bufferedSec / video.duration) * 100));
    if (videoLoadingProgressIndeterminate) {
        videoLoadingProgressFill.classList.remove('is-indeterminate');
        videoLoadingProgressIndeterminate = false;
    }
    videoLoadingProgressFill.style.width = `${pct}%`;
    videoLoadingProgressPercent.textContent = `${pct.toFixed(1)}%`;
}

function hideVideoLoadingProgress() {
    if (!videoLoadingProgress) return;
    clearInterval(videoLoadingElapsedTimer);
    videoLoadingElapsedTimer = null;
    videoLoadingProgress.hidden = true;
    videoLoadingProgressFill.classList.remove('is-indeterminate');
    videoLoadingProgressFill.style.width = '0%';
    videoLoadingProgressIndeterminate = false;
}

function getFullscreenMode() {
    const stored = localStorage.getItem(STORAGE_FULLSCREEN_MODE);
    return stored === 'native' ? 'native' : FULLSCREEN_MODE_DEFAULT;
}

function setFullscreenMode(mode) {
    if (mode !== 'native' && mode !== 'expand') return;
    localStorage.setItem(STORAGE_FULLSCREEN_MODE, mode);
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
        return [hours, minutes, secs].map(unit => String(unit).padStart(2, '0')).join(':');
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseTimeInput(value) {
    const raw = (value || '').trim();
    if (!raw) return NaN;
    if (raw.includes(':')) {
        const parts = raw.split(':').map(part => part.trim());
        if (parts.some(part => part === '')) return NaN;
        const numbers = parts.map(Number);
        if (numbers.some(num => !Number.isFinite(num) || num < 0)) return NaN;
        return numbers.reduce((acc, num) => acc * 60 + num, 0);
    }
    const numeric = Number(raw);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : NaN;
}

function setVideoAspect(value = DEFAULT_VIDEO_ASPECT) {
    if (videoFrame) {
        videoFrame.style.setProperty('--video-aspect', value);
    }
}

function updateVideoAspectFromMetadata() {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoAspect(`${video.videoWidth} / ${video.videoHeight}`);
    } else {
        setVideoAspect();
    }
}

function getBaseFileName() {
    if (selectedFileName) {
        const withoutExt = selectedFileName.replace(/\.[^/.]+$/, '');
        return withoutExt || 'timeline';
    }
    return 'timeline';
}

function refreshFileDetails() {
    if (!fileInfoCard || fileInfoCard.style.display === 'none') return;
    const sizeText = selectedFileSize ? `${(selectedFileSize / (1024 * 1024)).toFixed(1)} MB` : '-- MB';
    const durationText = totalDuration > 0 ? formatTime(totalDuration) : '--:--';
    fileDetailsText.textContent = `${sizeText} · 길이 ${durationText}`;
}

function updateFileInfo(file) {
    if (!file) {
        selectedFileSize = 0;
        selectedFileName = '';
        fileNameText.textContent = '아직 파일이 선택되지 않았어요';
        fileDetailsText.textContent = '-- MB';
        uploadCard.style.display = 'block';
        fileInfoCard.style.display = 'none';
        convertStatus.textContent = '';
        convertVideoButton.disabled = false;
        convertVideoButton.textContent = '파일 변환';
        setVideoLoadingStatus('ready');
        hideVideoLoadingProgress();
        setVideoAspect();
        if (fileThumbnailWrap) fileThumbnailWrap.hidden = true;
        if (fileThumbnailImg) fileThumbnailImg.src = '';
        return;
    }
    selectedFileSize = file.size;
    selectedFileName = file.name;
    fileNameText.textContent = file.name;
    uploadCard.style.display = 'none';
    fileInfoCard.style.display = 'flex';
    convertStatus.textContent = '';
    convertVideoButton.disabled = false;
    convertVideoButton.textContent = '파일 변환';
    setVideoLoadingStatus('ready');
    refreshFileDetails();
    renderPremiereTimeline();
}

function simulateConversion() {
    if (!selectedFileSize) {
        convertStatus.textContent = '먼저 영상을 선택해주세요.';
        return;
    }
    convertVideoButton.disabled = true;
    convertVideoButton.textContent = '변환 중...';
    convertStatus.textContent = '최적화된 MP4로 변환 중입니다...';
    setTimeout(() => {
        convertVideoButton.disabled = false;
        convertVideoButton.textContent = '파일 변환';
        convertStatus.textContent = '변환 완료! 최적화된 파일이 준비되었어요.';
    }, 1600);
}

function setActiveTab(target) {
    tabButtons.forEach(button => {
        const isActive = button.dataset.tab === target;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
    });
    workspacePanels.forEach(panel => {
        const isActive = panel.dataset.panel === target;
        panel.classList.toggle('is-active', isActive);
        panel.setAttribute('aria-hidden', String(!isActive));
    });
}

// totalDuration은 영상 로드 후 거의 변하지 않으므로 캐싱.
let cachedTotalBadgeText = '--:--';
let cachedTotalBadgeForDuration = NaN;
let lastTimeBadgeText = '';
function setTimeBadge() {
    const cur = video.currentTime || 0;
    if (cachedTotalBadgeForDuration !== totalDuration) {
        cachedTotalBadgeText = totalDuration > 0 ? formatTime(totalDuration) : '--:--';
        cachedTotalBadgeForDuration = totalDuration;
    }
    const next = `${formatTime(cur)} / ${cachedTotalBadgeText}`;
    // 같은 텍스트면 textContent 쓰기로 인한 paint 비용 생략.
    if (next === lastTimeBadgeText) return;
    lastTimeBadgeText = next;
    timeBadge.textContent = next;
}

function renderTimelineBar(targetBar, emptyState) {
    if (!targetBar || !emptyState) return;
    targetBar.innerHTML = '';
    if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';
    segments.forEach(segment => {
        if (!Number.isFinite(segment.start) || !Number.isFinite(segment.end)) return;
        const startPercent = Math.max(0, Math.min(100, (segment.start / totalDuration) * 100));
        const endPercent = Math.max(0, Math.min(100, (segment.end / totalDuration) * 100));
        const width = Math.max(1, endPercent - startPercent);
        const marker = document.createElement('div');
        marker.className = 'timeline-marker';
        marker.style.left = `${startPercent}%`;
        marker.style.width = `${width}%`;
        marker.style.background = segment.color;
        marker.title = `${segment.title || '제목 없음'} (${formatTime(segment.start)}~${formatTime(segment.end)})`;
        marker.addEventListener('click', () => {
            video.currentTime = segment.start;
            video.play();
        });
        targetBar.appendChild(marker);
    });
}

function renderTimeline() {
    renderTimelineBar(timelineBar, timelineEmpty);
    renderTimelineBar(timelineBarCompact, timelineEmptyCompact);
}


function normalizeSegment(segment) {
    const normalized = {
        ...segment,
        id: segment.id || crypto.randomUUID(),
        start: Number(segment.start),
        end: Number(segment.end),
        color: segment.color || DEFAULT_SEGMENT_COLOR,
    };
    normalized._searchIndex = [normalized.title, normalized.note, normalized.tag]
        .map(value => String(value || '').toLowerCase())
        .join(' ');
    return normalized;
}

function renderSegments(filterText = '') {
    segmentsList.innerHTML = '';
    const keyword = filterText.trim().toLowerCase();
    const filtered = !keyword
        ? segments
        : segments.filter(segment => (segment._searchIndex || '').includes(keyword));

    if (filtered.length === 0) {
        segmentsEmpty.style.display = 'block';
        segmentsEmpty.textContent = keyword
            ? '검색 결과가 없습니다. 다른 키워드로 찾아보세요.'
            : '아직 등록된 메모가 없습니다. 영상을 재생하면서 중요한 순간을 기록해보세요.';
        return;
    }
    segmentsEmpty.style.display = 'none';

    const fragment = document.createDocumentFragment();

    filtered.forEach(segment => {
        const card = document.createElement('article');
        card.className = 'segment-card';

        const header = document.createElement('div');
        header.className = 'segment-header';

        const titleWrap = document.createElement('div');
        titleWrap.className = 'segment-title';
        const dot = document.createElement('span');
        dot.className = 'color-dot';
        dot.style.background = segment.color;
        const titleText = document.createElement('strong');
        titleText.textContent = segment.title || '제목 없음';
        titleWrap.append(dot, titleText);

        const timeText = document.createElement('span');
        timeText.className = 'segment-time';
        timeText.textContent = `${formatTime(segment.start)} ~ ${formatTime(segment.end)}`;

        header.append(titleWrap, timeText);

        const note = document.createElement('p');
        note.className = 'segment-note';
        note.textContent = segment.note || '작성된 메모가 없습니다.';

        card.append(header, note);

        if (segment.tag) {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = `#${segment.tag}`;
            card.appendChild(tag);
        }

        const actions = document.createElement('div');
        actions.className = 'segment-actions';

        const jumpButton = document.createElement('button');
        jumpButton.className = 'success';
        jumpButton.textContent = '재생';
        jumpButton.addEventListener('click', () => {
            if (Number.isFinite(segment.start)) {
                video.currentTime = segment.start;
                video.play();
            }
        });

        const editButton = document.createElement('button');
        editButton.className = 'ghost';
        editButton.textContent = '수정';
        editButton.addEventListener('click', () => startEditing(segment.id));

        const deleteButton = document.createElement('button');
        deleteButton.className = 'danger';
        deleteButton.textContent = '삭제';
        deleteButton.addEventListener('click', () => {
            if (!confirm('이 구간 메모를 삭제할까요?')) return;
            segments = segments.filter(item => item.id !== segment.id);
            finishEditing();
            renderAll();
        });

        actions.append(jumpButton, editButton, deleteButton);
        card.appendChild(actions);

        fragment.appendChild(card);
    });

    segmentsList.appendChild(fragment);
}

function renderAll() {
    segments.sort((a, b) => a.start - b.start);
    renderTimeline();
    renderSegments(searchInput.value);
    renderPremiereTimeline();
    saveToLocalStorage();
}

function startEditing(id) {
    const segment = segments.find(item => item.id === id);
    if (!segment) return;
    editingId = id;
    segmentTitle.value = segment.title;
    startTimeInput.value = formatTime(segment.start);
    endTimeInput.value = formatTime(segment.end);
    segmentTag.value = segment.tag || '';
    segmentColor.value = segment.color;
    segmentNote.value = segment.note || '';
    saveButton.textContent = '수정 저장';
    cancelEditButton.style.display = 'inline-block';

    // 자동으로 메모 입력 탭으로 전환
    setActiveTab('editor');
}

function finishEditing() {
    editingId = null;
    saveButton.textContent = '메모 추가';
    cancelEditButton.style.display = 'none';
    resetForm();
}

function resetForm() {
    const shouldClearTitle = localStorage.getItem(STORAGE_CLEAR_TITLE) === 'true';
    const shouldClearTag = localStorage.getItem(STORAGE_CLEAR_TAG) === 'true';

    if (shouldClearTitle) {
        segmentTitle.value = '';
    }
    if (shouldClearTag) {
        segmentTag.value = '';
    }
    segmentNote.value = '';
    const defaultColor = localStorage.getItem(STORAGE_DEFAULT_COLOR) || DEFAULT_SEGMENT_COLOR;
    segmentColor.value = defaultColor;
    if (Number.isFinite(video.currentTime)) {
        const formatted = formatTime(video.currentTime);
        startTimeInput.value = formatted;
        endTimeInput.value = formatTime(video.currentTime + 10);
    } else {
        startTimeInput.value = '';
        endTimeInput.value = '';
    }
}

function showFormStatus(message) {
    formStatus.textContent = message;
    formStatus.style.display = 'inline';
    setTimeout(() => {
        formStatus.style.display = 'none';
    }, 1600);
}

function gatherFormData() {
    const start = parseTimeInput(startTimeInput.value);
    const end = parseTimeInput(endTimeInput.value);

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        alert('시작/종료 시간을 올바르게 입력해주세요. (예: 1:20 또는 80)');
        return null;
    }
    if (end <= start) {
        alert('종료 시간은 시작 시간보다 커야 합니다.');
        return null;
    }
    if (totalDuration > 0 && end > totalDuration + 0.2) {
        if (!confirm('영상 길이를 초과하는 메모입니다. 그대로 저장할까요?')) {
            return null;
        }
    }

    return {
        id: editingId ?? crypto.randomUUID(),
        title: segmentTitle.value.trim(),
        start,
        end,
        tag: segmentTag.value.trim(),
        color: segmentColor.value,
        note: segmentNote.value.trim(),
    };
}

function saveSegment() {
    const data = gatherFormData();
    if (!data) return;
    if (editingId) {
        segments = segments.map(item => (item.id === editingId ? normalizeSegment({ ...item, ...data }) : item));
        showFormStatus('수정 완료');
    } else {
        segments.push(normalizeSegment(data));
        showFormStatus('메모 추가 완료');
    }
    finishEditing();
    renderAll();
}

function copyNotes() {
    if (segments.length === 0) {
        alert('복사할 메모가 없습니다.');
        return;
    }
    const text = segments.map(segment => {
        const parts = [
            `▶ ${segment.title || '제목 없음'}`,
            `시간: ${formatTime(segment.start)} ~ ${formatTime(segment.end)}`,
            segment.tag ? `태그: #${segment.tag}` : '',
            segment.note ? `메모: ${segment.note}` : '',
        ].filter(Boolean);
        return parts.join('\n');
    }).join('\n\n');

    const temp = document.createElement('textarea');
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    try {
        document.execCommand('copy');
        showFormStatus('메모 복사 완료');
    } catch (err) {
        alert('클립보드 복사에 실패했습니다. 수동으로 선택 후 복사해주세요.');
    }
    document.body.removeChild(temp);
}

function exportTxt() {
    if (segments.length === 0) {
        alert('저장할 메모가 없습니다.');
        return;
    }
    const lines = segments.map(segment => {
        const timeline = `${formatTime(segment.start)} ~ ${formatTime(segment.end)}`;
        const tag = segment.tag ? `#${segment.tag}` : '태그 없음';
        const title = segment.title || '제목 없음';
        const note = segment.note || '메모 없음';
        return [timeline, tag, title, note].join(' - ');
    }).join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getBaseFileName()}_타임라인.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportJson() {
    if (segments.length === 0) {
        alert('저장할 메모가 없습니다.');
        return;
    }
    const payload = {
        exportedAt: new Date().toISOString(),
        duration: totalDuration,
        videoName: selectedFileName,
        segments,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getBaseFileName()}_타임라인.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = event => {
        try {
            const payload = JSON.parse(event.target.result);
            const importedSegments = Array.isArray(payload.segments) ? payload.segments : [];
            segments = importedSegments
                .map(normalizeSegment)
                .filter(segment => Number.isFinite(segment.start) && Number.isFinite(segment.end));
            if (typeof payload.duration === 'number' && Number.isFinite(payload.duration)) {
                totalDuration = payload.duration;
            }
            if (typeof payload.videoName === 'string' && payload.videoName.trim()) {
                selectedFileName = payload.videoName.trim();
                fileNameText.textContent = selectedFileName;
                fileDetailsText.textContent = totalDuration > 0
                    ? `길이 ${formatTime(totalDuration)}`
                    : '-- MB';
                uploadCard.style.display = 'none';
                fileInfoCard.style.display = 'flex';
            }
            finishEditing();
            renderAll();
            showFormStatus('JSON 불러오기 완료');
        } catch (error) {
            console.error(error);
            alert('JSON 파일을 불러오는 중 오류가 발생했습니다.');
        }
    };
    reader.readAsText(file, 'utf-8');
}

function clearAll() {
    if (segments.length === 0) return;
    if (!confirm('등록된 모든 메모를 삭제할까요?')) return;
    segments = [];
    if (selectedFileName) {
        localStorage.removeItem(STORAGE_KEY_PREFIX + selectedFileName);
    }
    finishEditing();
    renderAll();
}

function getStorageKey(fileName) {
    return STORAGE_KEY_PREFIX + fileName;
}

function saveToLocalStorage() {
    if (!selectedFileName) return;

    try {
        const data = {
            segments,
            totalDuration,
            selectedFileName,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem(getStorageKey(selectedFileName), JSON.stringify(data));
        localStorage.setItem(STORAGE_RECENT_FILE, selectedFileName);
    } catch (error) {
        console.error('localStorage 저장 실패:', error);
    }
}

function loadFromLocalStorage(fileName) {
    if (!fileName) return false;

    try {
        const stored = localStorage.getItem(getStorageKey(fileName));
        if (!stored) return false;

        const data = JSON.parse(stored);

        // 세그먼트 데이터 복원
        if (Array.isArray(data.segments)) {
            segments = data.segments
                .map(normalizeSegment)
                .filter(segment => Number.isFinite(segment.start) && Number.isFinite(segment.end));
        }

        // 영상 정보 복원
        if (typeof data.totalDuration === 'number' && Number.isFinite(data.totalDuration)) {
            totalDuration = data.totalDuration;
        }

        renderAll();

        if (segments.length > 0) {
            showFormStatus(`저장된 타임라인 ${segments.length}개 불러왔습니다`);
        }

        return true;
    } catch (error) {
        console.error('localStorage 불러오기 실패:', error);
        return false;
    }
}

function loadRecentFileInfo() {
    try {
        const recentFileName = localStorage.getItem(STORAGE_RECENT_FILE);
        if (!recentFileName) return;

        const stored = localStorage.getItem(getStorageKey(recentFileName));
        if (!stored) return;

        const data = JSON.parse(stored);

        selectedFileName = recentFileName;
        fileNameText.textContent = `${recentFileName} (영상 파일을 다시 선택해주세요)`;

        const durationText = data.totalDuration > 0 ? formatTime(data.totalDuration) : '--:--';
        fileDetailsText.textContent = `캐시된 타임라인 ${data.segments?.length || 0}개 · 길이 ${durationText}`;

        uploadCard.style.display = 'none';
        fileInfoCard.style.display = 'flex';

        // 타임라인 데이터는 불러오지만 영상은 없음
        loadFromLocalStorage(recentFileName);
    } catch (error) {
        console.error('최근 파일 정보 불러오기 실패:', error);
    }
}

function getAllCachedFiles() {
    const files = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                const fileName = key.replace(STORAGE_KEY_PREFIX, '');
                files.push({
                    fileName,
                    segmentsCount: data.segments?.length || 0,
                    savedAt: data.savedAt
                });
            } catch (error) {
                console.error('파일 정보 파싱 실패:', key, error);
            }
        }
    }
    return files;
}

function updateCacheInfo() {
    const files = getAllCachedFiles();
    const totalSegments = files.reduce((sum, file) => sum + file.segmentsCount, 0);

    document.getElementById('cachedFilesCount').textContent = `${files.length}개`;
    document.getElementById('totalSegmentsCount').textContent = `${totalSegments}개`;

    const filesList = document.getElementById('cachedFilesList');
    if (files.length === 0) {
        filesList.innerHTML = '<p style="text-align: center; color: var(--text-subtle); padding: 20px;">저장된 파일이 없습니다.</p>';
        return;
    }

    filesList.innerHTML = '<div class="cached-files-list"></div>';
    const listContainer = filesList.querySelector('.cached-files-list');

    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'cached-file-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'cached-file-name';
        nameSpan.textContent = file.fileName;

        const countSpan = document.createElement('span');
        countSpan.className = 'cached-file-count';
        countSpan.textContent = `${file.segmentsCount}개`;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'danger';
        deleteBtn.textContent = '삭제';
        deleteBtn.style.padding = '4px 12px';
        deleteBtn.style.fontSize = '0.85rem';
        deleteBtn.addEventListener('click', () => {
            if (confirm(`"${file.fileName}"의 타임라인 데이터를 삭제할까요?`)) {
                localStorage.removeItem(STORAGE_KEY_PREFIX + file.fileName);
                if (selectedFileName === file.fileName) {
                    segments = [];
                    renderAll();
                }
                updateCacheInfo();
                showFormStatus('캐시 삭제 완료');
            }
        });

        item.append(nameSpan, countSpan, deleteBtn);
        listContainer.appendChild(item);
    });
}

function openSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('is-open');
    updateCacheInfo();
    loadDefaultSettings();
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('is-open');
}

function clearCurrentCache() {
    if (!selectedFileName) {
        alert('현재 선택된 영상이 없습니다.');
        return;
    }
    if (confirm(`"${selectedFileName}"의 타임라인 데이터를 삭제할까요?`)) {
        localStorage.removeItem(STORAGE_KEY_PREFIX + selectedFileName);
        segments = [];
        selectedFileName = '';
        uploadCard.style.display = 'block';
        fileInfoCard.style.display = 'none';
        renderAll();
        updateCacheInfo();
        showFormStatus('현재 영상 캐시 삭제 완료');
    }
}

function clearAllCache() {
    const files = getAllCachedFiles();
    if (files.length === 0) {
        alert('삭제할 캐시가 없습니다.');
        return;
    }
    if (confirm(`전체 ${files.length}개 영상의 타임라인 데이터를 모두 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`)) {
        files.forEach(file => {
            localStorage.removeItem(STORAGE_KEY_PREFIX + file.fileName);
        });
        localStorage.removeItem(STORAGE_RECENT_FILE);
        segments = [];
        selectedFileName = '';
        uploadCard.style.display = 'block';
        fileInfoCard.style.display = 'none';
        renderAll();
        updateCacheInfo();
        showFormStatus('전체 캐시 삭제 완료');
    }
}

function loadDefaultSettings() {
    const defaultColor = localStorage.getItem(STORAGE_DEFAULT_COLOR) || DEFAULT_SEGMENT_COLOR;
    document.getElementById('defaultColorSetting').value = defaultColor;
    segmentColor.value = defaultColor;

    const clearTitle = localStorage.getItem(STORAGE_CLEAR_TITLE) === 'true';
    const clearTag = localStorage.getItem(STORAGE_CLEAR_TAG) === 'true';
    document.getElementById('clearTitleToggle').checked = clearTitle;
    document.getElementById('clearTagToggle').checked = clearTag;

    const fullscreenSelect = document.getElementById('fullscreenModeSetting');
    if (fullscreenSelect) {
        fullscreenSelect.value = getFullscreenMode();
    }

    const designSelect = document.getElementById('designSelect');
    if (designSelect) {
        designSelect.value = getDesign();
    }

    const faststartToggle = document.getElementById('faststartToggle');
    if (faststartToggle) {
        faststartToggle.checked = getAutoFaststart();
    }

    syncPwaUi();
}

function syncPwaUi() {
    const section = document.getElementById('pwaSection');
    const status = document.getElementById('pwaModeStatus');
    const toggle = document.getElementById('pwaHintToggle');
    if (!section) return;

    const standalone = isInStandalone();
    const hintEnabled = isPwaHintEnabled();

    if (status) {
        status.textContent = standalone ? 'PWA (홈 화면 앱)' : '브라우저';
        status.style.color = standalone ? 'var(--success)' : 'var(--accent)';
    }
    if (toggle) {
        toggle.checked = hintEnabled;
    }
    section.classList.toggle('is-disabled', !hintEnabled);
}

function toggleClearTitle(enabled) {
    localStorage.setItem(STORAGE_CLEAR_TITLE, enabled ? 'true' : 'false');
}

function toggleClearTag(enabled) {
    localStorage.setItem(STORAGE_CLEAR_TAG, enabled ? 'true' : 'false');
}

function saveDefaultColor(color) {
    localStorage.setItem(STORAGE_DEFAULT_COLOR, color);
    segmentColor.value = color;
    showFormStatus('기본 색상 저장 완료');
}

function resetDefaultColor() {
    localStorage.removeItem(STORAGE_DEFAULT_COLOR);
    document.getElementById('defaultColorSetting').value = DEFAULT_SEGMENT_COLOR;
    segmentColor.value = DEFAULT_SEGMENT_COLOR;
    showFormStatus('기본 색상 초기화 완료');
}

function toggleDarkMode(enabled) {
    if (enabled) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(STORAGE_DARK_MODE, 'true');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(STORAGE_DARK_MODE, 'false');
    }
}

function loadDarkMode() {
    const darkMode = localStorage.getItem(STORAGE_DARK_MODE) === 'true';
    document.getElementById('darkModeToggle').checked = darkMode;
    if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

// =====================================================================
// faststart 자동 적용 (MP4 컨테이너 재인덱싱)
// 원본 파일은 절대 수정되지 않음. 메모리에서 moov만 보정 후
// 가상의 blob([ftyp][새 moov][중간][끝])을 video.src로 사용한다.
// =====================================================================

function getAutoFaststart() {
    const v = localStorage.getItem(STORAGE_FASTSTART_AUTO);
    return v === null ? true : v === 'true';
}

function setAutoFaststart(enabled) {
    localStorage.setItem(STORAGE_FASTSTART_AUTO, enabled ? 'true' : 'false');
}

function looksLikeMp4(file) {
    if (!file) return false;
    if (/\.(mp4|m4v|m4a|mov)$/i.test(file.name || '')) return true;
    if (/^video\/(mp4|quicktime|x-m4v)/i.test(file.type || '')) return true;
    return false;
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0MB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)}GB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function shouldSkipInBrowserFaststart(file) {
    // iPadOS Safari는 대용량 File 조각을 다시 합친 가상 Blob을 video.src로
    // 등록하는 단계에서 멈추거나 실패하는 경우가 있어, 큰 파일은 원본 URL만
    // 붙이고 외부 faststart/압축 변환을 안내한다.
    return isIOS() && file && file.size > IOS_IN_BROWSER_FASTSTART_MAX_BYTES;
}

function shouldDeferAutoPlay(file) {
    // iPadOS에서 11GB 같은 파일은 metadata 확인 전에 play()를 걸면
    // 불필요한 버퍼링/디코딩이 시작되어 더 빨리 실패할 수 있다.
    return isIOS() && file && file.size > LARGE_FILE_WARNING_BYTES;
}

// 단일 박스 헤더 파싱: [4B size][4B type][optional 8B large size]
function parseBoxHeader(view, offset) {
    if (offset + 8 > view.byteLength) return null;
    let size = view.getUint32(offset);
    const type = String.fromCharCode(
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
        view.getUint8(offset + 6),
        view.getUint8(offset + 7)
    );
    let headerSize = 8;
    if (size === 1) {
        if (offset + 16 > view.byteLength) return null;
        const high = view.getUint32(offset + 8);
        const low = view.getUint32(offset + 12);
        size = high * 0x100000000 + low;
        headerSize = 16;
    }
    return { size, type, headerSize, payloadOffset: offset + headerSize };
}

// 파일 최상위 박스 워킹: 각 박스 헤더(최대 16바이트)만 읽으므로 매우 빠름.
// 11GB 파일이라도 수십 바이트만 디스크에서 읽음.
async function walkTopLevelBoxes(file) {
    const boxes = [];
    let offset = 0;
    let safetyLimit = 200;
    while (offset < file.size && safetyLimit-- > 0) {
        const headBuf = await file.slice(offset, offset + 16).arrayBuffer();
        if (headBuf.byteLength < 8) break;
        const view = new DataView(headBuf);
        const box = parseBoxHeader(view, 0);
        if (!box) break;
        if (box.size === 0) {
            box.size = file.size - offset;
        }
        if (box.size < box.headerSize) break;
        boxes.push({
            type: box.type,
            fileOffset: offset,
            size: box.size,
            headerSize: box.headerSize
        });
        offset += box.size;
    }
    return boxes;
}

// 메모리에 올라온 box 안을 워킹 (재귀용)
const MP4_CONTAINER_TYPES = new Set([
    'moov', 'trak', 'edts', 'mdia', 'minf', 'dinf',
    'stbl', 'mvex', 'moof', 'traf', 'udta', 'sinf',
    'rinf', 'tref', 'iprp', 'ipco'
]);

function walkInsideBox(view, parentOffset, parentSize, callback) {
    let offset = parentOffset;
    const end = parentOffset + parentSize;
    let safetyLimit = 10000;
    while (offset + 8 <= end && safetyLimit-- > 0) {
        const box = parseBoxHeader(view, offset);
        if (!box) break;
        if (box.size === 0) box.size = end - offset;
        if (box.size < box.headerSize || offset + box.size > end) break;
        callback({
            type: box.type,
            offset,
            size: box.size,
            headerSize: box.headerSize,
            payloadOffset: box.payloadOffset,
            payloadSize: box.size - box.headerSize
        });
        offset += box.size;
    }
}

// moov 안의 stco(32bit) / co64(64bit) 청크 오프셋 테이블에 shift 더하기
function shiftMoovChunkOffsets(moovView, moovTotalSize, shift) {
    let stcoCount = 0;
    let co64Count = 0;
    function recurse(offset, size) {
        walkInsideBox(moovView, offset, size, (box) => {
            if (MP4_CONTAINER_TYPES.has(box.type)) {
                recurse(box.payloadOffset, box.payloadSize);
            } else if (box.type === 'stco') {
                const count = moovView.getUint32(box.payloadOffset + 4);
                for (let i = 0; i < count; i++) {
                    const p = box.payloadOffset + 8 + i * 4;
                    if (p + 4 > moovTotalSize) break;
                    moovView.setUint32(p, moovView.getUint32(p) + shift);
                }
                stcoCount += count;
            } else if (box.type === 'co64') {
                const count = moovView.getUint32(box.payloadOffset + 4);
                for (let i = 0; i < count; i++) {
                    const p = box.payloadOffset + 8 + i * 8;
                    if (p + 8 > moovTotalSize) break;
                    const high = moovView.getUint32(p);
                    const low = moovView.getUint32(p + 4);
                    const oldVal = high * 0x100000000 + low;
                    const newVal = oldVal + shift;
                    moovView.setUint32(p, Math.floor(newVal / 0x100000000));
                    moovView.setUint32(p + 4, newVal % 0x100000000);
                }
                co64Count += count;
            }
        });
    }
    // moov 박스 자체부터 시작 (header 8B 또는 16B 스킵해서 내부로)
    const rootBox = parseBoxHeader(moovView, 0);
    if (rootBox && rootBox.type === 'moov') {
        recurse(rootBox.payloadOffset, rootBox.size - rootBox.headerSize);
    }
    return { stco: stcoCount, co64: co64Count };
}

// faststart blob URL 생성. 필요 없거나 실패하면 null.
async function makeFaststartBlobUrl(file) {
    const boxes = await walkTopLevelBoxes(file);
    if (!boxes.length) return null;

    const ftyp = boxes.find(b => b.type === 'ftyp');
    const moov = boxes.find(b => b.type === 'moov');
    const mdat = boxes.find(b => b.type === 'mdat');
    if (!ftyp || !moov || !mdat) return null;
    if (ftyp.fileOffset !== 0) return null; // ftyp가 맨 앞에 없으면 비표준

    // 이미 faststart인지 (moov가 mdat보다 앞에 있음)
    if (moov.fileOffset < mdat.fileOffset) {
        return null;
    }

    // moov 크기 안전 한계 (메모리 보호)
    const maxMoovSize = isIOS() ? 250 * 1024 * 1024 : 1024 * 1024 * 1024;
    if (moov.size > maxMoovSize) {
        throw new Error(`moov atom이 너무 큽니다 (${(moov.size / 1024 / 1024).toFixed(0)}MB > ${(maxMoovSize / 1024 / 1024).toFixed(0)}MB)`);
    }

    // moov 메모리에 읽기
    const moovBlob = file.slice(moov.fileOffset, moov.fileOffset + moov.size);
    const moovBuffer = await moovBlob.arrayBuffer();
    if (moovBuffer.byteLength !== moov.size) {
        throw new Error('moov 읽기 크기 불일치');
    }
    const moovView = new DataView(moovBuffer);

    // moov가 새 위치(파일 앞)로 가면 mdat 등 모든 데이터가 moov.size만큼 뒤로 밀림
    const shift = moov.size;
    shiftMoovChunkOffsets(moovView, moov.size, shift);

    // 새 blob 구성: [ftyp 그대로] + [보정된 moov] + [ftyp~원래 moov 직전] + [원래 moov 직후~끝]
    // file.slice() 들은 데이터 복사 없이 참조만이므로 11GB여도 메모리 사용 거의 0
    const ftypEnd = ftyp.fileOffset + ftyp.size;
    const moovEnd = moov.fileOffset + moov.size;

    const parts = [
        file.slice(0, ftypEnd),
        moovBuffer,
        file.slice(ftypEnd, moov.fileOffset),
    ];
    if (moovEnd < file.size) {
        parts.push(file.slice(moovEnd));
    }

    const newBlob = new Blob(parts, { type: file.type || 'video/mp4' });
    return URL.createObjectURL(newBlob);
}

// faststart를 적용한 video URL을 반환. 실패/불필요 시 원본 blob URL.
async function getVideoBlobUrl(file) {
    if (!getAutoFaststart() || !looksLikeMp4(file)) {
        return { url: URL.createObjectURL(file), faststart: false };
    }
    if (shouldSkipInBrowserFaststart(file)) {
        setVideoLoadingStatus('ios-faststart-skipped', formatFileSize(file.size));
        return {
            url: URL.createObjectURL(file),
            faststart: false,
            status: 'ios-faststart-skipped'
        };
    }
    try {
        setVideoLoadingStatus('faststart-analyzing');
        const url = await makeFaststartBlobUrl(file);
        if (url) {
            setVideoLoadingStatus('ready');
            return { url, faststart: true };
        }
        // 이미 faststart거나 MP4가 아니거나 비표준 → 원본 사용
        setVideoLoadingStatus('ready');
        return { url: URL.createObjectURL(file), faststart: false };
    } catch (err) {
        console.warn('[faststart] failed, using original:', err);
        setVideoLoadingStatus('faststart-failed');
        return { url: URL.createObjectURL(file), faststart: false };
    }
}

// MP4 파일의 첫 부분을 읽어 moov atom이 앞쪽에 있는지(faststart) 확인.
// 결과: { faststart: boolean, ftyp: string|null, scannedBytes: number }
async function probeMp4Faststart(file) {
    const result = { faststart: false, ftyp: null, scannedBytes: 0 };
    try {
        const probeSize = Math.min(file.size, 1024 * 1024); // 첫 1MB
        const blob = file.slice(0, probeSize);
        const buf = await blob.arrayBuffer();
        const view = new DataView(buf);
        let pos = 0;
        while (pos + 8 <= buf.byteLength) {
            const size = view.getUint32(pos);
            const type = String.fromCharCode(
                view.getUint8(pos + 4),
                view.getUint8(pos + 5),
                view.getUint8(pos + 6),
                view.getUint8(pos + 7)
            );
            if (type === 'ftyp') {
                const major = String.fromCharCode(
                    view.getUint8(pos + 8),
                    view.getUint8(pos + 9),
                    view.getUint8(pos + 10),
                    view.getUint8(pos + 11)
                );
                result.ftyp = major;
            }
            if (type === 'moov') {
                result.faststart = true;
                result.scannedBytes = pos;
                return result;
            }
            if (type === 'mdat') {
                // moov 전에 mdat이 나타나면 non-faststart
                result.scannedBytes = pos;
                return result;
            }
            if (size === 0) break;
            if (size === 1) {
                // 64-bit large size
                const high = view.getUint32(pos + 8);
                const low = view.getUint32(pos + 12);
                const big = high * 0x100000000 + low;
                if (!Number.isFinite(big) || big <= 0) break;
                pos += big;
            } else if (size < 8) {
                break;
            } else {
                pos += size;
            }
            result.scannedBytes = pos;
        }
    } catch (err) {
        // 읽기 실패는 무시 (네트워크/권한 등)
    }
    return result;
}

function isIOS() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    // iPadOS 13+에서는 UA가 Mac으로 보고되지만 터치가 있다
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
    return false;
}

function setVideoLoadingStatus(state, extra = '') {
    if (!videoLoadingStatus) return;
    videoLoadingStatus.dataset.state = state || '';
    videoLoadingStatus.classList.remove('is-warning', 'is-error');
    switch (state) {
        case 'faststart-analyzing':
            videoLoadingStatus.textContent = 'faststart 분석 중... (파일 끝의 moov atom 위치 확인)';
            break;
        case 'faststart-applied':
            videoLoadingStatus.textContent = '✅ faststart 적용됨 (메모리 안에서만, 원본 파일은 그대로)';
            break;
        case 'faststart-failed':
            videoLoadingStatus.textContent = '⚠️ faststart 적용 실패 — 원본으로 재시도합니다.';
            videoLoadingStatus.classList.add('is-warning');
            break;
        case 'loading':
            videoLoadingStatus.textContent = '영상 메타데이터 불러오는 중...';
            break;
        case 'slow':
            videoLoadingStatus.textContent = '⚠️ 영상이 너무 큽니다. MP4의 메타데이터(moov atom)가 파일 끝에 있을 경우 브라우저가 전체 파일을 스캔해야 해서 매우 느리거나 실패할 수 있습니다. faststart로 변환된 MP4를 권장합니다.';
            videoLoadingStatus.classList.add('is-warning');
            break;
        case 'large-file':
            videoLoadingStatus.textContent = `⚠️ ${extra} - 큰 파일은 메타데이터 위치(moov atom)에 따라 로딩이 매우 느릴 수 있습니다.`;
            videoLoadingStatus.classList.add('is-warning');
            break;
        case 'ios-faststart-skipped':
            videoLoadingStatus.textContent = `⚠️ ${extra} 영상은 iPad에서는 브라우저 안에서 faststart를 가상 적용하지 않습니다. 파일은 등록했지만, 재생이 안 되면 데스크톱에서 H.264/AAC MP4 + -movflags +faststart로 변환하거나 2GB 이하로 분할해주세요.`;
            videoLoadingStatus.classList.add('is-warning');
            break;
        case 'ios-warning':
            videoLoadingStatus.textContent = `⚠️ ${extra} iPad/iPhone Safari는 4GB가 넘는 영상이나 moov atom이 끝에 있는 MP4를 처리하지 못할 수 있습니다. 데스크톱에서 faststart로 변환하거나 파일을 분할해주세요.`;
            videoLoadingStatus.classList.add('is-warning');
            break;
        case 'error':
            if (isIOS()) {
                videoLoadingStatus.textContent = '⚠️ iPad/iPhone에서 이 영상을 불러올 수 없습니다. 가능한 원인: ① 파일 크기가 Safari 한도(약 2~4GB)를 초과 ② MP4의 moov atom이 파일 끝에 있어 메모리가 부족 ③ HEVC/H.265 등 미지원 코덱. 데스크톱에서 \"-movflags +faststart\" 옵션으로 H.264 MP4로 변환하거나 파일을 분할해서 다시 시도해주세요.';
            } else {
                videoLoadingStatus.textContent = '⚠️ 영상을 불러오지 못했습니다. 파일이 너무 크거나 브라우저가 지원하지 않는 형식일 수 있습니다.';
            }
            videoLoadingStatus.classList.add('is-error');
            break;
        case 'ready':
        default:
            videoLoadingStatus.textContent = '';
            break;
    }
}

function initVideoEvents() {
    video.addEventListener('loadstart', () => {
        clearTimeout(videoLoadingTimer);
        const keepCurrentStatus = videoLoadingStatus?.dataset.state === 'ios-faststart-skipped';
        if (video.src) {
            showVideoLoadingProgress();
        }
        if (keepCurrentStatus) {
            return;
        }
        if (selectedFileSize > LARGE_FILE_WARNING_BYTES) {
            const sizeText = `${(selectedFileSize / (1024 * 1024 * 1024)).toFixed(1)} GB`;
            setVideoLoadingStatus('large-file', sizeText);
            videoLoadingTimer = setTimeout(() => {
                setVideoLoadingStatus('slow');
            }, SLOW_LOAD_THRESHOLD_MS);
        } else if (video.src) {
            setVideoLoadingStatus('loading');
        }
    });

    video.addEventListener('progress', updateVideoLoadingProgress);

    video.addEventListener('loadedmetadata', () => {
        clearTimeout(videoLoadingTimer);
        setVideoLoadingStatus('ready');
        totalDuration = Number.isFinite(video.duration) ? video.duration : 0;
        setTimeBadge();
        // Premiere 타임라인은 처음 로드 시 자동 fit (전체 영상이 보이도록)
        autoFitPremiereTimeline();
        renderTimeline();
        renderPremiereTimeline();
        resetForm();
        refreshFileDetails();
        updateVideoAspectFromMetadata();
        updateVideoLoadingProgress();
    });

    video.addEventListener('loadeddata', () => {
        captureVideoThumbnail();
    });

    video.addEventListener('canplay', () => {
        updateVideoLoadingProgress();
        // 재생 가능 상태가 되면 진행률 UI를 숨김
        setTimeout(hideVideoLoadingProgress, 400);
    });

    video.addEventListener('error', () => {
        clearTimeout(videoLoadingTimer);
        hideVideoLoadingProgress();
        // faststart로 변환한 영상이 실패하면 원본으로 한 번 재시도
        if (currentLoadedFaststartActive && currentLoadedFile) {
            console.warn('[faststart] video error, retrying with original file');
            currentLoadedFaststartActive = false;
            const fallback = currentLoadedFile;
            if (currentVideoUrl) URL.revokeObjectURL(currentVideoUrl);
            currentVideoUrl = URL.createObjectURL(fallback);
            video.src = currentVideoUrl;
            video.load();
            setVideoLoadingStatus('faststart-failed');
            return;
        }
        setVideoLoadingStatus('error');
    });

    // timeupdate는 재생 중 약 4–10Hz로 발화하고, 2배속에서는 더 잦다.
    // 핸들러마다 곧바로 DOM 작업을 하면 메인 쓰레드가 빈번히 점유돼
    // rate 변경 시 디코더 작업과 경쟁한다. rAF로 묶어 한 paint에 한 번만
    // 갱신해 같은 정보를 같은 비용으로 더 적은 부담으로 처리한다.
    let timeUpdateRafId = 0;
    function flushTimeUpdateUI() {
        timeUpdateRafId = 0;
        setTimeBadge();
        updatePremierePlayhead();
    }
    video.addEventListener('timeupdate', () => {
        if (timeUpdateRafId) return;
        timeUpdateRafId = requestAnimationFrame(flushTimeUpdateUI);
    });
    // 시킹/재개 직후에는 즉시 한 번 동기 갱신해 응답성 유지.
    video.addEventListener('seeked', () => {
        if (timeUpdateRafId) {
            cancelAnimationFrame(timeUpdateRafId);
            timeUpdateRafId = 0;
        }
        setTimeBadge();
        updatePremierePlayhead();
    });
}

function captureVideoThumbnail() {
    if (!fileThumbnailWrap || !fileThumbnailImg) return;
    if (!video.videoWidth || !video.videoHeight) {
        fileThumbnailWrap.hidden = true;
        return;
    }
    try {
        const canvas = document.createElement('canvas');
        const maxWidth = 480;
        const ratio = video.videoHeight / video.videoWidth;
        canvas.width = Math.min(maxWidth, video.videoWidth);
        canvas.height = Math.round(canvas.width * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        fileThumbnailImg.src = dataUrl;
        fileThumbnailWrap.style.setProperty('--thumbnail-aspect', `${video.videoWidth} / ${video.videoHeight}`);
        fileThumbnailWrap.hidden = false;
    } catch (err) {
        // 보안 정책으로 캡처 실패 시 무시
        fileThumbnailWrap.hidden = true;
    }
}

// CSS 확대 모드 전용 커스텀 컨트롤 바.
// 외부(setExpanded, handleZoneInteraction)에서 호출할 수 있도록 모듈 객체를 노출.
const customControls = {
    show: () => {},
    hide: () => {},
    toggle: () => {},
    isVisible: () => false,
};

function initCustomControls() {
    const bar = document.getElementById('customControlsBar');
    const playBtn = document.getElementById('customPlayPauseBtn');
    const scrubber = document.getElementById('customScrubber');
    const currentTimeEl = document.getElementById('customCurrentTime');
    const totalTimeEl = document.getElementById('customTotalTime');
    if (!bar || !playBtn || !scrubber || !currentTimeEl || !totalTimeEl) return;

    let isScrubbing = false;
    let hideTimer = null;
    const AUTO_HIDE_MS = 3000;

    function clearHideTimer() {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    }

    function scheduleAutoHide() {
        clearHideTimer();
        if (!video.paused && bar.classList.contains('is-visible') && !isScrubbing) {
            hideTimer = setTimeout(() => bar.classList.remove('is-visible'), AUTO_HIDE_MS);
        }
    }

    function show() {
        bar.classList.add('is-visible');
        scheduleAutoHide();
    }

    function hide() {
        bar.classList.remove('is-visible');
        clearHideTimer();
    }

    function toggle() {
        if (bar.classList.contains('is-visible')) hide();
        else show();
    }

    function isVisible() {
        return bar.classList.contains('is-visible');
    }

    function syncPlayState() {
        bar.classList.toggle('is-playing', !video.paused);
    }

    // dur과 totalTime 텍스트는 거의 변하지 않아 캐시.
    let syncCachedDuration = NaN;
    let syncCachedTotalText = '--:--';
    let syncLastCurText = '';
    function syncTime() {
        if (isScrubbing) return;
        const cur = Number.isFinite(video.currentTime) ? video.currentTime : 0;
        const dur = Number.isFinite(video.duration) ? video.duration : 0;
        if (syncCachedDuration !== dur) {
            syncCachedDuration = dur;
            syncCachedTotalText = dur > 0 ? formatTime(dur) : '--:--';
            totalTimeEl.textContent = syncCachedTotalText;
            if (dur > 0) scrubber.max = String(dur);
        }
        const curText = formatTime(cur);
        if (curText !== syncLastCurText) {
            syncLastCurText = curText;
            currentTimeEl.textContent = curText;
        }
        scrubber.value = String(cur);
    }
    // timeupdate에서 호출되는 syncTime을 rAF로 배치 — 메인 쓰레드 부담 분산.
    let syncTimeRafId = 0;
    function scheduleSyncTime() {
        if (syncTimeRafId) return;
        syncTimeRafId = requestAnimationFrame(() => {
            syncTimeRafId = 0;
            syncTime();
        });
    }

    playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!video.src) return;
        if (video.paused) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
        scheduleAutoHide();
    });

    scrubber.addEventListener('pointerdown', () => {
        isScrubbing = true;
        clearHideTimer();
    });
    scrubber.addEventListener('input', () => {
        const val = parseFloat(scrubber.value);
        if (Number.isFinite(val)) {
            currentTimeEl.textContent = formatTime(val);
        }
    });
    scrubber.addEventListener('change', () => {
        const val = parseFloat(scrubber.value);
        if (Number.isFinite(val)) {
            video.currentTime = val;
        }
        isScrubbing = false;
        scheduleAutoHide();
    });
    scrubber.addEventListener('pointerup', () => {
        // change 이벤트가 안 온 경우 대비
        isScrubbing = false;
        scheduleAutoHide();
    });

    video.addEventListener('play', () => { syncPlayState(); scheduleAutoHide(); });
    video.addEventListener('pause', () => { syncPlayState(); clearHideTimer(); });
    video.addEventListener('timeupdate', scheduleSyncTime);
    video.addEventListener('durationchange', syncTime);
    video.addEventListener('loadedmetadata', syncTime);
    // 시킹/일시정지 등 응답성이 중요한 시점에는 즉시 동기화.
    video.addEventListener('seeked', () => {
        if (syncTimeRafId) { cancelAnimationFrame(syncTimeRafId); syncTimeRafId = 0; }
        syncTime();
    });

    customControls.show = show;
    customControls.hide = hide;
    customControls.toggle = toggle;
    customControls.isVisible = isVisible;

    syncPlayState();
    syncTime();
}

function initFullscreen() {
    if (!fullscreenButton) return;

    // 두 가지 모드 지원:
    // - 'expand' (기본): CSS로 videoFrame을 viewport 전체에 고정. DOM/리스너가
    //   그대로 유지되어 더블탭/롱프레스 제스처가 그대로 동작. iPad에서 권장.
    // - 'native': 표준 Fullscreen API + iOS webkitEnterFullscreen 폴백. OS 레벨
    //   풀스크린이지만 iPad/iPhone에서는 시스템 컨트롤 레이어가 터치를 가로채
    //   커스텀 제스처가 비활성화됨.

    function isExpanded() {
        return videoFrame.classList.contains('is-expanded');
    }

    function isInNativeFullscreen() {
        return !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            video.webkitDisplayingFullscreen
        );
    }

    function setExpanded(expanded) {
        videoFrame.classList.toggle('is-expanded', expanded);
        document.body.classList.toggle('is-video-expanded', expanded);
        if (expanded) {
            // 확대 모드: 네이티브 컨트롤(중앙 ▶ + 디밍 + PiP/AirPlay/풀스크린 버튼)을
            // 모두 끄고 우리가 만든 커스텀 바만 사용.
            video.removeAttribute('controls');
            customControls.hide();
        } else {
            // 일반 모드: 네이티브 컨트롤 복원, 커스텀 바 숨김
            video.setAttribute('controls', '');
            customControls.hide();
        }
        syncButtonState();
    }

    function enterNativeFullscreen() {
        // iOS에서 표준 Fullscreen API가 지원되지 않을 때만 비디오 자체로 진입
        if (typeof video.webkitEnterFullscreen === 'function' && !document.fullscreenEnabled) {
            try {
                video.webkitEnterFullscreen();
                return;
            } catch (_) {}
        }
        const target = videoFrame;
        if (target.requestFullscreen) {
            target.requestFullscreen().catch(() => {
                if (typeof video.webkitEnterFullscreen === 'function') {
                    try { video.webkitEnterFullscreen(); } catch (_) {}
                }
            });
        } else if (target.webkitRequestFullscreen) {
            target.webkitRequestFullscreen();
        } else if (typeof video.webkitEnterFullscreen === 'function') {
            try { video.webkitEnterFullscreen(); } catch (_) {}
        }
    }

    function exitNativeFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (typeof video.webkitExitFullscreen === 'function') {
            try { video.webkitExitFullscreen(); } catch (_) {}
        }
    }

    function syncButtonState() {
        const active = isExpanded() || isInNativeFullscreen();
        fullscreenButton.classList.toggle('is-fullscreen', active);
        fullscreenButton.setAttribute('aria-label', active ? '전체화면 종료' : '전체화면 보기');
    }

    fullscreenButton.addEventListener('click', () => {
        if (!video.src) return;
        if (isExpanded()) {
            setExpanded(false);
            return;
        }
        if (isInNativeFullscreen()) {
            exitNativeFullscreen();
            return;
        }
        if (getFullscreenMode() === 'native') {
            enterNativeFullscreen();
        } else {
            setExpanded(true);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isExpanded()) {
            setExpanded(false);
        }
    });

    document.addEventListener('fullscreenchange', syncButtonState);
    document.addEventListener('webkitfullscreenchange', syncButtonState);
    video.addEventListener('webkitbeginfullscreen', syncButtonState);
    video.addEventListener('webkitendfullscreen', syncButtonState);
}

function initGestures() {
    const overlay = document.getElementById('gestureOverlay');
    const indicator = document.getElementById('gestureIndicator');
    const speedIndicator = document.getElementById('speedIndicator');
    const zones = overlay.querySelectorAll('.gesture-zone');

    if (!overlay) return;

    const DOUBLE_TAP_DELAY = 320;
    // 길게 누름 인식 시간. 더블탭(320ms)과 충돌하지 않으면서
    // "꾹 누르자마자 2배속" 체감을 빠르게 하기 위해 짧게 잡는다.
    const LONG_PRESS_DELAY = 360;
    const SEEK_SECONDS = 10;
    const SPEED_MULTIPLIER = 2;
    const RATE_RESTORE_DELAY = 140;

    let lastTapTime = 0;
    let lastTapZone = null;
    let singleTapTimer = null;
    let longPressTimer = null;
    let isLongPressing = false;
    let originalRate = 1;
    let wasPausedAtLongPressStart = false;
    let pressStartX = 0;
    let pressStartY = 0;
    let pressMoved = false;
    let indicatorTimer = null;
    const activePointers = new Set();
    let pendingRateRestoreTimer = null;

    function enablePitchPreservation() {
        // 브라우저별 음정 보존 플래그를 모두 켠다.
        // (Safari: webkitPreservesPitch, Firefox: mozPreservesPitch)
        const pitchProps = ['preservesPitch', 'webkitPreservesPitch', 'mozPreservesPitch'];
        pitchProps.forEach((prop) => {
            if (prop in video) {
                try { video[prop] = true; } catch (_) {}
            }
        });
    }

    // 초기/소스 변경 시마다 음정 보존 상태를 강제
    enablePitchPreservation();
    video.addEventListener('loadedmetadata', enablePitchPreservation);
    video.addEventListener('ratechange', enablePitchPreservation);

    function showIndicator(text, side) {
        if (!indicator) return;
        clearTimeout(indicatorTimer);
        indicator.textContent = text;
        indicator.classList.remove('is-left', 'is-right');
        indicator.classList.add(side === 'left' ? 'is-left' : 'is-right');
        indicator.classList.add('is-visible');
        indicatorTimer = setTimeout(() => {
            indicator.classList.remove('is-visible');
        }, 600);
    }

    function showSpeedIndicator() {
        if (!speedIndicator) return;
        speedIndicator.classList.add('is-active');
    }

    function hideSpeedIndicator() {
        if (!speedIndicator) return;
        speedIndicator.classList.remove('is-active');
    }

    function safeSeek(deltaSeconds) {
        if (!video.src || !Number.isFinite(video.currentTime)) return;
        const duration = Number.isFinite(video.duration) ? video.duration : totalDuration;
        let next = video.currentTime + deltaSeconds;
        if (Number.isFinite(duration) && duration > 0) {
            // iOS Safari가 정확히 duration으로 시킹되면 끝에서 멈추거나
            // 처음으로 되감기는 경우가 있어 살짝 안쪽으로 클램프.
            next = Math.min(Math.max(0, duration - 0.25), next);
        }
        next = Math.max(0, next);
        smoothSeekTo(next);
    }

    // 누적된 시킹이 서로 간섭하지 않도록 일관된 시킹 헬퍼.
    // fastSeek가 있으면 keyframe으로 빠르게 점프해 더 매끄럽다 (iOS Safari/Firefox 지원).
    function smoothSeekTo(target) {
        if (!Number.isFinite(target)) return;
        if (Math.abs(target - (video.currentTime || 0)) < 0.05) return;
        if (typeof video.fastSeek === 'function') {
            try { video.fastSeek(target); return; } catch (_) {}
        }
        video.currentTime = target;
    }

    function togglePlay() {
        if (!video.src) return;
        if (video.paused) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    }

    function toggleNativeControlsBar() {
        if (!video.src) return;
        if (video.hasAttribute('controls')) {
            video.removeAttribute('controls');
        } else {
            video.setAttribute('controls', '');
        }
    }

    function hideNativeControlsBar() {
        if (!video.src) return;
        if (video.hasAttribute('controls')) {
            video.removeAttribute('controls');
        }
    }

    function handleZoneInteraction(zone, clientX, clientY) {
        const now = Date.now();
        const isDoubleTap = (now - lastTapTime < DOUBLE_TAP_DELAY) && lastTapZone === zone;
        const isExpanded = videoFrame.classList.contains('is-expanded');

        if (isDoubleTap) {
            clearTimeout(singleTapTimer);
            singleTapTimer = null;
            lastTapTime = 0;
            lastTapZone = null;

            // 더블탭 시 어떤 모드든 컨트롤 바를 즉시 숨김
            if (isExpanded) {
                customControls.hide();
            } else {
                hideNativeControlsBar();
            }

            if (zone === 'left') {
                safeSeek(-SEEK_SECONDS);
                showIndicator(`-${SEEK_SECONDS}초`, 'left');
            } else {
                safeSeek(SEEK_SECONDS);
                showIndicator(`+${SEEK_SECONDS}초`, 'right');
            }
            return;
        }

        lastTapTime = now;
        lastTapZone = zone;
        clearTimeout(singleTapTimer);

        if (isExpanded) {
            // 확대 모드: 싱글탭은 커스텀 컨트롤 바 토글.
            // DOUBLE_TAP_DELAY 후에 발동시켜 더블탭 가능성을 우선 확인.
            singleTapTimer = setTimeout(() => {
                customControls.toggle();
                lastTapTime = 0;
                lastTapZone = null;
            }, DOUBLE_TAP_DELAY);
            return;
        }

        // 미확대 모드: 싱글탭은 네이티브 컨트롤 바(어두워지며 뜨는 iOS 기본 바)를
        // 토글. 재생/정지 토글은 하지 않는다 (네이티브 바의 재생 버튼으로 조작).
        singleTapTimer = setTimeout(() => {
            toggleNativeControlsBar();
            lastTapTime = 0;
            lastTapZone = null;
        }, DOUBLE_TAP_DELAY);
    }

    // rate 변경 시 브라우저(특히 iOS Safari)는 음 높이 유지(preservesPitch)를
    // 위해 오디오 리샘플러를 재구성하느라 짧게 멈춘다. 이 멈춤은 디코더 레벨이라
    // JS에서 직접 제거할 수 없어, 변경량을 최소화하는 것이 우리가 할 수 있는 최선.
    function setPlaybackRateIfChanged(newRate) {
        const current = video.playbackRate || 1;
        if (Math.abs(current - newRate) < 0.001) return true;
        try {
            video.playbackRate = newRate;
            return true;
        } catch (_) {
            return false;
        }
    }

    function cancelPendingRateRestore() {
        if (!pendingRateRestoreTimer) return;
        clearTimeout(pendingRateRestoreTimer);
        pendingRateRestoreTimer = null;
    }

    function startLongPress() {
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
            if (pressMoved) return;
            if (!video.src || !Number.isFinite(video.duration)) return;
            cancelPendingRateRestore();
            originalRate = video.playbackRate || 1;
            wasPausedAtLongPressStart = video.paused;
            // 가장 비싼 작업(rate 변경)을 가장 먼저, 다른 작업과 분리해 호출 —
            // 메인 쓰레드 정체로 인한 추가 지연을 줄임. 같은 rate이면 no-op.
            if (!setPlaybackRateIfChanged(SPEED_MULTIPLIER)) return;
            isLongPressing = true;
            // 사용자가 "활성화됨" 신호를 빠르게 받도록 시각 지시자는 즉시.
            showSpeedIndicator();
            if (video.paused) {
                video.play().catch(() => {});
            }
            if (navigator.vibrate) {
                // 진동은 메인 쓰레드 작업과 분리해 rate 적용 후에 호출.
                setTimeout(() => {
                    try { navigator.vibrate(30); } catch (_) {}
                }, 0);
            }
        }, LONG_PRESS_DELAY);
    }

    function endLongPress() {
        if (isLongPressing) {
            isLongPressing = false;
            hideSpeedIndicator();
            // 배속 시작 전에 일시정지 상태였다면 손을 떼는 순간 원 상태로 복원.
            if (wasPausedAtLongPressStart && !video.paused) {
                video.pause();
            }
            // 손을 떼자마자 바로 원복하지 않고 약간 지연시켜
            // 빠른 재-롱프레스 시 1x↔2x 재전환에 따른 끊김을 줄인다.
            cancelPendingRateRestore();
            pendingRateRestoreTimer = setTimeout(() => {
                requestAnimationFrame(() => {
                    setPlaybackRateIfChanged(originalRate || 1);
                    pendingRateRestoreTimer = null;
                });
            }, RATE_RESTORE_DELAY);
        }
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }

    function abortGestures() {
        clearTimeout(longPressTimer);
        clearTimeout(singleTapTimer);
        singleTapTimer = null;
        lastTapTime = 0;
        lastTapZone = null;
        pressMoved = true;
        if (isLongPressing) {
            endLongPress();
        }
    }

    zones.forEach(zone => {
        const zoneName = zone.dataset.zone;

        zone.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            activePointers.add(e.pointerId);
            // 두 손가락 이상 (핀치 줌 등) 감지 시 제스처 중단해 네이티브 동작에 양보
            if (activePointers.size > 1) {
                abortGestures();
                return;
            }
            pressStartX = e.clientX;
            pressStartY = e.clientY;
            pressMoved = false;
            try { zone.setPointerCapture(e.pointerId); } catch (_) {}
            // iOS Safari가 비디오 위 long-press를 자체 selection/callout 동작으로
            // 처리하면서 짧게 재생이 끊기는 케이스를 막기 위해 기본 동작을 차단.
            // (cancelable일 때만 호출 — passive 리스너로 등록된 경우 콘솔 경고 방지)
            if (e.cancelable) e.preventDefault();
            startLongPress();
        });

        zone.addEventListener('pointermove', (e) => {
            if (activePointers.size > 1) return;
            const dx = Math.abs(e.clientX - pressStartX);
            const dy = Math.abs(e.clientY - pressStartY);
            if (dx > 12 || dy > 12) {
                pressMoved = true;
                clearTimeout(longPressTimer);
            }
        });

        zone.addEventListener('pointerup', (e) => {
            try { zone.releasePointerCapture(e.pointerId); } catch (_) {}
            const wasMultiTouch = activePointers.size > 1;
            activePointers.delete(e.pointerId);
            if (wasMultiTouch) return;
            if (isLongPressing) {
                endLongPress();
                return;
            }
            clearTimeout(longPressTimer);
            if (pressMoved) return;
            handleZoneInteraction(zoneName, e.clientX, e.clientY);
        });

        zone.addEventListener('pointercancel', (e) => {
            activePointers.delete(e.pointerId);
            clearTimeout(longPressTimer);
            endLongPress();
        });

        zone.addEventListener('pointerleave', () => {
            if (!isLongPressing) {
                clearTimeout(longPressTimer);
            }
        });

        zone.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        zone.addEventListener('dblclick', (e) => {
            e.preventDefault();
        });

        // gesturestart는 사파리 핀치 제스처 — 발생 시 즉시 양보
        zone.addEventListener('gesturestart', () => {
            abortGestures();
        });
    });
}

function initControls() {
    document.querySelectorAll('[data-set-from-video]').forEach(button => {
        button.addEventListener('click', () => {
            const target = button.dataset.setFromVideo === 'start' ? startTimeInput : endTimeInput;
            target.value = formatTime(video.currentTime || 0);
        });
    });

    jumpBackButton.addEventListener('click', () => {
        video.currentTime = Math.max(0, (video.currentTime || 0) - 5);
    });

    jumpForwardButton.addEventListener('click', () => {
        if (!Number.isFinite(video.currentTime)) return;
        if (Number.isFinite(totalDuration) && totalDuration > 0) {
            video.currentTime = Math.min(totalDuration, video.currentTime + 5);
        } else {
            video.currentTime += 5;
        }
    });

    saveButton.addEventListener('click', saveSegment);
    cancelEditButton.addEventListener('click', () => {
        finishEditing();
        showFormStatus('초기화');
    });

    // 현재 장면 메모 추가 버튼
    document.getElementById('quickAddMemo').addEventListener('click', () => {
        if (!Number.isFinite(video.currentTime)) {
            alert('영상이 로드되지 않았습니다.');
            return;
        }

        const currentTime = video.currentTime;
        const endTime = currentTime + 5;

        const data = {
            id: crypto.randomUUID(),
            title: segmentTitle.value.trim() || '제목 없음',
            start: currentTime,
            end: Math.min(endTime, totalDuration > 0 ? totalDuration : endTime),
            tag: segmentTag.value.trim(),
            color: segmentColor.value,
            note: '',
        };

        segments.push(normalizeSegment(data));
        showFormStatus('현재 장면 메모 추가 완료');
        resetForm();
        renderAll();
    });

    let searchDebounceTimer = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => renderSegments(searchInput.value), 120);
    });
    copyNotesButton.addEventListener('click', copyNotes);
    exportTxtButton.addEventListener('click', exportTxt);
    exportJsonButton.addEventListener('click', exportJson);
    importJsonButton.addEventListener('click', () => importJsonInput.click());
    importJsonInput.addEventListener('change', event => {
        const file = event.target.files?.[0];
        if (!file) return;
        importJsonFile(file);
        importJsonInput.value = '';
    });
    clearAllButton.addEventListener('click', clearAll);
    changeVideoButton.addEventListener('click', () => videoInput.click());
    convertVideoButton.addEventListener('click', simulateConversion);
    tabButtons.forEach(button => {
        button.addEventListener('click', () => setActiveTab(button.dataset.tab));
    });

    videoInput.addEventListener('change', async event => {
        const file = event.target.files?.[0];
        if (!file) return;

        // 기존 영상과 다른 영상을 선택한 경우, 세그먼트 초기화 확인
        const isDifferentFile = selectedFileName && selectedFileName !== file.name;
        if (isDifferentFile && segments.length > 0) {
            if (!confirm(`다른 영상을 선택하셨습니다. "${selectedFileName}"의 타임라인을 저장하고 "${file.name}"의 타임라인을 불러올까요?`)) {
                videoInput.value = '';
                return;
            }
        }

        updateFileInfo(file);

        // 해당 파일의 타임라인은 영상 URL 생성 성공 여부와 분리해서 먼저 등록한다.
        const loaded = loadFromLocalStorage(file.name);
        if (!loaded) {
            segments = [];
            totalDuration = 0;
            renderAll();
        }

        // iOS에서 큰 파일이거나 MP4의 moov atom이 끝에 있을 가능성이 있다면 미리 경고
        // (faststart 자동 적용이 꺼진 경우에만 경고만 출력)
        if (isIOS() && !getAutoFaststart() && /\.mp4$|\.m4v$|\.mov$/i.test(file.name)) {
            const probe = await probeMp4Faststart(file);
            const sizeGb = file.size / (1024 * 1024 * 1024);
            const reasons = [];
            if (sizeGb > 4) reasons.push(`${sizeGb.toFixed(1)}GB 파일`);
            if (!probe.faststart) reasons.push('moov atom이 파일 앞쪽에 없음');
            if (reasons.length > 0) {
                setVideoLoadingStatus('ios-warning', reasons.join(', ') + '.');
            }
        }

        // 다음 비디오 에러 발생 시 원본으로 fallback 가능하도록 파일 보관
        currentLoadedFile = file;

        try {
            // faststart 적용된 URL 또는 원본 URL을 받음
            const { url, faststart, status } = await getVideoBlobUrl(file);
            currentLoadedFaststartActive = faststart;
            if (currentVideoUrl) {
                URL.revokeObjectURL(currentVideoUrl);
            }
            currentVideoUrl = url;
            video.src = url;
            video.load();
            if (faststart) {
                setVideoLoadingStatus('faststart-applied');
            } else if (status === 'ios-faststart-skipped') {
                // video.load()의 loadstart가 큰 파일 일반 경고로 덮어쓸 수 있어
                // iPad 전용 안내를 다시 표시한다.
                setVideoLoadingStatus('ios-faststart-skipped', formatFileSize(file.size));
            }

            if (!shouldDeferAutoPlay(file)) {
                const playPromise = video.play();
                if (playPromise && typeof playPromise.then === 'function') {
                    playPromise.catch(() => {
                        // iOS/iPadOS에서는 사용자 제스처 후에도 재생이 막힐 수 있음 - 컨트롤로 직접 시작 가능
                    });
                }
            }
        } catch (err) {
            console.error('영상 URL 생성 실패:', err);
            currentLoadedFaststartActive = false;
            currentLoadedFile = null;
            setVideoLoadingStatus('error');
        } finally {
            videoInput.value = '';
        }
    });

    setActiveTab('editor');
}

function initSettings() {
    const settingsButton = document.getElementById('settingsButton');
    const closeSettingsButton = document.getElementById('closeSettings');
    const settingsModal = document.getElementById('settingsModal');
    const clearCurrentCacheButton = document.getElementById('clearCurrentCache');
    const clearAllCacheButton = document.getElementById('clearAllCache');
    const defaultColorSetting = document.getElementById('defaultColorSetting');
    const resetDefaultColorButton = document.getElementById('resetDefaultColor');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const clearTitleToggle = document.getElementById('clearTitleToggle');
    const clearTagToggle = document.getElementById('clearTagToggle');
    const fullscreenModeSelect = document.getElementById('fullscreenModeSetting');

    settingsButton.addEventListener('click', openSettings);
    closeSettingsButton.addEventListener('click', closeSettings);

    // 모달 배경 클릭 시 닫기
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettings();
        }
    });

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsModal.classList.contains('is-open')) {
            closeSettings();
        }
    });

    clearCurrentCacheButton.addEventListener('click', clearCurrentCache);
    clearAllCacheButton.addEventListener('click', clearAllCache);
    defaultColorSetting.addEventListener('change', (e) => saveDefaultColor(e.target.value));
    resetDefaultColorButton.addEventListener('click', resetDefaultColor);
    darkModeToggle.addEventListener('change', (e) => toggleDarkMode(e.target.checked));
    clearTitleToggle.addEventListener('change', (e) => toggleClearTitle(e.target.checked));
    clearTagToggle.addEventListener('change', (e) => toggleClearTag(e.target.checked));
    if (fullscreenModeSelect) {
        fullscreenModeSelect.addEventListener('change', (e) => {
            setFullscreenMode(e.target.value);
            showFormStatus('전체화면 방식 저장됨');
        });
    }

    const designSelect = document.getElementById('designSelect');
    if (designSelect) {
        designSelect.addEventListener('change', (e) => {
            setDesign(e.target.value);
            showFormStatus('디자인 변경됨');
        });
    }

    const faststartToggle = document.getElementById('faststartToggle');
    if (faststartToggle) {
        faststartToggle.addEventListener('change', (e) => {
            setAutoFaststart(e.target.checked);
            showFormStatus(e.target.checked ? 'faststart 자동 적용 켜짐' : 'faststart 자동 적용 꺼짐');
        });
    }

    const pwaHintToggle = document.getElementById('pwaHintToggle');
    const showInstallGuideButton = document.getElementById('showInstallGuide');
    const installGuide = document.getElementById('installGuide');

    if (pwaHintToggle) {
        pwaHintToggle.addEventListener('change', (e) => {
            setPwaHintEnabled(e.target.checked);
            syncPwaUi();
            showFormStatus(e.target.checked ? 'PWA 안내 사용' : 'PWA 안내 끔');
        });
    }
    if (showInstallGuideButton && installGuide) {
        showInstallGuideButton.addEventListener('click', () => {
            const isVisible = !installGuide.hasAttribute('hidden');
            if (isVisible) {
                installGuide.setAttribute('hidden', '');
                showInstallGuideButton.textContent = '설치 방법 보기';
            } else {
                installGuide.removeAttribute('hidden');
                showInstallGuideButton.textContent = '설치 방법 숨기기';
            }
        });
    }
    // 설치 모드 변화(예: 홈 화면 앱으로 다시 열림) 감지
    if (window.matchMedia) {
        const standaloneQuery = window.matchMedia('(display-mode: standalone)');
        const onChange = () => syncPwaUi();
        if (standaloneQuery.addEventListener) {
            standaloneQuery.addEventListener('change', onChange);
        } else if (standaloneQuery.addListener) {
            standaloneQuery.addListener(onChange);
        }
    }

    // 기본 색상 및 다크모드 불러오기
    loadDefaultSettings();
    loadDarkMode();
}

const STORAGE_PANEL_RATIO_TOP = 'timeline_panel_ratio_top';
const STORAGE_PANEL_RATIO_BOTTOM = 'timeline_panel_ratio_bottom';
const STORAGE_PANEL_RATIO_VERT = 'timeline_panel_ratio_vert';

applyDesign();
setVideoAspect();
resetForm();
initVideoEvents();
initControls();
initSettings();
initGestures();
initCustomControls();
initFullscreen();
initResizers();
initPremiereTimelineKeyboard();
loadRecentFileInfo();

function initPremiereTimelineKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (!isPremiereDesign()) return;
        // 텍스트 입력 중에는 단축키 무시
        const tag = (e.target?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
        // 모달 열려있으면 무시
        const modal = document.getElementById('settingsModal');
        if (modal && modal.classList.contains('is-open')) return;

        const view = document.getElementById('premiereTimelineView');
        if (!view) return;

        if (e.code === 'Space') {
            e.preventDefault();
            if (!video.src) return;
            if (video.paused) video.play().catch(() => {});
            else video.pause();
            return;
        }

        if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            premiereTimelineZoom = Math.min(PREMIERE_TIMELINE_ZOOM_MAX, premiereTimelineZoom * 1.5);
            if (view._setZoomSliderFromValue) view._setZoomSliderFromValue();
            renderPremiereTimeline();
            return;
        }
        if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            const minZoom = getEffectiveMinZoom();
            premiereTimelineZoom = Math.max(minZoom, premiereTimelineZoom / 1.5);
            if (view._setZoomSliderFromValue) view._setZoomSliderFromValue();
            renderPremiereTimeline();
            return;
        }
        if (e.key === '0') {
            e.preventDefault();
            premiereTimelineZoom = getEffectiveMinZoom();
            if (view._setZoomSliderFromValue) view._setZoomSliderFromValue();
            renderPremiereTimeline();
            return;
        }
        if (e.key === 'Home') {
            e.preventDefault();
            video.currentTime = 0;
            return;
        }
        if (e.key === 'End') {
            e.preventDefault();
            if (totalDuration > 0) video.currentTime = totalDuration;
            return;
        }
        if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            video.currentTime = Math.max(0, (video.currentTime || 0) - (e.shiftKey ? 10 : 1));
            return;
        }
        if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            const t = (video.currentTime || 0) + (e.shiftKey ? 10 : 1);
            video.currentTime = totalDuration > 0 ? Math.min(totalDuration, t) : t;
            return;
        }
    });
}

function initResizers() {
    addHorizontalResizer({
        getContainer: () => document.querySelector('.app-shell'),
        getCols: () => {
            const c = document.querySelector('.app-shell');
            return [c.querySelector('.video-stage'), c.querySelector('.workspace')];
        },
        storageKey: STORAGE_PANEL_RATIO_TOP,
        designFilter: () => true,
    });

    addHorizontalResizer({
        getContainer: () => document.getElementById('premiereBottomZone'),
        getCols: () => {
            const z = document.getElementById('premiereBottomZone');
            if (!z) return null;
            const left = z.querySelector('#fileInfoCard') || z.querySelector('#uploadCard');
            const right = z.querySelector('#timelinePanel');
            return left && right ? [left, right] : null;
        },
        storageKey: STORAGE_PANEL_RATIO_BOTTOM,
        designFilter: () => isPremiereDesign(),
    });

    addVerticalResizer({
        getContainer: () => document.body,
        getRows: () => {
            return [document.querySelector('.app-shell'), document.getElementById('premiereBottomZone')];
        },
        storageKey: STORAGE_PANEL_RATIO_VERT,
        designFilter: () => isPremiereDesign(),
    });

    applyStoredPanelRatios();
    window.addEventListener('resize', () => applyStoredPanelRatios());
}

function applyStoredPanelRatios() {
    const topRatio = parseFloat(localStorage.getItem(STORAGE_PANEL_RATIO_TOP));
    if (Number.isFinite(topRatio) && topRatio > 0.05 && topRatio < 0.95) {
        const c = document.querySelector('.app-shell');
        if (c) c.style.gridTemplateColumns = `minmax(0, ${topRatio}fr) minmax(0, ${1 - topRatio}fr)`;
    }
    if (isPremiereDesign()) {
        const botRatio = parseFloat(localStorage.getItem(STORAGE_PANEL_RATIO_BOTTOM));
        if (Number.isFinite(botRatio) && botRatio > 0.05 && botRatio < 0.95) {
            const z = document.getElementById('premiereBottomZone');
            if (z) z.style.gridTemplateColumns = `minmax(0, ${botRatio}fr) minmax(0, ${1 - botRatio}fr)`;
        }
        const vRatio = parseFloat(localStorage.getItem(STORAGE_PANEL_RATIO_VERT));
        if (Number.isFinite(vRatio) && vRatio > 0.1 && vRatio < 0.9) {
            const top = document.querySelector('.app-shell');
            const bot = document.getElementById('premiereBottomZone');
            if (top && bot) {
                top.style.flex = `${vRatio} 1 0`;
                bot.style.flex = `${1 - vRatio} 1 0`;
            }
        }
    }
}

function addHorizontalResizer({ getContainer, getCols, storageKey, designFilter }) {
    const handle = document.createElement('div');
    handle.className = 'panel-resizer panel-resizer-horizontal';
    handle.setAttribute('aria-hidden', 'true');
    document.body.appendChild(handle);

    function update() {
        if (!designFilter()) {
            handle.style.display = 'none';
            return;
        }
        const c = getContainer();
        const cols = c ? getCols() : null;
        if (!c || !cols || !cols[0] || !cols[1]) {
            handle.style.display = 'none';
            return;
        }
        const r1 = cols[0].getBoundingClientRect();
        const r2 = cols[1].getBoundingClientRect();
        if (r1.width === 0 || r2.width === 0) {
            handle.style.display = 'none';
            return;
        }
        const x = r1.right;
        const top = Math.min(r1.top, r2.top);
        const bottom = Math.max(r1.bottom, r2.bottom);
        handle.style.display = 'block';
        handle.style.left = `${x - 3}px`;
        handle.style.top = `${top}px`;
        handle.style.height = `${bottom - top}px`;
    }

    function attachDrag() {
        let dragging = false;
        let startX = 0;
        let startRatio = 0.5;
        let containerWidth = 0;
        let containerLeft = 0;

        handle.addEventListener('pointerdown', (e) => {
            const c = getContainer();
            const cols = getCols();
            if (!c || !cols) return;
            dragging = true;
            startX = e.clientX;
            const cRect = c.getBoundingClientRect();
            containerWidth = cRect.width;
            containerLeft = cRect.left;
            const r1 = cols[0].getBoundingClientRect();
            startRatio = r1.width / containerWidth;
            handle.setPointerCapture?.(e.pointerId);
            handle.classList.add('is-dragging');
            document.body.classList.add('is-resizing');
            e.preventDefault();
        });

        handle.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const c = getContainer();
            if (!c) return;
            const newRatio = Math.max(0.1, Math.min(0.9, (e.clientX - containerLeft) / containerWidth));
            c.style.gridTemplateColumns = `minmax(0, ${newRatio}fr) minmax(0, ${1 - newRatio}fr)`;
            update();
            renderPremiereTimeline();
        });

        function endDrag(e) {
            if (!dragging) return;
            dragging = false;
            handle.releasePointerCapture?.(e.pointerId);
            handle.classList.remove('is-dragging');
            document.body.classList.remove('is-resizing');
            const c = getContainer();
            if (c) {
                const cols = getCols();
                if (cols && cols[0]) {
                    const ratio = cols[0].getBoundingClientRect().width / c.getBoundingClientRect().width;
                    localStorage.setItem(storageKey, String(ratio));
                }
            }
        }
        handle.addEventListener('pointerup', endDrag);
        handle.addEventListener('pointercancel', endDrag);
    }

    attachDrag();

    const ro = new ResizeObserver(update);
    setTimeout(() => {
        const c = getContainer();
        if (c) ro.observe(c);
        update();
    }, 100);
    window.addEventListener('resize', update);

    // 디자인 전환 시 갱신
    new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['data-design', 'data-theme'] });
}

function addVerticalResizer({ getContainer, getRows, storageKey, designFilter }) {
    const handle = document.createElement('div');
    handle.className = 'panel-resizer panel-resizer-vertical';
    handle.setAttribute('aria-hidden', 'true');
    document.body.appendChild(handle);

    function update() {
        if (!designFilter()) {
            handle.style.display = 'none';
            return;
        }
        const rows = getRows();
        if (!rows || !rows[0] || !rows[1]) {
            handle.style.display = 'none';
            return;
        }
        const r1 = rows[0].getBoundingClientRect();
        const r2 = rows[1].getBoundingClientRect();
        if (r1.height === 0 || r2.height === 0) {
            handle.style.display = 'none';
            return;
        }
        const left = Math.min(r1.left, r2.left);
        const right = Math.max(r1.right, r2.right);
        handle.style.display = 'block';
        handle.style.top = `${r1.bottom - 3}px`;
        handle.style.left = `${left}px`;
        handle.style.width = `${right - left}px`;
    }

    function attachDrag() {
        let dragging = false;
        let startY = 0;
        let containerHeight = 0;
        let containerTop = 0;

        handle.addEventListener('pointerdown', (e) => {
            const rows = getRows();
            if (!rows || !rows[0] || !rows[1]) return;
            dragging = true;
            startY = e.clientY;
            const r1 = rows[0].getBoundingClientRect();
            const r2 = rows[1].getBoundingClientRect();
            containerTop = r1.top;
            containerHeight = (r2.bottom - r1.top);
            handle.setPointerCapture?.(e.pointerId);
            handle.classList.add('is-dragging');
            document.body.classList.add('is-resizing');
            e.preventDefault();
        });

        handle.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const rows = getRows();
            if (!rows) return;
            const newRatio = Math.max(0.15, Math.min(0.85, (e.clientY - containerTop) / containerHeight));
            rows[0].style.flex = `${newRatio} 1 0`;
            rows[1].style.flex = `${1 - newRatio} 1 0`;
            update();
            renderPremiereTimeline();
        });

        function endDrag(e) {
            if (!dragging) return;
            dragging = false;
            handle.releasePointerCapture?.(e.pointerId);
            handle.classList.remove('is-dragging');
            document.body.classList.remove('is-resizing');
            const rows = getRows();
            if (rows && rows[0] && rows[1]) {
                const r1 = rows[0].getBoundingClientRect();
                const r2 = rows[1].getBoundingClientRect();
                const total = r2.bottom - r1.top;
                if (total > 0) {
                    localStorage.setItem(storageKey, String(r1.height / total));
                }
            }
        }
        handle.addEventListener('pointerup', endDrag);
        handle.addEventListener('pointercancel', endDrag);
    }

    attachDrag();

    const ro = new ResizeObserver(update);
    setTimeout(() => {
        const c = getContainer();
        if (c) ro.observe(c);
        update();
    }, 100);
    window.addEventListener('resize', update);
    new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['data-design', 'data-theme'] });
}
