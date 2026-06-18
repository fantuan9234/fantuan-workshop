<footer class="border-t border-dark-600/50 bg-dark-900/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">

            {{-- 品牌信息 --}}
            <div class="md:col-span-2">
                <div class="flex items-center space-x-3 mb-4">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                        <span class="text-dark-900 font-bold text-sm">饭</span>
                    </div>
                    <span class="text-lg font-bold text-white">饭团工坊</span>
                </div>
                <p class="text-dark-300 text-sm leading-relaxed max-w-md">
                    星露谷物语模组制作工具。轻松管理 NPC、编排事件、配置物品、编辑地图，
                    让你的星露谷世界更加丰富多彩。
                </p>
                <div class="flex space-x-4 mt-6">
                    <a href="https://github.com/fantuan9234/fantuan-workshop" target="_blank" rel="noopener"
                       class="p-2 bg-dark-700/50 rounded-lg text-dark-300 hover:text-brand-400 hover:bg-dark-600/50 transition-all">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                    </a>
                </div>
            </div>

            {{-- 快速链接 --}}
            <div>
                <h3 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">快速链接</h3>
                <ul class="space-y-3">
                    <li><a href="{{ route('features') }}" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">功能特性</a></li>
                    <li><a href="{{ route('download') }}" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">下载</a></li>
                    <li><a href="{{ route('docs') }}" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">文档</a></li>
                    <li><a href="{{ route('blog') }}" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">公告</a></li>
                    <li><a href="{{ route('contact') }}" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">联系我们</a></li>
                </ul>
            </div>

            {{-- 相关资源 --}}
            <div>
                <h3 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">相关资源</h3>
                <ul class="space-y-3">
                    <li><a href="https://stardewvalleywiki.com" target="_blank" rel="noopener" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">星露谷 Wiki</a></li>
                    <li><a href="https://www.nexusmods.com/stardewvalley" target="_blank" rel="noopener" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">Nexus Mods</a></li>
                    <li><a href="https://github.com/Pathoschild/SMAPI" target="_blank" rel="noopener" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">SMAPI</a></li>
                </ul>
            </div>
        </div>

        <div class="mt-12 pt-8 border-t border-dark-600/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p class="text-sm text-dark-400">&copy; {{ date('Y') }} 饭团工坊. MIT License.</p>
            <p class="text-sm text-dark-400">
                星露谷物语 &copy; ConcernedApe. 本工具为非官方粉丝制作。
            </p>
        </div>
    </div>
</footer>
