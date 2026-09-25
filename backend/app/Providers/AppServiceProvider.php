<?php

namespace App\Providers;

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
use Illuminate\Support\ServiceProvider;

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
    }
}
