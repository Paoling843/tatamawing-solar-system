<?php

namespace App\Services;

use App\Models\ChatMessage;
use App\Models\InstallationSchedule;
use App\Models\QuoteSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * "Delete user" on the admin's Users page.
 *
 * The account isn't removed from the database: the foreign keys would erase
 * the customer's quotations and installations with it (and an admin's FAQs).
 * Instead the personal details are wiped and the account can no longer sign
 * in. Quotations, installations and an admin's past work stay in the records
 * as "Deleted customer" / "Deleted admin", so reports don't change.
 *
 * Removed: name, email, mobile number, address, the customer's chat
 * messages, notifications, sign-ins and password-reset links. The person can
 * register again with the same email.
 */
class AccountDeletion
{
    /**
     * Why this account can't be deleted right now, or null if it can.
     */
    public static function blockReason(User $target, User $actor): ?string
    {
        if ($target->id === $actor->id) {
            return "You can't delete your own account. Ask another admin to do it.";
        }

        if ($target->role === 'admin' && User::active()->where('role', 'admin')->count() <= 1) {
            return "This is the only admin account, so it can't be deleted.";
        }

        if ($target->role === 'customer' && $target->customer) {
            $customerId = $target->customer->id;
            $unfinished = InstallationSchedule::query()
                ->where('status', '!=', 'completed')
                ->where(fn ($q) => $q->where('customer_id', $customerId)
                    ->orWhereHas('quotation.quotationRequest', fn ($r) => $r->where('customer_id', $customerId)))
                ->orderBy('scheduled_date')
                ->first();

            if ($unfinished) {
                return "{$target->name} has an installation on {$unfinished->scheduled_date->format('F j, Y')} that isn't finished. "
                    . 'Mark it as completed first.';
            }
        }

        return null;
    }

    public static function delete(User $user): void
    {
        DB::transaction(function () use ($user) {
            $oldEmail = $user->email;
            $customer = $user->customer;

            if ($customer) {
                // Requests still waiting for a decision can't be answered any more
                $customer->quotationRequests()->where('status', 'pending')->update([
                    'status' => 'rejected',
                    'notes' => 'Customer account deleted.',
                ]);

                // The exact spot and the house description are personal; the
                // barangay and town stay for the location analytics
                $customer->quotationRequests()->update([
                    'install_purok' => null,
                    'site_description' => null,
                ]);

                $customer->update([
                    'contact_number' => '',
                    'address' => null,
                    'install_location' => null,
                ]);

                ChatMessage::query()->customerThread($user->id)->delete();
            }

            // An admin's replies stay in the customers' chats, under "Deleted admin"
            QuoteSession::where('user_id', $user->id)->update(['user_id' => null]);
            $user->notifications()->delete();
            $user->tokens()->delete();
            DB::table('password_reset_tokens')->where('email', $oldEmail)->delete();

            $user->forceFill([
                'name' => $user->role === 'admin' ? 'Deleted admin' : 'Deleted customer',
                'email' => "deleted-user-{$user->id}@deleted.invalid",
                'password' => Hash::make(Str::random(40)),
                'remember_token' => null,
                'account_deleted_at' => now(),
            ])->save();
        });
    }
}
