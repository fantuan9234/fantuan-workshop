import { useState, useEffect } from 'react'
import { useT, asString } from '../i18n'

const BILIBILI_URL = 'https://space.bilibili.com/3546621436496190?spm_id_from=333.40164.0.0'
const DOUYIN_URL = 'https://www.douyin.com/user/self?from_tab_name=main'
const WECHAT_ID = 'wjhrvn0'
const GITHUB_URL = 'https://github.com/fantuan9234/fantuan-workshop'

type CheckState = 'idle' | 'checking' | 'up-to-date' | 'has-update' | 'downloading' | 'downloaded' | 'error'

export default function AboutPage(): JSX.Element {
  const t = useT()
  const ts = (k: string): string => asString(t, k)
  const [copied, setCopied] = useState(false)
  const [checkState, setCheckState] = useState<CheckState>('idle')
  const [checkMessage, setCheckMessage] = useState('')
  const [currentVersion, setCurrentVersion] = useState('')
  const [downloadPercent, setDownloadPercent] = useState(0)

  const handleCopyWechat = async () => {
    try {
      await navigator.clipboard.writeText(WECHAT_ID)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

	const handleCheckUpdate = async () => {
	    if (!window.electronAPI) {
	      setCheckState('error')
	      setCheckMessage('Electron API 不可用')
	      return
	    }
	    setCheckState('checking')
	    setCheckMessage('')
	    try {
	      // 拉取当前版本号
	      const v = await window.electronAPI.getAppVersion()
	      setCurrentVersion(v)
	      const result = await window.electronAPI.checkForUpdate()
	      if (result.hasUpdate && result.version) {
	        setCheckState('has-update')
	        setCheckMessage(result.version)
	      } else {
	        setCheckState('up-to-date')
	        setCheckMessage(`v${result.currentVersion || v}`)
	      }
	    } catch (e) {
	      setCheckState('error')
	      setCheckMessage((e as Error)?.message || String(e))
	    }
	  }

	  const handleDownloadUpdate = async () => {
	    if (!window.electronAPI) return
	    setCheckState('downloading')
	    setDownloadPercent(0)
	    // 监听下载进度
	    const offProgress = window.electronAPI.onUpdateProgress((progress) => {
	      if (progress?.percent) setDownloadPercent(Math.round(progress.percent))
	    })
	    // 监听下载完成
	    const offDownloaded = window.electronAPI.onUpdateDownloaded(() => {
	      offProgress?.()
	      offDownloaded?.()
	      setCheckState('downloaded')
	      setDownloadPercent(100)
	    })
	    // 监听下载失败
	    const offError = window.electronAPI.onUpdateError(() => {
	      offProgress?.()
	      offDownloaded?.()
	      offError?.()
	      setCheckState('error')
	      setCheckMessage('下载失败，请稍后重试')
	    })
	    try {
	      await window.electronAPI.downloadUpdate()
	    } catch {
	      offProgress?.()
	      offDownloaded?.()
	      offError?.()
	      setCheckState('error')
	      setCheckMessage('下载失败')
	    }
	  }

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        {/* 顶部标题 */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold themed-text-primary">{ts('about.title')}</h2>
          <p className="text-base themed-text-muted mt-1">{ts('about.subtitle')}</p>
        </div>

        {/* 更新检查 */}
        <section className="mb-6">
          <h3 className="text-sm themed-text-dimmed uppercase tracking-wider mb-3">
            {ts('updater.checkUpdate')}
          </h3>
          <div className="themed-bg-card border themed-border-secondary rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm themed-text-dimmed">
                  {currentVersion
                    ? ts('updater.currentVersion').replace('{{version}}', currentVersion)
                    : '饭团工坊'}
                </div>
                <div className="text-base themed-text-primary mt-0.5">
                  {checkState === 'checking' && ts('updater.checking')}
                  {checkState === 'up-to-date' && `${ts('updater.upToDate')} · ${checkMessage}`}
                  {checkState === 'has-update' && ts('updater.latestVersion').replace('{{version}}', checkMessage)}
                  {checkState === 'downloading' && `${ts('updater.downloadingUpdate')} ${downloadPercent}%`}
                  {checkState === 'downloaded' && ts('updater.downloadComplete')}
                  {checkState === 'error' && `${checkMessage || ts('updater.updateError')}`}
                  {checkState === 'idle' && ts('updater.checkUpdate')}
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                {checkState === 'idle' && (
                  <button onClick={handleCheckUpdate} className="px-4 py-2 rounded-lg themed-btn-primary text-sm font-medium transition-colors">
                    {ts('updater.checkUpdate')}
                  </button>
                )}
                {checkState === 'checking' && (
                  <button disabled className="px-4 py-2 rounded-lg themed-btn-primary text-sm font-medium opacity-50 cursor-not-allowed">
                    {ts('updater.checking')}
                  </button>
                )}
                {checkState === 'has-update' && (
                  <button onClick={handleDownloadUpdate} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors">
                    下载更新
                  </button>
                )}
                {checkState === 'downloading' && (
                  <div className="text-sm themed-text-dimmed font-mono min-w-[3rem] text-right">
                    {downloadPercent}%
                  </div>
                )}
                {checkState === 'downloaded' && (
                  <button onClick={() => window.electronAPI?.installUpdate()} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors">
                    重启安装
                  </button>
                )}
                {checkState === 'up-to-date' && (
                  <button onClick={handleCheckUpdate} className="px-4 py-2 rounded-lg themed-btn-primary text-sm font-medium transition-colors">
                    {ts('updater.checkUpdate')}
                  </button>
                )}
                {checkState === 'error' && (
                  <button onClick={handleCheckUpdate} className="px-4 py-2 rounded-lg themed-btn-primary text-sm font-medium transition-colors">
                    重试
                  </button>
                )}
              </div>
            </div>
            {/* 下载进度条 */}
            {checkState === 'downloading' && (
              <div className="mt-3 w-full bg-gray-700/30 rounded-full h-1.5 overflow-hidden">
                <div className="bg-green-500 h-full rounded-full transition-all duration-300" style={{ width: `${downloadPercent}%` }} />
              </div>
            )}
          </div>
        </section>

        {/* 开源 */}
        <section className="mb-6">
          <h3 className="text-sm themed-text-dimmed uppercase tracking-wider mb-3">
            {ts('about.links')}
          </h3>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
            className="themed-bg-card border themed-border-secondary rounded-xl p-5 flex items-center gap-4 transition-all hover:themed-bg-hover group">
            <div className="w-12 h-12 rounded-xl bg-gray-500/15 flex items-center justify-center flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#888">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold themed-text-primary">GitHub</div>
              <div className="text-sm themed-text-dimmed mt-0.5 truncate">{ts('about.githubDesc')}</div>
            </div>
            <svg className="themed-text-disabled flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </section>

        {/* 联系方式 */}
        <section className="mb-6">
          <h3 className="text-sm themed-text-dimmed uppercase tracking-wider mb-3">
            {ts('about.contact')}
          </h3>
          <div className="themed-bg-card border themed-border-secondary rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#07c160]/15 flex items-center justify-center flex-shrink-0">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#07c160">
                <path d="M9.5 4C5.36 4 2 6.91 2 10.5c0 1.86.96 3.52 2.46 4.6-.12.43-.36 1.18-.65 1.62-.16.24-.06.31.07.32.13.01.34-.04.93-.42.5-.32 1.18-.84 1.62-1.2.92.27 1.91.42 2.95.42h.42c-.12-.39-.2-.8-.2-1.23 0-2.86 2.86-5.18 6.39-5.18.27 0 .54.02.81.05C16.34 5.95 13.21 4 9.5 4zm-2.6 4.3a.9.9 0 110 1.8.9.9 0 010-1.8zm5.2 0a.9.9 0 110 1.8.9.9 0 010-1.8zM21.5 13.6c0-2.7-2.85-4.9-6.36-4.9-3.52 0-6.37 2.2-6.37 4.9 0 2.7 2.85 4.9 6.37 4.9.78 0 1.52-.1 2.21-.28.34.27.84.66 1.21.9.46.3.62.34.72.33.1-.01.18-.06.05-.25-.23-.34-.42-.93-.51-1.27 1.16-.84 1.68-2.02 1.68-3.33zm-8.4-1.2a.7.7 0 110 1.4.7.7 0 010-1.4zm4.2 0a.7.7 0 110 1.4.7.7 0 010-1.4z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm themed-text-dimmed">{ts('about.wechat')}</div>
              <div className="text-lg themed-text-primary font-medium tracking-wide mt-0.5">
                wx: {WECHAT_ID}
              </div>
            </div>
            <button
              onClick={handleCopyWechat}
              className="px-4 py-2 rounded-lg themed-btn-primary text-sm font-medium transition-colors flex-shrink-0"
            >
              {copied ? t('about.copied') : t('about.copy')}
            </button>
          </div>
        </section>

        {/* 社交账号 */}
        <section className="mb-6">
          <h3 className="text-sm themed-text-dimmed uppercase tracking-wider mb-3">
            {ts('about.social')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* B站 */}
            <a
              href={BILIBILI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="themed-bg-card border themed-border-secondary rounded-xl p-6 flex flex-col items-center text-center transition-all hover:themed-bg-hover hover:border-[#fb7299]/40 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#fb7299]/15 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="#fb7299">
                  <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906l-1.173 1.12zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374a1.262 1.262 0 0 1-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374a1.262 1.262 0 0 1-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386z" />
                </svg>
              </div>
              <div className="text-lg font-semibold themed-text-primary">Bilibili</div>
              <div className="text-sm themed-text-dimmed mt-1">@饭团923</div>
            </a>

            {/* 抖音 */}
            <a
              href={DOUYIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="themed-bg-card border themed-border-secondary rounded-xl p-6 flex flex-col items-center text-center transition-all hover:themed-bg-hover hover:border-white/40 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="white">
                  <path d="M19.59 4c.27 1.42.93 2.7 1.88 3.74 1.13 1.24 2.69 2.09 4.42 2.36v3.49c-1.96-.13-3.79-.74-5.36-1.71v7.81c0 4.6-3.74 8.31-8.36 8.31-4.62 0-8.36-3.71-8.36-8.31 0-4.6 3.74-8.31 8.36-8.31.51 0 1.01.05 1.5.13v3.59a4.79 4.79 0 0 0-1.5-.24c-2.67 0-4.83 2.15-4.83 4.81 0 2.66 2.16 4.81 4.83 4.81 2.67 0 4.83-2.15 4.83-4.81V4h2.59z" />
                </svg>
              </div>
              <div className="text-lg font-semibold themed-text-primary">{ts('about.douyin')}</div>
              <div className="text-sm themed-text-dimmed mt-1">@饭团</div>
            </a>
          </div>
        </section>

        {/* 赞赏图片 */}
        <section className="mb-6">
          <h3 className="text-sm themed-text-dimmed uppercase tracking-wider mb-3">
            {ts('about.donation')}
          </h3>
          <div className="themed-bg-card border themed-border-secondary rounded-xl p-5">
            <p className="text-sm themed-text-dimmed mb-4 text-center">
              {ts('about.donationHint')}
            </p>
            <div className="flex justify-center">
              <div className="rounded-xl overflow-hidden border themed-border-secondary bg-white p-2 max-w-[320px]">
                <img
                  src="./assets/donation.jpg"
                  alt={ts('about.donationAlt')}
                  className="w-full h-auto block"
                  onError={(e) => {
                    const t = e.currentTarget
                    t.style.display = 'none'
                    const parent = t.parentElement
                    if (parent) {
                      parent.innerHTML =
                        '<div class="aspect-square w-[300px] flex flex-col items-center justify-center text-gray-400 text-sm gap-3">' +
                        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
                        `<span>${ts('about.donationImageMissing')}</span></div>`
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 致谢 */}
        <section>
          <div className="text-center text-sm themed-text-dimmed py-4">
            {ts('about.thanks')}
          </div>
        </section>
      </div>
    </div>
  )
}
