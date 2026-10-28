<?php

namespace App\Http\Controllers;

use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Mail\PasswordResetLink;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;

/**
 * "Forgot password?": email a one-time link, then set a new password with it.
 * Uses Laravel's password broker, which keeps only a hash of each token in
 * password_reset_tokens and expires it after config('auth.passwords.users.expire')
 * minutes.
 */
class PasswordResetController extends Controller
{
    // The same answer whether or not the email has an account, so this form
    // can't be used to find out who is a TataMawing customer
    private const SENT_MESSAGE = "We've sent a reset link to your email. Check your inbox and spam folder.";

    public function sendLink(ForgotPasswordRequest $request)
    {
        $expires = (int) config('auth.passwords.users.expire', 60);

        Password::sendResetLink(
            ['email' => $request->email],
            function (User $user, string $token) use ($expires) {
                $url = config('app.frontend_url').'/reset-password?'.http_build_query([
                    'token' => $token,
                    'email' => $user->email,
                ]);

                try {
                    Mail::to($user->email)->send(new PasswordResetLink($user, $url, $expires));
                } catch (\Throwable $e) {
                    // Logged for the admin; the answer stays the same so it
                    // doesn't reveal that this email has an account
                    report($e);
                }
            }
        );

        // Unknown emails and "already sent a minute ago" get the same answer
        return response()->json(['message' => self::SENT_MESSAGE]);
    }

    public function reset(ResetPasswordRequest $request)
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();

                // Sign out every device that was still logged in with the old password
                $user->tokens()->delete();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'This reset link is invalid or has expired. Request a new one.',
            ], 422);
        }

        return response()->json(['message' => 'Your password was changed. You can now log in.']);
    }
}
