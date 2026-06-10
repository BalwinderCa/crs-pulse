<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name'                  => ['required', 'string', 'max:100'],
            'email'                 => ['required', 'email:rfc', 'unique:users,email', 'max:255'],
            'password'              => ['required', 'string', 'min:8', 'max:128', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
            'device_name'           => ['required', 'string', 'max:255'],
        ];
    }
}
