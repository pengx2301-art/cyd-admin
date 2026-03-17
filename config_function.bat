@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo    配置云函数 HTTP 触发器
echo ========================================
echo.

echo 正在为云函数 cyd-server 配置 HTTP 触发器...
echo.

tcb fn trigger create cyd-server --type http --name cyd-server-http

echo.
echo ========================================
echo   配置完成
echo ========================================
echo.
echo 现在您可以在 CloudBase 控制台查看触发器配置
echo 控制台: https://tcb.cloud.tencent.com/dev?envId=longxia-2gdgbb5782e17db6#/scf
echo.
pause
