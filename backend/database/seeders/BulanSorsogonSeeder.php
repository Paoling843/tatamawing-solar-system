<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\ApplianceItem;
use App\Models\Customer;
use App\Models\ElectricityBill;
use App\Models\ExternalInstallationRequest;
use App\Models\InstallationSchedule;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\QuoteSession;
use App\Models\User;
use App\Services\SolarComputationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Demo data: customers living in Bulan, Sorsogon, with quotation requests at
 * every stage, installation schedules, external installation requests and
 * quote-builder visits for the analytics page.
 *
 * Every quotation is computed by SolarComputationService, so package sizes,
 * prices and savings match what the app itself would produce. Dates are
 * spread over the last six months relative to today.
 *
 * Fictional people; @example.com emails. All customer passwords: password123
 * Run: php artisan db:seed --class=BulanSorsogonSeeder
 */
class BulanSorsogonSeeder extends Seeder
{
    private const PASSWORD = 'password123';

    private const TECHNICIANS = ['Jerome Gile', 'Mark Esplana', 'Ramil Golla'];

    // Bulan barangays used for addresses
    private const CUSTOMERS = [
        // name, barangay, purok, mobile, load profile, story
        ['Maria Luz Gerona',    'Zone II Poblacion',  3, '+639171234501', 'household',  'installed'],
        ['Ramon Golpeo',        'Bical',              1, '+639171234502', 'aircon',     'scheduled'],
        ['Jocelyn Dioneda',     'Butag',              4, '+639171234503', 'store',      'in_progress'],
        ['Eduardo Grajo',       'Calomagon',          2, '+639171234504', 'pump',       'approved'],
        ['Ana Marie Gallanosa', 'Cadandanan',         5, '+639171234505', 'cooking',    'delayed'],
        ['Rodel Lasala',        'Gate',               2, '+639171234506', 'small',      'pending'],
        ['Cristina Gacis',      'Inararan',           6, '+639171234507', 'aircon',     'pending'],
        ['Arnel Furio',         'Jamorawon',          1, '+639171234508', 'household',  'pending'],
        ['Rowena Labalan',      'Marinab',            3, '+639171234509', 'store',      'rejected'],
        ['Jun Gamos',           'Obrero',             4, '+639171234510', 'pump',       'rejected'],
        ['Liza Estrella',       'San Francisco',      2, '+639171234511', 'cooking',    'pending'],
        ['Noel Gonzaga',        'Somagongsong',       7, '+639171234512', 'small',      'scheduled'],
    ];

    private const REJECTION_REASONS = [
        'Roof structure needs a site inspection before we can quote a system this size.',
        'Customer asked to postpone the project until next year.',
    ];

    private SolarComputationService $engine;

    private Admin $admin;

    public function run(): void
    {
        if (User::where('email', $this->email(self::CUSTOMERS[0][0]))->exists()) {
            $this->command?->warn('Bulan, Sorsogon demo data is already seeded — skipping.');
            return;
        }

        $this->engine = new SolarComputationService();
        $this->admin = $this->ensureAdmin();

        $count = count(self::CUSTOMERS);
        foreach (self::CUSTOMERS as $i => [$name, $barangay, $purok, $mobile, $profile, $story]) {
            // Oldest customers first, spread across the last six months
            $joined = now()->subDays((int) round(175 - $i * (165 / $count)))->setTime(9 + $i % 8, 15);
            $this->seedCustomer($i, $name, $barangay, $purok, $mobile, $profile, $story, $joined);
        }

        $this->seedExternalRequests();
        $this->seedAbandonedGuestVisits();

        $this->command?->info("Seeded {$count} Bulan, Sorsogon customers (password: " . self::PASSWORD . ').');
    }

    // ------------------------------------------------------------------
    // Admin
    // ------------------------------------------------------------------

