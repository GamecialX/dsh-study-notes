@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

rem ============================================================
rem  学习笔记 · 本地学习门户 一键启动（Windows）
rem  用法：双击本文件；也可在命令行传入端口，如
rem        启动学习服务器.bat 9000
rem  依赖：系统里存在 Python 3 或 Node.js 之一即可，零安装、零联网。
rem ============================================================

set "PORT=%~1"
if not defined PORT set "PORT=8765"

echo.
echo   ============================================================
echo     学习笔记 · 本地学习门户
echo     笔记根目录：%CD%
echo   ============================================================
echo.

rem ---------- 1. 探测可用运行时 ----------
set "KIND="
set "PY="

python -c "import sys" 1>nul 2>nul
if errorlevel 1 goto :try_py
set "KIND=python"
set "PY=python"
goto :runtime_ok

:try_py
py -3 -c "import sys" 1>nul 2>nul
if errorlevel 1 goto :try_node
set "KIND=python"
set "PY=py -3"
goto :runtime_ok

:try_node
node -e "process.exit(0)" 1>nul 2>nul
if errorlevel 1 goto :no_runtime
set "KIND=node"
goto :runtime_ok

rem ---------- 2. 找一个没被占用的端口（默认 8765，至多 +5） ----------
:runtime_ok
set /a TRIES=0
:port_check
rem 判断端口是否真的被占用：只看 LISTENING 的行，避免把 TIME_WAIT 连接里
rem 作为「本地/远端端口」出现的同一数字误判为占用。
rem 用 for /f 收集结果而不是靠管道后的 errorlevel —— 后者的取值不可靠。
set "BUSY="
for /f "delims=" %%L in ('netstat -an ^| findstr /c:"LISTENING" ^| findstr /c:":%PORT% "') do set "BUSY=1"
if not defined BUSY goto :port_ok
set /a PORT+=1
set /a TRIES+=1
if %TRIES% lss 5 goto :port_check
echo   [提示] 连续 5 个端口都被占用，继续尝试 %PORT% 端口。

:port_ok
set "URL=http://localhost:%PORT%/web/index.html"
echo   运行时：%KIND%
echo   端口　：%PORT%
echo   地址　：%URL%
echo.
echo   停止服务器：关闭标题为「笔记服务器」的窗口，或在本窗口按 Ctrl+C。
echo.

rem ---------- 3. 后台启动服务器 ----------
if /i "%KIND%"=="python" (
  start "笔记服务器 :%PORT%" /min cmd /c "%PY% -m http.server %PORT% --bind 127.0.0.1"
) else (
  start "笔记服务器 :%PORT%" /min cmd /c "node web\serve.mjs %PORT%"
)

rem ---------- 4. 等服务器就绪，然后打开浏览器 ----------
ping -n 3 127.0.0.1 >nul 2>nul
start "" "%URL%"

echo   已尝试打开浏览器。若没有自动打开，请手动访问上面的地址。
echo.
endlocal
exit /b 0

rem ---------- 找不到运行时 ----------
:no_runtime
echo   [错误] 没有找到可用的运行时（需要 Python 3 或 Node.js 中的任意一个）。
echo.
echo   请安装其中一个后重新双击本脚本：
echo.
echo     * Python 3   https://www.python.org/downloads/
echo                  安装时请勾选 "Add python.exe to PATH"。
echo.
echo     * Node.js    https://nodejs.org/
echo.
echo   安装完成后请重新打开本脚本（需要让新的 PATH 生效）。
echo.
pause
endlocal
exit /b 1
