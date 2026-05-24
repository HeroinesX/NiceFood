#!/bin/bash
#
# 🚀 优餐 (YouCan) - 一键启动脚本
#
# 零依赖运行！不需要 MongoDB，不需要 root 权限。
# 使用纯 JavaScript JSON 文件数据库 (.data/)
#
# 用法:
#   ./start.sh            启动前后端（首次自动安装依赖 + 导入种子数据）
#   ./start.sh --server   只启动后端 API
#   ./start.sh --seed     只重新导入种子数据
#   ./start.sh --build    构建前端生产版本
#   ./start.sh --help     查看帮助
#

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# ── 颜色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}ℹ️  $1${NC}"; }
ok()    { echo -e "${GREEN}✅ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()   { echo -e "${RED}❌ $1${NC}"; }
title() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

# ── 帮助 ──
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
  echo ""
  echo "  🚀 优餐 (YouCan) 启动脚本"
  echo ""
  echo "  用法:"
  echo "    ./start.sh           启动前后端开发服务器"
  echo "    ./start.sh --server  只启动后端 API"
  echo "    ./start.sh --seed    只重新导入种子数据"
  echo "    ./start.sh --build   构建生产版本"
  echo "    ./start.sh --help    显示帮助"
  echo ""
  echo "  说明:"
  echo "    • 使用本地 JSON 文件数据库 (.data/)，无需安装 MongoDB"
  echo "    • 纯 JavaScript，零原生依赖"
  echo "    • 前端 http://localhost:3000"
  echo "    • 后端 http://localhost:3001"
  echo "    • 管理员账号: admin / admin123"
  echo ""
  exit 0
fi

# ── 检查 Node.js ──
title "环境检查"
if ! command -v node &>/dev/null; then
  err "未找到 Node.js，请先安装 Node.js 18+"
  exit 1
fi
NODE_VER=$(node -v)
ok "Node.js $NODE_VER"

# ── 修复 vboxsf 共享文件夹的 node_modules ──
fix_node_modules() {
  # vboxsf 共享文件夹的 root:root 权限会导致 npm install 失败
  # 手动补全缺失的核心包
  local MISSING=0
  for pkg in cors jsonwebtoken express; do
    if ! node -e "require('$pkg')" 2>/dev/null; then
      MISSING=1
      warn "缺失依赖: $pkg"
    fi
  done

  if [[ "$MISSING" == "1" ]]; then
    info "补全依赖中..."
    # 检查核心包是否在本地
    for pkg in cors jsonwebtoken; do
      if [[ ! -d "node_modules/$pkg" ]]; then
        # 从 tarball 直接解压（绕过 npm install 的权限问题）
        local TMPDIR="/tmp/food-app-pkg"
        mkdir -p "$TMPDIR"
        curl -sL "https://registry.npmjs.org/$pkg/-/\$(npm view $pkg version 2>/dev/null || echo latest).tgz" -o "$TMPDIR/$pkg.tgz" 2>/dev/null || {
          warn "无法下载 $pkg，尝试备用方案..."
          continue
        }
        mkdir -p "node_modules/$pkg"
        tar -xzf "$TMPDIR/$pkg.tgz" -C "node_modules/$pkg" 2>/dev/null
        if [[ -d "node_modules/$pkg/package" ]]; then
          cp -r "node_modules/$pkg/package/"* "node_modules/$pkg/"
          rm -rf "node_modules/$pkg/package"
        fi
      fi
    done
    info "依赖补全完成"
  fi
}

# ── 安装依赖 ──
title "检查依赖"
fix_node_modules

# 验证所有核心依赖
DEPS_OK=true
for pkg in cors express jsonwebtoken; do
  if node -e "require('$pkg')" 2>/dev/null; then
    ok "$pkg ✓"
  else
    err "$pkg ✗ — 请尝试: npm install $pkg"
    DEPS_OK=false
  fi
done

if [[ "$DEPS_OK" == "false" ]]; then
  err "依赖缺失，请检查网络连接后重试"
  exit 1
fi

# ── 种子数据 ──
title "种子数据"
if [[ "$1" == "--seed" ]]; then
  info "重新导入种子数据..."
  node src/server/seed.js
  exit 0
fi

if [[ ! -f ".data/recipes.json" ]]; then
  info "首次启动，导入种子数据..."
  node src/server/seed.js
  ok "种子数据导入完成"
else
  RECIPE_COUNT=$(node -e "const d=require('./.data/recipes.json');console.log(d.length)" 2>/dev/null || echo "0")
  ok "数据已存在 ($RECIPE_COUNT 道菜谱)"
  if [[ "$RECIPE_COUNT" == "0" ]]; then
    warn "数据文件为空，重新导入..."
    node src/server/seed.js
  fi
fi

# ── 构建前端（生产模式） ──
if [[ "$1" == "--build" ]]; then
  title "构建前端"
  npm run build 2>/dev/null || warn "构建失败，请检查前端代码"
  ok "构建完成: $PROJECT_DIR/build/"
  echo ""
  echo "  启动生产服务器:"
  echo "    NODE_ENV=production node src/server/index.js"
  echo ""
  echo "  访问: http://localhost:3001"
  exit 0
fi

# ── 清理旧的进程 ──
kill $(lsof -ti:3000 2>/dev/null) 2>/dev/null || true
kill $(lsof -ti:3001 2>/dev/null) 2>/dev/null || true

# ── 启动 ──
title "启动服务器"

# 启动后端
info "启动后端 API (端口 3001)..."
node src/server/index.js &
BACKEND_PID=$!

sleep 1
if kill -0 $BACKEND_PID 2>/dev/null; then
  ok "后端已启动 http://localhost:3001"
else
  err "后端启动失败"
  exit 1
fi

# 只启动后端模式
if [[ "$1" == "--server" ]]; then
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║     🚀 优餐 后端服务已启动          ║${NC}"
  echo -e "${GREEN}╠══════════════════════════════════════╣${NC}"
  echo -e "${GREEN}║                                      ${NC}"
  echo -e "${GREEN}║   📡 API: http://localhost:3001/api  ${NC}"
  echo -e "${GREEN}║   👤 管理员: admin / admin123        ${NC}"
  echo -e "${GREEN}║                                      ${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
  echo ""
  info "按 Ctrl+C 停止"
  trap "kill $BACKEND_PID 2>/dev/null; ok '已停止'; exit 0" SIGINT SIGTERM
  wait
  exit 0
fi

# 启动前端
info "启动前端开发服务器 (端口 3000)..."
BROWSER=none npm start &
FRONTEND_PID=$!

# ── 显示信息 ──
echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        🚀 优餐 已启动               ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                      ${NC}"
echo -e "${GREEN}║   📡 前端: http://localhost:3000     ${NC}"
echo -e "${GREEN}║   📡 后端: http://localhost:3001     ${NC}"
echo -e "${GREEN}║   🗄️  数据库: .data/  (JSON 文件)   ${NC}"
echo -e "${GREEN}║   👤 管理员: admin / admin123        ${NC}"
echo -e "${GREEN}║                                      ${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
info "按 Ctrl+C 停止所有服务"

# ── 优雅关闭 ──
cleanup() {
  echo ""
  warn "正在关闭服务..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  ok "已停止"
  exit 0
}
trap cleanup SIGINT SIGTERM

wait
