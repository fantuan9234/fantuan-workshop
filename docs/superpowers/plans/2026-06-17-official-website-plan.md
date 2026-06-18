# 饭团工坊官网 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建饭团工坊（Fantuan Workshop）官网及后台管理系统

**Architecture:** Laravel 11 + Filament 3 的 Blade 全栈架构。官网页面使用 Blade 模板 + Tailwind CSS 深色主题渲染，后台管理通过 Filament 面板自动生成 CRUD 界面。数据层使用 MySQL + Eloquent ORM。

**Tech Stack:** Laravel 11, PHP 8.4, Filament 3.x, Tailwind CSS 3.x, MySQL, Nginx, Livewire

**部署目录:** `fantuan-website/`（在项目根目录下新建独立文件夹）

---

### Task 1: 初始化 Laravel 项目

**Files:**
- Create: `fantuan-website/` (entire Laravel skeleton via `laravel new`)

- [ ] **Step 1: 创建 Laravel 11 项目**

```bash
cd D:\aaaawagjunhao\stardew-mod-studio
composer create-project laravel/laravel fantuan-website "^11.0"
cd fantuan-website
```

- [ ] **Step 2: 安装 Filament 管理面板**

```bash
composer require filament/filament:"^3.2" -W
php artisan filament:install --panels
```

- [ ] **Step 3: 安装其他依赖**

```bash
composer require livewire/livewire "^3.0"
npm install -D tailwindcss @tailwindcss/forms @tailwindcss/typography postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 4: 配置 .env**

```bash
# 编辑 .env 文件
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fantuan_website
DB_USERNAME=root
DB_PASSWORD=your_password

