// 全局变量
let socket = null;
let isTestRunning = false;
let currentTestSession = null;
let opsChart = null;
let latencyChart = null;
let testStartTime = null;
let progressInterval = null;

// DOM 元素
const elements = {
    // 连接状态
    connectionStatus: document.getElementById('connectionStatus'),
    
    // 配置表单
    redisHost: document.getElementById('redisHost'),
    redisPort: document.getElementById('redisPort'),
    redisPassword: document.getElementById('redisPassword'),
    redisDatabase: document.getElementById('redisDatabase'),
    testDuration: document.getElementById('testDuration'),
    concurrency: document.getElementById('concurrency'),
    keySize: document.getElementById('keySize'),
    valueSize: document.getElementById('valueSize'),
    testSet: document.getElementById('testSet'),
    testGet: document.getElementById('testGet'),
    testHset: document.getElementById('testHset'),
    testHget: document.getElementById('testHget'),
    
    // 控制按钮
    startTestBtn: document.getElementById('startTestBtn'),
    stopTestBtn: document.getElementById('stopTestBtn'),
    clearResultsBtn: document.getElementById('clearResultsBtn'),
    
    // 状态显示
    testStatus: document.getElementById('testStatus'),
    progressBar: document.getElementById('progressBar'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    currentOperation: document.getElementById('currentOperation'),
    
    // 性能指标
    opsPerSecond: document.getElementById('opsPerSecond'),
    avgLatency: document.getElementById('avgLatency'),
    successRate: document.getElementById('successRate'),
    errorCount: document.getElementById('errorCount'),
    
    // 结果和日志
    resultsContent: document.getElementById('resultsContent'),
    logsContent: document.getElementById('logsContent')
};

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    connectWebSocket();
    setupEventListeners();
    initializeCharts();
    addLog('应用已启动', 'info');
}

// WebSocket 连接
function connectWebSocket() {
    try {
        socket = io();
        
        socket.on('connect', () => {
            updateConnectionStatus(true);
            addLog('已连接到服务器', 'success');
        });
        
        socket.on('disconnect', () => {
            updateConnectionStatus(false);
            addLog('与服务器断开连接', 'error');
        });
        
        socket.on('testStarted', handleTestStarted);
        socket.on('testProgress', handleTestProgress);
        socket.on('testResult', handleTestResult);
        socket.on('testCompleted', handleTestCompleted);
        socket.on('testError', handleTestError);
        socket.on('testStopped', handleTestStopped);
        
    } catch (error) {
        console.error('WebSocket 连接失败:', error);
        addLog(`WebSocket 连接失败: ${error.message}`, 'error');
    }
}

// 更新连接状态
function updateConnectionStatus(connected) {
    const statusElement = elements.connectionStatus;
    if (connected) {
        statusElement.className = 'connection-status connected';
        statusElement.innerHTML = '<i class="fas fa-circle"></i><span>已连接</span>';
    } else {
        statusElement.className = 'connection-status disconnected';
        statusElement.innerHTML = '<i class="fas fa-circle"></i><span>未连接</span>';
    }
}

// 设置事件监听器
function setupEventListeners() {
    elements.startTestBtn.addEventListener('click', startTest);
    elements.stopTestBtn.addEventListener('click', stopTest);
    elements.clearResultsBtn.addEventListener('click', clearResults);
}

// 获取测试配置
function getTestConfig() {
    const testTypes = [];
    if (elements.testSet.checked) testTypes.push('set');
    if (elements.testGet.checked) testTypes.push('get');
    if (elements.testHset.checked) testTypes.push('hset');
    if (elements.testHget.checked) testTypes.push('hget');
    
    return {
        host: elements.redisHost.value.trim() || 'localhost',
        port: parseInt(elements.redisPort.value) || 6379,
        password: elements.redisPassword.value.trim(),
        database: parseInt(elements.redisDatabase.value) || 0,
        testDuration: parseInt(elements.testDuration.value) || 30,
        concurrency: parseInt(elements.concurrency.value) || 50,
        keySize: parseInt(elements.keySize.value) || 64,
        valueSize: parseInt(elements.valueSize.value) || 1024,
        testTypes: testTypes
    };
}

