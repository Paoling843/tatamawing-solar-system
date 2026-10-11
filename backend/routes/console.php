<?php

use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Run on every production start (docker/start.sh). Creates the admin from
// ADMIN_EMAIL / ADMIN_PASSWORD when no admin with that email exists yet;
// an existing account is left alone, so changing the password in the app sticks.
Artisan::command('app:ensure-admin', function () {
    $email = env('ADMIN_EMAIL');
    $password = env('ADMIN_PASSWORD');

    if (! $email || ! $password) {
        $this->comment('ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin setup.');
        return;
    }

    if (User::where('email', $email)->exists()) {
        $this->comment("Admin {$email} already exists.");
        return;
    }

    $user = User::create([
        'name' => 'TataMawing Admin',
        'email' => $email,
        'password' => Hash::make($password),
        'role' => 'admin',
    ]);
    $user->admin()->create(['department' => 'Operations']);

    $this->info("Created admin {$email}.");
})->purpose('Create the admin account from ADMIN_EMAIL / ADMIN_PASSWORD');