APP_URL=http://localhost:8000
```

- [ ] **Step 5: 创建管理员用户**

```bash
php artisan make:filament-user
# 输入: name=admin, email=admin@fantuan.workshop, password=自定义密码
```

- [ ] **Step 6: 提交初始项目**

```bash
git init
git add .
git commit -m "feat: initialize Laravel 11 + Filament 3"
```

---

### Task 2: 配置深色主题 + Tailwind CSS

**Files:**
- Create: `fantuan-website/tailwind.config.js`
- Create: `fantuan-website/resources/css/app.css`
- Modify: `fantuan-website/resources/views/components/layouts/app.blade.php` (Filament 布局)
- Create: `fantuan-website/public/assets/` (目录)

- [ ] **Step 1: 配置 tailwind.config.js**

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.js",
    "./resources/**/*.vue",
    "./vendor/filament/**/*.blade.php",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef8e7',
          100: '#fdefc4',
          200: '#fbe08d',
          300: '#f8d04f',
          400: '#f5c222',
          500: '#f0c040',
          600: '#d4a030',
          700: '#b08020',
          800: '#8c6018',
          900: '#704810',
        },
        dark: {
          50: '#f0f0f5',
          100: '#d0d0dd',
          200: '#a0a0bb',
          300: '#707099',
          400: '#404066',
          500: '#16162a',
          600: '#12122a',
          700: '#0e0e1a',
          800: '#0a0a0f',
          900: '#06060a',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(240, 192, 64, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(240, 192, 64, 0.6)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

- [ ] **Step 2: 配置 CSS**

```css
/* resources/css/app.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700;900&display=swap');

@layer base {
  body {
    @apply bg-dark-800 text-white antialiased;
    scroll-behavior: smooth;
  }

  ::selection {
    @apply bg-brand-500/30 text-white;
  }

  ::-webkit-scrollbar {
    @apply w-2;
  }

  ::-webkit-scrollbar-track {
    @apply bg-dark-900;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-dark-400 rounded-full hover:bg-dark-300;
  }
}

@layer components {
  .btn-primary {
    @apply inline-flex items-center px-6 py-3 bg-brand-500 text-dark-900 font-semibold rounded-xl
           hover:bg-brand-400 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/25
           active:scale-95;
  }

  .btn-outline {
    @apply inline-flex items-center px-6 py-3 border border-dark-300 text-white font-medium rounded-xl
           hover:bg-white/5 hover:border-brand-500/50 transition-all duration-300;
  }

  .gradient-text {
    @apply bg-gradient-to-r from-brand-300 via-brand-500 to-brand-300 bg-clip-text text-transparent;
  }

  .glass-card {
    @apply bg-dark-600/50 backdrop-blur-xl border border-dark-400/50 rounded-2xl
           hover:border-brand-500/30 transition-all duration-500;
  }

  .section-title {
    @apply text-3xl md:text-4xl font-bold text-white mb-4;
  }

  .section-subtitle {
    @apply text-lg text-dark-200 max-w-2xl mx-auto;
  }
}
```

- [ ] **Step 3: 配置 Vite**

```js
// vite.config.js
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
    ],
});
```

- [ ] **Step 4: 编译前端资源**

```bash
npm install
npm run build
```

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: configure dark theme with Tailwind CSS"
```

---

### Task 3: 创建数据库迁移 + 模型

**Files:**
- Create: `fantuan-website/database/migrations/xxxx_xx_xx_create_pages_table.php`
- Create: `fantuan-website/database/migrations/xxxx_xx_xx_create_releases_table.php`
- Create: `fantuan-website/database/migrations/xxxx_xx_xx_create_messages_table.php`
- Create: `fantuan-website/database/migrations/xxxx_xx_xx_create_posts_table.php`
- Create: `fantuan-website/database/migrations/xxxx_xx_xx_create_page_views_table.php`
- Create: `fantuan-website/database/migrations/xxxx_xx_xx_create_download_logs_table.php`
- Create: `fantuan-website/app/Models/Page.php`
- Create: `fantuan-website/app/Models/Release.php`
- Create: `fantuan-website/app/Models/Message.php`
- Create: `fantuan-website/app/Models/Post.php`
- Create: `fantuan-website/app/Models/PageView.php`
- Create: `fantuan-website/app/Models/DownloadLog.php`

- [ ] **Step 1: 创建 pages 迁移**

```php
// database/migrations/xxxx_xx_xx_create_pages_table.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('content')->nullable();
            $table->json('meta')->nullable();
            $table->boolean('published')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pages');
    }
};
```

- [ ] **Step 2: 创建 releases 迁移**

```php
// database/migrations/xxxx_xx_xx_create_releases_table.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('releases', function (Blueprint $table) {
            $table->id();
            $table->string('version', 20);
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('changelog')->nullable();
            $table->string('download_url');
            $table->string('file_size', 20)->nullable();
            $table->string('platform', 50)->default('windows');
            $table->string('sha256')->nullable();
            $table->boolean('published')->default(false);
            $table->timestamp('released_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('releases');
    }
};
```

- [ ] **Step 3: 创建 messages 迁移**

```php
// database/migrations/xxxx_xx_xx_create_messages_table.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('subject');
            $table->text('content');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
```

- [ ] **Step 4: 创建 posts 迁移**

```php
// database/migrations/xxxx_xx_xx_create_posts_table.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('excerpt')->nullable();
            $table->longText('content');
            $table->string('cover_image')->nullable();
            $table->json('tags')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
```

- [ ] **Step 5: 创建统计相关迁移**

```php
// database/migrations/xxxx_xx_xx_create_page_views_table.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_views', function (Blueprint $table) {
            $table->id();
            $table->string('url');
            $table->string('ip', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('visited_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_views');
    }
};
```

```php
// database/migrations/xxxx_xx_xx_create_download_logs_table.php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('download_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('release_id')->constrained()->onDelete('cascade');
            $table->string('ip', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('downloaded_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('download_logs');
    }
};
```

- [ ] **Step 6: 创建 Model 类**

```php
// app/Models/Page.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Page extends Model
{
    protected $fillable = ['slug', 'title', 'content', 'meta', 'published'];

    protected $casts = [
        'meta' => 'array',
        'published' => 'boolean',
    ];
}
```

```php
// app/Models/Release.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Release extends Model
{
    protected $fillable = [
        'version', 'title', 'description', 'changelog',
        'download_url', 'file_size', 'platform', 'sha256',
        'published', 'released_at',
    ];

    protected $casts = [
        'published' => 'boolean',
        'released_at' => 'datetime',
    ];

    public function downloadLogs()
    {
        return $this->hasMany(DownloadLog::class);
    }
}
```

```php
// app/Models/Message.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = ['name', 'email', 'subject', 'content', 'read_at'];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }
}
```

```php
// app/Models/Post.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    protected $fillable = [
        'title', 'slug', 'excerpt', 'content',
        'cover_image', 'tags', 'published_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'published_at' => 'datetime',
    ];

    public function scopePublished($query)
    {
        return $query->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }
}
```

```php
// app/Models/PageView.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PageView extends Model
{
    public $timestamps = false;

    protected $fillable = ['url', 'ip', 'user_agent', 'visited_at'];

    protected $casts = [
        'visited_at' => 'datetime',
    ];
}
```

```php
// app/Models/DownloadLog.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DownloadLog extends Model
{
    public $timestamps = false;

    protected $fillable = ['release_id', 'ip', 'user_agent', 'downloaded_at'];

    protected $casts = [
        'downloaded_at' => 'datetime',
    ];

    public function release()
    {
        return $this->belongsTo(Release::class);
    }
}
```

- [ ] **Step 7: 运行迁移**

```bash
php artisan migrate
```

- [ ] **Step 8: 提交**

```bash
git add .
git commit -m "feat: add database migrations and Eloquent models"
```

---

### Task 4: 构建布局模板（导航 + 页脚 + 全局布局）

**Files:**
- Create: `fantuan-website/resources/views/layouts/app.blade.php`
- Create: `fantuan-website/resources/views/components/nav.blade.php`
- Create: `fantuan-website/resources/views/components/footer.blade.php`
- Create: `fantuan-website/resources/views/components/particles.blade.php`

- [ ] **Step 1: 创建全局布局**

```blade
{{-- resources/views/layouts/app.blade.php --}}
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
```

- [ ] **Step 2: 创建导航组件**

```blade
{{-- resources/views/components/nav.blade.php --}}
@props(['transparent' => true])

<nav x-data="{ scrolled: false, mobileOpen: false }"
     x-init="window.addEventListener('scroll', () => scrolled = window.scrollY > 50)"
     class="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
     :class="scrolled ? 'bg-dark-800/90 backdrop-blur-xl border-b border-dark-600/50' : 'bg-transparent'">

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16 md:h-20">

            {{-- Logo --}}
            <a href="/" class="flex items-center space-x-3 group">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center
                            group-hover:shadow-lg group-hover:shadow-brand-500/30 transition-all duration-300">
                    <span class="text-dark-900 font-bold text-sm">饭</span>
                </div>
                <span class="text-lg font-bold text-white hidden sm:block">饭团工坊</span>
            </a>

            {{-- 桌面导航 --}}
            <div class="hidden md:flex items-center space-x-1">
                @php
                    $navItems = [
                        ['label' => '功能', 'route' => 'features'],
                        ['label' => '下载', 'route' => 'download'],
                        ['label' => '文档', 'route' => 'docs'],
                        ['label' => '公告', 'route' => 'blog'],
                        ['label' => '关于', 'route' => 'about'],
                    ];
                @endphp

                @foreach($navItems as $item)
                    <a href="{{ route($item['route']) }}"
                       class="px-4 py-2 text-sm text-dark-200 hover:text-white rounded-lg
                              hover:bg-white/5 transition-all duration-300
                              {{ request()->routeIs($item['route']) ? 'text-brand-400 bg-white/5' : '' }}">
                        {{ $item['label'] }}
                    </a>
                @endforeach

                <a href="https://github.com/fantuan9234/fantuan-workshop" target="_blank"
                   class="ml-4 p-2 text-dark-300 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-300">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
            </div>

            {{-- 移动端菜单按钮 --}}
            <button @click="mobileOpen = !mobileOpen"
                    class="md:hidden p-2 text-dark-300 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path :class="mobileOpen ? 'hidden' : 'block'" stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    <path :class="mobileOpen ? 'block' : 'hidden'" stroke-linecap="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    </div>

    {{-- 移动端菜单 --}}
    <div x-show="mobileOpen"
         x-transition:enter="transition ease-out duration-300"
         x-transition:enter-start="opacity-0 -translate-y-4"
         x-transition:enter-end="opacity-100 translate-y-0"
         x-transition:leave="transition ease-in duration-200"
         x-transition:leave-start="opacity-100 translate-y-0"
         x-transition:leave-end="opacity-0 -translate-y-4"
         class="md:hidden border-t border-dark-600/50 bg-dark-800/95 backdrop-blur-xl">
        <div class="px-4 py-4 space-y-2">
            @foreach($navItems as $item)
                <a href="{{ route($item['route']) }}"
                   class="block px-4 py-3 text-dark-200 hover:text-white rounded-xl hover:bg-white/5 transition-all">
                    {{ $item['label'] }}
                </a>
            @endforeach
            <a href="https://github.com/fantuan9234/fantuan-workshop" target="_blank"
               class="block px-4 py-3 text-dark-200 hover:text-white rounded-xl hover:bg-white/5 transition-all">
                GitHub
            </a>
        </div>
    </div>
</nav>
```

- [ ] **Step 3: 创建页脚组件**

```blade
{{-- resources/views/components/footer.blade.php --}}
<footer class="border-t border-dark-600/50 bg-dark-900/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">

            {{-- 品牌信息 --}}
            <div class="md:col-span-2">
                <div class="flex items-center space-x-3 mb-4">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                        <span class="text-dark-900 font-bold text-sm">饭</span>
                    </div>
                    <span class="text-lg font-bold text-white">饭团工坊</span>
                </div>
                <p class="text-dark-300 text-sm leading-relaxed max-w-md">
                    星露谷物语模组制作工具。轻松管理 NPC、编排事件、配置物品、编辑地图，
                    让你的星露谷世界更加丰富多彩。
                </p>
                <div class="flex space-x-4 mt-6">
                    <a href="https://github.com/fantuan9234/fantuan-workshop" target="_blank"
                       class="p-2 bg-dark-700/50 rounded-lg text-dark-300 hover:text-brand-400 hover:bg-dark-600/50 transition-all">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    </a>
                </div>
            </div>

            {{-- 快速链接 --}}
            <div>
                <h3 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">快速链接</h3>
                <ul class="space-y-3">
                    <li><a href="{{ route('features') }}" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">功能特性</a></li>
                    <li><a href="{{ route('download') }}" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">下载</a></li>
                    <li><a href="{{ route('docs') }}" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">文档</a></li>
                    <li><a href="{{ route('blog') }}" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">公告</a></li>
                </ul>
            </div>

            {{-- 相关资源 --}}
            <div>
                <h3 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">相关资源</h3>
                <ul class="space-y-3">
                    <li><a href="https://stardewvalleywiki.com" target="_blank" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">星露谷 Wiki</a></li>
                    <li><a href="https://www.nexusmods.com/stardewvalley" target="_blank" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">Nexus Mods</a></li>
                    <li><a href="https://github.com/Pathoschild/SMAPI" target="_blank" class="text-sm text-dark-300 hover:text-brand-400 transition-colors">SMAPI</a></li>
                </ul>
            </div>
        </div>

        <div class="mt-12 pt-8 border-t border-dark-600/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p class="text-sm text-dark-400">&copy; {{ date('Y') }} 饭团工坊. MIT License.</p>
            <p class="text-sm text-dark-400">
                星露谷物语 &copy; ConcernedApe. 本工具为非官方粉丝制作。
            </p>
        </div>
    </div>
</footer>
```

- [ ] **Step 4: 创建星空粒子背景**

```blade
{{-- resources/views/components/particles.blade.php --}}
<div id="particles-bg" class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
</div>

@push('scripts')
<script>
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-full';
    document.getElementById('particles-bg').appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let stars = [];
    let mouseX = 0, mouseY = 0;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Star {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.opacity = Math.random() * 0.8 + 0.2;
            this.speed = Math.random() * 0.3 + 0.05;
            this.direction = Math.random() * Math.PI * 2;
        }
        update() {
            this.direction += (Math.random() - 0.5) * 0.01;
            this.x += Math.cos(this.direction) * this.speed;
            this.y += Math.sin(this.direction) * this.speed;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
            // 鼠标互动
            const dx = this.x - mouseX;
            const dy = this.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                this.x += dx * 0.005;
                this.y += dy * 0.005;
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < 150; i++) {
        stars.push(new Star());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(star => {
            star.update();
            star.draw();
        });
        requestAnimationFrame(animate);
    }

    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    animate();
});
</script>
@endpush
```

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: build layout templates (nav, footer, particles)"
```

---

### Task 5: 实现首页（Hero + 功能卡片 + 下载区）

**Files:**
- Create: `fantuan-website/routes/web.php`
- Create: `fantuan-website/app/Http/Controllers/HomeController.php`
- Create: `fantuan-website/resources/views/pages/home.blade.php`

- [ ] **Step 1: 配置路由**

```php
// routes/web.php
<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\FeatureController;
use App\Http\Controllers\DownloadController;
use App\Http\Controllers\DocController;
use App\Http\Controllers\AboutController;
use App\Http\Controllers\BlogController;

// 首页
Route::get('/', [HomeController::class, 'index'])->name('home');

// 功能
Route::get('/features', [FeatureController::class, 'index'])->name('features');

// 下载
Route::get('/download', [DownloadController::class, 'index'])->name('download');
Route::get('/download/{version}', [DownloadController::class, 'show'])->name('download.show');

// 文档
Route::get('/docs', [DocController::class, 'index'])->name('docs');
Route::get('/docs/{slug}', [DocController::class, 'show'])->name('docs.show');

// 关于
Route::get('/about', [AboutController::class, 'index'])->name('about');

// 博客/公告
Route::get('/blog', [BlogController::class, 'index'])->name('blog');
Route::get('/blog/{slug}', [BlogController::class, 'show'])->name('blog.show');
```

- [ ] **Step 2: 创建 HomeController**

```php
// app/Http/Controllers/HomeController.php
<?php
namespace App\Http\Controllers;

use App\Models\Release;

class HomeController extends Controller
{
    public function index()
    {
        $latestRelease = Release::where('published', true)
            ->where('platform', 'windows')
            ->orderBy('released_at', 'desc')
            ->first();

        $features = [
            [
                'icon' => 'user',
                'title' => 'NPC 编辑',
                'description' => '管理 45 位原版 NPC 的肖像与行走图，也支持创建自定义角色。',
                'color' => 'from-amber-500 to-orange-600',
            ],
            [
                'icon' => 'calendar',
                'title' => '事件编排',
                'description' => '可视化编排 NPC 对话、移动、动画等游戏事件流程，所见即所得。',
                'color' => 'from-emerald-500 to-teal-600',
            ],
            [
                'icon' => 'package',
                'title' => '物品配置',
                'description' => '配置物品属性、售价、描述，创建属于你的独特道具。',
                'color' => 'from-blue-500 to-indigo-600',
            ],
            [
                'icon' => 'map',
                'title' => '地图编辑',
                'description' => '创建和修改游戏地图，预览修改效果，轻松布局场景。',
                'color' => 'from-purple-500 to-pink-600',
            ],
            [
                'icon' => 'check-circle',
                'title' => '任务系统',
                'description' => '管理游戏任务目标与奖励，设计丰富的任务链。',
                'color' => 'from-cyan-500 to-blue-600',
            ],
            [
                'icon' => 'mail',
                'title' => '邮件管理',
                'description' => '编辑游戏内邮件内容，给玩家发送自定义信件。',
                'color' => 'from-rose-500 to-red-600',
            ],
        ];

        return view('pages.home', compact('latestRelease', 'features'));
    }
}
```

- [ ] **Step 3: 创建首页视图**

```blade
{{-- resources/views/pages/home.blade.php --}}
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
                    <svg class="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    {{-- SVG 图标 --}}
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

            <a href="{{ $latestRelease->download_url }}"
               class="btn-primary text-lg w-full justify-center mb-4 group">
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
            <a href="https://github.com/fantuan9234/fantuan-workshop/releases" target="_blank"
               class="btn-primary">前往 GitHub Releases</a>
        </div>
        @endif
    </div>
</section>
@endsection
```

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: implement homepage (hero, features, download)"
```

---

### Task 6: 实现功能页 / 下载页 / 关于页

**Files:**
- Create: `fantuan-website/app/Http/Controllers/FeatureController.php`
- Create: `fantuan-website/app/Http/Controllers/DownloadController.php`
- Create: `fantuan-website/app/Http/Controllers/AboutController.php`
- Create: `fantuan-website/resources/views/pages/features.blade.php`
- Create: `fantuan-website/resources/views/pages/download.blade.php`
- Create: `fantuan-website/resources/views/pages/about.blade.php`

- [ ] **Step 1: 创建功能页控制器 + 视图**

```php
// app/Http/Controllers/FeatureController.php
<?php
namespace App\Http\Controllers;

class FeatureController extends Controller
{
    public function index()
    {
        $features = [
            [
                'title' => 'NPC 编辑器',
                'subtitle' => '管理星露谷全部 45 位 NPC',
                'description' => '编辑 NPC 的肖像图、行走图、对话内容。支持 4 季服装切换、节日专属对话、自定义 NPC 创建。',
                'highlights' => [
                    '45 位原版 NPC 完整数据',
                    '肖像图与行走图双编辑',
                    '支持自定义 NPC 创建',
                    '四季服装自动切换',
                    '生日与社交数据管理',
                ],
                'image' => 'npc-editor.png',
                'gradient' => 'from-amber-500 to-orange-600',
            ],
            [
                'title' => '事件编辑器',
                'subtitle' => '可视化编排游戏事件',
                'description' => '拖拽式编排 NPC 对话、移动、动画、选项分支等事件步骤，实时预览效果。',
                'highlights' => [
                    '可视化步骤编排',
                    '支持所有事件指令类型',
                    '对话、移动、动画混合编排',
                    '条件分支与选项系统',
                    '实时预览事件效果',
                ],
                'image' => 'event-editor.png',
                'gradient' => 'from-emerald-500 to-teal-600',
            ],
            [
                'title' => '物品配置器',
                'subtitle' => '创建属于你的独特道具',
                'description' => '配置物品名称、描述、售价、类型、分类等属性，创建武器、工具、装饰品等各类物品。',
                'highlights' => [
                    '丰富的物品类型支持',
                    '自定义属性配置',
                    '物品图标预览',
                    '批量导入/导出',
                    '兼容 SMAPI 模组格式',
                ],
                'image' => 'item-editor.png',
                'gradient' => 'from-blue-500 to-indigo-600',
            ],
            [
                'title' => '地图编辑器',
                'subtitle' => '创建和修改游戏地图',
                'description' => '基于游戏原版地图进行编辑修改，添加建筑、装饰、传送点等地图元素。',
                'highlights' => [
                    '加载原版地图文件',
                    '瓦片编辑与图层管理',
                    '建筑与装饰物放置',
                    '传送点与触发区域',
                    '季节变化支持',
                ],
                'image' => 'map-editor.png',
                'gradient' => 'from-purple-500 to-pink-600',
            ],
        ];

        return view('pages.features', compact('features'));
    }
}
```

```blade
{{-- resources/views/pages/features.blade.php --}}
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
            <a href="{{ route('download') }}" class="btn-primary text-lg">免费下载</a>
        </div>
    </section>
</div>
@endsection
```

- [ ] **Step 2: 创建下载页控制器 + 视图**

```php
// app/Http/Controllers/DownloadController.php
<?php
namespace App\Http\Controllers;

use App\Models\Release;

class DownloadController extends Controller
{
    public function index()
    {
        $latestRelease = Release::where('published', true)
            ->orderBy('released_at', 'desc')
            ->first();

        $releases = Release::where('published', true)
            ->orderBy('released_at', 'desc')
            ->get();

        return view('pages.download', compact('latestRelease', 'releases'));
    }

    public function show($version)
    {
        $release = Release::where('version', $version)->firstOrFail();
        return view('pages.download-detail', compact('release'));
    }
}
```

```blade
{{-- resources/views/pages/download.blade.php --}}
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
                        <svg class="w-4 h-4 text-brand-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        支持 Windows 10/11 64位
                    </div>
                    <div class="flex items-center text-sm text-dark-300">
                        <svg class="w-4 h-4 text-brand-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        需要 SMAPI 3.18+
                    </div>
                    <div class="flex items-center text-sm text-dark-300">
                        <svg class="w-4 h-4 text-brand-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        开源 · MIT 协议
                    </div>
                </div>

                <a href="{{ $latestRelease->download_url }}"
                   class="btn-primary w-full justify-center text-lg group">
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
                        </div>
                        <div class="flex items-center space-x-3">
                            @if($release->changelog)
                            <button onclick="alert('{{ addslashes($release->changelog) }}')"
                                    class="text-sm text-dark-400 hover:text-brand-400 transition-colors">
                                更新内容
                            </button>
                            @endif
                            <a href="{{ $release->download_url }}"
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
                <a href="https://github.com/fantuan9234/fantuan-workshop/releases" target="_blank"
                   class="btn-primary">前往 GitHub Releases</a>
            </div>
            @endif
        </div>
    </section>
</div>
@endsection
```

- [ ] **Step 3: 创建关于页**

```php
// app/Http/Controllers/AboutController.php
<?php
namespace App\Http\Controllers;

class AboutController extends Controller
{
    public function index()
    {
        return view('pages.about');
    }
}
```

```blade
{{-- resources/views/pages/about.blade.php --}}
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
                <div class="prose prose-invert max-w-none text-dark-300 leading-relaxed space-y-4">
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
                    <a href="https://github.com/fantuan9234/fantuan-workshop" target="_blank"
                       class="flex items-center space-x-3 text-dark-300 hover:text-brand-400 transition-colors group">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                        <span>GitHub: fantuan9234/fantuan-workshop  <span class="text-dark-500 group-hover:translate-x-1 inline-block transition-transform">→</span></span>
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
```

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: implement features, download, and about pages"
```

---

### Task 7: 实现文档页 + 博客页

**Files:**
- Create: `fantuan-website/app/Http/Controllers/DocController.php`
- Create: `fantuan-website/app/Http/Controllers/BlogController.php`
- Create: `fantuan-website/resources/views/pages/docs.blade.php`
- Create: `fantuan-website/resources/views/pages/blog/index.blade.php`
- Create: `fantuan-website/resources/views/pages/blog/show.blade.php`

- [ ] **Step 1: 创建 DocController**

```php
// app/Http/Controllers/DocController.php
<?php
namespace App\Http\Controllers;

class DocController extends Controller
{
    public function index()
    {
        $docs = [
            'getting-started' => [
                'title' => '快速开始',
                'children' => [
                    ['slug' => 'installation', 'title' => '安装指南'],
                    ['slug' => 'first-use', 'title' => '首次使用'],
                    ['slug' => 'project-basics', 'title' => '项目基础'],
                ],
            ],
            'editors' => [
                'title' => '编辑器指南',
                'children' => [
                    ['slug' => 'npc-editor', 'title' => 'NPC 编辑'],
                    ['slug' => 'event-editor', 'title' => '事件编辑'],
                    ['slug' => 'item-editor', 'title' => '物品编辑'],
                    ['slug' => 'map-editor', 'title' => '地图编辑'],
                    ['slug' => 'quest-editor', 'title' => '任务编辑'],
                    ['slug' => 'mail-editor', 'title' => '邮件编辑'],
                ],
            ],
            'advanced' => [
                'title' => '进阶',
                'children' => [
                    ['slug' => 'export-mod', 'title' => '模组导出'],
                    ['slug' => 'faq', 'title' => '常见问题'],
                ],
            ],
        ];

        return view('pages.docs', compact('docs'));
    }

    public function show($slug)
    {
        $content = $this->getDocContent($slug);
        return view('pages.docs-show', compact('content', 'slug'));
    }

    private function getDocContent($slug)
    {
        $contents = [
            'installation' => [
                'title' => '安装指南',
                'body' => "
## 系统要求

- **操作系统**: Windows 10/11 64位
- **内存**: 4GB 以上
- **硬盘空间**: 200MB 以上
- **依赖**: SMAPI 3.18+

## 安装步骤

1. 从官网下载最新版本的安装包
2. 双击运行安装程序
3. 按照安装向导完成安装
4. 启动饭团工坊

## 首次运行

首次启动时，程序会引导你完成基本配置：
- 选择星露谷物语游戏目录
- 创建或打开模组项目
- 浏览欢迎页面了解基本操作
                ",
            ],
            'first-use' => [
                'title' => '首次使用',
                'body' => "
## 欢迎页面

首次启动饭团工坊时，你会看到欢迎页面。这里提供了快速操作入口：

- **选择游戏目录** - 告诉程序你的星露谷物语安装位置
- **新建项目** - 创建一个新的模组项目
- **打开项目** - 打开已有的模组项目
- **查看教程** - 浏览使用教程

## 界面概览

主界面分为三个区域：

1. **左侧边栏** - 导航和功能切换
2. **中央工作区** - 主要编辑区域
3. **顶部工具栏** - 项目操作和设置
                ",
            ],
        ];

        return $contents[$slug] ?? ['title' => '文档未找到', 'body' => '该文档页面暂未上线。'];
    }
}
```

```blade
{{-- resources/views/pages/docs.blade.php --}}
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
```

```blade
{{-- resources/views/pages/docs-show.blade.php --}}
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
```

- [ ] **Step 2: 创建 BlogController + 视图**

```php
// app/Http/Controllers/BlogController.php
<?php
namespace App\Http\Controllers;

use App\Models\Post;

class BlogController extends Controller
{
    public function index()
    {
        $posts = Post::published()
            ->orderBy('published_at', 'desc')
            ->paginate(10);

        return view('pages.blog.index', compact('posts'));
    }

    public function show($slug)
    {
        $post = Post::where('slug', $slug)
            ->published()
            ->firstOrFail();

        return view('pages.blog.show', compact('post'));
    }
}
```

```blade
{{-- resources/views/pages/blog/index.blade.php --}}
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
                                <span>{{ $post->published_at->format('Y-m-d') }}</span>
                                @if($post->tags)
                                    @foreach($post->tags as $tag)
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
```

```blade
{{-- resources/views/pages/blog/show.blade.php --}}
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
                        <span>{{ $post->published_at->format('Y-m-d') }}</span>
                        @if($post->tags)
                            @foreach($post->tags as $tag)
                            <span class="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400">{{ $tag }}</span>
                            @endforeach
                        @endif
                    </div>
                    <h1 class="text-3xl md:text-4xl font-bold text-white">{{ $post->title }}</h1>
                </div>

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
```

- [ ] **Step 3: 配置 Markdown 支持**

```bash
composer require spatie/laravel-markdown
```

```php
// 在 app/Providers/AppServiceProvider.php 的 boot 方法中或使用 Blade::directive
// 由于 Laravel 11 已内置 markdown 支持，可直接使用 @markdown() 指令
// 如不支持则安装 spatie/laravel-markdown
```

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: implement docs and blog pages"
```

---

### Task 8: 安装配置 Filament 管理后台

**Files:**
- Modify: `fantuan-website/app/Providers/Filament/AdminPanelProvider.php`
- Create: `fantuan-website/app/Filament/Resources/PageResource.php`
- Create: `fantuan-website/app/Filament/Resources/ReleaseResource.php`
- Create: `fantuan-website/app/Filament/Resources/MessageResource.php`
- Create: `fantuan-website/app/Filament/Resources/PostResource.php`

- [ ] **Step 1: 配置 Filament Panel（深色主题）**

```php
// app/Providers/Filament/AdminPanelProvider.php
<?php
namespace App\Providers\Filament;

use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Widgets;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\AuthenticateSession;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->colors([
                'primary' => Color::Amber,
            ])
            ->darkMode(true)
            ->defaultDarkMode(true)
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\\Filament\\Pages')
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\\Filament\\Widgets')
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}
```

- [ ] **Step 2: 创建 PageResource（页面内容管理）**

```php
// app/Filament/Resources/PageResource.php
<?php
namespace App\Filament\Resources;

use App\Filament\Resources\PageResource\Pages;
use App\Models\Page;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class PageResource extends Resource
{
    protected static ?string $model = Page::class;

    protected static ?string $navigationIcon = 'heroicon-o-document-text';

    protected static ?string $navigationLabel = '页面内容';

    protected static ?string $modelLabel = '页面';

    protected static ?string $pluralModelLabel = '页面内容';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('基本信息')
                    ->schema([
                        Forms\Components\TextInput::make('title')
                            ->label('标题')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('slug')
                            ->label('URL 标识')
                            ->required()
                            ->maxLength(255)
                            ->unique(ignoreRecord: true),
                        Forms\Components\Toggle::make('published')
                            ->label('发布')
                            ->default(false),
                    ])
                    ->columns(3),

                Forms\Components\Section::make('内容')
                    ->schema([
                        Forms\Components\RichEditor::make('content')
                            ->label('页面内容')
                            ->toolbarButtons([
                                'bold', 'italic', 'underline', 'strike',
                                'link', 'heading', 'blockquote',
                                'bulletList', 'orderedList',
                                'codeBlock', 'table',
                            ]),
                    ]),

                Forms\Components\Section::make('元数据')
                    ->schema([
                        Forms\Components\KeyValue::make('meta')
                            ->label('自定义字段'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->label('标题')
                    ->searchable(),
                Tables\Columns\TextColumn::make('slug')
                    ->label('URL 标识')
                    ->searchable(),
                Tables\Columns\IconColumn::make('published')
                    ->label('状态')
                    ->boolean(),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('最后更新')
                    ->dateTime('Y-m-d H:i'),
            ])
            ->defaultSort('updated_at', 'desc')
            ->filters([])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPages::route('/'),
            'create' => Pages\CreatePage::route('/create'),
            'edit' => Pages\EditPage::route('/{record}/edit'),
        ];
    }
}
```

- [ ] **Step 3: 创建 ReleaseResource（下载版本管理）**

```php
// app/Filament/Resources/ReleaseResource.php
<?php
namespace App\Filament\Resources;

use App\Filament\Resources\ReleaseResource\Pages;
use App\Models\Release;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ReleaseResource extends Resource
{
    protected static ?string $model = Release::class;

    protected static ?string $navigationIcon = 'heroicon-o-arrow-down-tray';

    protected static ?string $navigationLabel = '版本管理';

    protected static ?string $modelLabel = '版本';

    protected static ?string $pluralModelLabel = '版本管理';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('版本信息')
                    ->schema([
                        Forms\Components\TextInput::make('version')
                            ->label('版本号')
                            ->required()
                            ->placeholder('0.1.9')
                            ->maxLength(20),
                        Forms\Components\TextInput::make('title')
                            ->label('标题')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\Select::make('platform')
                            ->label('平台')
                            ->options([
                                'windows' => 'Windows',
                                'macos' => 'macOS',
                                'linux' => 'Linux',
                            ])
                            ->default('windows')
                            ->required(),
                        Forms\Components\TextInput::make('file_size')
                            ->label('文件大小')
                            ->placeholder('50MB'),
                        Forms\Components\DateTimePicker::make('released_at')
                            ->label('发布日期')
                            ->default(now()),
                        Forms\Components\Toggle::make('published')
                            ->label('发布'),
                    ])
                    ->columns(3),

                Forms\Components\Section::make('下载信息')
                    ->schema([
                        Forms\Components\TextInput::make('download_url')
                            ->label('下载地址')
                            ->required()
                            ->url()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('sha256')
                            ->label('SHA256 校验')
                            ->maxLength(255),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('描述与更新日志')
                    ->schema([
                        Forms\Components\Textarea::make('description')
                            ->label('简要描述')
                            ->rows(3),
                        Forms\Components\RichEditor::make('changelog')
                            ->label('更新日志'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('version')
                    ->label('版本号')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('title')
                    ->label('标题'),
                Tables\Columns\TextColumn::make('platform')
                    ->label('平台')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'windows' => 'info',
                        'macos' => 'success',
                        'linux' => 'warning',
                    }),
                Tables\Columns\IconColumn::make('published')
                    ->label('状态')
                    ->boolean(),
                Tables\Columns\TextColumn::make('downloads')
                    ->label('下载次数')
                    ->counts('downloadLogs'),
                Tables\Columns\TextColumn::make('released_at')
                    ->label('发布日期')
                    ->dateTime('Y-m-d')
                    ->sortable(),
            ])
            ->defaultSort('released_at', 'desc')
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListReleases::route('/'),
            'create' => Pages\CreateRelease::route('/create'),
            'edit' => Pages\EditRelease::route('/{record}/edit'),
        ];
    }
}
```

- [ ] **Step 4: 创建 MessageResource（用户消息管理）**

```php
// app/Filament/Resources/MessageResource.php
<?php
namespace App\Filament\Resources;

use App\Filament\Resources\MessageResource\Pages;
use App\Models\Message;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class MessageResource extends Resource
{
    protected static ?string $model = Message::class;

    protected static ?string $navigationIcon = 'heroicon-o-chat-bubble-left-right';

    protected static ?string $navigationLabel = '用户消息';

    protected static ?string $modelLabel = '消息';

    protected static ?string $pluralModelLabel = '用户消息';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('消息详情')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->label('姓名')
                            ->disabled(),
                        Forms\Components\TextInput::make('email')
                            ->label('邮箱')
                            ->disabled(),
                        Forms\Components\TextInput::make('subject')
                            ->label('主题')
                            ->disabled(),
                        Forms\Components\Textarea::make('content')
                            ->label('内容')
                            ->disabled()
                            ->rows(5),
                        Forms\Components\DateTimePicker::make('read_at')
                            ->label('阅读时间'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('姓名')
                    ->searchable(),
                Tables\Columns\TextColumn::make('email')
                    ->label('邮箱')
                    ->searchable(),
                Tables\Columns\TextColumn::make('subject')
                    ->label('主题')
                    ->limit(30),
                Tables\Columns\IconColumn::make('read_at')
                    ->label('已读')
                    ->boolean()
                    ->trueIcon('heroicon-o-check-circle')
                    ->falseIcon('heroicon-o-envelope'),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('提交时间')
                    ->dateTime('Y-m-d H:i')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([
                Tables\Actions\EditAction::make()->label('查看'),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListMessages::route('/'),
            'edit' => Pages\EditMessage::route('/{record}/edit'),
        ];
    }
}
```

- [ ] **Step 5: 创建 PostResource（公告管理）**

```php
// app/Filament/Resources/PostResource.php
<?php
namespace App\Filament\Resources;

use App\Filament\Resources\PostResource\Pages;
use App\Models\Post;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class PostResource extends Resource
{
    protected static ?string $model = Post::class;

    protected static ?string $navigationIcon = 'heroicon-o-megaphone';

    protected static ?string $navigationLabel = '公告管理';

    protected static ?string $modelLabel = '公告';

    protected static ?string $pluralModelLabel = '公告管理';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('基本信息')
                    ->schema([
                        Forms\Components\TextInput::make('title')
                            ->label('标题')
                            ->required()
                            ->live(onBlur: true)
                            ->afterStateUpdated(fn ($state, callable $set) => $set('slug', Str::slug($state))),
                        Forms\Components\TextInput::make('slug')
                            ->label('URL 标识')
                            ->required()
                            ->unique(ignoreRecord: true),
                        Forms\Components\Textarea::make('excerpt')
                            ->label('摘要')
                            ->rows(3),
                        Forms\Components\TagsInput::make('tags')
                            ->label('标签'),
                        Forms\Components\DateTimePicker::make('published_at')
                            ->label('发布时间')
                            ->default(now()),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('封面图片')
                    ->schema([
                        Forms\Components\FileUpload::make('cover_image')
                            ->label('封面图')
                            ->image()
                            ->directory('blog/covers')
                            ->maxSize(2048),
                    ]),

                Forms\Components\Section::make('正文')
                    ->schema([
                        Forms\Components\RichEditor::make('content')
                            ->label('内容')
                            ->required()
                            ->toolbarButtons([
                                'bold', 'italic', 'underline', 'strike',
                                'link', 'heading', 'blockquote',
                                'bulletList', 'orderedList',
                                'codeBlock', 'table', 'image',
                            ]),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->label('标题')
                    ->searchable()
                    ->limit(40),
                Tables\Columns\TextColumn::make('tags')
                    ->label('标签')
                    ->badge()
                    ->separator(','),
                Tables\Columns\TextColumn::make('published_at')
                    ->label('发布时间')
                    ->dateTime('Y-m-d H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('创建时间')
                    ->dateTime('Y-m-d')
                    ->sortable(),
            ])
            ->defaultSort('published_at', 'desc')
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPosts::route('/'),
            'create' => Pages\CreatePost::route('/create'),
            'edit' => Pages\EditPost::route('/{record}/edit'),
        ];
    }
}
```

- [ ] **Step 6: 提交**

```bash
git add .
git commit -m "feat: add Filament admin panel with Page, Release, Message, Post resources"
```

---

### Task 9: 添加统计数据面板和联系表单

**Files:**
- Create: `fantuan-website/app/Filament/Widgets/StatsOverview.php`
- Create: `fantuan-website/app/Livewire/ContactForm.php`
- Create: `fantuan-website/resources/views/livewire/contact-form.blade.php`

- [ ] **Step 1: 创建统计 Widget**

```php
// app/Filament/Widgets/StatsOverview.php
<?php
namespace App\Filament\Widgets;

use App\Models\Message;
use App\Models\PageView;
use App\Models\Post;
use App\Models\Release;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('总发布版本', Release::where('published', true)->count())
                ->description('所有已发布的版本')
                ->color('success'),

            Stat::make('未读消息', Message::unread()->count())
                ->description('待处理的用户消息')
                ->color('warning'),

            Stat::make('已发布公告', Post::published()->count())
                ->description('所有已发布的公告')
                ->color('info'),
        ];
    }
}
```

- [ ] **Step 2: 创建联系表单 Livewire 组件**

```php
// app/Livewire/ContactForm.php
<?php
namespace App\Livewire;

use App\Models\Message;
use Livewire\Component;

class ContactForm extends Component
{
    public string $name = '';
    public string $email = '';
    public string $subject = '';
    public string $content = '';
    public bool $success = false;

    protected $rules = [
        'name' => 'required|min:2|max:50',
        'email' => 'required|email',
        'subject' => 'required|min:2|max:100',
        'content' => 'required|min:10|max:2000',
    ];

    protected $messages = [
        'name.required' => '请输入您的姓名',
        'email.required' => '请输入您的邮箱',
        'email.email' => '请输入有效的邮箱地址',
        'subject.required' => '请输入主题',
        'content.required' => '请输入内容',
        'content.min' => '内容至少 10 个字符',
    ];

    public function submit()
    {
        $this->validate();

        Message::create([
            'name' => $this->name,
            'email' => $this->email,
            'subject' => $this->subject,
            'content' => $this->content,
        ]);

        $this->reset();
        $this->success = true;
    }

    public function render()
    {
        return view('livewire.contact-form');
    }
}
```

```blade
{{-- resources/views/livewire/contact-form.blade.php --}}
<div>
    @if($success)
        <div class="glass-card p-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-500/20 flex items-center justify-center">
                <svg class="w-8 h-8 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">消息已发送！</h3>
            <p class="text-dark-400">感谢你的反馈，我们会尽快处理。</p>
        </div>
    @else
        <form wire:submit="submit" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm text-dark-200 mb-2">姓名</label>
                    <input wire:model="name" type="text"
                           class="w-full px-4 py-3 bg-dark-700/50 border border-dark-500 rounded-xl text-white
                                  focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all
                                  placeholder:text-dark-500">
                    @error('name') <p class="text-red-400 text-sm mt-1">{{ $message }}</p> @enderror
                </div>
                <div>
                    <label class="block text-sm text-dark-200 mb-2">邮箱</label>
                    <input wire:model="email" type="email"
                           class="w-full px-4 py-3 bg-dark-700/50 border border-dark-500 rounded-xl text-white
                                  focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all
                                  placeholder:text-dark-500">
                    @error('email') <p class="text-red-400 text-sm mt-1">{{ $message }}</p> @enderror
                </div>
            </div>

            <div>
                <label class="block text-sm text-dark-200 mb-2">主题</label>
                <input wire:model="subject" type="text"
                       class="w-full px-4 py-3 bg-dark-700/50 border border-dark-500 rounded-xl text-white
                              focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all
                              placeholder:text-dark-500">
                @error('subject') <p class="text-red-400 text-sm mt-1">{{ $message }}</p> @enderror
            </div>

            <div>
                <label class="block text-sm text-dark-200 mb-2">内容</label>
                <textarea wire:model="content" rows="5"
                          class="w-full px-4 py-3 bg-dark-700/50 border border-dark-500 rounded-xl text-white
                                 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all
                                 placeholder:text-dark-500 resize-none"></textarea>
                @error('content') <p class="text-red-400 text-sm mt-1">{{ $message }}</p> @enderror
            </div>

            <button type="submit" class="btn-primary w-full justify-center">
                发送消息
            </button>
        </form>
    @endif
</div>
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add stats widget and contact form"
```

---

### Task 10: 添加联系页面路由并集成联系表单

**Files:**
- Modify: `fantuan-website/routes/web.php`
- Create: `fantuan-website/resources/views/pages/contact.blade.php`

- [ ] **Step 1: 添加联系页面路由**

```php
// 在 routes/web.php 中添加
Route::get('/contact', function () {
    return view('pages.contact');
})->name('contact');
```

```blade
{{-- resources/views/pages/contact.blade.php --}}
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
```

- [ ] **Step 2: 在导航中添加联系页面**

```blade
{{-- 在 nav.blade.php 的 $navItems 数组中添加 --}}
['label' => '联系', 'route' => 'contact'],
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add contact page with form"
```

---

### Task 11: 数据填充 + 部署配置

**Files:**
- Create: `fantuan-website/database/seeders/DatabaseSeeder.php`

- [ ] **Step 1: 创建数据填充器**

```php
// database/seeders/DatabaseSeeder.php
<?php
namespace Database\Seeders;

use App\Models\Post;
use App\Models\Release;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 创建示例公告
        Post::create([
            'title' => '饭团工坊 v0.1.9 正式发布',
            'slug' => 'fantuan-workshop-v0-1-9-released',
            'excerpt' => '我们很高兴地宣布饭团工坊 v0.1.9 正式发布！本次更新带来了多项新功能和改进。',
            'content' => "## 更新亮点\n\n### 新功能\n\n- **NPC 编辑器**：全面支持 45 位原版 NPC 的肖像与行走图编辑\n- **事件编辑器**：可视化编排游戏事件，支持对话、移动、动画等\n- **物品配置器**：创建自定义物品，配置属性、售价、描述\n\n### 改进\n\n- 优化了项目加载速度\n- 改进了用户界面交互体验\n\n### 修复\n\n- 修复了若干已知问题\n\n---\n\n感谢所有提供反馈的用户！",
            'tags' => ['版本发布', 'v0.1.9'],
            'published_at' => now(),
        ]);

        // 创建示例版本
        Release::create([
            'version' => '0.1.9',
            'title' => '饭团工坊 v0.1.9',
            'description' => '首个公开测试版本，包含核心编辑器功能。',
            'changelog' => "## 新增\n- NPC 编辑器\n- 事件编辑器\n- 物品配置器\n- 地图编辑器",
            'download_url' => 'https://github.com/fantuan9234/fantuan-workshop/releases/tag/v0.1.9',
            'file_size' => '120MB',
            'platform' => 'windows',
            'sha256' => '请以 GitHub Releases 页面为准',
            'published' => true,
            'released_at' => now(),
        ]);
    }
}
```

- [ ] **Step 2: 运行迁移和填充**

```bash
php artisan migrate
php artisan db:seed
```

- [ ] **Step 3: 配置 Nginx 伪静态**

在宝塔站点设置 → 伪静态 → Laravel：

```nginx
location / {
    try_files $uri $uri/ /index.php?$query_string;
}

location ~ \.php$ {
    fastcgi_pass unix:/tmp/php-cgi-84.sock;
    fastcgi_index index.php;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}

location ~ /\.(?!well-known).* {
    deny all;
}
```

- [ ] **Step 4: 配置存储链接和缓存**

```bash
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

- [ ] **Step 5: 创建 .env 生产配置示例**

```bash
# 生产环境 .env 关键配置
APP_ENV=production
APP_DEBUG=false
APP_URL=https://你的域名

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fantuan_website
DB_USERNAME=你的数据库用户名
DB_PASSWORD=你的数据库密码
```

- [ ] **Step 6: 提交**

```bash
git add .
git commit -m "feat: add database seeder and deployment config"
```
