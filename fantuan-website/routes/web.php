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

// 公告
Route::get('/blog', [BlogController::class, 'index'])->name('blog');
Route::get('/blog/{slug}', [BlogController::class, 'show'])->name('blog.show');

// 联系
Route::get('/contact', function () {
    return view('pages.contact');
})->name('contact');
