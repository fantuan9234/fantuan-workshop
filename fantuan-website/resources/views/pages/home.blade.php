@extends('layouts.app')

@section('title', '饭团工坊')
@section('description', '饭团工坊 - 星露谷物语模组制作工具，轻松管理NPC、编排事件、配置物品、编辑地图')

@section('content')
{{-- Hero 区域 --}}
<section class="relative min-h-screen flex items-center justify-center overflow-hidden">
    <div class="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <div class="animate-fade-in-up">
            <div class="inline-flex items-center px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-8">
                ✦ v0.1.9 已发布
            </div>

            <h1 class="text-5xl md:text-7xl font-black mb-6 tracking-tight">
                <span class="gradient-text">饭团工坊</span>
            </h1>

            <p class="text-xl md:text-2xl text-dark-200 font-medium mb-4">
                星露谷物语模组制作工具
            </p>

            <p class="text-dark-400 max-w-xl mx-auto mb-10 text-lg">
                可视化编辑 NPC、事件、物品、地图，一键导出你的专属模组
            </p>

            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="{{ route('download') }}" class="btn-primary text-lg group">
                    <svg class="w-5 h-5 mr-2 group-hover:animate-bounce inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    免费下载
                </a>
                <a href="{{ route('features') }}" class="btn-outline text-lg">
                    了解更多 →
                </a>
            </div>
        </div>

        {{-- 向下滚动提示 --}}
        <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
            <svg class="w-6 h-6 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
            </svg>
        </div>
    </div>
</section>

{{-- 功能展示 --}}
<section class="relative z-10 py-24 md:py-32">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
            <h2 class="section-title">强大而高效</h2>
            <p class="section-subtitle">一站式完成所有模组编辑工作，无需在多个工具间切换</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @foreach($features as $feature)
            <div class="glass-card p-6 group cursor-default">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br {{ $feature['color'] }} p-2.5 mb-4
                            group-hover:scale-110 transition-transform duration-300">
                    @if($feature['icon'] === 'user')
                    <svg class="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    @elseif($feature['icon'] === 'calendar')
                    <svg class="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    @elseif($feature['icon'] === 'package')
                    <svg class="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                    @elseif($feature['icon'] === 'map')
                    <svg class="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                    </svg>
                    @elseif($feature['icon'] === 'check-circle')
                    <svg class="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    @elseif($feature['icon'] === 'mail')
                    <svg class="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    @endif
                </div>
                <h3 class="text-lg font-semibold text-white mb-2">{{ $feature['title'] }}</h3>
                <p class="text-dark-300 text-sm leading-relaxed">{{ $feature['description'] }}</p>
            </div>
            @endforeach
        </div>
    </div>
</section>

{{-- 下载区域 --}}
<section class="relative z-10 py-24 md:py-32">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="section-title">立即开始创作</h2>
        <p class="section-subtitle mb-12">下载饭团工坊，开启你的星露谷模组之旅</p>

        @if($latestRelease)
        <div class="glass-card p-8 md:p-12 max-w-lg mx-auto">
            <div class="text-sm text-brand-400 font-medium mb-2">最新版本</div>
            <div class="text-4xl font-black text-white mb-2">v{{ $latestRelease->version }}</div>
            <div class="text-dark-400 text-sm mb-6">
                {{ $latestRelease->released_at ? $latestRelease->released_at->format('Y-m-d') : '' }}
                · Windows 64位
                @if($latestRelease->file_size)
                · {{ $latestRelease->file_size }}
                @endif
            </div>

            <a href="{{ $latestRelease->download_url }}" target="_blank" rel="noopener"
               class="btn-primary text-lg w-full justify-center mb-4 group inline-flex">
                <svg class="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                下载 Windows 版
            </a>

            @if($latestRelease->sha256)
            <p class="text-xs text-dark-500 mt-3 font-mono break-all">SHA256: {{ $latestRelease->sha256 }}</p>
            @endif

            <div class="mt-6 pt-6 border-t border-dark-500/50">
                <a href="{{ route('download') }}" class="text-sm text-dark-400 hover:text-brand-400 transition-colors">
                    查看所有版本 & 更新日志 →
                </a>
            </div>
        </div>
        @else
        <div class="glass-card p-8 md:p-12 max-w-lg mx-auto">
            <p class="text-dark-300 mb-4">暂无发布版本</p>
            <a href="https://github.com/fantuan9234/fantuan-workshop/releases" target="_blank" rel="noopener"
               class="btn-primary inline-flex">前往 GitHub Releases</a>
        </div>
        @endif
    </div>
</section>
@endsection