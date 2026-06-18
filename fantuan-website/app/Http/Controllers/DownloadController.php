<?php
namespace App\Http\Controllers;

use App\Models\Release;

class DownloadController extends Controller
{
    public function index()
    {
        $latestRelease = Release::where('published', true)
            ->orderBy('released_at', 'desc')
            ->first();

        $releases = Release::where('published', true)
            ->orderBy('released_at', 'desc')
            ->get();

        return view('pages.download', compact('latestRelease', 'releases'));
    }

    public function show($version)
    {
        $release = Release::where('version', $version)
            ->where('published', true)
            ->firstOrFail();

        return back();
    }
}
