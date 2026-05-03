// 中老年运动陪伴 App - JavaScript

// ===== 数据存储键名 =====
const STORAGE_KEYS = {
    VIDEOS: 'fitness_videos',
    CHECKINS: 'fitness_checkins',
    MEDICALS: 'fitness_medicals',
    STATS: 'fitness_stats'
};

// ===== 当前状态 =====
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let posterStyle = 0;

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', function() {
    // 显示当前日期
    updateTodayDate();
    // 加载数据
    loadAllData();
    // 渲染日历
    renderCalendar();
    // 渲染海报日期
    updatePosterDate();
    // 设置底部导航
    initNavigation();
    // 加载关怀消息
    loadCaringMessage();
});

// ===== 日期显示 =====
function updateTodayDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('today-date').textContent = now.toLocaleDateString('zh-CN', options);
}

// ===== 导航切换 =====
let previousPage = 'home';
let currentPage = 'home';

function switchPage(pageId) {
    if (pageId === currentPage) return;

    const currentPageEl = document.querySelector('.page.active');
    const nextPageEl = document.getElementById('page-' + pageId);

    if (!nextPageEl || !currentPageEl) return;

    const pageOrder = ['home', 'video', 'checkin', 'poster', 'medical'];
    const currentIndex = pageOrder.indexOf(currentPage);
    const nextIndex = pageOrder.indexOf(pageId);
    const direction = nextIndex > currentIndex ? 'left' : 'right';

    currentPageEl.classList.remove('active');
    currentPageEl.classList.add('slide-out-' + direction);

    nextPageEl.classList.add('active');
    nextPageEl.classList.add('slide-in-' + direction);

    setTimeout(() => {
        currentPageEl.classList.remove('slide-out-left', 'slide-out-right');
        nextPageEl.classList.remove('slide-in-left', 'slide-in-right');
    }, 350);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const targetNav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (targetNav) targetNav.classList.add('active');

    previousPage = currentPage;
    currentPage = pageId;
}

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            switchPage(page);
        });
    });
}

// ===== 视频管理 =====
function showAddVideoModal() {
    document.getElementById('add-video-modal').classList.add('active');
}

function hideAddVideoModal() {
    document.getElementById('add-video-modal').classList.remove('active');
    // 清空表单
    document.getElementById('video-url').value = '';
    document.getElementById('video-title').value = '';
}

function addVideo() {
    const url = document.getElementById('video-url').value.trim();
    const title = document.getElementById('video-title').value.trim() || '未命名视频';
    const category = document.getElementById('video-category').value;

    if (!url) {
        showToast('请输入视频链接');
        return;
    }

    const videos = getStorage(STORAGE_KEYS.VIDEOS);
    const video = {
        id: Date.now(),
        url: url,
        title: title,
        category: category,
        createdAt: new Date().toISOString()
    };

    videos.push(video);
    setStorage(STORAGE_KEYS.VIDEOS, videos);

    hideAddVideoModal();
    renderVideoList();
    showToast('视频添加成功');
}

function deleteVideo(id) {
    showConfirmDialog({
        title: '删除视频',
        message: '确定要删除这个视频吗？删除后可在视频库重新添加。',
        confirmText: '删除',
        cancelText: '保留',
        isDangerous: true,
        onConfirm: () => {
            let videos = getStorage(STORAGE_KEYS.VIDEOS);
            videos = videos.filter(v => v.id !== id);
            setStorage(STORAGE_KEYS.VIDEOS, videos);
            renderVideoList();
            showToast('已删除', 'success');
        }
    });
}

function playVideo(url) {
    // 尝试在App内打开（如果是支持的平台）
    window.open(url, '_blank');
}

