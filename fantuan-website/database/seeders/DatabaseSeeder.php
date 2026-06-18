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
            'content' => "## 更新亮点\n\n### 新功能\n\n- **NPC 编辑器**：全面支持 45 位原版 NPC 的肖像与行走图编辑\n- **事件编辑器**：可视化编排游戏事件，支持对话、移动、动画等\n- **物品配置器**：创建自定义物品，配置属性、售价、描述\n- **地图编辑器**：创建和修改游戏地图\n\n### 改进\n\n- 优化了项目加载速度\n- 改进了用户界面交互体验\n- 增加了空状态引导页面\n\n### 修复\n\n- 修复了若干已知的界面显示问题\n- 修复了某些场景下的崩溃问题\n\n---\n\n感谢所有提供反馈的用户！欢迎通过官网联系我们提交建议。",
            'tags' => ['版本发布', 'v0.1.9'],
            'published_at' => now(),
        ]);

        // 创建示例版本
        Release::create([
            'version' => '0.1.9',
            'title' => '饭团工坊 v0.1.9',
            'description' => '首个公开测试版本，包含核心编辑器功能。',
            'changelog' => "## 新增\n- NPC 编辑器\n- 事件编辑器\n- 物品配置器\n- 地图编辑器\n- 任务系统\n- 邮件管理\n\n## 优化\n- 项目保存/加载性能\n- 用户界面交互",
            'download_url' => 'https://github.com/fantuan9234/fantuan-workshop/releases/tag/v0.1.9',
            'file_size' => '120MB',
            'platform' => 'windows',
            'sha256' => '请以 GitHub Releases 页面为准',
            'published' => true,
            'released_at' => now(),
        ]);
    }
}
