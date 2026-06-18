<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Page extends Model
{
    protected $fillable = ['slug', 'title', 'content', 'meta', 'published'];

    protected $casts = [
        'meta' => 'array',
        'published' => 'boolean',
    ];

    public function scopePublished($query)
    {
        return $query->where('published', true);
    }
}
