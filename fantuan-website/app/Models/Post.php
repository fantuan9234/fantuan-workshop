<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    protected $fillable = [
        'title', 'slug', 'excerpt', 'content',
        'cover_image', 'tags', 'published_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'published_at' => 'datetime',
    ];

    public function scopePublished($query)
    {
        return $query->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }
}
