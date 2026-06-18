@extends('layouts.app')

@section('title', '联系我们 - 饭团工坊')

@section('content')
<div class="pt-24 md:pt-32">
    <section class="relative z-10 py-16 md:py-24">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <span class="text-brand-400 text-sm font-medium tracking-wider uppercase">CONTACT</span>
                <h1 class="section-title mt-4">联系我们</h1>
                <p class="section-subtitle">有任何问题或建议？欢迎给我们留言</p>
            </div>

            <div class="max-w-lg mx-auto">
                @livewire('contact-form')
            </div>
        </div>
    </section>
</div>
@endsection