    /**
     * Uses the first existing admin; creates one only on an empty database.
     */
    private function ensureAdmin(): Admin
    {
        $user = User::where('role', 'admin')->orderBy('id')->first();

        if (! $user) {
            $user = User::create([
                'name' => 'TataMawing Admin',
                'email' => 'admin@tatamawing.test',
                'password' => Hash::make(self::PASSWORD),
                'role' => 'admin',
            ]);
            $this->command?->info('Created admin: admin@tatamawing.test / ' . self::PASSWORD);
        }

        return $user->admin()->firstOrCreate(['user_id' => $user->id], ['department' => 'Operations']);
    }

    // ------------------------------------------------------------------
    // Customers and their quotations
    // ------------------------------------------------------------------

    private function seedCustomer(int $i, string $name, string $barangay, int $purok, string $mobile, string $profile, string $story, Carbon $joined): void
    {
        $address = "Purok {$purok}, Brgy. {$barangay}, Bulan, Sorsogon";

        $user = User::create([
            'name' => $name,
            'email' => $this->email($name),
            'password' => Hash::make(self::PASSWORD),
            'role' => 'customer',
        ]);
        $user->forceFill(['created_at' => $joined, 'updated_at' => $joined, 'email_verified_at' => $joined])->save();

        $customer = Customer::create([
            'user_id' => $user->id,
            'contact_number' => $mobile,
            'address' => $address,
            'install_location' => $address,
        ]);
        $customer->forceFill(['created_at' => $joined, 'updated_at' => $joined])->save();

        // The quotation is requested a few days after signing up
        $submitted = $joined->copy()->addDays(1 + $i % 4)->addHours(2);
        $bills = $this->bills($profile, $submitted, withKwh: $i % 2 === 0);
        $request = $this->createQuotationRequest($customer, $profile, $bills, $submitted, $barangay, $purok);

        // How they reached the quote builder: two out of three started as guests
        $this->seedConvertedSession($user, $request, $submitted, startedAsGuest: $i % 3 !== 2);

        $this->applyStory($i, $request, $story, $submitted);
    }

    private function createQuotationRequest(Customer $customer, string $profile, array $bills, Carbon $submitted, string $barangay, int $purok): QuotationRequest
    {
        $rows = $this->applianceRows($profile);

        // Pick what the Step 3 defaults would be: the recommended package,
        // its default panel count, and the recommended battery
        $load = $this->engine->computeLoad($rows);
        $package = SolarComputationService::PACKAGES[$this->engine->recommendPackageIndex($load['adjusted_total_wh'])];
        $battery = SolarComputationService::BATTERIES[$this->engine->recommendBatteryIndex($load['total_night_wh'])];

        $result = $this->engine->evaluate($rows, $package['kw'], $package['panelDefault'], $battery['ah'], $bills);

        $request = QuotationRequest::create([
            'customer_id' => $customer->id,
            'solar_system_type' => 'hybrid',
            'monthly_bill' => $bills[0]['amount'] ?? null,
            'submission_date' => $submitted->toDateString(),
            'status' => 'pending',
            // Installation site, as entered at the top of the quote builder
            'install_purok' => "Purok {$purok}",
            'install_barangay' => $barangay,
            'install_municipality' => 'Bulan',
            'install_province' => 'Sorsogon',
        ]);
        $request->forceFill(['created_at' => $submitted, 'updated_at' => $submitted])->save();

        foreach ($rows as $i => $row) {
            $computed = $result['load']['rows'][$i];
            ApplianceItem::create([
                'quotation_request_id' => $request->id,
                'appliance_name' => $computed['name'],
                'appliance_type' => $row['appliance_type'],
                'hp' => $computed['uses_hp'] ? $row['hp'] : null,
                'wattage' => (int) round($computed['watts']),
                'quantity' => $computed['qty'],
                'usage_hours_per_day' => $computed['day_hours'] + $computed['night_hours'],
                'day_from' => $row['day_from'] ?? null,
                'day_to' => $row['day_to'] ?? null,
                'night_from' => $row['night_from'] ?? null,
                'night_to' => $row['night_to'] ?? null,
                'day_wh' => $computed['day_wh'],
                'night_wh' => $computed['night_wh'],
            ]);
        }

        foreach ($bills as $i => $bill) {
            ElectricityBill::create([
                'quotation_request_id' => $request->id,
                'sequence' => $i + 1,
                'billing_month' => $bill['billing_month'] . '-01',
                'amount' => $bill['amount'],
                'kwh' => $bill['kwh'],
            ]);
        }

        $this->engine->save($request, $result);

        return $request;
    }