function renderVideoList() {
    const videos = getStorage(STORAGE_KEYS.VIDEOS);
    const container = document.getElementById('video-list');

    if (videos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📺</div>
                <h3>还没有收藏的视频</h3>
                <p>点击上方"+ 添加视频"粘贴链接<br>开始管理您的健身视频</p>
                <div class="guide-text">📌 提示：支持抖音、B站等平台的视频链接</div>
            </div>
        `;
        return;
    }

    const categoryNames = {
        dancing: '广场舞',
        yoga: '瑜伽',
        taiji: '太极',
        stretching: '拉伸',
        walking: '散步',
        other: '其他'
    };

    container.innerHTML = videos.map(video => `
        <div class="video-card">
            <div class="video-info">
                <div class="video-title">${escapeHtml(video.title)}</div>
                <div class="video-meta">${categoryNames[video.category] || '其他'} · ${formatDate(video.createdAt)}</div>
            </div>
            <div class="video-actions">
                <button class="btn-play" onclick="playVideo('${escapeHtml(video.url)}')">播放</button>
                <button class="btn-delete" onclick="deleteVideo(${video.id})">删除</button>
            </div>
        </div>
    `).join('');
}

// ===== 打卡日历 =====
function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

function renderCalendar() {
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                        '七月', '八月', '九月', '十月', '十一月', '十二月'];
    document.getElementById('calendar-month').textContent = `${currentYear}年${monthNames[currentMonth]}`;

    const grid = document.getElementById('calendar-grid');
    const checkins = getStorage(STORAGE_KEYS.CHECKINS);
    const checkedDays = checkins.map(c => c.date);

    // 获取本月第一天和最后一天
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startWeekDay = firstDay.getDay();

    // 获取今天的日期用于比较
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let html = '<div class="day-header">日</div><div class="day-header">一</div><div class="day-header">二</div><div class="day-header">三</div><div class="day-header">四</div><div class="day-header">五</div><div class="day-header">六</div>';

    // 填充空白
    for (let i = 0; i < startWeekDay; i++) {
        html += '<div class="day"></div>';
    }

    // 填充日期
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isChecked = checkedDays.includes(dayStr);
        const isToday = dayStr === todayStr;

        let classes = 'day';
        if (isChecked) classes += ' checked';
        if (isToday) classes += ' today';

        html += `<div class="${classes}" data-date="${dayStr}">${day}</div>`;
    }

    grid.innerHTML = html;
}

function submitCheckin() {
    const minutes = document.getElementById('exercise-minutes').value;
    const type = document.getElementById('exercise-type').value;
    const note = document.getElementById('exercise-note').value;

    if (!minutes || parseInt(minutes) <= 0) {
        showToast('请输入有效的运动时长', 'warning');
        return;
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const checkins = getStorage(STORAGE_KEYS.CHECKINS);
    const existingIndex = checkins.findIndex(c => c.date === dateStr);

    const checkin = {
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
    setTimeout(() => switchPage('poster'), 1500);
}

function showCelebration() {
    const overlay = document.createElement('div');
    overlay.className = 'check-success-overlay show';
    overlay.innerHTML = '<div class="check-success-icon">🎉</div>';
    document.body.appendChild(overlay);

    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    const colors = ['#FF8C9A', '#6ECFB7', '#FFB347', '#FFE4E7', '#A8E6CF', '#E3F2FD'];
    for (let i = 0; i < 60; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.4 + 's';
        confetti.style.animationDuration = (1.5 + Math.random()) + 's';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        confetti.style.width = (8 + Math.random() * 8) + 'px';
        confetti.style.height = (8 + Math.random() * 8) + 'px';
        container.appendChild(confetti);
    }

    setTimeout(() => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
        container.remove();
    }, 2200);
}

function updateStats() {
    const checkins = getStorage(STORAGE_KEYS.CHECKINS);

    // 计算连续天数
    let streak = 0;
    const today = new Date();
    const sortedCheckins = [...checkins].sort((a, b) => new Date(b.date) - new Date(a.date));

    for (let i = 0; i < sortedCheckins.length; i++) {
        const checkDate = new Date(sortedCheckins[i].date);
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);
        expectedDate.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);

        if (checkDate.getTime() === expectedDate.getTime()) {
            streak++;
        } else {
            break;
        }
    }

    // 计算总分钟数
    const totalMinutes = checkins.reduce((sum, c) => sum + (c.minutes || 0), 0);

    setStorage(STORAGE_KEYS.STATS, { streak, totalMinutes });

    // 更新UI
    document.getElementById('total-days').textContent = streak;
    document.getElementById('total-minutes').textContent = totalMinutes;
    document.getElementById('profile-days').textContent = streak;
}

function loadAllData() {
    updateStats();
    renderVideoList();
    renderMedicalList();
}

// ===== 海报 =====
const posterTemplates = [
    { bg: 'linear-gradient(135deg, #FFE4E7 0%, #FFF 50%, #E8F5E9 100%)' },
    { bg: 'linear-gradient(135deg, #E8F5E9 0%, #FFF 50%, #FFE4E7 100%)' },
    { bg: 'linear-gradient(135deg, #E3F2FD 0%, #FFF 50%, #FCE4EC 100%)' },
    { bg: 'linear-gradient(135deg, #FFF3E0 0%, #FFF 50%, #E8F5E9 100%)' }
];

function updatePosterDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('poster-date').textContent = now.toLocaleDateString('zh-CN', options);
}

function updatePosterData(checkin) {
    const typeNames = {
        walking: '散步',
        dancing: '广场舞',
        yoga: '瑜伽',
        taiji: '太极',
        stretching: '拉伸',
        other: '其他'
    };

    // 获取连续天数
    const stats = getStorage(STORAGE_KEYS.STATS);
    document.getElementById('poster-days').textContent = stats.streak || 1;
    document.getElementById('poster-minutes').textContent = checkin.minutes;
    document.getElementById('poster-type').textContent = typeNames[checkin.type] || '运动';
}

function refreshPoster() {
    posterStyle = (posterStyle + 1) % posterTemplates.length;
    const card = document.getElementById('poster-card');
    card.style.background = posterTemplates[posterStyle].bg;
}

function sharePoster() {
    // 由于浏览器限制，我们创建一个画布图片并下载
    showToast('正在生成分享图片...');

    // 使用html2canvas方式生成（这里简化为提示）
    // 实际项目中可以引入 html2canvas 库

    // 模拟下载
    setTimeout(() => {
        showToast('长按海报保存图片后分享');
    }, 500);
}

// ===== 就医记录 =====
function showAddMedicalModal() {
    document.getElementById('add-medical-modal').classList.add('active');
    // 设置默认日期为明天
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('medical-date').value = tomorrow.toISOString().split('T')[0];
}

function hideAddMedicalModal() {
    document.getElementById('add-medical-modal').classList.remove('active');
    // 清空表单
    document.getElementById('medical-hospital').value = '';
    document.getElementById('medical-department').value = '';
    document.getElementById('medical-note').value = '';
}

function addMedical() {
    const date = document.getElementById('medical-date').value;
    const hospital = document.getElementById('medical-hospital').value.trim();
    const department = document.getElementById('medical-department').value.trim();
    const note = document.getElementById('medical-note').value.trim();

    if (!date || !hospital) {
        showToast('请填写日期和医院名称');
        return;
    }

    const medicals = getStorage(STORAGE_KEYS.MEDICALS);
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
    showToast('就医记录已添加');
}

function deleteMedical(id) {
    showConfirmDialog({
        title: '删除记录',
        message: '确定要删除这条就医记录吗？',
        confirmText: '删除',
        cancelText: '保留',
        isDangerous: true,
        onConfirm: () => {
            let medicals = getStorage(STORAGE_KEYS.MEDICALS);
            medicals = medicals.filter(m => m.id !== id);
            setStorage(STORAGE_KEYS.MEDICALS, medicals);
            renderMedicalList();
            showToast('已删除', 'success');
        }
    });
}

function toggleMedicalDone(id) {
    let medicals = getStorage(STORAGE_KEYS.MEDICALS);
    const index = medicals.findIndex(m => m.id === id);
    if (index >= 0) {
        medicals[index].done = !medicals[index].done;
        setStorage(STORAGE_KEYS.MEDICALS, medicals);
        renderMedicalList();
    }
}

function renderMedicalList() {
    const medicals = getStorage(STORAGE_KEYS.MEDICALS);
    const container = document.getElementById('medical-list');

    if (medicals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏥</div>
                <h3>还没有就医记录</h3>
                <p>点击上方"+ 添加记录"<br>为您的健康保驾护航</p>
                <div class="guide-text">📌 建议：添加定期复查提醒</div>
            </div>
        `;
        return;
    }

    // 按日期排序
    const sortedMedicals = [...medicals].sort((a, b) => new Date(a.date) - new Date(b.date));

    container.innerHTML = sortedMedicals.map(m => `
        <div class="medical-card ${m.done ? 'done' : ''}" onclick="toggleMedicalDone(${m.id})">
            <div class="medical-date">${formatDate(m.date)}</div>
            <div class="medical-hospital">${escapeHtml(m.hospital)}</div>
            <div class="medical-department">${escapeHtml(m.department)}</div>
            ${m.note ? `<div class="medical-note">备注：${escapeHtml(m.note)}</div>` : ''}
            <button class="btn-delete" style="margin-top:8px" onclick="event.stopPropagation();deleteMedical(${m.id})">删除</button>
        </div>
    `).join('');
}

