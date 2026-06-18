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
