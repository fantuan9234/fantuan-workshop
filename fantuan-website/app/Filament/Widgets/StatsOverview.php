<?php
namespace App\Filament\Widgets;

use App\Models\Message;
use App\Models\Post;
use App\Models\Release;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('已发布版本', Release::where('published', true)->count())
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