<?php

namespace App\Http\Controllers;

use App\Services\AnalyticsService;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    /**
     * Everything the admin Analytics page shows, for the last `days` days
     * (7, 30, 90 or 365; default 30).
     */
    public function overview(Request $request, AnalyticsService $analytics)
    {
        return response()->json(
            $analytics->overview(AnalyticsService::normalizeDays($request->query('days', 30)))
        );
    }
}
