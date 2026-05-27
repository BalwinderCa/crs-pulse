<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name'                   => ['sometimes', 'string', 'max:100'],
            'crs_score'              => ['sometimes', 'integer', 'min:0', 'max:1200'],
            'category'               => ['sometimes', Rule::in(['CEC', 'General', 'Healthcare', 'STEM', 'Trades', 'French'])],
            'notifications_enabled'  => ['sometimes', 'boolean'],
            'weekly_summary_enabled' => ['sometimes', 'boolean'],
        ];
    }
}
