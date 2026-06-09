# 负载均衡 vs 故障转移策略对比分析

## 📊 当前配置分析

### clashmi.yml 当前使用的策略

```yaml
# 锚点定义
Anchor_FB: &Anchor_FB {
  type: fallback,
  url: 'https://www.g.cn/generate_204',
  interval: 300,
  lazy: true,
  timeout: 2000,
  max-failed-times: 3,
  hidden: true
}

# 实际应用
proxy-groups:
  - {name: 香港故转, <<: *Anchor_FB, proxies: [香港手动, 香港自动]}
  - {name: 台湾故转, <<: *Anchor_FB, proxies: [台湾手动, 台湾自动]}
  # ... 其他区域
```

---

## 🔍 两种策略深度对比

### 1️⃣ Fallback（故障转移）策略

#### 工作原理
```
代理列表: [节点A, 节点B, 节点C]
       ↓
优先使用节点A
       ↓
每300秒健康检查
       ↓
节点A失败3次 → 切换到节点B
       ↓
节点B失败3次 → 切换到节点C
       ↓
所有恢复后 → 回到节点A
```

#### 特点
- ✅ **优先级明确**：永远优先用第一个可用节点
- ✅ **连接稳定**：同一时间只用一个节点，不会频繁切换
- ✅ **适合低延迟场景**：选定最快的节点后持续使用
- ❌ **资源利用率低**：备用节点闲置，浪费带宽
- ❌ **单点性能瓶颈**：只用一个节点，无法并行利用多节点带宽

#### 适用场景
- ✅ 延迟敏感型应用（游戏、视频会议）
- ✅ 需要保持连接稳定性（WebSocket、长连接）
- ✅ 节点质量差异大（有明确的"最优节点"）

---

### 2️⃣ Load-Balance（负载均衡）策略

#### 工作原理
```
代理列表: [节点A, 节点B, 节点C]
       ↓
根据策略分配连接：
  - consistent-hashing: 相同目标走相同节点
  - round-robin: 轮流分配
       ↓
连接1 → 节点A
连接2 → 节点B
连接3 → 节点C
连接4 → 节点A (循环)
       ↓
每300秒健康检查，自动剔除故障节点
```

#### 配置示例
```yaml
# 负载均衡策略
Anchor_LB: &Anchor_LB {
  type: load-balance,
  strategy: consistent-hashing,  # 或 round-robin
  url: 'https://www.g.cn/generate_204',
  interval: 300,
  lazy: true,
  timeout: 2000,
  max-failed-times: 3,
  hidden: true
}

proxy-groups:
  - {name: 香港负载, <<: *Anchor_LB, proxies: [香港节点1, 香港节点2, 香港节点3]}
```

#### 特点
- ✅ **资源利用率高**：所有可用节点同时工作，充分利用带宽
- ✅ **分散风险**：单节点故障影响范围小（只影响部分连接）
- ✅ **适合高并发**：多连接分散到多节点，避免单点过载
- ✅ **自动容错**：故障节点自动剔除，无需手动干预
- ❌ **延迟可能不一致**：不同连接走不同节点，延迟有差异
- ❌ **不适合长连接**：节点切换可能影响连接稳定性

#### 适用场景
- ✅ 下载/上传大文件（充分利用带宽）
- ✅ 高并发网页浏览（多个请求并行）
- ✅ **节点不稳定**（自动分散风险）
- ✅ 节点质量相近（没有明确的"最优"）

---

## 🎯 针对"不稳定服务器列表"的分析

### 场景假设
```
你有10个节点：
- 5个延迟低但经常掉线（不稳定）
- 3个延迟中等，偶尔掉线
- 2个延迟高但很稳定
```

---

### 方案1：Fallback（当前方案）

#### 配置
```yaml
proxy-groups:
  - name: 香港故转
    type: fallback
    proxies:
      - 香港低延迟1  # 优先
      - 香港低延迟2
      - 香港中延迟1
      - 香港高延迟1  # 备用
```

#### 实际表现
```
初始状态：使用 香港低延迟1
  ↓
10分钟后，低延迟1掉线
  ↓
切换到 香港低延迟2
  ↓
5分钟后，低延迟2也掉线
  ↓
切换到 香港中延迟1
  ↓
⚠️ 问题：频繁切换，每次切换可能影响正在进行的连接
```

