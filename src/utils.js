// 工具函数模块

/**
 * 格式化字节数为可读字符串
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的字符串
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时间毫秒数为可读字符串
 * @param {number} milliseconds 毫秒数
 * @returns {string} 格式化后的字符串
 */
function formatTime(milliseconds) {
  if (milliseconds < 1) {
    return (milliseconds * 1000).toFixed(2) + 'μs';
  } else if (milliseconds < 1000) {
    return milliseconds.toFixed(2) + 'ms';
  } else {
    return (milliseconds / 1000).toFixed(2) + 's';
  }
}

/**
 * 生成随机字符串
 * @param {number} length 字符串长度
 * @returns {string} 随机字符串
 */
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 计算数组的百分位数
 * @param {number[]} arr 数值数组
 * @param {number} percentile 百分位数 (0-100)
 * @returns {number} 百分位数值
 */
function calculatePercentile(arr, percentile) {
  if (arr.length === 0) return 0;
  
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * percentile / 100) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * 验证 Redis 连接配置
 * @param {object} config Redis 配置对象
 * @returns {object} 验证结果
 */
function validateRedisConfig(config) {
  const errors = [];
  
  // 验证主机地址
  if (!config.host || typeof config.host !== 'string') {
    errors.push('主机地址不能为空');
  }
  
  // 验证端口
  const port = parseInt(config.port);
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push('端口必须是 1-65535 之间的数字');
  }
  
  // 验证数据库编号
  const database = parseInt(config.database);
  if (isNaN(database) || database < 0 || database > 15) {
    errors.push('数据库编号必须是 0-15 之间的数字');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * 验证测试配置参数
 * @param {object} config 测试配置对象
 * @returns {object} 验证结果
 */
function validateTestConfig(config) {
  const errors = [];
  
  // 验证测试时长
  const duration = parseInt(config.testDuration);
  if (isNaN(duration) || duration < 1 || duration > 300) {
    errors.push('测试时长必须是 1-300 秒之间的数字');
  }
  
  // 验证并发数
  const concurrency = parseInt(config.concurrency);
  if (isNaN(concurrency) || concurrency < 1 || concurrency > 1000) {
    errors.push('并发数必须是 1-1000 之间的数字');
  }
  
  // 验证键长度
  const keySize = parseInt(config.keySize);
  if (isNaN(keySize) || keySize < 1 || keySize > 1024) {
    errors.push('键长度必须是 1-1024 字节之间的数字');
  }
  
  // 验证值大小
  const valueSize = parseInt(config.valueSize);
  if (isNaN(valueSize) || valueSize < 1 || valueSize > 10240) {
    errors.push('值大小必须是 1-10240 字节之间的数字');
  }
  
  // 验证测试类型
  if (!Array.isArray(config.testTypes) || config.testTypes.length === 0) {
    errors.push('必须选择至少一种测试操作类型');
  }
  
  const validTypes = ['set', 'get', 'hset', 'hget'];
  const invalidTypes = config.testTypes.filter(type => !validTypes.includes(type.toLowerCase()));
  if (invalidTypes.length > 0) {
    errors.push(`无效的测试类型: ${invalidTypes.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * 格式化测试结果为表格数据
 * @param {object} results 测试结果对象
 * @returns {array} 表格数据数组
 */
function formatResultsForTable(results) {
  if (!results.details) return [];
  
  return Object.entries(results.details).map(([operation, data]) => ({
    operation: operation.toUpperCase(),
    iterations: data.iterations,
    successes: data.successes,
    failures: data.failures,
    successRate: ((data.successes / data.iterations) * 100).toFixed(1) + '%',
    avgTime: data.avgTime.toFixed(2) + 'ms',
    minTime: data.minTime.toFixed(2) + 'ms',
    maxTime: data.maxTime.toFixed(2) + 'ms',
    p50: (data.p50 || 0).toFixed(2) + 'ms',
    p95: (data.p95 || 0).toFixed(2) + 'ms',
    p99: (data.p99 || 0).toFixed(2) + 'ms',
    ops: (data.ops || 0).toFixed(0) + ' ops/s'
  }));
}

/**
 * 生成性能测试报告
 * @param {object} results 测试结果
 * @returns {string} 报告文本
 */
function generateReport(results) {
  if (!results.summary || !results.details) {
    return '无测试结果数据';
  }
  
  let report = '# Redis 性能测试报告\n\n';
  report += `测试时间: ${results.summary.startTime} - ${results.summary.endTime}\n`;
  report += `测试时长: ${(results.summary.testDuration / 1000).toFixed(1)} 秒\n\n`;
  
  report += '## 总体统计\n';
  report += `- 总操作数: ${results.summary.totalOperations.toLocaleString()}\n`;
  report += `- 成功操作: ${results.summary.totalSuccesses.toLocaleString()}\n`;
  report += `- 失败操作: ${results.summary.totalFailures.toLocaleString()}\n`;
  report += `- 成功率: ${results.summary.successRate}\n`;
  report += `- 平均吞吐量: ${results.summary.avgOpsPerSecond} ops/s\n\n`;
  
  report += '## 详细结果\n';
  for (const [operation, data] of Object.entries(results.details)) {
    report += `\n### ${operation.toUpperCase()} 操作\n`;
    report += `- 操作次数: ${data.iterations.toLocaleString()}\n`;
    report += `- 成功率: ${((data.successes / data.iterations) * 100).toFixed(1)}%\n`;
    report += `- 平均延迟: ${data.avgTime.toFixed(2)}ms\n`;
    report += `- 最小延迟: ${data.minTime.toFixed(2)}ms\n`;
    report += `- 最大延迟: ${data.maxTime.toFixed(2)}ms\n`;
    report += `- P50 延迟: ${(data.p50 || 0).toFixed(2)}ms\n`;
    report += `- P95 延迟: ${(data.p95 || 0).toFixed(2)}ms\n`;
    report += `- P99 延迟: ${(data.p99 || 0).toFixed(2)}ms\n`;
    report += `- 吞吐量: ${(data.ops || 0).toFixed(0)} ops/s\n`;
  }
  
  if (results.errors && results.errors.length > 0) {
    report += '\n## 错误信息\n';
    results.errors.slice(0, 10).forEach((error, index) => {
      report += `${index + 1}. [${error.operation}] ${error.error}\n`;
    });
    
    if (results.errors.length > 10) {
      report += `... 还有 ${results.errors.length - 10} 个错误\n`;
    }
  }
  
  return report;
}

/**
 * 深拷贝对象
 * @param {object} obj 要拷贝的对象
 * @returns {object} 深拷贝后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * 节流函数
 * @param {function} func 要节流的函数
 * @param {number} limit 节流间隔时间（毫秒）
 * @returns {function} 节流后的函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

/**
 * 防抖函数
 * @param {function} func 要防抖的函数
 * @param {number} delay 防抖延迟时间（毫秒）
 * @returns {function} 防抖后的函数
 */
function debounce(func, delay) {
  let timeoutId;
  return function() {
    const args = arguments;
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(context, args), delay);
  }
}

module.exports = {
  formatBytes,
  formatTime,
  generateRandomString,
  calculatePercentile,
  validateRedisConfig,
  validateTestConfig,
  formatResultsForTable,
  generateReport,
  deepClone,
  throttle,
  debounce
};