// ===== 关怀消息 =====
const caringMessages = [
    '今天天气不错，适当活动一下对身体好哦~',
    '早上起来伸个懒腰，一天都有精神！',
    '记得多喝水，运动后要补充水分哦',
    '今天你已经很棒了，休息一下也没关系的',
    '坚持就是胜利，每天进步一点点！',
    '运动时注意安全，慢慢来不要着急',
    '听说今天是个好日子，适合出去走走~',
    '别忘了今天的运动计划哦，完成后会很开心的！',
    '您辛苦啦，今天也要好好爱自己',
    '天气转凉了，记得添件衣服再出去运动'
];

function loadCaringMessage() {
    // 根据时间生成不同消息
    const hour = new Date().getHours();
    let message = caringMessages[Math.floor(Math.random() * caringMessages.length)];

    if (hour < 9) {
        message = '早上好！新的一天开始啦，今天也要加油哦~';
    } else if (hour >= 12 && hour < 14) {
        message = '中午好，饭后散散步有助于消化~';
    } else if (hour >= 18 && hour < 20) {
        message = '晚上好，适当的夜练可以助眠哦~';
    } else if (hour >= 22) {
        message = '夜深了，早点休息，明天继续加油！';
    }

    document.querySelector('.caring-message p').textContent = message;
}

