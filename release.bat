@echo off
cd /d D:\aaaawagjunhao\stardew-mod-studio

:: 设置 Token
set GH_TOKEN=YOUR_GH_TOKEN
set OPENLIST_TOKEN=openlist-a1c1f182-dab5-442d-ac95-5b9be53a895anZaf43BVmqDWcvLIgxE29En3eTi9WpYkGODRrjK1hrezoRrXCzdV2w6GBatpcSur

:: 使用可靠构建脚本（绕过 app-builder-bin 的 bug）
echo.
echo === 使用可靠构建脚本 ===
node scripts/build-release.js publish

echo.
echo === 上传到 OpenList ===
for /f "tokens=2 delims=:, " %%a in ('findstr "version" package.json') do set VERSION=%%~a
set VERSION=%VERSION:"=%
echo Version: %VERSION%
set TOKEN=%OPENLIST_TOKEN%
set BASE=https://wp.svlmod.cn
set PATH=/SVL/SVL/fantuangongfang/update
for %%f in ("fantuan-workshop-setup-%VERSION%.exe" "fantuan-workshop-setup-%VERSION%.exe.blockmap" "latest.yml") do (
  curl -s -X PUT -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/octet-stream" --data-binary "@dist\%%~f" "%BASE%/dav%PATH%/%%~f"
  echo OpenList OK: %%~f
)

pause
