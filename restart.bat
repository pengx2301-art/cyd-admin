@echo off
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul
cd /d %~dp0
start "" /B node server.js > server_output.log 2> server_error.log
echo Server started.