// 验证配置
function validateConfig(config) {
    if (!config.testTypes.length) {
        throw new Error('请至少选择一种测试操作类型');
    }
    
    if (config.testDuration < 1 || config.testDuration > 300) {
        throw new Error('测试时长必须在 1-300 秒之间');
    }
    
    if (config.concurrency < 1 || config.concurrency > 1000) {
        throw new Error('并发数必须在 1-1000 之间');
    }
    
    return true;
}

// 开始测试
function startTest() {
    if (isTestRunning) {
        addLog('测试已在运行中', 'warning');
        return;
    }
    
    try {
        const config = getTestConfig();
        validateConfig(config);
        
        if (!socket || !socket.connected) {
            throw new Error('未连接到服务器');
        }
        
        // 重置 UI 状态
        resetTestUI();
        setTestRunning(true);
        
        // 发送测试配置
        socket.emit('startTest', config);
        addLog(`开始 Redis 性能测试 - ${config.host}:${config.port}`, 'info');
        
    } catch (error) {
        addLog(`启动测试失败: ${error.message}`, 'error');
        setTestRunning(false);
    }
}

// 停止测试
function stopTest() {
    if (!isTestRunning) {
        addLog('没有正在运行的测试', 'warning');
        return;
    }
    
    if (socket && socket.connected) {
        socket.emit('stopTest');
        addLog('正在停止测试...', 'info');
    }
}

// 清除结果
function clearResults() {
    elements.resultsContent.innerHTML = '<div class="no-results"><i class="fas fa-inbox"></i><p>暂无测试结果</p></div>';
    elements.logsContent.innerHTML = '';
    
    // 重置图表
    if (opsChart) {
        opsChart.data.labels = [];
        opsChart.data.datasets[0].data = [];
        opsChart.update();
    }
    
    if (latencyChart) {
        latencyChart.data.labels = [];
        latencyChart.data.datasets[0].data = [];
        latencyChart.update();
    }
    
    // 重置指标
    updateMetrics({
        opsPerSecond: 0,
        avgLatency: 0,
        successRate: 0,
        errorCount: 0
    });
    
    addLog('已清除所有测试结果', 'info');
}

// 设置测试运行状态
function setTestRunning(running) {
    isTestRunning = running;
    elements.startTestBtn.disabled = running;
    elements.stopTestBtn.disabled = !running;
    
    if (running) {
        elements.testStatus.textContent = '正在测试';
        elements.testStatus.className = 'value pulse';
        testStartTime = Date.now();
    } else {
        elements.testStatus.textContent = '待机';
        elements.testStatus.className = 'value';
        testStartTime = null;
        
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    }
}

// 重置测试 UI
function resetTestUI() {
    updateProgress(0, '准备中...');
    elements.currentOperation.textContent = '无';
    updateMetrics({
        opsPerSecond: 0,
        avgLatency: 0,
        successRate: 0,
        errorCount: 0
    });
}

// 更新进度
function updateProgress(percentage, text) {
    elements.progressFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    elements.progressText.textContent = text || `${percentage.toFixed(1)}%`;
}

