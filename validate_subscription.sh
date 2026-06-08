#!/bin/bash
# 完整的订阅节点分组检测脚本（使用配置文件中的真实过滤器）
#
# 用法: ./test_complete_final.sh <订阅URL>
# 示例: ./test_complete_final.sh "https://example.com/sub.yaml"

if [ $# -eq 0 ]; then
    echo "错误: 缺少订阅URL参数"
    echo ""
    echo "用法: $0 <订阅URL>"
    echo "示例: $0 \"https://example.com/sub.yaml\""
    exit 1
fi

SUBSCRIPTION_URL="$1"

echo "=========================================="
echo "   订阅节点分组完整性检测"
echo "=========================================="
echo ""
echo "订阅URL: $SUBSCRIPTION_URL"
echo ""

CONFIG="C:/Users/tienchiu/code/github/clash_rules/clashmi.yml"
TEMP_SUB="/tmp/subscription.yaml"

# 步骤1：下载订阅
echo "【步骤1】下载订阅数据..."
rtk proxy curl -sL "$SUBSCRIPTION_URL" -o "$TEMP_SUB" 2>/dev/null
if [ $? -ne 0 ] || [ ! -s "$TEMP_SUB" ]; then
    echo "❌ 订阅下载失败"
    exit 1
fi
echo "✅ 订阅下载成功"
echo ""

# 步骤2：提取真实节点（排除策略组和信息行）
echo "【步骤2】提取真实节点..."
rtk proxy grep "name:" "$TEMP_SUB" | \
    sed "s/.*name: //" | \
    sed "s/,.*//" | \
    sed "s/^'//" | \
    sed "s/'$//" | \
    grep -v "剩余流量" | \
    grep -v "距离下次重置" | \
    grep -v "套餐到期" | \
    grep -v "去除.*线路" | \
    grep -v "跳转域名" | \
    grep -v "请勿连接" | \
    grep -v "www\." | \
    grep -v "自动选择" | \
    grep -v "故障转移" | \
    grep -v "^NCloud$" | \
    grep -v "^\(PROXY\|AUTO\|FALLBACK\|OPENAI\|YOUTUBE\|DIRECT\|REJECT\)$" > /tmp/real_nodes_only.txt

total_nodes=$(wc -l < /tmp/real_nodes_only.txt)
echo "✅ 共提取 $total_nodes 个真实节点"
echo ""

# 步骤3：统计国家/地区分布
echo "【步骤3】统计国家/地区分布..."
declare -A country_count

while IFS= read -r node; do
    # 提取国家代码（支持中文名称、emoji和英文缩写）
    if [[ "$node" =~ 美国|🇺🇸|US|USA ]]; then country="US"
    elif [[ "$node" =~ 香港|🇭🇰|HKG|HK ]]; then country="HK"
    elif [[ "$node" =~ 台湾|台灣|🇹🇼|TW ]]; then country="TW"
    elif [[ "$node" =~ 新加坡|🇸🇬|SG|SGP ]]; then country="SG"
    elif [[ "$node" =~ 日本|🇯🇵|JP|JPN ]]; then country="JP"
    elif [[ "$node" =~ 韩国|韓國|🇰🇷|KR|KOR ]]; then country="KR"
    elif [[ "$node" =~ 德国|德國|🇩🇪|DE|DEU ]]; then country="DE"
    elif [[ "$node" =~ 英国|英國|🇬🇧|GB|UK ]]; then country="GB"
    elif [[ "$node" =~ 法国|法國|🇫🇷|FR|FRA ]]; then country="FR"
    elif [[ "$node" =~ 加拿大|🇨🇦|CA|CAN ]]; then country="CA"
    elif [[ "$node" =~ 罗马尼亚|羅馬尼亞|🇷🇴|RO|ROM ]]; then country="RO"
    elif [[ "$node" =~ 爱尔兰|🇮🇪|IE|IRL ]]; then country="IE"
    elif [[ "$node" =~ 荷兰|荷蘭|🇳🇱|NL ]]; then country="NL"
    elif [[ "$node" =~ 奥地利|🇦🇹|AT|AUT ]]; then country="AT"
    elif [[ "$node" =~ 匈牙利|🇭🇺|HU|HUN ]]; then country="HU"
    elif [[ "$node" =~ 瑞典|🇸🇪|SE|SWE ]]; then country="SE"
    elif [[ "$node" =~ 泰国|泰國|🇹🇭|TH ]]; then country="TH"
    elif [[ "$node" =~ 印尼|印度尼西亚|🇮🇩|ID ]]; then country="ID"
    elif [[ "$node" =~ 俄罗斯|俄羅斯|🇷🇺|RU ]]; then country="RU"
    elif [[ "$node" =~ 波兰|🇵🇱|PL|POL ]]; then country="PL"
    elif [[ "$node" =~ 土耳其|🇹🇷|TR|TUR ]]; then country="TR"
    elif [[ "$node" =~ 🇺🇳|UN ]]; then country="UN"
    elif [[ "$node" =~ 澳大利亚|🇦🇺|AU|AUS ]]; then country="AU"
    elif [[ "$node" =~ 巴西|🇧🇷|BR|BRA ]]; then country="BR"
    elif [[ "$node" =~ 墨西哥|🇲🇽|MX|MEX ]]; then country="MX"
    else country="OTHER"
    fi
    ((country_count[$country]++))
done < /tmp/real_nodes_only.txt

echo "国家/地区分布:"
for country in $(echo "${!country_count[@]}" | tr ' ' '\n' | sort); do
    printf "  %-10s: %3d 个节点\n" "$country" "${country_count[$country]}"
done
echo ""

# 步骤4：提取配置文件中的完整过滤器
echo "【步骤4】从配置文件提取过滤器..."

# 提取过滤器（移除正则语法）
filter_hk=$(grep "Anchor_HK:" "$CONFIG" | sed "s/.*(?=\.\*(//" | sed "s/)).*//" | tr -d "'")
filter_tw=$(grep "Anchor_TW:" "$CONFIG" | sed "s/.*(?=\.\*(//" | sed "s/)).*//" | tr -d "'")
filter_sg=$(grep "Anchor_SG:" "$CONFIG" | sed "s/.*(?=\.\*(//" | sed "s/)).*//" | tr -d "'")
filter_jp=$(grep "Anchor_JP:" "$CONFIG" | sed "s/.*(?=\.\*(//" | sed "s/)).*//" | tr -d "'")
filter_us=$(grep "Anchor_US:" "$CONFIG" | sed "s/.*(?=\.\*(//" | sed "s/)).*//" | tr -d "'")
filter_as=$(grep "Anchor_AS:" "$CONFIG" | sed "s/.*(?=\.\*(//" | sed "s/)).*//" | tr -d "'")
filter_eu=$(grep "Anchor_EU:" "$CONFIG" | sed "s/.*(?=\.\*(//" | sed "s/)).*//" | tr -d "'")
filter_am=$(grep "Anchor_AM:" "$CONFIG" | sed "s/.*(?=\.\*(//" | sed "s/)).*//" | tr -d "'")

echo "✅ 过滤器已提取"
echo ""

# 步骤5：分组统计
echo "【步骤5】节点分组统计..."

count_hk=0; count_tw=0; count_sg=0; count_jp=0; count_us=0
count_as=0; count_eu=0; count_am=0; count_ot=0
unmatched=()

while IFS= read -r node; do
    matched=0

    echo "$node" | grep -qiE "$filter_hk" && ((count_hk++)) && matched=1
    echo "$node" | grep -qiE "$filter_tw" && ((count_tw++)) && matched=1
    echo "$node" | grep -qiE "$filter_sg" && ((count_sg++)) && matched=1
    echo "$node" | grep -qiE "$filter_jp" && ((count_jp++)) && matched=1
    echo "$node" | grep -qiE "$filter_us" && ((count_us++)) && matched=1
    echo "$node" | grep -qiE "$filter_as" && ((count_as++)) && matched=1
    echo "$node" | grep -qiE "$filter_eu" && ((count_eu++)) && matched=1
    echo "$node" | grep -qiE "$filter_am" && ((count_am++)) && matched=1

    if [ $matched -eq 0 ]; then
        ((count_ot++))
        unmatched+=("$node")
    fi
done < /tmp/real_nodes_only.txt

printf "%-25s: %3d 个节点\n" "香港负载均衡/速度优先" $count_hk
printf "%-25s: %3d 个节点\n" "台湾负载均衡/速度优先" $count_tw
printf "%-25s: %3d 个节点\n" "新加坡负载均衡/速度优先" $count_sg
printf "%-25s: %3d 个节点\n" "日本负载均衡/速度优先" $count_jp
printf "%-25s: %3d 个节点\n" "美国负载均衡/速度优先" $count_us
printf "%-25s: %3d 个节点\n" "亚洲手动" $count_as
printf "%-25s: %3d 个节点\n" "欧洲手动" $count_eu
printf "%-25s: %3d 个节点\n" "美洲手动" $count_am
printf "%-25s: %3d 个节点\n" "其他手动" $count_ot

echo ""

# 步骤6：显示未匹配节点
echo "【步骤6】未匹配到任何组的节点..."
if [ ${#unmatched[@]} -eq 0 ]; then
    echo "✅ 无（所有节点都至少在一个组中）"
else
    echo "❌ 发现 ${#unmatched[@]} 个未匹配节点:"
    for node in "${unmatched[@]}"; do
        echo "  $node"
    done
fi
echo ""

# 最终报告
echo "=========================================="
echo "   最终报告"
echo "=========================================="
echo ""
echo "总节点数: $total_nodes"
echo ""

if [ ${#unmatched[@]} -eq 0 ]; then
    echo "✅ 所有节点都已正确分组，无遗漏！"
    echo ""
    echo "分组说明:"
    echo "  • 常用地区（HK/TW/SG/JP/US）节点在对应的LB/UT组中"
    echo "  • 所有亚洲节点都在'亚洲手动'组中"
    echo "  • 所有欧洲节点都在'欧洲手动'组中"
    echo "  • 所有美洲节点都在'美洲手动'组中"
    echo "  • AU/UN等节点在'其他手动'组中"
else
    echo "❌ 存在未分配节点，需要检查过滤器"
fi
echo ""
