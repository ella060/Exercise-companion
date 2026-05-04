// 运动陪伴 — JavaScript

// ===== 存储键 =====
const STORAGE_KEYS = {
    VIDEOS: 'fitness_videos',
    CHECKINS: 'fitness_checkins',
    MEDICALS: 'fitness_medicals',
    STATS: 'fitness_stats'
};

// ===== 状态 =====
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let posterStyle = 0;
let previousPage = 'home';
let currentPage = 'home';

// ===== 运动类型 =====
const exerciseTypeNames = {
    walking: '散步',
    dancing: '广场舞',
    yoga: '瑜伽',
    taiji: '太极',
    stretching: '拉伸',
    other: '其他'
};

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', function() {
    updateTodayDate();
    loadAllData();
    renderCalendar();
    updatePosterDate();
    initNavigation();
    updateCaringMessage();
});

// ===== 日期显示 =====
function updateTodayDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('today-date').textContent = now.toLocaleDateString('zh-CN', options);
}

// ===== 导航 =====
function switchPage(pageId) {
    if (pageId === currentPage) return;

    const currentPageEl = document.querySelector('.page.active');
    const nextPageEl = document.getElementById('page-' + pageId);
    if (!nextPageEl || !currentPageEl) return;

    const pageOrder = ['home', 'video', 'checkin', 'poster', 'medical', 'profile'];
    const currentIndex = pageOrder.indexOf(currentPage);
    const nextIndex = pageOrder.indexOf(pageId);
    const direction = nextIndex > currentIndex ? 'left' : 'right';

    currentPageEl.classList.remove('active');
    currentPageEl.classList.add('slide-out-' + direction);
    nextPageEl.classList.add('active');
    nextPageEl.classList.add('slide-in-' + direction);

    setTimeout(function() {
        currentPageEl.classList.remove('slide-out-left', 'slide-out-right');
        nextPageEl.classList.remove('slide-in-left', 'slide-in-right');
    }, 350);

    document.querySelectorAll('.nav-item').forEach(function(item) {
        item.classList.remove('active');
        item.setAttribute('aria-selected', 'false');
    });
    var targetNav = document.querySelector('.nav-item[data-page="' + pageId + '"]');
    if (targetNav) {
        targetNav.classList.add('active');
        targetNav.setAttribute('aria-selected', 'true');
    }

    previousPage = currentPage;
    currentPage = pageId;
}

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(function(item) {
        item.addEventListener('click', function() {
            switchPage(this.getAttribute('data-page'));
        });
    });
}

// ===== 视频管理 =====
function showAddVideoModal() {
    document.getElementById('add-video-modal').classList.add('active');
}
function hideAddVideoModal() {
    document.getElementById('add-video-modal').classList.remove('active');
    document.getElementById('video-url').value = '';
    document.getElementById('video-title').value = '';
}

function addVideo() {
    var url = document.getElementById('video-url').value.trim();
    var title = document.getElementById('video-title').value.trim() || '未命名视频';
    var category = document.getElementById('video-category').value;

    if (!url) {
        showToast('请填写视频链接');
        return;
    }

    var videos = getStorage(STORAGE_KEYS.VIDEOS);
    videos.push({
        id: Date.now(),
        url: url,
        title: title,
        category: category,
        createdAt: new Date().toISOString()
    });
    setStorage(STORAGE_KEYS.VIDEOS, videos);

    hideAddVideoModal();
    renderVideoList();
    showToast('已收藏', 'success');
}

function deleteVideo(id) {
    showConfirmDialog({
        title: '移除视频',
        message: '这个视频会被移出收藏哦，以后也可以重新添加。',
        confirmText: '移除',
        cancelText: '保留',
        onConfirm: function() {
            var videos = getStorage(STORAGE_KEYS.VIDEOS);
            videos = videos.filter(function(v) { return v.id !== id; });
            setStorage(STORAGE_KEYS.VIDEOS, videos);
            renderVideoList();
            showToast('已移除', 'success');
        }
    });
}

function playVideo(url) {
    window.open(url, '_blank');
}

