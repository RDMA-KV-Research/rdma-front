const redis = require('redis');
const EventEmitter = require('events');
const moment = require('moment');

class RedisTestRunner extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
    this.testStartTime = null;
    this.testEndTime = null;
    this.isRunning = false;
    this.results = {
      summary: {},
      details: {},
      errors: []
    };
  }

  async createClient() {
    const clientConfig = {
      socket: {
        host: this.config.host,
        port: this.config.port
      }
    };

    if (this.config.password) {
      clientConfig.password = this.config.password;
    }

    if (this.config.database) {
      clientConfig.database = this.config.database;
    }

    this.client = redis.createClient(clientConfig);

    this.client.on('error', (err) => {
      this.emit('error', err);
    });

    await this.client.connect();
    return this.client;
  }

  generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async testSet(iterations, keyPrefix, valueSize) {
    const results = {
      operation: 'SET',
      iterations: iterations,
      successes: 0,
      failures: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      times: []
    };

    const value = this.generateRandomString(valueSize);

    for (let i = 0; i < iterations; i++) {
      const key = `${keyPrefix}:set:${i}`;
      const startTime = process.hrtime.bigint();

      try {
        await this.client.set(key, value);
        const endTime = process.hrtime.bigint();
        const operationTime = Number(endTime - startTime) / 1000000; // 转换为毫秒

        results.successes++;
        results.times.push(operationTime);
        results.totalTime += operationTime;
        results.minTime = Math.min(results.minTime, operationTime);
        results.maxTime = Math.max(results.maxTime, operationTime);

      } catch (error) {
        results.failures++;
        this.results.errors.push({
          operation: 'SET',
          key: key,
          error: error.message,
          timestamp: new Date()
        });
      }

      // 每100次操作报告一次进度
      if (i % 100 === 0) {
        this.emit('progress', {
          operation: 'SET',
          completed: i + 1,
          total: iterations,
          avgTime: results.totalTime / results.successes || 0
        });
      }
    }

    results.avgTime = results.totalTime / results.successes || 0;
    results.ops = results.successes / (results.totalTime / 1000) || 0;
    return results;
  }

  async testGet(iterations, keyPrefix) {
    const results = {
      operation: 'GET',
      iterations: iterations,
      successes: 0,
      failures: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      times: []
    };

    for (let i = 0; i < iterations; i++) {
      const key = `${keyPrefix}:set:${Math.floor(Math.random() * iterations)}`;
      const startTime = process.hrtime.bigint();

      try {
        await this.client.get(key);
        const endTime = process.hrtime.bigint();
        const operationTime = Number(endTime - startTime) / 1000000;

        results.successes++;
        results.times.push(operationTime);
        results.totalTime += operationTime;
        results.minTime = Math.min(results.minTime, operationTime);
        results.maxTime = Math.max(results.maxTime, operationTime);

      } catch (error) {
        results.failures++;
        this.results.errors.push({
          operation: 'GET',
          key: key,
          error: error.message,
          timestamp: new Date()
        });
      }

      if (i % 100 === 0) {
        this.emit('progress', {
          operation: 'GET',
          completed: i + 1,
          total: iterations,
          avgTime: results.totalTime / results.successes || 0
        });
      }
    }

    results.avgTime = results.totalTime / results.successes || 0;
    results.ops = results.successes / (results.totalTime / 1000) || 0;
    return results;
  }

  async testHSet(iterations, keyPrefix, valueSize) {
    const results = {
      operation: 'HSET',
      iterations: iterations,
      successes: 0,
      failures: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      times: []
    };

    const value = this.generateRandomString(valueSize);

    for (let i = 0; i < iterations; i++) {
      const key = `${keyPrefix}:hash:${Math.floor(i / 10)}`;
      const field = `field:${i}`;
      const startTime = process.hrtime.bigint();

      try {
        await this.client.hSet(key, field, value);
        const endTime = process.hrtime.bigint();
        const operationTime = Number(endTime - startTime) / 1000000;

        results.successes++;
        results.times.push(operationTime);
        results.totalTime += operationTime;
        results.minTime = Math.min(results.minTime, operationTime);
        results.maxTime = Math.max(results.maxTime, operationTime);

      } catch (error) {
        results.failures++;
        this.results.errors.push({
          operation: 'HSET',
          key: key,
          field: field,
          error: error.message,
          timestamp: new Date()
        });
      }

      if (i % 100 === 0) {
        this.emit('progress', {
          operation: 'HSET',
          completed: i + 1,
          total: iterations,
          avgTime: results.totalTime / results.successes || 0
        });
      }
    }

    results.avgTime = results.totalTime / results.successes || 0;
    results.ops = results.successes / (results.totalTime / 1000) || 0;
    return results;
  }

  async testHGet(iterations, keyPrefix) {
    const results = {
      operation: 'HGET',
      iterations: iterations,
      successes: 0,
      failures: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      times: []
    };

    for (let i = 0; i < iterations; i++) {
      const key = `${keyPrefix}:hash:${Math.floor(Math.random() * (iterations / 10))}`;
      const field = `field:${Math.floor(Math.random() * iterations)}`;
      const startTime = process.hrtime.bigint();

      try {
        await this.client.hGet(key, field);
        const endTime = process.hrtime.bigint();
        const operationTime = Number(endTime - startTime) / 1000000;

        results.successes++;
        results.times.push(operationTime);
        results.totalTime += operationTime;
        results.minTime = Math.min(results.minTime, operationTime);
        results.maxTime = Math.max(results.maxTime, operationTime);

      } catch (error) {
        results.failures++;
        this.results.errors.push({
          operation: 'HGET',
          key: key,
          field: field,
          error: error.message,
          timestamp: new Date()
        });
      }

      if (i % 100 === 0) {
        this.emit('progress', {
          operation: 'HGET',
          completed: i + 1,
          total: iterations,
          avgTime: results.totalTime / results.successes || 0
        });
      }
    }

    results.avgTime = results.totalTime / results.successes || 0;
    results.ops = results.successes / (results.totalTime / 1000) || 0;
    return results;
  }

  calculatePercentile(sortedArray, percentile) {
    const index = Math.ceil(sortedArray.length * percentile / 100) - 1;
    return sortedArray[Math.max(0, index)];
  }

  async start() {
    if (this.isRunning) {
      throw new Error('测试已在运行中');
    }

    this.isRunning = true;
    this.testStartTime = Date.now();

    try {
      // 连接 Redis
      await this.createClient();
      this.emit('progress', { phase: 'connected', message: '已连接到 Redis 服务器' });

      // 计算每种操作的迭代次数
      const totalIterations = this.config.testDuration * 1000; // 基于测试时长估算
      const iterationsPerOperation = Math.floor(totalIterations / this.config.testTypes.length);
      const keyPrefix = `perf_test_${Date.now()}`;

      this.emit('progress', { 
        phase: 'starting', 
        message: `开始性能测试 - ${iterationsPerOperation} 次操作 x ${this.config.testTypes.length} 种操作类型` 
      });

      // 执行各种测试
      for (const testType of this.config.testTypes) {
        if (!this.isRunning) break;

        this.emit('progress', { phase: 'testing', operation: testType, message: `正在测试 ${testType.toUpperCase()} 操作` });

        let result;
        switch (testType.toLowerCase()) {
          case 'set':
            result = await this.testSet(iterationsPerOperation, keyPrefix, this.config.valueSize);
            break;
          case 'get':
            result = await this.testGet(iterationsPerOperation, keyPrefix);
            break;
          case 'hset':
            result = await this.testHSet(iterationsPerOperation, keyPrefix, this.config.valueSize);
            break;
          case 'hget':
            result = await this.testHGet(iterationsPerOperation, keyPrefix);
            break;
          default:
            continue;
        }

        // 计算统计信息
        if (result.times.length > 0) {
          const sortedTimes = result.times.slice().sort((a, b) => a - b);
          result.p50 = this.calculatePercentile(sortedTimes, 50);
          result.p95 = this.calculatePercentile(sortedTimes, 95);
          result.p99 = this.calculatePercentile(sortedTimes, 99);
        }

        this.results.details[testType] = result;
        this.emit('result', result);
      }

      // 清理测试数据
      if (this.isRunning) {
        this.emit('progress', { phase: 'cleanup', message: '正在清理测试数据' });
        
        try {
          // 删除测试键（使用 SCAN 和 DEL）
          const keys = await this.client.keys(`${keyPrefix}:*`);
          if (keys.length > 0) {
            await this.client.del(keys);
          }
        } catch (error) {
          console.warn('清理测试数据时出错:', error.message);
        }
      }

      this.testEndTime = Date.now();
      
      // 生成汇总报告
      this.generateSummary();
      
      this.emit('completed', this.results);

    } catch (error) {
      this.emit('error', error);
    } finally {
      this.isRunning = false;
      if (this.client) {
        try {
          await this.client.quit();
        } catch (error) {
          console.warn('关闭 Redis 连接时出错:', error.message);
        }
      }
    }
  }

  generateSummary() {
    const totalDuration = this.testEndTime - this.testStartTime;
    let totalOperations = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;
    let totalOps = 0;

    for (const [operation, result] of Object.entries(this.results.details)) {
      totalOperations += result.iterations;
      totalSuccesses += result.successes;
      totalFailures += result.failures;
      totalOps += result.ops || 0;
    }

    this.results.summary = {
      testDuration: totalDuration,
      totalOperations: totalOperations,
      totalSuccesses: totalSuccesses,
      totalFailures: totalFailures,
      successRate: (totalSuccesses / totalOperations * 100).toFixed(2) + '%',
      avgOpsPerSecond: (totalOps).toFixed(2),
      startTime: moment(this.testStartTime).format('YYYY-MM-DD HH:mm:ss'),
      endTime: moment(this.testEndTime).format('YYYY-MM-DD HH:mm:ss'),
      config: this.config,
      errorCount: this.results.errors.length
    };
  }

  stop() {
    this.isRunning = false;
  }
}

function createTestRunner(config) {
  return new RedisTestRunner(config);
}

module.exports = {
  createTestRunner,
  RedisTestRunner
};
