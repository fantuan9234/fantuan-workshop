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
        'name.min' => '姓名至少 2 个字符',
        'subject.min' => '主题至少 2 个字符',
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