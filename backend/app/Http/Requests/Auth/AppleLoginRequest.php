<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class AppleLoginRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'identity_token' => ['required', 'string'],
            'nonce'          => ['required', 'string'],
            'full_name'      => ['nullable', 'string', 'max:200'],
            'device_name'    => ['required', 'string', 'max:255'],
        ];
    }
}
