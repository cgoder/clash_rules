# FlClash 覆写脚本使用指南

## 📥 如何使用

FlClash 的脚本模式**不支持远程订阅**，只能手动复制粘贴。

### 方法一：从 GitHub 复制（推荐）

1. 访问：https://github.com/cgoder/clash_rules/blob/main/flclash_override.js
2. 点击右上角 **Raw** 按钮
3. 全选复制（Ctrl+A / Cmd+A）
4. FlClash → 配置 → 覆写 → **脚本模式**
5. 粘贴内容 → 保存

### 方法二：本地文件

1. 克隆仓库：
   ```bash
   git clone https://github.com/cgoder/clash_rules.git
   ```
2. 打开 `clash_rules/flclash_override.js`
3. 复制全部内容到 FlClash 脚本模式

## 🔄 如何更新

当脚本更新后，需要**手动重新复制粘贴**：

1. 查看更新日志：https://github.com/cgoder/clash_rules/commits/main/flclash_override.js
2. 如果有更新，重新执行上述步骤
3. 保存后自动生效

## ⚙️ 配置说明

### 覆写开关

```javascript
// 完全覆盖订阅规则（推荐 true）
const OVERRIDE_RULES = true;

// 完全覆盖订阅策略组（推荐 true）
const OVERRIDE_GROUPS = true;
```

### 策略组顺序

按照定义顺序显示（Proxy 始终在第一位）：
1. Proxy（核心出站）
2. AI / Media / Comm / Cloud / Finance（场景服务）
3. Apple / Microsoft / Domestic（直连优先）
4. Final（漏网之鱼）
5. Auto / HK / TW / SG / US（自动选择 + 常用地区）
6. Asia / NorthAmerica / Europe（大洲）

### 自定义规则

已内置 60 条自定义规则：
- **my_proxy.list**：43 条代理规则（Cloudflare、linux.do 等）
- **my_direct.list**：17 条直连规则（gh-proxy、AI 中转等）

## 📊 功能特性

| 功能 | 说明 |
|------|------|
| ✅ 策略组覆盖 | 删除订阅策略组，使用脚本定义的 18 个组 |
| ✅ 规则覆盖 | 删除订阅规则，使用脚本定义的 ~90 条规则 |
| ✅ 自定义规则 | 集成 my_proxy.list 和 my_direct.list |
| ✅ 地区分组 | HK/TW/SG/US 独立分组 + 大洲分组 |
| ✅ 兜底规则 | MATCH,Final 漏网之鱼 |
| ✅ 固定顺序 | 策略组按定义顺序显示 |

## 🔍 日志输出

启用脚本后，FlClash 日志会显示：

```
🚀 FlClash 配置脚本 v3.0 开始执行
📦 订阅节点数量: 50
📋 订阅策略组数量: 5
📜 订阅规则数量: 120
🔥 完全覆盖模式: 清空订阅的 5 个策略组
✅ 添加代理组: Proxy (10 个代理)
✅ 添加代理组: Auto (45 个代理)
✅ 添加代理组: HK (12 个代理)
✅ 添加代理组: TW (8 个代理)
✅ 添加代理组: SG (10 个代理)
✅ 添加代理组: US (15 个代理)
... (其他策略组)
🔥 完全覆盖模式: 清空订阅的 120 条规则
✅ 应用脚本规则: 93 条
📊 最终策略组数量: 18
📊 最终规则数量: 93
🎉 FlClash 配置更新完成
```

## ❓ 常见问题

### 1. 为什么不支持远程订阅？

FlClash 的脚本模式只支持本地脚本，不支持通过 URL 自动更新。这是 FlClash 的设计限制。

### 2. 如何知道脚本有更新？

- 关注 GitHub 仓库：https://github.com/cgoder/clash_rules
- 查看 Commits：https://github.com/cgoder/clash_rules/commits/main/flclash_override.js
- 订阅 Release 通知

### 3. 修改脚本后需要重启吗？

不需要。保存脚本后，FlClash 会自动重新加载配置。

### 4. 如何自定义规则？

直接修改脚本中的 `RULES` 数组，按照 Clash 规则格式添加：

```javascript
const RULES = [
  // 添加自定义规则
  "DOMAIN-SUFFIX,example.com,Proxy",
  "DOMAIN-KEYWORD,google,Proxy",
  "IP-CIDR,1.2.3.0/24,DIRECT",
  // ... 其他规则
];
```

### 5. 如何添加地区节点过滤？

修改 `PROXY_GROUPS` 中的 `match` 正则表达式：

```javascript
{
  name: "JP",  // 新增日本分组
  type: "url-test",
  match: /(日本|🇯🇵|\bJP\b|\bJPN\b|Japan)/i,
  url: "https://www.gstatic.com/generate_204",
  interval: 300,
  tolerance: 80
}
```

## 📝 版本历史

- **v3.0** (2025-06-13)
  - ✅ 完全覆盖订阅策略组
  - ✅ 固定策略组显示顺序
  - ✅ 集成自定义规则（my_proxy + my_direct）

- **v2.0** (2025-06-13)
  - ✅ 完全覆盖订阅规则
  - ✅ 添加兜底规则
  - ✅ 详细日志输出

- **v1.0** (2025-06-13)
  - 初始版本

## 🔗 相关文件

- **完整配置**：[clashmi.yml](https://github.com/cgoder/clash_rules/blob/main/clashmi.yml)
- **通用 override**：[clash_override.yml](https://github.com/cgoder/clash_rules/blob/main/clash_override.yml)
- **Surge/QX 脚本**：[clash_override.js](https://github.com/cgoder/clash_rules/blob/main/clash_override.js)
- **FlClash 脚本**：[flclash_override.js](https://github.com/cgoder/clash_rules/blob/main/flclash_override.js)

## 📧 反馈

遇到问题或有建议？请提交 [Issue](https://github.com/cgoder/clash_rules/issues)
