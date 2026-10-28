<?php

namespace Tests\Feature;

use App\Mail\PasswordResetLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private const SENT = "We've sent a reset link to your email. Check your inbox and spam folder.";

    private function customer(): User
    {
        return User::factory()->create([
            'role' => 'customer',
            'email' => 'juan@example.com',
            'password' => Hash::make('oldpass123'),
        ]);
    }

    private function reset(array $overrides = [])
    {
        return $this->postJson('/api/reset-password', $overrides + [
            'email' => 'juan@example.com',
            'password' => 'newpass456',
            'password_confirmation' => 'newpass456',
        ]);
    }

    public function test_a_reset_link_is_emailed_to_the_website(): void
    {
        Mail::fake();
        config(['app.frontend_url' => 'https://tatamawing.example']);
        $this->customer();

        $this->postJson('/api/forgot-password', ['email' => 'Juan@Example.com '])
            ->assertOk()
            ->assertJsonPath('message', self::SENT);

        Mail::assertSent(PasswordResetLink::class, function (PasswordResetLink $mail) {
            return $mail->hasTo('juan@example.com')
                && str_starts_with($mail->url, 'https://tatamawing.example/reset-password?token=')
                && str_contains($mail->url, 'email=juan%40example.com');
        });
    }

    public function test_an_unknown_email_gets_the_same_answer_and_no_email(): void
    {
        Mail::fake();

        $this->postJson('/api/forgot-password', ['email' => 'nobody@example.com'])
            ->assertOk()
            ->assertJsonPath('message', self::SENT);

        Mail::assertNothingSent();
    }

    public function test_the_link_sets_a_new_password_and_signs_out_other_devices(): void
    {
        $user = $this->customer();
        $user->createToken('phone');
        $token = Password::createToken($user);

        $this->reset(['token' => $token])
            ->assertOk()
            ->assertJsonPath('message', 'Your password was changed. You can now log in.');

        $user->refresh();
        $this->assertTrue(Hash::check('newpass456', $user->password));
        $this->assertSame(0, $user->tokens()->count());

        // Logging in works with the new password only
        $this->postJson('/api/login', ['email' => 'juan@example.com', 'password' => 'newpass456'])->assertOk();
        $this->postJson('/api/login', ['email' => 'juan@example.com', 'password' => 'oldpass123'])->assertStatus(401);
    }

    public function test_a_link_works_only_once(): void
    {
        $user = $this->customer();
        $token = Password::createToken($user);

        $this->reset(['token' => $token])->assertOk();
        $this->reset(['token' => $token, 'password' => 'another789', 'password_confirmation' => 'another789'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'This reset link is invalid or has expired. Request a new one.');
    }

    public function test_an_expired_link_is_refused(): void
    {
        $user = $this->customer();
        $token = Password::createToken($user);

        $this->travel(61)->minutes();

        $this->reset(['token' => $token])->assertStatus(422);
        $this->assertTrue(Hash::check('oldpass123', $user->fresh()->password));
    }

    public function test_a_wrong_token_is_refused(): void
    {
        $this->customer();

        $this->reset(['token' => 'not-a-real-token'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'This reset link is invalid or has expired. Request a new one.');
    }

    public function test_the_new_password_follows_the_signup_rules(): void
    {
        $user = $this->customer();
        $token = Password::createToken($user);

        $this->reset(['token' => $token, 'password' => 'lettersonly', 'password_confirmation' => 'lettersonly'])
            ->assertStatus(422)
            ->assertJsonPath('errors.password.0', 'Password must contain both letters and numbers.');

        $this->reset(['token' => $token, 'password_confirmation' => 'different1'])
            ->assertStatus(422)
            ->assertJsonPath('errors.password.0', 'Passwords do not match.');
    }
}