function renderVideoList() {
    var videos = getStorage(STORAGE_KEYS.VIDEOS);
    var container = document.getElementById('video-list');

    if (videos.length === 0) {
        container.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-state-mark">+</div>' +
                '<h3>还没有收藏的视频</h3>' +
                '<p>把喜欢的健身视频收藏到这里，随时都能找到</p>' +
                '<span class="hint-text">支持抖音、B站等平台的视频链接</span>' +
            '</div>';
        return;
    }

    container.innerHTML = videos.map(function(video) {
        return (
            '<div class="video-item">' +
                '<div class="video-item-info">' +
                    '<div class="video-item-title">' + escapeHtml(video.title) + '</div>' +
                    '<div class="video-item-meta">' + (exerciseTypeNames[video.category] || '其他') + ' · ' + formatDate(video.createdAt) + '</div>' +
                '</div>' +
                '<div class="video-item-actions">' +
                    '<button class="btn-icon play" onclick="playVideo(\'' + escapeHtml(video.url) + '\')">播放</button>' +
                    '<button class="btn-icon delete" onclick="deleteVideo(' + video.id + ')">移除</button>' +
                '</div>' +
            '</div>'
        );
    }).join('');
}

// ===== 打卡日历 =====
function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    else if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

function renderCalendar() {
    var monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                      '七月', '八月', '九月', '十月', '十一月', '十二月'];
    document.getElementById('calendar-month').textContent = currentYear + '年' + monthNames[currentMonth];

    var grid = document.getElementById('calendar-grid');
    var checkins = getStorage(STORAGE_KEYS.CHECKINS);
    var checkedDays = checkins.map(function(c) { return c.date; });

    var firstDay = new Date(currentYear, currentMonth, 1);
    var lastDay = new Date(currentYear, currentMonth + 1, 0);
    var startWeekDay = firstDay.getDay();

    var today = new Date();
    var todayStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

    var html = '<div class="day-header">日</div><div class="day-header">一</div><div class="day-header">二</div><div class="day-header">三</div><div class="day-header">四</div><div class="day-header">五</div><div class="day-header">六</div>';

    for (var i = 0; i < startWeekDay; i++) {
        html += '<div class="day"></div>';
    }

    for (var day = 1; day <= lastDay.getDate(); day++) {
        var dayStr = currentYear + '-' +
            String(currentMonth + 1).padStart(2, '0') + '-' +
            String(day).padStart(2, '0');
        var isChecked = checkedDays.indexOf(dayStr) !== -1;
        var isToday = dayStr === todayStr;

        var classes = 'day';
        if (isChecked) classes += ' checked';
        if (isToday) classes += ' today';

        html += '<div class="' + classes + '" data-date="' + dayStr + '">' + day + '</div>';
    }

    grid.innerHTML = html;
}

function submitCheckin() {
    var minutes = document.getElementById('exercise-minutes').value;
    var type = document.getElementById('exercise-type').value;
    var note = document.getElementById('exercise-note').value;

    if (!minutes || parseInt(minutes) <= 0) {
        showToast('请填写运动时长', 'warning');
        return;
    }

    var today = new Date();
    var dateStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

    var checkins = getStorage(STORAGE_KEYS.CHECKINS);
    var existingIndex = -1;
    for (var i = 0; i < checkins.length; i++) {
        if (checkins[i].date === dateStr) { existingIndex = i; break; }
    }

    var checkin = {
        date: dateStr,
        minutes: parseInt(minutes),
        type: type,
        note: note,
        createdAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        checkins[existingIndex] = checkin;
    } else {
        checkins.push(checkin);
    }

    setStorage(STORAGE_KEYS.CHECKINS, checkins);
    updateStats();
    updatePosterData(checkin);

    document.getElementById('exercise-minutes').value = '';
    document.getElementById('exercise-note').value = '';

    renderCalendar();
    showCelebration();
    setTimeout(function() { switchPage('poster'); }, 1500);
}

function showCelebration() {
    var overlay = document.createElement('div');
    overlay.className = 'check-success show';
    overlay.innerHTML = '<div class="check-success-circle"><div class="check-success-mark"></div></div>';
    document.body.appendChild(overlay);

    var container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    var colors = ['#C28B6E', '#F0E3D8', '#8FAF92', '#F6EDE6', '#E8F0E6', '#F3EDE4', '#EBD5C5', '#C49F7A'];
    for (var i = 0; i < 50; i++) {
        var confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.3 + 's';
        confetti.style.animationDuration = (1.5 + Math.random() * 0.8) + 's';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        confetti.style.width = (6 + Math.random() * 8) + 'px';
        confetti.style.height = (6 + Math.random() * 8) + 'px';
        container.appendChild(confetti);
    }

    setTimeout(function() {
        overlay.classList.remove('show');
        setTimeout(function() { overlay.remove(); }, 300);
        container.remove();
    }, 2000);
}

