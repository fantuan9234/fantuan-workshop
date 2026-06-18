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
                    <label class="block text-sm text-dark-200 mb-2">姓名 <span class="text-red-400">*</span></label>
                    <input wire:model="name" type="text"
                           class="w-full px-4 py-3 bg-dark-700/50 border border-dark-500 rounded-xl text-white
                                  focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all
                                  placeholder:text-dark-500">
                    @error('name') <p class="text-red-400 text-sm mt-1">{{ $message }}</p> @enderror
                </div>
                <div>
                    <label class="block text-sm text-dark-200 mb-2">邮箱 <span class="text-red-400">*</span></label>
                    <input wire:model="email" type="email"
                           class="w-full px-4 py-3 bg-dark-700/50 border border-dark-500 rounded-xl text-white
                                  focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all
                                  placeholder:text-dark-500">
                    @error('email') <p class="text-red-400 text-sm mt-1">{{ $message }}</p> @enderror
                </div>
            </div>

            <div>
                <label class="block text-sm text-dark-200 mb-2">主题 <span class="text-red-400">*</span></label>
                <input wire:model="subject" type="text"
                       class="w-full px-4 py-3 bg-dark-700/50 border border-dark-500 rounded-xl text-white
                              focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all
                              placeholder:text-dark-500">
                @error('subject') <p class="text-red-400 text-sm mt-1">{{ $message }}</p> @enderror
            </div>

            <div>
                <label class="block text-sm text-dark-200 mb-2">内容 <span class="text-red-400">*</span></label>
                <textarea wire:model="content" rows="5"
                          class="w-full px-4 py-3 bg-dark-700/50 border border-dark-500 rounded-xl text-white
                                 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all
                                 placeholder:text-dark-500 resize-none"></textarea>
                @error('content') <p class="text-red-400 text-sm mt-1">{{ $message }}</p> @enderror
            </div>

            <button type="submit" class="btn-primary w-full justify-center inline-flex">
                发送消息
            </button>
        </form>
    @endif
</div>