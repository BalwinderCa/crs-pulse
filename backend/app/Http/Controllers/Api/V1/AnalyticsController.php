<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(private AnalyticsService $analytics) {}

    public function index(Request $request): JsonResponse
    {
        $category = $request->input('category', 'all');
        $period   = $request->input('period', 'all');

        $validCategories = ['all', 'CEC', 'General', 'Healthcare', 'STEM', 'Trades', 'French'];
        $validPeriods    = ['all', '1y', '6m', '3m'];

        if (! in_array($category, $validCategories)) {
            $category = 'all';
        }

        if (! in_array($period, $validPeriods)) {
            $period = 'all';
        }

        $data = $this->analytics->get($category, $period);

        return response()->json(['data' => $data]);
    }
}
