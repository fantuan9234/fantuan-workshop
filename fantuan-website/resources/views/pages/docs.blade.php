@extends('layouts.app')

@section('title', '文档 - 饭团工坊')
@section('description', '饭团工坊使用文档和教程')

@section('content')
<div class="pt-24 md:pt-32">
    <section class="relative z-10 py-16 md:py-24">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <span class="text-brand-400 text-sm font-medium tracking-wider uppercase">DOCS</span>
                <h1 class="section-title mt-4">文档与教程</h1>
                <p class="section-subtitle">从入门到精通，帮助你快速上手饭团工坊</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                @foreach($docs as $category => $group)
                <div class="glass-card p-6">
                    <h2 class="text-lg font-semibold text-white mb-2">{{ $group['title'] }}</h2>
                    <div class="w-12 h-0.5 rounded bg-brand-500 mb-4"></div>
                    <ul class="space-y-2">
                        @foreach($group['children'] as $child)
                        <li>
                            <a href="{{ route('docs.show', $child['slug']) }}"
                               class="text-sm text-dark-300 hover:text-brand-400 transition-colors flex items-center justify-between group">
                                <span>{{ $child['title'] }}</span>
                                <span class="text-dark-500 group-hover:translate-x-1 transition-transform">→</span>
                            </a>
                        </li>
                        @endforeach
                    </ul>
                </div>
                @endforeach
            </div>
        </div>
    </section>
</div>
@endsection