function updateStats() {
    var checkins = getStorage(STORAGE_KEYS.CHECKINS);

    var streak = 0;
    var today = new Date();
    var sortedCheckins = checkins.slice().sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
    });

    for (var i = 0; i < sortedCheckins.length; i++) {
        var checkDate = new Date(sortedCheckins[i].date);
        var expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);
        expectedDate.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);
        if (checkDate.getTime() === expectedDate.getTime()) {
            streak++;
        } else {
            break;
        }
    }

    var totalMinutes = checkins.reduce(function(sum, c) {
        return sum + (c.minutes || 0);
    }, 0);

    setStorage(STORAGE_KEYS.STATS, { streak: streak, totalMinutes: totalMinutes });

    var daysEl = document.getElementById('total-days');
    var minsEl = document.getElementById('total-minutes');
    if (daysEl) daysEl.textContent = streak;
    if (minsEl) minsEl.textContent = totalMinutes;

    var profDaysEl = document.getElementById('profile-days');
    if (profDaysEl) profDaysEl.textContent = streak;

    // 连续天数 >0 时加高亮样式
    if (daysEl) {
        if (streak > 0) {
            daysEl.classList.add('has-streak');
        } else {
            daysEl.classList.remove('has-streak');
        }
    }
}

function loadAllData() {
    updateStats();
    renderVideoList();
    renderMedicalList();
}

// ===== 海报 =====
var posterTemplates = [
    {
        bg:          '#FDFCF8',
        accent:      '#C28B6E',
        accentSoft:  '#F0E3D8',
        border:      '#E6E1DA',
        numberColor: '#C28B6E',
        textColor:   '#3C3732',
        labelColor:  '#999490'
    },
    {
        bg:          '#F9F6F1',
        accent:      '#8FAF92',
        accentSoft:  '#E8F0E6',
        border:      '#D5DDD3',
        numberColor: '#8FAF92',
        textColor:   '#3C3732',
        labelColor:  '#999490'
    },
    {
        bg:          '#F3EDE4',
        accent:      '#C49F7A',
        accentSoft:  '#F6EDE6',
        border:      '#E6DDD2',
        numberColor: '#C49F7A',
        textColor:   '#3C3732',
        labelColor:  '#999490'
    },
    {
        bg:          '#FDFCF8',
        accent:      '#B8987A',
        accentSoft:  '#F3EDE4',
        border:      '#EBE5DC',
        numberColor: '#B8987A',
        textColor:   '#3C3732',
        labelColor:  '#999490'
    }
];

function updatePosterDate() {
    var now = new Date();
    var options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('poster-date').textContent = now.toLocaleDateString('zh-CN', options);
}

function updatePosterData(checkin) {
    var stats = getStorage(STORAGE_KEYS.STATS);
    document.getElementById('poster-days').textContent = stats.streak || 1;
    document.getElementById('poster-minutes').textContent = checkin.minutes;
    document.getElementById('poster-type').textContent = exerciseTypeNames[checkin.type] || '运动';
}

function refreshPoster() {
    posterStyle = (posterStyle + 1) % posterTemplates.length;
    var t = posterTemplates[posterStyle];
    var card = document.getElementById('poster-card');
    card.style.background = t.bg;
    card.style.borderColor = t.border;

    // 更新内部颜色
    var number = card.querySelector('.poster-number');
    var badge = card.querySelector('.poster-badge');
    var detailRow = card.querySelector('.poster-detail-row');
    var footnote = card.querySelector('.poster-footnote');

    if (number) number.style.color = t.numberColor;
    if (badge) badge.style.borderColor = t.border;
    if (detailRow) detailRow.style.background = t.accentSoft;
    if (footnote) footnote.style.borderColor = t.border;
}

function sharePoster() {
    showToast('长按海报保存图片后分享');
}

// ===== 就医记录 =====
function showAddMedicalModal() {
    document.getElementById('add-medical-modal').classList.add('active');
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('medical-date').value = tomorrow.toISOString().split('T')[0];
}
function hideAddMedicalModal() {
    document.getElementById('add-medical-modal').classList.remove('active');
    document.getElementById('medical-hospital').value = '';
    document.getElementById('medical-department').value = '';
    document.getElementById('medical-note').value = '';
}

