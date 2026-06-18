@extends('layouts.app')

@section('title', $content['title'] . ' - 文档 - 饭团工坊')

@section('content')
<div class="pt-24 md:pt-32">
    <section class="relative z-10 py-16 md:py-24">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="mb-8">
                <a href="{{ route('docs') }}" class="text-sm text-dark-400 hover:text-brand-400 transition-colors">
                    ← 返回文档列表
                </a>
            </div>

            <article class="glass-card p-8 md:p-12">
                <h1 class="text-3xl font-bold text-white mb-8">{{ $content['title'] }}</h1>
                <div class="prose prose-invert max-w-none
                            prose-headings:text-white prose-headings:mt-8 prose-headings:mb-4
                            prose-p:text-dark-300 prose-p:leading-relaxed
                            prose-code:text-brand-400 prose-code:bg-dark-700 prose-code:px-2 prose-code:py-0.5 prose-code:rounded
                            prose-strong:text-white
                            prose-ul:text-dark-300
                            prose-li:text-dark-300
                            prose-h2:text-2xl prose-h2:font-bold
                            prose-h3:text-xl prose-h3:font-semibold
                            prose-pre:bg-dark-700 prose-pre:border prose-pre:border-dark-500">
                    @markdown($content['body'])
                </div>
            </article>
        </div>
    </section>
</div>
@endsection