@extends('layouts.app')

@section('title', '关于 - 饭团工坊')

@section('content')
<div class="pt-24 md:pt-32">
    <section class="relative z-10 py-16 md:py-24">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <span class="text-brand-400 text-sm font-medium tracking-wider uppercase">ABOUT</span>
                <h1 class="section-title mt-4">关于饭团工坊</h1>
            </div>

            <div class="glass-card p-8 md:p-12 mb-8">
                <h2 class="text-2xl font-bold text-white mb-4">开发故事</h2>
                <div class="text-dark-300 leading-relaxed space-y-4">
                    <p>
                        饭团工坊诞生于对星露谷物语的热爱。作为一个深度模组玩家，
                        我发现现有的模组编辑工具要么功能分散、要么使用复杂。
                        于是决定自己动手，打造一款一体化的、用户友好的模组制作工具。
                    </p>
                    <p>
                        项目的名字"饭团"取自开发者最爱吃的食物——简单、温暖、实在。
                        希望这个工具也能像饭团一样，给模组创作者们带来温暖和便利。
                    </p>
                </div>
            </div>

            <div class="glass-card p-8 md:p-12 mb-8">
                <h2 class="text-2xl font-bold text-white mb-4">技术栈</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    @php
                        $techs = [
                            ['name' => 'Electron', 'desc' => '桌面框架'],
                            ['name' => 'React', 'desc' => 'UI 框架'],
                            ['name' => 'TypeScript', 'desc' => '类型安全'],
                            ['name' => 'Tailwind CSS', 'desc' => '样式方案'],
                        ];
                    @endphp
                    @foreach($techs as $tech)
                    <div class="p-4 rounded-xl bg-dark-700/50 text-center">
                        <div class="font-semibold text-white">{{ $tech['name'] }}</div>
                        <div class="text-xs text-dark-400 mt-1">{{ $tech['desc'] }}</div>
                    </div>
                    @endforeach
                </div>
            </div>

            <div class="glass-card p-8 md:p-12">
                <h2 class="text-2xl font-bold text-white mb-4">联系与支持</h2>
                <div class="space-y-4">
                    <a href="https://github.com/fantuan9234/fantuan-workshop" target="_blank" rel="noopener"
                       class="flex items-center space-x-3 text-dark-300 hover:text-brand-400 transition-colors group">
                        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        <span>GitHub: fantuan9234/fantuan-workshop <span class="text-dark-500 group-hover:translate-x-1 inline-block transition-transform">→</span></span>
                    </a>
                    <p class="text-dark-400 text-sm">
                        如果你喜欢这个项目，欢迎在 GitHub 上给一个 Star ⭐
                    </p>
                </div>
            </div>
        </div>
    </section>
</div>
@endsection