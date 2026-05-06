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
const VALID_DESIGNS = ['default', 'ipad'];

function getDesign() {
    const stored = localStorage.getItem(STORAGE_DESIGN);
    return VALID_DESIGNS.includes(stored) ? stored : DESIGN_DEFAULT;
}

function setDesign(design) {
    if (!VALID_DESIGNS.includes(design)) return;
    localStorage.setItem(STORAGE_DESIGN, design);
    applyDesign();
}

function applyDesign() {
    const design = getDesign();
    if (design === DESIGN_DEFAULT) {
        document.documentElement.removeAttribute('data-design');
    } else {
        document.documentElement.setAttribute('data-design', design);
    }
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
const SLOW_LOAD_THRESHOLD_MS = 15000;
let videoLoadingTimer = null;

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
        setVideoAspect();
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

function setTimeBadge() {
    const current = formatTime(video.currentTime || 0);
    const total = totalDuration > 0 ? formatTime(totalDuration) : '--:--';
    timeBadge.textContent = `${current} / ${total}`;
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

function renderSegments(filterText = '') {
    segmentsList.innerHTML = '';
    const keyword = filterText.trim().toLowerCase();
    const filtered = !keyword
        ? segments
        : segments.filter(({ title, note, tag }) => {
            const joined = [title, note, tag].join(' ').toLowerCase();
            return joined.includes(keyword);
        });

    if (filtered.length === 0) {
        segmentsEmpty.style.display = 'block';
        segmentsEmpty.textContent = keyword
            ? '검색 결과가 없습니다. 다른 키워드로 찾아보세요.'
            : '아직 등록된 메모가 없습니다. 영상을 재생하면서 중요한 순간을 기록해보세요.';
        return;
    }
    segmentsEmpty.style.display = 'none';

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

        segmentsList.appendChild(card);
    });
}

function renderAll() {
    segments.sort((a, b) => a.start - b.start);
    renderTimeline();
    renderSegments(searchInput.value);
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
        segments = segments.map(item => (item.id === editingId ? { ...item, ...data } : item));
        showFormStatus('수정 완료');
    } else {
        segments.push(data);
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
            segments = importedSegments.map(segment => ({
                ...segment,
                id: segment.id || crypto.randomUUID(),
                start: Number(segment.start),
                end: Number(segment.end),
                color: segment.color || DEFAULT_SEGMENT_COLOR,
            })).filter(segment => Number.isFinite(segment.start) && Number.isFinite(segment.end));
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
            segments = data.segments.map(segment => ({
                ...segment,
                id: segment.id || crypto.randomUUID(),
                start: Number(segment.start),
                end: Number(segment.end),
                color: segment.color || DEFAULT_SEGMENT_COLOR,
            })).filter(segment => Number.isFinite(segment.start) && Number.isFinite(segment.end));
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

function setVideoLoadingStatus(state, extra = '') {
    if (!videoLoadingStatus) return;
    videoLoadingStatus.classList.remove('is-warning', 'is-error');
    switch (state) {
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
        case 'error':
            videoLoadingStatus.textContent = '⚠️ 영상을 불러오지 못했습니다. 파일이 너무 크거나 브라우저가 지원하지 않는 형식일 수 있습니다.';
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

    video.addEventListener('loadedmetadata', () => {
        clearTimeout(videoLoadingTimer);
        setVideoLoadingStatus('ready');
        totalDuration = Number.isFinite(video.duration) ? video.duration : 0;
        setTimeBadge();
        renderTimeline();
        resetForm();
        refreshFileDetails();
        updateVideoAspectFromMetadata();
    });

    video.addEventListener('error', () => {
        clearTimeout(videoLoadingTimer);
        setVideoLoadingStatus('error');
    });

    video.addEventListener('timeupdate', () => {
        setTimeBadge();
    });
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
    const LONG_PRESS_DELAY = 450;
    const SEEK_SECONDS = 10;
    const SPEED_MULTIPLIER = 2;

    let lastTapTime = 0;
    let lastTapZone = null;
    let singleTapTimer = null;
    let longPressTimer = null;
    let isLongPressing = false;
    let originalRate = 1;
    let pressStartX = 0;
    let pressStartY = 0;
    let pressMoved = false;
    let indicatorTimer = null;
    const activePointers = new Set();

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
            next = Math.min(duration, next);
        }
        next = Math.max(0, next);
        video.currentTime = next;
    }

    function togglePlay() {
        if (!video.src) return;
        if (video.paused) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    }

    function handleZoneInteraction(zone, clientX, clientY) {
        const now = Date.now();
        const isDoubleTap = (now - lastTapTime < DOUBLE_TAP_DELAY) && lastTapZone === zone;

        if (isDoubleTap) {
            clearTimeout(singleTapTimer);
            singleTapTimer = null;
            lastTapTime = 0;
            lastTapZone = null;

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
        singleTapTimer = setTimeout(() => {
            togglePlay();
            lastTapTime = 0;
            lastTapZone = null;
        }, DOUBLE_TAP_DELAY);
    }

    function startLongPress() {
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
            if (pressMoved) return;
            if (!video.src || !Number.isFinite(video.duration)) return;
            originalRate = video.playbackRate || 1;
            video.playbackRate = SPEED_MULTIPLIER;
            isLongPressing = true;
            showSpeedIndicator();
            if (video.paused) {
                video.play().catch(() => {});
            }
            if (navigator.vibrate) {
                try { navigator.vibrate(30); } catch (_) {}
            }
        }, LONG_PRESS_DELAY);
    }

    function endLongPress() {
        if (isLongPressing) {
            video.playbackRate = originalRate || 1;
            isLongPressing = false;
            hideSpeedIndicator();
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

        segments.push(data);
        showFormStatus('현재 장면 메모 추가 완료');
        resetForm();
        renderAll();
    });

    searchInput.addEventListener('input', () => renderSegments(searchInput.value));
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

    videoInput.addEventListener('change', event => {
        const file = event.target.files?.[0];
        if (!file) return;

        // 기존 영상과 다른 영상을 선택한 경우, 세그먼트 초기화 확인
        const isDifferentFile = selectedFileName && selectedFileName !== file.name;
        if (isDifferentFile && segments.length > 0) {
            if (!confirm(`다른 영상을 선택하셨습니다. "${selectedFileName}"의 타임라인을 저장하고 "${file.name}"의 타임라인을 불러올까요?`)) {
                return;
            }
        }

        updateFileInfo(file);
        const url = URL.createObjectURL(file);
        if (currentVideoUrl) {
            URL.revokeObjectURL(currentVideoUrl);
        }
        currentVideoUrl = url;
        video.src = url;
        video.load();

        // 해당 파일의 타임라인 불러오기
        const loaded = loadFromLocalStorage(file.name);
        if (!loaded) {
            // 저장된 타임라인이 없으면 초기화
            segments = [];
            renderAll();
        }

        const playPromise = video.play();
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch(() => {
                // iOS/iPadOS에서는 사용자 제스처 후에도 재생이 막힐 수 있음 - 컨트롤로 직접 시작 가능
            });
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

applyDesign();
setVideoAspect();
resetForm();
initVideoEvents();
initControls();
initSettings();
initGestures();
initFullscreen();
loadRecentFileInfo();
