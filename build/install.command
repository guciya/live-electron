#!/bin/bash
# ============================================================
#  NikoLive 一键安装脚本 (双击 install.command 即触发)
#  - 把 DMG 里的 NikoLive.app 复制到 /Applications
#  - 清除 Gatekeeper 隔离属性（首次双击绕过安全提示）
#  - 自动启动 NikoLive
#  - 卸载 DMG
# ============================================================

set -u

APP_NAME="NikoLive.app"
TARGET_DIR="/Applications"
VOLUME_NAME="NikoLive"

# ---------- 1. 找到当前 DMG 的挂载点 ----------
# install.command 自身的父目录就是 DMG 根
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NikoLive 正在安装到你的 Mac..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 也尝试通过卷名匹配（容错）
if [ ! -d "$SCRIPT_DIR/$APP_NAME" ]; then
  SCRIPT_DIR=$(find /Volumes -maxdepth 1 -type d -name "NikoLive*" 2>/dev/null | head -n 1)
fi

if [ -z "$SCRIPT_DIR" ] || [ ! -d "$SCRIPT_DIR/$APP_NAME" ]; then
  echo ""
  echo "❌ 没找到 $APP_NAME"
  echo "   请确认你是双击 DMG 里的「安装.command」"
  echo ""
  read -p "按回车关闭..."
  exit 1
fi

echo ""
echo "📂 源: $SCRIPT_DIR/$APP_NAME"
echo "🎯 目标: $TARGET_DIR/$APP_NAME"

# ---------- 2. 关闭正在运行的旧版本 ----------
if pgrep -f "$TARGET_DIR/$APP_NAME" > /dev/null 2>&1; then
  echo "🔄 检测到旧版本正在运行，正在关闭..."
  osascript -e "tell application \"$APP_NAME\" to quit" 2>/dev/null || true
  sleep 1
fi

# ---------- 3. 复制到 /Applications（覆盖旧版） ----------
echo "📦 复制应用到 /Applications..."
ditto "$SCRIPT_DIR/$APP_NAME" "$TARGET_DIR/$APP_NAME"
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ 复制失败"
  echo "   可能是权限问题，请把 NikoLive.app 拖到 /Applications 手动安装"
  echo ""
  read -p "按回车关闭..."
  exit 1
fi

# ---------- 4. 清除 Gatekeeper 隔离属性 ----------
echo "🔓 清除安全隔离属性..."
xattr -r -d com.apple.quarantine "$TARGET_DIR/$APP_NAME" 2>/dev/null || true

# ---------- 5. 卸载 DMG ----------
echo "💿 卸载安装盘..."
DMG_VOLUME=$(basename "$SCRIPT_DIR")
if [ -d "/Volumes/$DMG_VOLUME" ]; then
  hdiutil detach "/Volumes/$DMG_VOLUME" -quiet 2>/dev/null || true
fi

# ---------- 6. 自动打开 ----------
echo "🚀 启动 NikoLive..."
open "$TARGET_DIR/$APP_NAME"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ 安装完成！窗口即将自动关闭"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 延迟关闭终端窗口（用户能看到完成提示）
sleep 2
osascript -e 'tell application "Terminal" to if (count of windows) > 0 then close front window' 2>/dev/null || true
