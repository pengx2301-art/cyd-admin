@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo    充易达管理系统 - 本地启动
echo ========================================
echo.

echo [1/3] 检查依赖...
if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
    echo [√] 依赖安装完成
) else (
    echo [√] 依赖已安装
)

echo.
echo [2/3] 启动服务器...
echo.
echo 服务器将在以下地址启动:
echo   http://localhost:8080
echo.
echo 按 Ctrl+C 可以停止服务器
echo.
echo ========================================
echo.

node server.js

if %errorlevel% neq 0 (
    echo.
    echo [X] 服务器启动失败
    echo.
    pause
)
