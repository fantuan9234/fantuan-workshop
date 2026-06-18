<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('releases', function (Blueprint $table) {
            $table->id();
            $table->string('version', 20);
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('changelog')->nullable();
            $table->string('download_url');
            $table->string('file_size', 20)->nullable();
            $table->string('platform', 50)->default('windows');
            $table->string('sha256')->nullable();
            $table->boolean('published')->default(false);
            $table->timestamp('released_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('releases');
    }
};
