@echo off
chcp 65001 >nul
echo ========================================
echo    CloudBase 登录工具
echo ========================================
echo.
echo 正在启动登录流程...
echo.
powershell -ExecutionPolicy Bypass -NoProfile -Command "tcb login"
echo.
echo ========================================
echo 按任意键退出...
pause >nul
