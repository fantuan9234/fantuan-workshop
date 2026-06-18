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

    public function scopeRead($query)
    {
        return $query->whereNotNull('read_at');
    }

    public function markAsRead(): void
    {
        $this->update(['read_at' => now()]);
    }
}
