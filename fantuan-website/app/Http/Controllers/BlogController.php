<?php
namespace App\Http\Controllers;

use App\Models\Post;

class BlogController extends Controller
{
    public function index()
    {
        $posts = Post::published()
            ->orderBy('published_at', 'desc')
            ->paginate(10);

        return view('pages.blog.index', compact('posts'));
    }

    public function show($slug)
    {
        $post = Post::where('slug', $slug)
            ->published()
            ->firstOrFail();

        return view('pages.blog.show', compact('post'));
    }
}
