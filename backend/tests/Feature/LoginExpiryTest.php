<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// A login lasts 30 days (config/sanctum.php), then the person signs in again
class LoginExpiryTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_login_stops_working_after_30_days(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        $token = $user->createToken('auth_token')->plainTextToken;

        $this->travel(29)->days();
        $this->withToken($token)->getJson('/api/me')->assertOk();

        $this->travel(2)->days();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/me')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Your session has ended. Please log in again.');
    }

    public function test_signing_in_clears_that_persons_expired_logins(): void
    {
        $user = User::factory()->create(['role' => 'customer', 'email' => 'ana@example.com', 'password' => 'Password123']);
        $user->createToken('auth_token');

        $this->travel(31)->days();

        $this->postJson('/api/login', ['email' => 'ana@example.com', 'password' => 'Password123'])->assertOk();

        // Only the new login is left
        $this->assertSame(1, $user->tokens()->count());
    }
}
