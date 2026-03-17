@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo    CloudBase 最终部署
echo ========================================
echo.
echo 环境: longxia-2gdgbb5782e17db6
echo 应用: cyd-admin
echo.
echo 开始部署...
echo.

tcb framework deploy

echo.
echo ========================================
echo   部署完成
echo ========================================
echo.
pause
