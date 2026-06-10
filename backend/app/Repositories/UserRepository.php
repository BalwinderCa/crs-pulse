<?php

namespace App\Repositories;

use App\Models\User;
use App\Models\UserProfile;
use App\Repositories\Contracts\UserRepositoryInterface;

class UserRepository implements UserRepositoryInterface
{
    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)->with('profile')->first();
    }

    public function create(array $data): User
    {
        return User::create($data);
    }

    public function createProfile(User $user, array $data = []): void
    {
        $user->profile()->create(array_merge([
            'crs_score'              => 0,
            'category'               => 'General',
            'notifications_enabled'  => true,
            'weekly_summary_enabled' => true,
        ], $data));
    }
}
