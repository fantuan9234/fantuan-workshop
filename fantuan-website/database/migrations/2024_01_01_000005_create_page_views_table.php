<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_views', function (Blueprint $table) {
            $table->id();
            $table->string('url');
            $table->string('ip', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('visited_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_views');
    }
};
