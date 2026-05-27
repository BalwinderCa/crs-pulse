<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json(['app' => 'CRS Pulse API', 'version' => '1.0.0']));
