# Redis 性能测试工具 - 快速开始

## 🚀 立即开始

### 1. 确保 Redis 服务运行
```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server

# 或使用 Docker
docker run -d -p 6379:6379 redis:alpine
```

### 2. 启动应用
```bash
npm start
```

### 3. 打开浏览器
访问：http://localhost:3000

## 📊 快速测试步骤

1. **配置 Redis 连接**
   - 主机：localhost （默认）
   - 端口：6379 （默认）
   - 如有密码请填写

2. **设置测试参数**
   - 测试时长：30秒 （推荐）
   - 并发数：50 （可调整）
   - 键/值大小：使用默认值

3. **选择测试操作**
   - ✅ SET - 写入性能
   - ✅ GET - 读取性能  
   - ✅ HSET - 哈希写入
   - ✅ HGET - 哈希读取

4. **开始测试**
   - 点击"开始测试"按钮
   - 实时查看性能指标
   - 等待测试完成

## 🔧 故障排除

### Redis 连接失败
```bash
# 检查 Redis 是否运行
redis-cli ping
# 应该返回 PONG

# 检查端口是否占用
netstat -tulpn | grep :6379
```

### 应用端口冲突
```bash
# 使用自定义端口启动
PORT=8080 npm start
```

### 权限问题
```bash
# 确保有足够权限
sudo chown -R $USER:$USER .
```

## 📈 性能指标说明

- **操作/秒**：越高越好，表示吞吐量
- **平均延迟**：越低越好，单位毫秒
- **P95延迟**：95%请求的最大延迟
- **成功率**：应接近100%

## 🎯 建议测试场景

### 1. 基础性能测试
- 时长：30秒
- 并发：50
- 操作：SET + GET

### 2. 高并发测试  
- 时长：60秒
- 并发：200-500
- 操作：全部

### 3. 大数据测试
- 值大小：4096字节
- 并发：100
- 操作：SET + GET

需要帮助？查看完整文档：[README.md](./README.md)
