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
