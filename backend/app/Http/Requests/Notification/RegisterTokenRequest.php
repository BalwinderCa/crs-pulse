<?php

namespace App\Http\Requests\Notification;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterTokenRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'token'    => ['required', 'string', 'max:512'],
            'platform' => ['required', Rule::in(['android', 'ios'])],
        ];
    }
}