    /**
     * Moves the request to where its story ends: approved (with or without
     * a schedule at some status), rejected, or still pending.
     */
    private function applyStory(int $i, QuotationRequest $request, string $story, Carbon $submitted): void
    {
        if ($story === 'pending') {
            return;
        }

        $reviewed = $submitted->copy()->addDays(2 + $i % 3)->setTime(10, 30);

        if ($story === 'rejected') {
            $request->update(['status' => 'rejected', 'notes' => self::REJECTION_REASONS[$i % 2]]);
            $request->forceFill(['updated_at' => $reviewed])->save();
            return;
        }

        // Approved: the computed price plus labour and delivery to Bulan
        $cost = (float) $request->solarComputation->estimated_cost;
        $labor = 15000 + ($i % 3) * 2500;
        $transport = 3500;

        $request->update(['status' => 'approved']);
        $request->forceFill(['updated_at' => $reviewed])->save();

        $quotation = Quotation::create([
            'quotation_request_id' => $request->id,
            'approved_by_admin_id' => $this->admin->id,
            'approval_date' => $reviewed->toDateString(),
            'adjusted_cost' => $cost,
            'labor_fee' => $labor,
            'transportation_fee' => $transport,
            'total_amount' => $cost + $labor + $transport,
        ]);
        $quotation->forceFill(['created_at' => $reviewed, 'updated_at' => $reviewed])->save();

        if ($story === 'approved') {
            return; // Waiting to be scheduled
        }

        [$date, $status] = match ($story) {
            // A completed installation must be in the past
            'installed' => [$reviewed->copy()->addDays(18)->min(now()->subDays(2)->startOfDay()), 'completed'],
            'in_progress' => [now()->startOfDay(), 'in_progress'],
            'delayed' => [now()->subDays(3)->startOfDay(), 'delayed'],
            default => [now()->addDays(4 + $i), 'scheduled'],
        };

        InstallationSchedule::create([
            'quotation_id' => $quotation->id,
            'scheduled_date' => $date->toDateString(),
            'scheduled_time' => ['08:00', '09:00', '13:00'][$i % 3],
            'assigned_technician' => self::TECHNICIANS[$i % count(self::TECHNICIANS)],
            'status' => $status,
            'notes' => $status === 'delayed' ? 'Waiting for clear weather — rain all week in Bulan.' : null,
        ]);
    }

    // ------------------------------------------------------------------
    // External installation requests (people who bought elsewhere)
    // ------------------------------------------------------------------

