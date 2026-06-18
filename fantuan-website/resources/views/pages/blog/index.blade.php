@extends('layouts.app')

@section('title', '公告 - 饭团工坊')

@section('content')
<div class="pt-24 md:pt-32">
    <section class="relative z-10 py-16 md:py-24">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <span class="text-brand-400 text-sm font-medium tracking-wider uppercase">BLOG</span>
                <h1 class="section-title mt-4">最新公告</h1>
                <p class="section-subtitle">了解饭团工坊的最新动态和版本更新</p>
            </div>

            @if($posts->count() > 0)
            <div class="space-y-6">
                @foreach($posts as $post)
                <a href="{{ route('blog.show', $post->slug) }}" class="block glass-card p-6 group">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <h2 class="text-xl font-semibold text-white group-hover:text-brand-400 transition-colors mb-2">
                                {{ $post->title }}
                            </h2>
                            @if($post->excerpt)
                            <p class="text-dark-400 text-sm mb-3">{{ $post->excerpt }}</p>
                            @endif
                            <div class="flex items-center space-x-4 text-xs text-dark-500">
                                <span>{{ $post->published_at?->format('Y-m-d') }}</span>
                                @if($post->tags)
                                    @foreach((array) $post->tags as $tag)
                                    <span class="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400">{{ $tag }}</span>
                                    @endforeach
                                @endif
                            </div>
                        </div>
                        <span class="text-dark-500 group-hover:text-brand-400 group-hover:translate-x-1 transition-all ml-4">→</span>
                    </div>
                </a>
                @endforeach
            </div>

            <div class="mt-8">
                {{ $posts->links() }}
            </div>
            @else
            <div class="glass-card p-12 text-center">
                <p class="text-dark-300">暂无公告</p>
            </div>
            @endif
        </div>
    </section>
</div>
@endsection