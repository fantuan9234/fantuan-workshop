<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', '饭团工坊') - 星露谷物语模组制作工具</title>
    <meta name="description" content="@yield('description', '饭团工坊 - 星露谷物语模组制作工具，轻松管理NPC、编排事件、配置物品、编辑地图')">
    <link rel="icon" type="image/png" href="{{ asset('assets/images/favicon.png') }}">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @stack('head')
</head>
<body class="bg-dark-800 min-h-screen">

    {{-- 星空粒子背景 --}}
    <x-particles />

    {{-- 导航栏 --}}
    <x-nav />

    {{-- 主内容 --}}
    <main>
        @yield('content')
    </main>

    {{-- 页脚 --}}
    <x-footer />

    @stack('scripts')
</body>
</html>
