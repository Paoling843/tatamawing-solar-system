<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Demo customers from Bulan, Sorsogon (also creates an admin on an
        // empty database)
        $this->call(BulanSorsogonSeeder::class);
    }
}
