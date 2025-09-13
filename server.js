const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const redisTest = require('./src/redisTest');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 存储测试会话
const testSessions = new Map();

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log('客户端已连接:', socket.id);

  // 开始性能测试
  socket.on('startTest', async (config) => {
    console.log('开始 Redis 性能测试:', config);
    
    // 验证配置
    const testConfig = {
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password || '',
      database: config.database || 0,
      testDuration: config.testDuration || 30,
      concurrency: config.concurrency || 50,
      keySize: config.keySize || 64,
      valueSize: config.valueSize || 1024,
      testTypes: config.testTypes || ['set', 'get', 'hset', 'hget']
    };

    try {
      // 创建测试会话
      const sessionId = socket.id;
      testSessions.set(sessionId, {
        config: testConfig,
        startTime: Date.now(),
        status: 'running'
      });

      // 发送测试开始事件
      socket.emit('testStarted', {
        sessionId,
        config: testConfig,
        message: 'Redis 性能测试已开始'
      });

      // 开始测试并监听进度
      const testRunner = redisTest.createTestRunner(testConfig);
      
      testRunner.on('progress', (data) => {
        socket.emit('testProgress', data);
      });

      testRunner.on('result', (data) => {
        socket.emit('testResult', data);
      });

      testRunner.on('completed', (finalResults) => {
        testSessions.get(sessionId).status = 'completed';
        socket.emit('testCompleted', finalResults);
        console.log('测试完成:', finalResults.summary);
      });

      testRunner.on('error', (error) => {
        testSessions.get(sessionId).status = 'error';
        socket.emit('testError', {
          message: error.message,
          stack: error.stack
        });
        console.error('测试错误:', error);
      });

      // 启动测试
      await testRunner.start();

    } catch (error) {
      socket.emit('testError', {
        message: error.message,
        stack: error.stack
      });
      console.error('启动测试失败:', error);
    }
  });

  // 停止测试
  socket.on('stopTest', () => {
    const session = testSessions.get(socket.id);
    if (session && session.status === 'running') {
      session.status = 'stopped';
      socket.emit('testStopped', { message: '测试已停止' });
      console.log('测试被用户停止:', socket.id);
    }
  });

  // 获取测试状态
  socket.on('getTestStatus', () => {
    const session = testSessions.get(socket.id);
    socket.emit('testStatus', session || { status: 'idle' });
  });

  // 断开连接
  socket.on('disconnect', () => {
    testSessions.delete(socket.id);
    console.log('客户端断开连接:', socket.id);
  });
});

// REST API 端点
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeSessions: testSessions.size
  });
});

app.get('/api/sessions', (req, res) => {
  const sessions = Array.from(testSessions.entries()).map(([id, session]) => ({
    id,
    status: session.status,
    startTime: session.startTime,
    config: session.config
  }));
  res.json(sessions);
});

// 静态文件服务
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`Redis 性能测试服务器运行在 http://localhost:${PORT}`);
  console.log('等待客户端连接...');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('接收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
