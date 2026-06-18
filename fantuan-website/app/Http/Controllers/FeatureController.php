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
                'gradient' => 'from-purple-500 to-pink-600',
            ],
            [
                'title' => '任务系统',
                'subtitle' => '设计丰富的任务链',
                'description' => '管理游戏任务目标与奖励，支持多步骤任务、条件触发、进度追踪。',
                'highlights' => [
                    '多步骤任务编排',
                    '条件触发系统',
                    '进度追踪与日志',
                    '奖励自定义配置',
                ],
                'gradient' => 'from-cyan-500 to-blue-600',
            ],
            [
                'title' => '邮件管理',
                'subtitle' => '编辑游戏内邮件',
                'description' => '创建和编辑游戏内邮件内容，支持多种邮件模板，给玩家发送自定义信件。',
                'highlights' => [
                    '邮件模板管理',
                    '自定义发件人',
                    '附件物品支持',
                    '条件触发发送',
                ],
                'gradient' => 'from-rose-500 to-red-600',
            ],
        ];

        return view('pages.features', compact('features'));
    }
}
