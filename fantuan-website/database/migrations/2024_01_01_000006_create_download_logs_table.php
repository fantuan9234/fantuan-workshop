<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('download_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('release_id')->constrained()->onDelete('cascade');
            $table->string('ip', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('downloaded_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('download_logs');
    }
};
