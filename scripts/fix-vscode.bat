@echo off
echo === Killing all VS Code processes ===
taskkill /IM "Code.exe" /F 2>nul
timeout /t 3 /nobreak >nul

echo === Clearing corrupted caches ===
rmdir /s /q "%APPDATA%\Code\Service Worker" 2>nul
rmdir /s /q "%APPDATA%\Code\Cache" 2>nul
rmdir /s /q "%APPDATA%\Code\CachedData" 2>nul
rmdir /s /q "%APPDATA%\Code\CachedExtensionVSIXs" 2>nul
rmdir /s /q "%APPDATA%\Code\GPUCache" 2>nul
rmdir /s /q "%APPDATA%\Code\User\workspaceStorage" 2>nul

echo === Reopening VS Code ===
code "C:\Users\Alfred\NeuraReport"
echo Done!
