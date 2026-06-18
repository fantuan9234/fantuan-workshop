@extends('layouts.app')

@section('title', '功能特性 - 饭团工坊')
@section('description', '了解饭团工坊的全部功能：NPC编辑、事件编排、物品配置、地图编辑')

@section('content')
<div class="pt-24 md:pt-32">
    {{-- 页头 --}}
    <section class="relative z-10 py-16 md:py-24">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span class="text-brand-400 text-sm font-medium tracking-wider uppercase">FEATURES</span>
            <h1 class="section-title mt-4">强大而简洁的模组制作体验</h1>
            <p class="section-subtitle">
                四大核心编辑器覆盖模组创作的全部需求，让每个创意都能轻松实现
            </p>
        </div>
    </section>

    {{-- 功能详情 --}}
    @foreach($features as $index => $feature)
    <section class="relative z-10 py-16 md:py-24 {{ $index % 2 == 1 ? 'bg-dark-900/30' : '' }}">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col {{ $index % 2 == 0 ? 'lg:flex-row' : 'lg:flex-row-reverse' }} items-center gap-12 lg:gap-16">

                {{-- 截图占位 --}}
                <div class="flex-1 w-full">
                    <div class="glass-card p-1 overflow-hidden">
                        <div class="aspect-video rounded-xl bg-gradient-to-br {{ $feature['gradient'] }} 
                                    flex items-center justify-center opacity-60">
                            <span class="text-white/40 text-lg font-medium">{{ $feature['title'] }} 截图</span>
                        </div>
                    </div>
                </div>

                {{-- 文字内容 --}}
                <div class="flex-1">
                    <div class="w-12 h-1 rounded-full bg-gradient-to-r {{ $feature['gradient'] }} mb-6"></div>
                    <span class="text-sm text-brand-400 font-medium mb-2 block">{{ $feature['subtitle'] }}</span>
                    <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">{{ $feature['title'] }}</h2>
                    <p class="text-dark-300 leading-relaxed mb-6">{{ $feature['description'] }}</p>

                    <ul class="space-y-3">
                        @foreach($feature['highlights'] as $highlight)
                        <li class="flex items-start space-x-3">
                            <svg class="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            <span class="text-dark-200">{{ $highlight }}</span>
                        </li>
                        @endforeach
                    </ul>
                </div>
            </div>
        </div>
    </section>
    @endforeach

    {{-- CTA --}}
    <section class="relative z-10 py-24">
        <div class="max-w-3xl mx-auto px-4 text-center">
            <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">准备好开始创作了吗？</h2>
            <p class="text-dark-300 mb-8">免费下载饭团工坊，立刻开启你的星露谷模组之旅</p>
            <a href="{{ route('download') }}" class="btn-primary text-lg inline-flex">免费下载</a>
        </div>
    </section>
</div>
@endsection