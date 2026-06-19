@echo off
cd /d D:\aaaawagjunhao\stardew-mod-studio

:: 设置 Token
set GH_TOKEN=YOUR_GH_TOKEN

:: 清理构建目录
if exist dist rmdir /s /q dist
if exist build-tmp rmdir /s /q build-tmp

:: 使用 electronDist 指向 node_modules 中的 electron，跳过 app-builder 解压
echo Building with electronDist from node_modules\electron\dist...
node scripts\build-final.js

pause
