<?php

namespace App\Providers;

use App\Mail\GmailApiTransport;
use App\Models\ExternalInstallationRequest;
use App\Models\Faq;
use App\Models\InstallationSchedule;
use App\Models\PurchaseRequest;
use App\Models\QuotationRequest;
use App\Policies\ExternalInstallationRequestPolicy;
use App\Policies\FaqPolicy;
use App\Policies\InstallationSchedulePolicy;
use App\Policies\PurchaseRequestPolicy;
use App\Policies\QuotationRequestPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoTransportFactory;
use Symfony\Component\Mailer\Transport\Dsn;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(QuotationRequest::class, QuotationRequestPolicy::class);
        Gate::policy(PurchaseRequest::class, PurchaseRequestPolicy::class);
        Gate::policy(InstallationSchedule::class, InstallationSchedulePolicy::class);
        Gate::policy(ExternalInstallationRequest::class, ExternalInstallationRequestPolicy::class);
        Gate::policy(Faq::class, FaqPolicy::class);

        // HTTPS mailers for production, where Render's free plan blocks SMTP.
        // gmail: send from the business Gmail (MAIL_MAILER=gmail).
        // brevo: for later, once there's a custom domain (MAIL_MAILER=brevo).
        Mail::extend('gmail', function () {
            return new GmailApiTransport(
                (string) config('services.gmail.client_id'),
                (string) config('services.gmail.client_secret'),
                (string) config('services.gmail.refresh_token'),
            );
        });

        Mail::extend('brevo', function () {
            return (new BrevoTransportFactory)->create(
                new Dsn('brevo+api', 'default', config('services.brevo.key'))
            );
        });
    }
}
