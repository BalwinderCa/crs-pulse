<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\DrawResource;
use App\Services\DrawService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DrawController extends Controller
{
    public function __construct(private DrawService $draws) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only(['filter', 'category']);
        $perPage = (int) $request->input('per_page', 20);
        $perPage = min($perPage, 50);

        $paginated = $this->draws->paginate($filters, $perPage);

        return DrawResource::collection($paginated);
    }

    public function show(int $id): JsonResponse
    {
        $draw = $this->draws->latest(); // fallback, adjust if needed

        // Find specific draw
        $found = \App\Models\Draw::published()->find($id);

        if (! $found) {
            return response()->json(['message' => 'Draw not found.'], 404);
        }

        return response()->json(['data' => new DrawResource($found)]);
    }

    public function latest(Request $request): JsonResponse
    {
        $category = $request->input('category');
        $draw     = $this->draws->latest($category);

        if (! $draw) {
            return response()->json(['message' => 'No draws found.'], 404);
        }

        return response()->json(['data' => new DrawResource($draw)]);
    }
}
