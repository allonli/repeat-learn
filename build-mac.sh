#!/bin/bash

# 彩色输出函数
function echo_color {
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  BLUE='\033[0;34m'
  NC='\033[0m' # No Color
  
  case $1 in
    "info") echo -e "${BLUE}[INFO]${NC} $2" ;;
    "success") echo -e "${GREEN}[SUCCESS]${NC} $2" ;;
    "error") echo -e "${RED}[ERROR]${NC} $2" ;;
    *) echo "$2" ;;
  esac
}

# 设置错误时退出
set -e

# 开始构建
echo_color "info" "开始构建 Mac 应用..."

# 清理旧的构建文件
echo_color "info" "清理旧的构建文件..."
rm -rf dist
rm -rf node_modules/.cache

# 检查 package.json 是否存在
if [ ! -f package.json ]; then
  echo_color "error" "package.json 不存在！"
  exit 1
fi

# 安装依赖
echo_color "info" "安装依赖..."
npm install --save-dev electron@^28.1.0 electron-builder@^24.9.1 rimraf@^5.0.5

# 检查 main.js 是否正确配置
echo_color "info" "检查 main.js 配置..."
grep -q "nodeIntegration: true" main.js || echo_color "info" "警告: main.js 中可能没有正确配置 nodeIntegration"

# 构建应用
echo_color "info" "构建 Mac 应用..."
npx electron-builder build --mac --x64 --arm64 

# 检查构建是否成功
if [ $? -eq 0 ]; then
  echo_color "success" "Mac 应用构建成功!"
  
  # 显示构建产物位置
  DMG_PATH=$(find dist -name "*.dmg" | head -n 1)
  APP_PATH=$(find dist -name "*.app" | head -n 1)
  
  echo_color "info" "安装包位置: $DMG_PATH"
  echo_color "info" "应用程序位置: $APP_PATH"
  
  # 清理编译残留
  echo_color "info" "清理编译残留..."
  rm -rf node_modules/.cache
  rm -rf .webpack
  
  # 打开包含构建产物的文件夹
  open dist
  
  echo_color "success" "构建和清理完成!"
else
  echo_color "error" "构建失败! 请检查错误信息."
  exit 1
fi 