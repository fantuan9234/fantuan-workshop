; 饭团工坊 NSIS 自定义安装脚本
; 安装器由 electron-updater 的 quitAndInstall 启动，此时应用已关闭，无需 taskkill
; ----------------------------------------------------------------
; 注意：MUI2 相关 !define 不可在此处定义，electron-builder 内置模板已定义，
;       重复定义会导致 makensis 报错。仅保留图片配置（在 electron-builder.yml 中）。
; ----------------------------------------------------------------

!macro customInit
  ; 等待应用进程完全退出、文件句柄释放
  Sleep 500
!macroend

!macro customInstall
  ; 安装完成后写入注册表（供系统“添加/删除程序”显示）
  ; electron-builder 已自动处理大部分，此处留空
!macroend

!macro customUnInit
  ; 卸载前结束饭团工坊进程
  nsExec::ExecToStack 'taskkill /F /IM "饭团工坊.exe" /T'
  Pop $0
  nsExec::ExecToStack 'taskkill /F /IM "fantuan-workshop.exe" /T'
  Pop $0
  Sleep 1500
!macroend

!macro customUnInstall
  ; 卸载时清理用户数据目录（AppData 中的缓存、日志等残留）
  RMDir /r "$APPDATA\fantuan-workshop"
  RMDir /r "$LOCALAPPDATA\fantuan-workshop"
!macroend
