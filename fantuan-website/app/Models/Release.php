<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Release extends Model
{
    protected $fillable = [
        'version', 'title', 'description', 'changelog',
        'download_url', 'file_size', 'platform', 'sha256',
        'published', 'released_at',
    ];

    protected $casts = [
        'published' => 'boolean',
        'released_at' => 'datetime',
    ];

    public function downloadLogs()
    {
        return $this->hasMany(DownloadLog::class);
    }

    public function scopePublished($query)
    {
        return $query->where('published', true);
    }
}