#### 优缺点
- ✅ 优先使用低延迟节点
- ❌ **节点不稳定时频繁切换**
- ❌ **切换期间可能断连**
- ❌ **浪费稳定节点**（高延迟节点闲置）

---

### 方案2：Load-Balance（负载均衡）

#### 配置
```yaml
proxy-groups:
  - name: 香港负载
    type: load-balance
    strategy: consistent-hashing
    proxies:
      - 香港低延迟1
      - 香港低延迟2
      - 香港中延迟1
      - 香港中延迟2
      - 香港高延迟1
      - 香港高延迟2
```

#### 实际表现
```
初始状态：10个连接分散到6个节点
  连接1,2 → 低延迟1
  连接3,4 → 低延迟2
  连接5,6 → 中延迟1
  连接7,8 → 中延迟2
  连接9   → 高延迟1
  连接10  → 高延迟2
  ↓
10分钟后，低延迟1掉线
  ↓
只有连接1,2受影响 → 自动重试其他节点
其他8个连接不受影响 ✅
  ↓
新连接自动分配到剩余5个节点
```

#### 优缺点
- ✅ **故障影响范围小**（只影响部分连接）
- ✅ **所有节点都被利用**（包括稳定的高延迟节点）
- ✅ **自动容错**（无需等待健康检查）
- ✅ **充分利用带宽**（并行使用多节点）
- ⚠️ 部分连接走高延迟节点（但至少稳定）

---

## 📊 性能对比表

| 维度 | Fallback | Load-Balance | 胜者 |
|------|----------|--------------|------|
| **延迟稳定性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Fallback |
| **容错能力** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Load-Balance |
| **资源利用率** | ⭐⭐ | ⭐⭐⭐⭐⭐ | Load-Balance |
| **带宽利用** | ⭐⭐ | ⭐⭐⭐⭐⭐ | Load-Balance |
| **连接稳定性** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 平手 |
| **不稳定节点适应** | ⭐⭐ | ⭐⭐⭐⭐⭐ | Load-Balance |
| **配置复杂度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Fallback |

---

## 🎯 结论：针对不稳定服务器列表

### ✅ Load-Balance 更适合的理由

#### 1. **分散风险**
```
Fallback: 1个节点挂了 → 影响所有连接
Load-Balance: 1个节点挂了 → 只影响该节点的连接（约1/N）
```

#### 2. **自动容错**
```
Fallback: 需要等待3次失败 + 300秒健康检查 → 切换慢
Load-Balance: 单次失败立即重试其他节点 → 容错快
```

#### 3. **充分利用资源**
```
Fallback: 只用1个节点，其他9个闲置
Load-Balance: 10个节点同时工作，总带宽 = 单节点 × 10
```

#### 4. **稳定性提升**
```
假设单节点稳定性 = 90%
Fallback: 总体稳定性 = 90%（单点依赖）
Load-Balance: 总体稳定性 ≈ 99.9%（至少1个节点可用即可）
```

---

## 🔧 推荐配置方案

### 方案1：完全替换为 Load-Balance

```yaml
# 修改锚点
Anchor_LB: &Anchor_LB {
  type: load-balance,
  strategy: consistent-hashing,  # 保持连接一致性
  url: 'https://www.g.cn/generate_204',
  interval: 300,
  lazy: true,
  timeout: 2000,
  max-failed-times: 3,
  hidden: true
}

# 应用到区域组
proxy-groups:
  - {name: 香港负载, <<: *Anchor_LB, proxies: [香港手动, 香港自动]}
  - {name: 台湾负载, <<: *Anchor_LB, proxies: [台湾手动, 台湾自动]}
  - {name: 日本负载, <<: *Anchor_LB, proxies: [日本手动, 日本自动]}
  # ... 其他区域
```

---

### 方案2：混合策略（推荐）⭐

