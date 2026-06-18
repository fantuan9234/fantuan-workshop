<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DownloadLog extends Model
{
    public $timestamps = false;

    protected $fillable = ['release_id', 'ip', 'user_agent', 'downloaded_at'];

    protected $casts = [
        'downloaded_at' => 'datetime',
    ];

    public function release()
    {
        return $this->belongsTo(Release::class);
    }
}