// ===== 工具函数 =====
function getStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Storage get error:', e);
        return [];
    }
}

function setStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Storage set error:', e);
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icons = {
        success: '✔',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
    toast.className = `toast toast-${type}`;

    void toast.offsetWidth;

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}

// ===== 自定义确认对话框 =====
function showConfirmDialog(options) {
    const {
        title,
        message,
        confirmText = '确定',
        cancelText = '取消',
        onConfirm,
        onCancel,
        isDangerous = false
    } = options;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-dialog">
            <div class="confirm-icon">${isDangerous ? '⚠' : '💝'}</div>
            <div class="confirm-title">${title}</div>
            <div class="confirm-message">${message}</div>
            <div class="confirm-actions">
                <button class="confirm-btn cancel">${cancelText}</button>
                <button class="confirm-btn confirm">${confirmText}</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });

    const closeDialog = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('.cancel').addEventListener('click', () => {
        closeDialog();
        onCancel && onCancel();
    });

    overlay.querySelector('.confirm').addEventListener('click', () => {
        closeDialog();
        onConfirm && onConfirm();
    });
}

// ===== 关于我们 =====
function showAbout() {
    alert('运动陪伴 v1.0\n\n一款温暖的中老年健身应用\n每天陪伴，温暖健身');
}

// ===== 清除数据 =====
function clearData() {
    showConfirmDialog({
        title: '清除所有数据',
        message: '确定要清除所有数据吗？此操作不可恢复，包括所有打卡记录、视频和就医信息。',
        confirmText: '确认清除',
        cancelText: '取消',
        isDangerous: true,
        onConfirm: () => {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            loadAllData();
            renderCalendar();
            showToast('数据已清除', 'success');
        }
    });
}

// 每日推送关怀（需要后端配合）
// 这里只是演示，实际需要后端定时任务 + 推送服务
function scheduleCaringNotification() {
    // 检查是否已推送
    const lastPush = localStorage.getItem('last_caring_push');
    const today = new Date().toDateString();

    if (lastPush === today) return;

    // 显示关怀消息（实际项目中通过推送实现）
    loadCaringMessage();

    localStorage.setItem('last_caring_push', today);
}

// 启动时检查
scheduleCaringNotification();