    private function seedExternalRequests(): void
    {
        $file = $this->placeholderQuotationFile();

        $requests = [
            ['Teresa Grafil',  'Fabrica', 2, '09171234521', 'Bicol Sunlight Energy',  'pending_review', 40],
            ['Victor Gilana',  'Danao',   5, '09171234522', 'Sorsogon Solar Supply',  'confirmed',      70],
            ['Glenda Lopez',   'Otavi',   1, '09171234523', 'Bicol Sunlight Energy',  'rejected',       100],
            ['Benjie Gerilla', 'Lajong',  3, '09171234524', 'SunVolt Legazpi',        'pending_review', 6],
            ['Mila Grajo',     'Sagrada', 4, '09171234525', 'Sorsogon Solar Supply',  'pending_review', 130],
        ];

        foreach ($requests as $i => [$name, $barangay, $purok, $phone, $company, $status, $daysAgo]) {
            $created = now()->subDays($daysAgo)->setTime(14, 10);
            $preferred = $created->copy()->addDays(14);

            $request = ExternalInstallationRequest::create([
                'name' => $name,
                'email' => $this->email($name),
                'phone' => $phone,
                'address' => "Purok {$purok}, Brgy. {$barangay}, Bulan, Sorsogon",
                'install_purok' => "Purok {$purok}",
                'install_barangay' => $barangay,
                'install_municipality' => 'Bulan',
                'install_province' => 'Sorsogon',
                'preferred_installation_date' => $preferred->toDateString(),
                'other_company_name' => $company,
                'quotation_file_path' => $file,
                'status' => $status,
            ]);
            $request->forceFill(['created_at' => $created, 'updated_at' => $created])->save();

            if ($status === 'rejected') {
                $request->update([
                    'reviewed_by_admin_id' => $this->admin->id,
                    'reviewed_at' => $created->copy()->addDay(),
                    'rejection_reason' => 'The uploaded quotation does not list the panel and inverter models.',
                ]);
            } elseif ($status === 'confirmed') {
                $schedule = InstallationSchedule::create([
                    'scheduled_date' => $preferred->toDateString(),
                    'scheduled_time' => '09:00',
                    'assigned_technician' => self::TECHNICIANS[$i % count(self::TECHNICIANS)],
                    'status' => $preferred->isPast() ? 'completed' : 'scheduled',
                    'notes' => 'Installation service only — customer supplied the materials.',
                ]);
                $request->update([
                    'reviewed_by_admin_id' => $this->admin->id,
                    'reviewed_at' => $created->copy()->addDay(),
                    'installation_schedule_id' => $schedule->id,
                ]);
            }
        }
    }

    /**
     * A small one-page PDF so "View quotation" works for the demo requests.
     */
    private function placeholderQuotationFile(): string
    {
        $path = 'external-installation-quotations/sample-external-quotation.pdf';

        $text = 'Sample external quotation (demo data)';
        $stream = "BT /F1 18 Tf 60 760 Td ({$text}) Tj ET";
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            '<< /Length ' . strlen($stream) . " >>\nstream\n{$stream}\nendstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $n => $body) {
            $offsets[] = strlen($pdf);
            $pdf .= ($n + 1) . " 0 obj\n{$body}\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= 'xref' . "\n0 " . (count($objects) + 1) . "\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= 'trailer << /Size ' . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF\n";

        Storage::put($path, $pdf);

        return $path;
    }

    // ------------------------------------------------------------------
    // Quote-builder visits (analytics)
    // ------------------------------------------------------------------

    private function seedConvertedSession(User $user, QuotationRequest $request, Carbon $submitted, bool $startedAsGuest): void
    {
        $started = $submitted->copy()->subHours($startedAsGuest ? 26 : 1);

        $session = QuoteSession::create([
            'session_id' => (string) Str::uuid(),
            'started_as_guest' => $startedAsGuest,
            'furthest_step' => 3,
            'requested_at' => $startedAsGuest ? $started->copy()->addMinutes(12) : $submitted,
            'user_id' => $user->id,
            'signed_in_at' => $startedAsGuest ? $submitted->copy()->subMinutes(5) : null,
            'quotation_request_id' => $request->id,
            'converted_at' => $submitted,
        ]);
        $session->forceFill(['created_at' => $started, 'updated_at' => $submitted])->save();
    }

    /**
     * Guests who used the quote builder but never signed in. Most saw the
     * price (Step 3); some stopped at Steps 1–2. More visits in recent months.
     */
    private function seedAbandonedGuestVisits(): void
    {
        $perMonth = [6, 7, 9, 10, 12, 14]; // oldest → this month

        foreach ($perMonth as $m => $visits) {
            $monthStart = now()->startOfMonth()->subMonths(5 - $m);
            // This month: only days up to yesterday, so no visit is in the future
            $daysAvailable = $m === 5 ? max(0, now()->day - 2) : $monthStart->daysInMonth - 1;

            for ($v = 0; $v < $visits; $v++) {
                $at = $monthStart->copy()->addDays(($v * 7 + $m * 3) % ($daysAvailable + 1))->setTime(8 + ($v * 5) % 13, ($v * 17) % 60);
                $step = [3, 3, 1, 3, 2, 3, 3][$v % 7];
                $requested = $step === 3 && $v % 3 === 0;

                $session = QuoteSession::create([
                    'session_id' => (string) Str::uuid(),
                    'started_as_guest' => true,
                    'furthest_step' => $step,
                    'requested_at' => $requested ? $at->copy()->addMinutes(9) : null,
                ]);
                $session->forceFill(['created_at' => $at, 'updated_at' => $at->copy()->addMinutes(10)])->save();
            }
        }
    }

