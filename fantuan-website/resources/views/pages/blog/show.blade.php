@extends('layouts.app')

@section('title', $post->title . ' - 公告 - 饭团工坊')
@section('description', $post->excerpt ?? $post->title)

@section('content')
<div class="pt-24 md:pt-32">
    <section class="relative z-10 py-16 md:py-24">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="mb-8">
                <a href="{{ route('blog') }}" class="text-sm text-dark-400 hover:text-brand-400 transition-colors">
                    ← 返回公告列表
                </a>
            </div>

            <article class="glass-card p-8 md:p-12">
                <div class="mb-8">
                    <div class="flex items-center space-x-4 text-sm text-dark-500 mb-4">
                        <span>{{ $post->published_at?->format('Y-m-d') }}</span>
                        @if($post->tags)
                            @foreach((array) $post->tags as $tag)
                            <span class="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400">{{ $tag }}</span>
                            @endforeach
                        @endif
                    </div>
                    <h1 class="text-3xl md:text-4xl font-bold text-white">{{ $post->title }}</h1>
                </div>

                @if($post->cover_image)
                <img src="{{ asset('storage/' . $post->cover_image) }}" alt="{{ $post->title }}"
                     class="w-full rounded-xl mb-8">
                @endif

                <div class="prose prose-invert max-w-none
                            prose-headings:text-white prose-headings:mt-8 prose-headings:mb-4
                            prose-p:text-dark-300 prose-p:leading-relaxed
                            prose-code:text-brand-400 prose-code:bg-dark-700 prose-code:px-2 prose-code:py-0.5 prose-code:rounded
                            prose-strong:text-white
                            prose-ul:text-dark-300
                            prose-li:text-dark-300
                            prose-h2:text-2xl prose-h2:font-bold
                            prose-h3:text-xl prose-h3:font-semibold
                            prose-pre:bg-dark-700 prose-pre:border prose-pre:border-dark-500
                            prose-img:rounded-xl">
                    @markdown($post->content)
                </div>
            </article>
        </div>
    </section>
</div>
@endsection