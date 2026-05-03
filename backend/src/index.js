// 中老年运动陪伴 App - 后端服务

const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../app')));

// 数据库路径
const DB_PATH = path.join(__dirname, 'fitness.db');

// 存储数据库实例
let db = null;

// 初始化数据库
async function initDatabase() {
    const SQL = await initSqlJs();

    // 如果数据库文件存在，读取它
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // 初始化表
    db.run(`
        CREATE TABLE IF NOT EXISTS checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT UNIQUE NOT NULL,
            minutes INTEGER NOT NULL,
            type TEXT NOT NULL,
            note TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS medicals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            hospital TEXT NOT NULL,
            department TEXT,
            note TEXT,
            done INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY,
            streak INTEGER DEFAULT 0,
            total_minutes INTEGER DEFAULT 0,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS caring_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            sent_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 确保stats表有初始数据
    const statsExists = db.exec("SELECT COUNT(*) FROM stats");
    if (statsExists[0] && statsExists[0].values[0][0] === 0) {
        db.run("INSERT INTO stats (id, streak, total_minutes) VALUES (1, 0, 0)");
    }

    // 保存数据库
    saveDatabase();

    console.log('[数据库] 初始化完成');
}

// 保存数据库到文件
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// ===== 打卡API =====

// 获取打卡记录
app.get('/api/checkins', (req, res) => {
    try {
        const result = db.exec('SELECT * FROM checkins ORDER BY date DESC');
        const checkins = result.length > 0 ? result[0].values.map(row => ({
            id: row[0],
            date: row[1],
            minutes: row[2],
            type: row[3],
            note: row[4],
            created_at: row[5]
        })) : [];
        res.json({ success: true, data: checkins });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 添加/更新打卡
app.post('/api/checkins', (req, res) => {
    try {
        const { date, minutes, type, note } = req.body;

        if (!date || !minutes || !type) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }

        // 检查是否存在
        const existing = db.exec(`SELECT id FROM checkins WHERE date = '${date}'`);

        if (existing.length > 0 && existing[0].values.length > 0) {
            db.run('UPDATE checkins SET minutes = ?, type = ?, note = ? WHERE date = ?', [minutes, type, note || '', date]);
        } else {
            db.run('INSERT INTO checkins (date, minutes, type, note) VALUES (?, ?, ?, ?)', [date, minutes, type, note || '']);
        }

        // 更新统计数据
        updateStats();
        saveDatabase();

        res.json({ success: true, message: '打卡成功' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取统计数据
app.get('/api/stats', (req, res) => {
    try {
        const result = db.exec("SELECT * FROM stats WHERE id = 1");
        const stats = result.length > 0 ? {
            streak: result[0].values[0][1],
            total_minutes: result[0].values[0][2]
        } : { streak: 0, total_minutes: 0 };
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

function updateStats() {
    // 计算连续天数
    const result = db.exec('SELECT date FROM checkins ORDER BY date DESC');
    const checkins = result.length > 0 ? result[0].values.map(row => row[0]) : [];

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < checkins.length; i++) {
        const checkDate = new Date(checkins[i]);
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);

        if (checkDate.toDateString() === expectedDate.toDateString()) {
            streak++;
        } else {
            break;
        }
    }

    // 计算总分钟数
    const totalResult = db.exec('SELECT SUM(minutes) as total FROM checkins');
    const totalMinutes = (totalResult.length > 0 && totalResult[0].values[0][0]) ? totalResult[0].values[0][0] : 0;

    db.run('UPDATE stats SET streak = ?, total_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [streak, totalMinutes]);
}

// ===== 视频API =====

// 获取视频列表
app.get('/api/videos', (req, res) => {
    try {
        const result = db.exec('SELECT * FROM videos ORDER BY created_at DESC');
        const videos = result.length > 0 ? result[0].values.map(row => ({
            id: row[0],
            url: row[1],
            title: row[2],
            category: row[3],
            created_at: row[4]
        })) : [];
        res.json({ success: true, data: videos });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 添加视频
app.post('/api/videos', (req, res) => {
    try {
        const { url, title, category } = req.body;

        if (!url || !title) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }

        db.run('INSERT INTO videos (url, title, category) VALUES (?, ?, ?)', [url, title, category || 'other']);
        saveDatabase();

        res.json({ success: true, data: { id: db.exec('SELECT last_insert_rowid()')[0].values[0][0] } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除视频
app.delete('/api/videos/:id', (req, res) => {
    try {
        db.run('DELETE FROM videos WHERE id = ?', [req.params.id]);
        saveDatabase();
        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== 就医记录API =====

// 获取就医记录
app.get('/api/medicals', (req, res) => {
    try {
        const result = db.exec('SELECT * FROM medicals ORDER BY date ASC');
        const medicals = result.length > 0 ? result[0].values.map(row => ({
            id: row[0],
            date: row[1],
            hospital: row[2],
            department: row[3],
            note: row[4],
            done: row[5] === 1,
            created_at: row[6]
        })) : [];
        res.json({ success: true, data: medicals });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 添加就医记录
app.post('/api/medicals', (req, res) => {
    try {
        const { date, hospital, department, note } = req.body;

        if (!date || !hospital) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }

        db.run('INSERT INTO medicals (date, hospital, department, note) VALUES (?, ?, ?, ?)',
            [date, hospital, department || '', note || '']);
        saveDatabase();

        res.json({ success: true, data: { id: db.exec('SELECT last_insert_rowid()')[0].values[0][0] } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新就医记录完成状态
app.patch('/api/medicals/:id', (req, res) => {
    try {
        const { done } = req.body;
        db.run('UPDATE medicals SET done = ? WHERE id = ?', [done ? 1 : 0, req.params.id]);
        saveDatabase();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 删除就医记录
app.delete('/api/medicals/:id', (req, res) => {
    try {
        db.run('DELETE FROM medicals WHERE id = ?', [req.params.id]);
        saveDatabase();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== 关怀消息API =====

// 获取关怀消息
app.get('/api/caring', (req, res) => {
    try {
        const hour = new Date().getHours();
        let message = '';

        // 根据时间返回不同消息
        if (hour < 9) {
            message = '早上好！新的一天开始啦，今天也要加油哦~';
        } else if (hour >= 12 && hour < 14) {
            message = '中午好，饭后散散步有助于消化~';
        } else if (hour >= 18 && hour < 20) {
            message = '晚上好，适当的夜练可以助眠哦~';
        } else if (hour >= 22) {
            message = '夜深了，早点休息，明天继续加油！';
        } else {
            const messages = [
                '今天天气不错，适当活动一下对身体好哦~',
                '早上起来伸个懒腰，一天都有精神！',
                '记得多喝水，运动后要补充水分哦',
                '今天你已经很棒了，休息一下也没关系的',
                '坚持就是胜利，每天进步一点点！',
                '运动时注意安全，慢慢来不要着急',
                '别忘了今天的运动计划哦，完成后会很开心的！',
                '您辛苦啦，今天也要好好爱自己'
            ];
            message = messages[Math.floor(Math.random() * messages.length)];
        }

        res.json({ success: true, data: { message, hour } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// AI生成关怀消息（需要接入LLM）
app.post('/api/caring/generate', async (req, res) => {
    try {
        const { context } = req.body;

        // TODO: 接入LLM API生成个性化关怀消息
        // 这里可以使用豆包、通义等API

        const message = '今天也要好好爱自己哦，运动是最好的保养品~';

        res.json({ success: true, data: { message } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== 定时任务：每日关怀 =====

// 每天早上8点发送关怀消息
cron.schedule('0 8 * * *', () => {
    console.log('[定时任务] 发送每日关怀消息');

    const message = '早上好！新的一天开始啦，今天也要加油哦~';
    db.run('INSERT INTO caring_messages (content) VALUES (?)', [message]);
    saveDatabase();

    console.log('[关怀消息已记录]', message);
});

// ===== 静态文件服务 =====

// 返回index.html用于SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../app/index.html'));
});

// ===== 启动服务 =====

async function startServer() {
    await initDatabase();

    app.listen(PORT, () => {
        console.log(`
========================================
  运动陪伴 App 后端服务已启动
  地址: http://localhost:${PORT}
========================================

  API 端点:
  - GET  /api/checkins    - 获取打卡记录
  - POST /api/checkins    - 添加打卡
  - GET  /api/stats       - 获取统计数据
  - GET  /api/videos      - 获取视频列表
  - POST /api/videos      - 添加视频
  - GET  /api/medicals    - 获取就医记录
  - POST /api/medicals    - 添加就医记录
  - GET  /api/caring      - 获取关怀消息

========================================
        `);
    });
}

startServer();