    // ------------------------------------------------------------------
    // Appliance lists and bills
    // ------------------------------------------------------------------

    /**
     * Typical Bulan households. Hours use the engine's scale: day 8–16,
     * night 16–32 (01:00 = 25, 08:00 = 32).
     */
    private function applianceRows(string $profile): array
    {
        $fridge = ['appliance_type' => 'freezer', 'watts' => 120, 'qty' => 1, 'day_from' => 8, 'day_to' => 16, 'night_from' => 16, 'night_to' => 32];
        $lights = ['appliance_type' => 'other', 'custom_name' => 'LED lights', 'watts' => 10, 'qty' => 8, 'night_from' => 18, 'night_to' => 23];
        $tv = ['appliance_type' => 'other', 'custom_name' => 'Television', 'watts' => 90, 'qty' => 1, 'night_from' => 18, 'night_to' => 22];
        $fans = ['appliance_type' => 'other', 'custom_name' => 'Electric fan', 'watts' => 50, 'qty' => 2, 'day_from' => 10, 'day_to' => 16];

        return match ($profile) {
            'small' => [$fridge, $lights, $fans],
            'household' => [$fridge, $lights, $tv, $fans,
                ['appliance_type' => 'other', 'custom_name' => 'Washing machine', 'watts' => 450, 'qty' => 1, 'day_from' => 9, 'day_to' => 10]],
            'aircon' => [$fridge, $lights, $tv,
                ['appliance_type' => 'aircon', 'hp' => 1, 'qty' => 1, 'night_from' => 22, 'night_to' => 28]],
            'store' => [
                ['appliance_type' => 'freezer', 'watts' => 150, 'qty' => 2, 'day_from' => 8, 'day_to' => 16, 'night_from' => 16, 'night_to' => 32],
                ['appliance_type' => 'other', 'custom_name' => 'Store lights', 'watts' => 15, 'qty' => 6, 'night_from' => 17, 'night_to' => 22],
                $tv],
            'pump' => [$fridge, $lights, $fans,
                ['appliance_type' => 'water_pump', 'hp' => 1, 'qty' => 1, 'day_from' => 8, 'day_to' => 9]],
            'cooking' => [$fridge, $lights, $tv,
                ['appliance_type' => 'induction_cooker', 'watts' => 1500, 'qty' => 1, 'day_from' => 11, 'day_to' => 12, 'night_from' => 17, 'night_to' => 18]],
        };
    }

    /**
     * Two recent bills sized to the household's load. Half the customers
     * also know the kWh (so their own rate is used).
     */
    private function bills(string $profile, Carbon $submitted, bool $withKwh): array
    {
        $monthlyKwh = ['small' => 95, 'household' => 160, 'aircon' => 290, 'store' => 250, 'pump' => 120, 'cooking' => 175][$profile];
        $rate = 12.4;

        return array_map(function ($n) use ($monthlyKwh, $rate, $submitted, $withKwh) {
            $kwh = $monthlyKwh + ($n === 0 ? 8 : -6);
            return [
                'billing_month' => $submitted->copy()->subMonths($n + 1)->format('Y-m'),
                'amount' => round($kwh * $rate, 2),
                'kwh' => $withKwh ? $kwh : null,
            ];
        }, [0, 1]);
    }

    private function email(string $name): string
    {
        return Str::of($name)->lower()->replace(' ', '.')->append('@example.com')->toString();
    }
}
