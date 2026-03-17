@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo    Git 初始化和上传
echo ========================================
echo.

echo [1/6] 初始化 Git 仓库...
git init

echo.
echo [2/6] 添加所有文件到暂存区...
git add .

echo.
echo [3/6] 创建初始提交...
git commit -m "Initial commit: 充易达管理系统 v2.5.0"

echo.
echo [4/6] 检查远程仓库...
git remote -v

echo.
echo ========================================
echo   配置远程仓库
echo ========================================
echo.
echo 请提供 Git 仓库地址（GitHub / Gitee 等）
echo 例如：
echo   https://github.com/username/cyd-admin.git
echo   git@gitee.com:username/cyd-admin.git
echo.
set /p REPO_URL="请输入仓库地址: "

if "%REPO_URL%"=="" (
    echo [X] 未提供仓库地址，跳过远程配置
    goto :done
)

echo.
echo [5/6] 添加远程仓库...
git remote add origin %REPO_URL%

echo.
echo [6/6] 推送到远程仓库...
git branch -M main
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo [√] 推送成功！
) else (
    echo.
    echo [X] 推送失败，请检查：
    echo   1. 仓库地址是否正确
    echo   2. 是否有仓库访问权限
    echo   3. 是否配置了 SSH 密钥（如使用 SSH）
)

:done
echo.
echo ========================================
echo   完成
echo ========================================
echo.
pause
