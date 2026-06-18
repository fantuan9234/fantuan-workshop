<nav x-data="{ scrolled: false, mobileOpen: false }"
     x-init="window.addEventListener('scroll', () => scrolled = window.scrollY > 50)"
     class="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
     :class="scrolled ? 'bg-dark-800/90 backdrop-blur-xl border-b border-dark-600/50 shadow-lg shadow-dark-900/50' : 'bg-transparent'">

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16 md:h-20">

            {{-- Logo --}}
            <a href="{{ route('home') }}" class="flex items-center space-x-3 group">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center
                            group-hover:shadow-lg group-hover:shadow-brand-500/30 transition-all duration-300">
                    <span class="text-dark-900 font-bold text-sm">饭</span>
                </div>
                <span class="text-lg font-bold text-white hidden sm:block">饭团工坊</span>
            </a>

            {{-- 桌面导航 --}}
            <div class="hidden md:flex items-center space-x-1">
                @php
                    $navItems = [
                        ['label' => '功能', 'route' => 'features'],
                        ['label' => '下载', 'route' => 'download'],
                        ['label' => '文档', 'route' => 'docs'],
                        ['label' => '公告', 'route' => 'blog'],
                        ['label' => '关于', 'route' => 'about'],
                        ['label' => '联系', 'route' => 'contact'],
                    ];
                @endphp

                @foreach($navItems as $item)
                    <a href="{{ route($item['route']) }}"
                       class="px-4 py-2 text-sm text-dark-200 hover:text-white rounded-lg
                              hover:bg-white/5 transition-all duration-300
                              {{ request()->routeIs($item['route']) ? 'text-brand-400 bg-white/5' : '' }}">
                        {{ $item['label'] }}
                    </a>
                @endforeach

                <a href="https://github.com/fantuan9234/fantuan-workshop" target="_blank" rel="noopener"
                   class="ml-4 p-2 text-dark-300 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-300">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                </a>
            </div>

            {{-- 移动端菜单按钮 --}}
            <button @click="mobileOpen = !mobileOpen"
                    class="md:hidden p-2 text-dark-300 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path :class="mobileOpen ? 'hidden' : 'block'" stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    <path :class="mobileOpen ? 'block' : 'hidden'" stroke-linecap="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    </div>

    {{-- 移动端菜单 --}}
    <div x-show="mobileOpen"
         x-transition:enter="transition ease-out duration-300"
         x-transition:enter-start="opacity-0 -translate-y-4"
         x-transition:enter-end="opacity-100 translate-y-0"
         x-transition:leave="transition ease-in duration-200"
         x-transition:leave-start="opacity-100 translate-y-0"
         x-transition:leave-end="opacity-0 -translate-y-4"
         class="md:hidden border-t border-dark-600/50 bg-dark-800/95 backdrop-blur-xl">
        <div class="px-4 py-4 space-y-2">
            @foreach($navItems as $item)
                <a href="{{ route($item['route']) }}"
                   class="block px-4 py-3 text-dark-200 hover:text-white rounded-xl hover:bg-white/5 transition-all">
                    {{ $item['label'] }}
                </a>
            @endforeach
            <a href="https://github.com/fantuan9234/fantuan-workshop" target="_blank" rel="noopener"
               class="block px-4 py-3 text-dark-200 hover:text-white rounded-xl hover:bg-white/5 transition-all">
                <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
            </a>
        </div>
    </div>
</nav>