function addMedical() {
    var date = document.getElementById('medical-date').value;
    var hospital = document.getElementById('medical-hospital').value.trim();
    var department = document.getElementById('medical-department').value.trim();
    var note = document.getElementById('medical-note').value.trim();

    if (!date || !hospital) {
        showToast('请填写日期和医院名称');
        return;
    }

    var medicals = getStorage(STORAGE_KEYS.MEDICALS);
    medicals.push({
        id: Date.now(),
        date: date,
        hospital: hospital,
        department: department,
        note: note,
        done: false,
        createdAt: new Date().toISOString()
    });

    setStorage(STORAGE_KEYS.MEDICALS, medicals);
    hideAddMedicalModal();
    renderMedicalList();
    showToast('已添加提醒', 'success');
}

function deleteMedical(id) {
    showConfirmDialog({
        title: '移除记录',
        message: '这条就医提醒会被移除哦。',
        confirmText: '移除',
        cancelText: '保留',
        onConfirm: function() {
            var medicals = getStorage(STORAGE_KEYS.MEDICALS);
            medicals = medicals.filter(function(m) { return m.id !== id; });
            setStorage(STORAGE_KEYS.MEDICALS, medicals);
            renderMedicalList();
            showToast('已移除', 'success');
        }
    });
}

function toggleMedicalDone(id) {
    var medicals = getStorage(STORAGE_KEYS.MEDICALS);
    for (var i = 0; i < medicals.length; i++) {
        if (medicals[i].id === id) {
            medicals[i].done = !medicals[i].done;
            break;
        }
    }
    setStorage(STORAGE_KEYS.MEDICALS, medicals);
    renderMedicalList();
}

function renderMedicalList() {
    var medicals = getStorage(STORAGE_KEYS.MEDICALS);
    var container = document.getElementById('medical-list');

    if (medicals.length === 0) {
        container.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-state-mark">+</div>' +
                '<h3>暂无就医提醒</h3>' +
                '<p>添加复查和就医安排，这里帮你记着</p>' +
                '<span class="hint-text">定期复查是对自己最好的关心</span>' +
            '</div>';
        return;
    }

    var sortedMedicals = medicals.slice().sort(function(a, b) {
        return new Date(a.date) - new Date(b.date);
    });

    container.innerHTML = sortedMedicals.map(function(m) {
        return (
            '<div class="medical-item' + (m.done ? ' done' : '') + '" onclick="toggleMedicalDone(' + m.id + ')">' +
                '<div class="medical-item-date">' + formatDate(m.date) + '</div>' +
                '<div class="medical-item-header">' +
                    '<span class="medical-item-hospital">' + escapeHtml(m.hospital) + '</span>' +
                    (m.department ? '<span class="medical-item-dept">' + escapeHtml(m.department) + '</span>' : '') +
                '</div>' +
                (m.note ? '<div class="medical-item-note">' + escapeHtml(m.note) + '</div>' : '') +
                '<button class="btn-icon delete" onclick="event.stopPropagation();deleteMedical(' + m.id + ')" style="margin-top:8px">移除</button>' +
            '</div>'
        );
    }).join('');
}

// ===== 关怀消息 =====
var caringMessages = {
    early: [
        '天刚亮不久，先喝杯温水再开始新的一天。',
        '清晨的空气最好，窗边站一会儿就很舒服。',
        '早上好，伸个懒腰，让身体慢慢醒过来。',
        '你醒得真早，今天也会是很好的一天。'
    ],
    morning: [
        '阳光正好，适合在客厅里慢慢活动一下。',
        '今天天气不错，出去走走会很舒服。',
        '做几个深呼吸吧，让新鲜空气充满身体。',
        '早上的光最温柔，照在身上暖暖的。'
    ],
    noon: [
        '中午好，吃过饭散散步，帮助消化。',
        '午休一小会儿再运动，身体会更舒服。',
        '阳光暖暖的，靠在沙发上歇一歇也很好。'
    ],
    afternoon: [
        '下午茶时间，喝口水、活动活动，精神更好。',
        '趁天还亮着，做些轻柔的拉伸吧。',
        '今天辛苦了，记得给自己一点小小的奖励。',
        '坐下来，做几个深呼吸，让身体放松下来。'
    ],
    evening: [
        '晚上好，轻柔地拉伸一下，睡得会更香。',
        '今天你已经做得很好了，休息也是一种练习。',
        '回顾今天，每一步都走得很稳。',
        '泡个脚，让身体暖起来，准备休息了。'
    ],
    night: [
        '夜深了，早点休息，明天我们还在。',
        '睡前回想今天一件让你开心的小事。',
        '晚安，你比自己想象的更了不起。'
    ]
};