// 更新性能指标
function updateMetrics(metrics) {
    if (metrics.opsPerSecond !== undefined) {
        elements.opsPerSecond.textContent = Number(metrics.opsPerSecond).toLocaleString('zh-CN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }
    
    if (metrics.avgLatency !== undefined) {
        elements.avgLatency.textContent = `${Number(metrics.avgLatency).toFixed(2)}ms`;
    }
    
    if (metrics.successRate !== undefined) {
        elements.successRate.textContent = `${Number(metrics.successRate).toFixed(1)}%`;
    }
    
    if (metrics.errorCount !== undefined) {
        elements.errorCount.textContent = Number(metrics.errorCount).toLocaleString('zh-CN');
    }
}

// 添加日志条目
function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span>${message}`;
    
    elements.logsContent.appendChild(logEntry);
    elements.logsContent.scrollTop = elements.logsContent.scrollHeight;
    
    // 限制日志条目数量
    const logEntries = elements.logsContent.querySelectorAll('.log-entry');
    if (logEntries.length > 100) {
        logEntries[0].remove();
    }
}

// 初始化图表
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: '时间'
                }
            },
            y: {
                display: true,
                beginAtZero: true
            }
        }
    };
    
    // 操作吞吐量图表
    const opsCtx = document.getElementById('opsChart').getContext('2d');
    opsChart = new Chart(opsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '操作/秒',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: {
                    ...chartOptions.scales.y,
                    title: {
                        display: true,
                        text: '操作/秒'
                    }
                }
            }
        }
    });
    
    // 延迟图表
    const latencyCtx = document.getElementById('latencyChart').getContext('2d');
    latencyChart = new Chart(latencyCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '平均延迟 (ms)',
                data: [],
                borderColor: '#f39c12',
                backgroundColor: 'rgba(243, 156, 18, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: {
                    ...chartOptions.scales.y,
                    title: {
                        display: true,
                        text: '延迟 (ms)'
                    }
                }
            }
        }
    });
}

// 更新图表数据
function updateCharts(data) {
    const currentTime = new Date().toLocaleTimeString();
    
    // 更新操作吞吐量图表
    if (data.ops !== undefined && opsChart) {
        opsChart.data.labels.push(currentTime);
        opsChart.data.datasets[0].data.push(data.ops);
        
        // 保持最多 20 个数据点
        if (opsChart.data.labels.length > 20) {
            opsChart.data.labels.shift();
            opsChart.data.datasets[0].data.shift();
        }
        
        opsChart.update('none');
    }
    
    // 更新延迟图表
    if (data.avgTime !== undefined && latencyChart) {
        latencyChart.data.labels.push(currentTime);
        latencyChart.data.datasets[0].data.push(data.avgTime);
        
        // 保持最多 20 个数据点
        if (latencyChart.data.labels.length > 20) {
            latencyChart.data.labels.shift();
            latencyChart.data.datasets[0].data.shift();
        }
        
        latencyChart.update('none');
    }
}

// WebSocket 事件处理函数

function handleTestStarted(data) {
    currentTestSession = data.sessionId;
    addLog(data.message, 'success');
    
    // 开始进度更新
    progressInterval = setInterval(() => {
        if (testStartTime && isTestRunning) {
            const elapsed = Date.now() - testStartTime;
            const totalDuration = data.config.testDuration * 1000;
            const percentage = Math.min((elapsed / totalDuration) * 100, 100);
            updateProgress(percentage);
        }
    }, 1000);
}

function handleTestProgress(data) {
    addLog(`${data.operation} 操作进度: ${data.completed}/${data.total} (${data.avgTime.toFixed(2)}ms)`, 'info');
    
    elements.currentOperation.textContent = data.operation.toUpperCase();
    
    // 更新实时指标
    updateMetrics({
        avgLatency: data.avgTime,
        opsPerSecond: data.completed / ((Date.now() - testStartTime) / 1000) || 0
    });
}

function handleTestResult(data) {
    addLog(`${data.operation} 操作完成: ${data.successes} 成功, ${data.failures} 失败, 平均 ${data.avgTime.toFixed(2)}ms`, 'success');
    
    // 更新图表
    updateCharts(data);
    
    // 更新指标
    const successRate = (data.successes / data.iterations) * 100;
    updateMetrics({
        opsPerSecond: data.ops || 0,
        avgLatency: data.avgTime || 0,
        successRate: successRate,
        errorCount: data.failures
    });
    
    // 显示详细结果
    displayDetailedResult(data);
}

function handleTestCompleted(data) {
    setTestRunning(false);
    updateProgress(100, '测试完成');
    elements.currentOperation.textContent = '已完成';
    
    addLog('所有测试已完成', 'success');
    displayFinalResults(data);
}

function handleTestError(error) {
    setTestRunning(false);
    elements.testStatus.textContent = '错误';
    addLog(`测试出错: ${error.message}`, 'error');
}

function handleTestStopped(data) {
    setTestRunning(false);
    elements.testStatus.textContent = '已停止';
    addLog(data.message, 'warning');
}

// 显示详细结果
function displayDetailedResult(data) {
    // 如果还没有结果表格，创建一个
    let table = document.querySelector('.results-table');
    if (!table) {
        elements.resultsContent.innerHTML = `
            <table class="results-table">
                <thead>
                    <tr>
                        <th>操作类型</th>
                        <th>总次数</th>
                        <th>成功</th>
                        <th>失败</th>
                        <th>成功率</th>
                        <th>平均延迟</th>
                        <th>最小延迟</th>
                        <th>最大延迟</th>
                        <th>P50</th>
                        <th>P95</th>
                        <th>P99</th>
                        <th>吞吐量</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        `;
        table = document.querySelector('.results-table');
    }
    
    const tbody = table.querySelector('tbody');
    const row = document.createElement('tr');
    row.className = 'fade-in';
    
    const successRate = ((data.successes / data.iterations) * 100).toFixed(1);
    
    row.innerHTML = `
        <td><strong>${data.operation}</strong></td>
        <td>${data.iterations.toLocaleString()}</td>
        <td style="color: #27ae60">${data.successes.toLocaleString()}</td>
        <td style="color: #e74c3c">${data.failures.toLocaleString()}</td>
        <td>${successRate}%</td>
        <td>${data.avgTime.toFixed(2)}ms</td>
        <td>${data.minTime.toFixed(2)}ms</td>
        <td>${data.maxTime.toFixed(2)}ms</td>
        <td>${(data.p50 || 0).toFixed(2)}ms</td>
        <td>${(data.p95 || 0).toFixed(2)}ms</td>
        <td>${(data.p99 || 0).toFixed(2)}ms</td>
        <td>${(data.ops || 0).toFixed(0)} ops/s</td>
    `;
    
    tbody.appendChild(row);
}

// 显示最终结果
function displayFinalResults(data) {
    // 添加汇总信息
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'test-summary fade-in';
    summaryDiv.innerHTML = `
        <h3><i class="fas fa-chart-bar"></i> 测试汇总</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <span class="label">测试时长:</span>
                <span class="value">${(data.summary.testDuration / 1000).toFixed(1)} 秒</span>
            </div>
            <div class="summary-item">
                <span class="label">总操作数:</span>
                <span class="value">${data.summary.totalOperations.toLocaleString()}</span>
            </div>
            <div class="summary-item">
                <span class="label">成功操作:</span>
                <span class="value" style="color: #27ae60">${data.summary.totalSuccesses.toLocaleString()}</span>
            </div>
            <div class="summary-item">
                <span class="label">失败操作:</span>
                <span class="value" style="color: #e74c3c">${data.summary.totalFailures.toLocaleString()}</span>
            </div>
            <div class="summary-item">
                <span class="label">整体成功率:</span>
                <span class="value">${data.summary.successRate}</span>
            </div>
            <div class="summary-item">
                <span class="label">平均吞吐量:</span>
                <span class="value">${data.summary.avgOpsPerSecond} ops/s</span>
            </div>
        </div>
    `;
    
    elements.resultsContent.insertBefore(summaryDiv, elements.resultsContent.firstChild);
    
    addLog(`测试汇总 - 总操作: ${data.summary.totalOperations}, 成功率: ${data.summary.successRate}`, 'success');
}
