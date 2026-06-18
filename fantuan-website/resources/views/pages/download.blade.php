@extends('layouts.app')

@section('title', '下载 - 饭团工坊')
@section('description', '下载饭团工坊最新版本，支持 Windows 64位系统')

@section('content')
<div class="pt-24 md:pt-32">
    <section class="relative z-10 py-16 md:py-24">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <span class="text-brand-400 text-sm font-medium tracking-wider uppercase">DOWNLOAD</span>
                <h1 class="section-title mt-4">下载饭团工坊</h1>
                <p class="section-subtitle">免费开源，持续更新。选择适合你的版本</p>
            </div>

            @if($latestRelease)
            {{-- 最新版本卡片 --}}
            <div class="glass-card p-8 md:p-10 max-w-2xl mx-auto mb-12">
                <div class="flex items-start justify-between mb-6">
                    <div>
                        <span class="text-xs text-brand-400 font-medium bg-brand-500/10 px-3 py-1 rounded-full">Latest</span>
                        <h2 class="text-3xl font-black text-white mt-3">v{{ $latestRelease->version }}</h2>
                        <p class="text-dark-400 text-sm mt-1">
                            {{ $latestRelease->released_at?->format('Y-m-d') }}
                            @if($latestRelease->file_size) · {{ $latestRelease->file_size }} @endif
                        </p>
                    </div>
                    <div class="p-3 rounded-xl bg-brand-500/10">
                        <svg class="w-8 h-8 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                    </div>
                </div>

                @if($latestRelease->description)
                <p class="text-dark-300 text-sm mb-6">{{ $latestRelease->description }}</p>
                @endif

                <div class="space-y-3 mb-8">
                    <div class="flex items-center text-sm text-dark-300">
                        <svg class="w-4 h-4 text-brand-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        支持 Windows 10/11 64位
                    </div>
                    <div class="flex items-center text-sm text-dark-300">
                        <svg class="w-4 h-4 text-brand-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        需要 SMAPI 3.18+
                    </div>
                    <div class="flex items-center text-sm text-dark-300">
                        <svg class="w-4 h-4 text-brand-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        开源 · MIT 协议
                    </div>
                </div>

                <a href="{{ $latestRelease->download_url }}" target="_blank" rel="noopener"
                   class="btn-primary w-full justify-center text-lg group inline-flex">
                    <svg class="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    下载 v{{ $latestRelease->version }}
                </a>

                @if($latestRelease->sha256)
                <p class="text-xs text-dark-500 mt-4 font-mono break-all text-center">
                    SHA256: {{ $latestRelease->sha256 }}
                </p>
                @endif
            </div>

            {{-- 历史版本 --}}
            @if($releases->count() > 1)
            <div class="max-w-3xl mx-auto">
                <h3 class="text-xl font-bold text-white mb-6">历史版本</h3>
                <div class="space-y-3">
                    @foreach($releases->skip(1) as $release)
                    <div class="glass-card p-5 flex items-center justify-between">
                        <div>
                            <span class="text-white font-semibold">v{{ $release->version }}</span>
                            <span class="text-dark-400 text-sm ml-3">{{ $release->released_at?->format('Y-m-d') }}</span>
                            <span class="text-dark-500 text-xs ml-2">{{ $release->platform }}</span>
                        </div>
                        <div class="flex items-center space-x-3">
                            @if($release->changelog)
                            <button onclick="alert('{{ str_replace(["\r\n", "\r", "\n", "'"], ['\\n', '\\n', '\\n', "\\'"], strip_tags($release->changelog)) }}')"
                                    class="text-sm text-dark-400 hover:text-brand-400 transition-colors">
                                更新内容
                            </button>
                            @endif
                            <a href="{{ $release->download_url }}" target="_blank" rel="noopener"
                               class="text-sm text-brand-400 hover:text-brand-300 transition-colors font-medium">
                                下载 →
                            </a>
                        </div>
                    </div>
                    @endforeach
                </div>
            </div>
            @endif

            @else
            <div class="glass-card p-12 text-center max-w-lg mx-auto">
                <p class="text-dark-300 mb-4">暂无发布版本</p>
                <a href="https://github.com/fantuan9234/fantuan-workshop/releases" target="_blank" rel="noopener"
                   class="btn-primary inline-flex">前往 GitHub Releases</a>
            </div>
            @endif
        </div>
    </section>
</div>
@endsection