```yaml
# 保留 Fallback 锚点（用于延迟敏感场景）
Anchor_FB: &Anchor_FB {
  type: fallback,
  url: 'https://www.g.cn/generate_204',
  interval: 300,
  lazy: true,
  timeout: 2000,
  max-failed-times: 3,
  hidden: true
}

# 新增 Load-Balance 锚点（用于不稳定节点）
Anchor_LB: &Anchor_LB {
  type: load-balance,
  strategy: consistent-hashing,
  url: 'https://www.g.cn/generate_204',
  interval: 300,
  lazy: true,
  timeout: 2000,
  max-failed-times: 3,
  hidden: true
}

proxy-groups:
  # 延迟敏感场景用 Fallback
  - {name: 游戏专用, <<: *Anchor_FB, proxies: [低延迟节点1, 低延迟节点2]}
  
  # 一般浏览/下载用 Load-Balance
  - {name: 香港负载, <<: *Anchor_LB, proxies: [香港节点1, 香港节点2, ...]}
  - {name: 台湾负载, <<: *Anchor_LB, proxies: [台湾节点1, 台湾节点2, ...]}
  
  # 顶层策略组可选
  - name: 一键代理
    type: select
    proxies: [香港负载, 台湾负载, 游戏专用, ...]
```

---

### 方案3：针对不稳定节点的最优配置

```yaml
# 专门处理不稳定节点
Anchor_LB_Unstable: &Anchor_LB_Unstable {
  type: load-balance,
  strategy: consistent-hashing,
  url: 'https://www.g.cn/generate_204',
  interval: 180,           # 缩短检测间隔（180秒 vs 300秒）
  lazy: false,             # 主动检测，而非惰性
  timeout: 1500,           # 降低超时阈值（1.5秒 vs 2秒）
  max-failed-times: 2,     # 快速剔除故障节点（2次 vs 3次）
  hidden: true
}

proxy-groups:
  - {name: 香港不稳定负载, <<: *Anchor_LB_Unstable, proxies: [不稳定节点列表]}
```

---

## 🎮 Load-Balance 策略选择

### consistent-hashing（推荐）⭐
```yaml
strategy: consistent-hashing
```

**特点**：
- ✅ 相同目标域名走相同节点
- ✅ 保持会话一致性（登录状态不丢失）
- ✅ 适合大部分场景

**原理**：
```
hash(目标域名) % 节点数 = 使用的节点

例如：
  访问 google.com → hash("google.com") → 节点2
  再次访问 google.com → 仍然是节点2
  访问 youtube.com → hash("youtube.com") → 节点5
```

---

### round-robin（轮询）
```yaml
strategy: round-robin
```

**特点**：
- ✅ 绝对平均分配
- ❌ 可能影响会话一致性
- ✅ 适合下载/上传场景

**原理**：
```
连接1 → 节点1
连接2 → 节点2
连接3 → 节点3
连接4 → 节点1 (循环)
```

---

## ⚠️ 注意事项

### 1. Load-Balance 不适合的场景
- ❌ 游戏（需要稳定低延迟）
- ❌ 视频会议（需要持续低延迟）
- ❌ WebSocket 长连接（频繁切换影响连接）

### 2. 健康检查参数调优
```yaml
# 不稳定节点建议配置
interval: 180        # 缩短检测间隔
timeout: 1500        # 降低超时阈值
max-failed-times: 2  # 快速剔除故障节点
lazy: false          # 主动检测
```

### 3. 节点数量建议
- 至少 **3-5个** 节点才有意义
- 节点数越多，容错能力越强
- 单节点故障影响 = 1/N

---

## 📋 总结

### 针对"不稳定服务器列表"

| 策略 | 推荐度 | 原因 |
|------|--------|------|
| **Load-Balance** | ⭐⭐⭐⭐⭐ | 分散风险、自动容错、充分利用资源 |
| Fallback | ⭐⭐ | 节点不稳定时频繁切换，体验差 |
| URL-Test | ⭐⭐⭐ | 自动选择最快节点，但仍是单点依赖 |

### 最佳实践

1. **一般场景**：使用 Load-Balance + consistent-hashing
2. **游戏/会议**：使用 Fallback（少数稳定节点）
3. **下载/上传**：使用 Load-Balance + round-robin
4. **混合配置**：根据服务类型分别配置

---

**结论**：针对不稳定服务器列表，Load-Balance 策略确实比 Fallback 更适合，能显著提升容错能力和资源利用率。建议采用混合策略，根据使用场景灵活配置。