#!/bin/bash
# 饭团工坊官网 - 服务端初始化脚本
# 在宝塔服务器上运行此脚本

set -e

echo "==================================="
echo "  饭团工坊官网 - 项目初始化"
echo "==================================="

# 1. 创建 Laravel 项目
echo "[1/8] 创建 Laravel 11 项目..."
composer create-project laravel/laravel . "^11.0" --no-interaction

# 2. 安装依赖
echo "[2/8] 安装 Filament 和其他依赖..."
composer require filament/filament:"^3.2" -W --no-interaction
composer require livewire/livewire "^3.0" --no-interaction

# 3. 安装前端依赖
echo "[3/8] 安装前端依赖..."
npm install -D tailwindcss @tailwindcss/forms @tailwindcss/typography postcss autoprefixer

# 4. 复制自定义文件
echo "[4/8] 复制自定义代码..."
# 将我方提供的文件复制到对应目录
# (已手动放置)

# 5. 配置 Filament
echo "[5/8] 配置 Filament..."
php artisan filament:install --panels --no-interaction

# 6. 运行迁移
echo "[6/8] 运行数据库迁移..."
php artisan migrate

# 7. 填充数据
echo "[7/8] 填充示例数据..."
php artisan db:seed

# 8. 构建前端
echo "[8/8] 构建前端资源..."
npm run build

echo ""
echo "==================================="
echo "  ✅ 初始化完成！"
echo "==================================="
echo ""
echo "下一步："
echo "  1. 创建管理员账号: php artisan make:filament-user"
echo "  2. 配置 .env 中的数据库信息"
echo "  3. 访问 https://你的域名/admin 登录后台"
echo "  4. 访问 https://你的域名/ 查看前台"
echo ""