function updateCaringMessage() {
    var hour = new Date().getHours();
    var pool;

    if (hour >= 5 && hour < 9)       pool = caringMessages.early;
    else if (hour >= 9 && hour < 12)  pool = caringMessages.morning;
    else if (hour >= 12 && hour < 14) pool = caringMessages.noon;
    else if (hour >= 14 && hour < 18) pool = caringMessages.afternoon;
    else if (hour >= 18 && hour < 21) pool = caringMessages.evening;
    else                              pool = caringMessages.night;

    var message = pool[Math.floor(Math.random() * pool.length)];
    var el = document.getElementById('caring-text');
    if (el) el.textContent = message;

    // 同时更新欢迎语
    updateWelcomeGreeting(hour);
}

function updateWelcomeGreeting(hour) {
    var greeting;
    if (hour >= 5 && hour < 9)       greeting = '早上好，今天也要对自己好一点';
    else if (hour >= 9 && hour < 12)  greeting = '上午好，慢慢来，不着急';
    else if (hour >= 12 && hour < 14) greeting = '中午好，记得好好吃饭';
    else if (hour >= 14 && hour < 18) greeting = '下午好，你今天的坚持很美';
    else if (hour >= 18 && hour < 21) greeting = '晚上好，今天辛苦了';
    else                              greeting = '夜深了，早点休息';

    var h1 = document.querySelector('.welcome-section h1');
    if (h1) h1.textContent = greeting;
}

// ===== 工具函数 =====
function getStorage(key) {
    try {
        var data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function setStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
}

function formatDate(dateStr) {
    var date = new Date(dateStr);
    return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
}

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== Toast =====
function showToast(message, type) {
    type = type || 'info';
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast toast-' + type;
    void toast.offsetWidth;
    toast.classList.add('show');
    setTimeout(function() {
        toast.classList.remove('show');
    }, 2500);
}

// ===== 确认对话框 =====
function showConfirmDialog(options) {
    var title = options.title;
    var message = options.message;
    var confirmText = options.confirmText || '确定';
    var cancelText = options.cancelText || '取消';
    var onConfirm = options.onConfirm;
    var onCancel = options.onCancel;
    var showCancel = options.showCancel !== false;

    var overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    var actionsClass = 'confirm-actions';
    if (!showCancel) actionsClass += ' single-action';

    overlay.innerHTML =
        '<div class="confirm-dialog">' +
            '<div class="confirm-title">' + title + '</div>' +
            '<div class="confirm-message">' + message + '</div>' +
            '<div class="' + actionsClass + '">' +
                (showCancel ? '<button class="confirm-btn cancel">' + cancelText + '</button>' : '') +
                '<button class="confirm-btn confirm">' + confirmText + '</button>' +
            '</div>' +
        '</div>';

    document.body.appendChild(overlay);

    requestAnimationFrame(function() {
        overlay.classList.add('active');
    });

    var closeDialog = function() {
        overlay.classList.remove('active');
        setTimeout(function() { overlay.remove(); }, 300);
    };

    var cancelBtn = overlay.querySelector('.cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            closeDialog();
            if (onCancel) onCancel();
        });
    }

    overlay.querySelector('.confirm').addEventListener('click', function() {
        closeDialog();
        if (onConfirm) onConfirm();
    });
}

// ===== 关于 =====
function showAbout() {
    showConfirmDialog({
        title: '关于运动陪伴',
        message: '运动陪伴 v2.0\n\n每天陪伴，温暖健身\n一个安静的角落，记得你每一天的坚持。',
        confirmText: '知道了',
        cancelText: '',
        showCancel: false
    });
}

// ===== 清除数据 =====
function clearData() {
    showConfirmDialog({
        title: '清除所有数据',
        message: '确定要清除所有数据吗？这个操作不能撤销哦，打卡记录、视频和就医信息都会被清空。',
        confirmText: '确认清除',
        cancelText: '再想想',
        onConfirm: function() {
            Object.values(STORAGE_KEYS).forEach(function(key) {
                localStorage.removeItem(key);
            });
            loadAllData();
            renderCalendar();
            showToast('数据已清除', 'success');
        }
    });
}
