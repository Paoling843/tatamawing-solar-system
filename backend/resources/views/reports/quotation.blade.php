<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Solar Power Quotation</title>
    <style>
        /* Basic reset and font */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111827; }

        /* Header section */
        .header { background-color: #16a34a; color: white; padding: 20px; margin-bottom: 20px; }
        .header h1 { font-size: 20px; margin-bottom: 4px; }
        .header p { font-size: 11px; opacity: 0.85; }

        /* Company info */
        .company-info { float: right; text-align: right; }

        /* Section titles */
        .section-title {
            font-size: 13px;
            font-weight: bold;
            color: #16a34a;
            border-bottom: 2px solid #16a34a;
            padding-bottom: 4px;
            margin: 16px 0 10px 0;
        }

        /* Info grid */
        .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .info-grid td { padding: 5px 8px; vertical-align: top; }
        .info-grid .label { color: #6b7280; font-size: 10px; text-transform: uppercase; font-weight: bold; }
        .info-grid .value { font-size: 12px; color: #111827; }

        /* Tables */
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th { background-color: #f3f4f6; text-align: left; padding: 7px 8px; font-size: 10px; text-transform: uppercase; color: #6b7280; }
        td { padding: 7px 8px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }

        /* Cost summary box */
        .cost-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px; margin: 16px 0; }
        .cost-row { display: flex; justify-content: space-between; padding: 4px 0; }
        .cost-total { font-size: 15px; font-weight: bold; color: #16a34a; border-top: 2px solid #16a34a; padding-top: 8px; margin-top: 8px; }

        /* Status badge */
        .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: bold; }
        .badge-approved { background-color: #dcfce7; color: #16a34a; }

        /* Footer */
        .footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #9ca3af; text-align: center; }

        /* Page content */
        .content { padding: 0 20px 20px 20px; }

        /* Clear floats */
        .clearfix::after { content: ''; display: table; clear: both; }

        /* Note box */
        .note { background-color: #fefce8; border: 1px solid #fde68a; border-radius: 4px; padding: 10px; font-size: 10px; color: #92400e; margin-top: 16px; }
    </style>
</head>
<body>

    {{-- Header --}}
    <div class="header clearfix">
        <div class="company-info">
            <strong>TataMawing Solar Power</strong><br>
            Installation Service<br>
            Sorsogon, Philippines
        </div>
        <div>
            <h1>Solar Power Quotation</h1>
            <p>Official Quotation Document</p>
        </div>
    </div>

    <div class="content">

        {{-- Quotation Status and Date --}}
        <table class="info-grid">
            <tr>
                <td>
                    <div class="label">Quotation No.</div>
                    <div class="value">#{{ str_pad($quotation->id, 5, '0', STR_PAD_LEFT) }}</div>
                </td>
                <td>
                    <div class="label">Status</div>
                    <div class="value">
                        <span class="badge badge-approved">Approved</span>
                    </div>
                </td>
                <td>
                    <div class="label">Approval Date</div>
                    <div class="value">{{ \Carbon\Carbon::parse($quotation->approval_date)->format('F d, Y') }}</div>
                </td>
                <td>
                    <div class="label">Approved By</div>
                    <div class="value">{{ $quotation->approvedByAdmin->user->name ?? 'Admin' }}</div>
                </td>
            </tr>
        </table>

        {{-- Customer Information --}}
        <div class="section-title">Customer Information</div>
        <table class="info-grid">
            <tr>
                <td>
                    <div class="label">Customer Name</div>
                    <div class="value">{{ $quotation->quotationRequest->customer->user->name }}</div>
                </td>
                <td>
                    <div class="label">Email</div>
                    <div class="value">{{ $quotation->quotationRequest->customer->user->email }}</div>
                </td>
                <td>
                    <div class="label">Contact Number</div>
                    <div class="value">{{ $quotation->quotationRequest->customer->contact_number }}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="label">Address</div>
                    <div class="value">{{ $quotation->quotationRequest->customer->address }}</div>
                </td>
                <td>
                    <div class="label">Installation Location</div>
                    <div class="value">{{ $quotation->quotationRequest->customer->install_location }}</div>
                </td>
                <td>
                    <div class="label">Solar System Type</div>
                    <div class="value">{{ ucfirst($quotation->quotationRequest->solar_system_type) }}</div>
                </td>
            </tr>
        </table>

        {{-- Appliance List --}}
        <div class="section-title">Appliance List</div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Appliance</th>
                    <th>Wattage</th>
                    <th>Quantity</th>
                    <th>Hours/Day</th>
                    <th>Daily Usage (Wh)</th>
                </tr>
            </thead>
            <tbody>
                @foreach($quotation->quotationRequest->applianceItems as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $item->appliance_name }}</td>
                    <td>{{ $item->wattage }}W</td>
                    <td>{{ $item->quantity }}</td>
                    <td>{{ $item->usage_hours_per_day }}h</td>
                    <td>{{ number_format($item->wattage * $item->quantity * $item->usage_hours_per_day) }} Wh</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        {{-- Solar System Requirements --}}
        <div class="section-title">Computed Solar System Requirements</div>
        <table class="info-grid">
            <tr>
                <td>
                    <div class="label">Total Daily Load</div>
                    <div class="value">{{ number_format($quotation->quotationRequest->solarComputation->total_load_watts) }} Wh</div>
                </td>
                <td>
                    <div class="label">Panel Capacity</div>
                    <div class="value">{{ $quotation->quotationRequest->solarComputation->panel_capacity_kw }} kW</div>
                </td>
                <td>
                    <div class="label">Inverter Size</div>
                    <div class="value">{{ $quotation->quotationRequest->solarComputation->inverter_specification }}</div>
                </td>
                @if($quotation->quotationRequest->solarComputation->battery_capacity_ah > 0)
                <td>
                    <div class="label">Battery Capacity</div>
                    <div class="value">{{ number_format($quotation->quotationRequest->solarComputation->battery_capacity_ah) }} Ah</div>
                </td>
                @endif
            </tr>
        </table>

        {{-- Cost Breakdown --}}
        <div class="section-title">Cost Breakdown</div>
        <div class="cost-box">
            <table style="border: none; margin: 0;">
                <tr>
                    <td style="border: none; padding: 3px 0;">Base System Cost</td>
                    <td style="border: none; padding: 3px 0; text-align: right;">PHP{{ number_format($quotation->adjusted_cost, 2) }}</td>
                </tr>
                <tr>
                    <td style="border: none; padding: 3px 0;">Labor Fee</td>
                    <td style="border: none; padding: 3px 0; text-align: right;">PHP{{ number_format($quotation->labor_fee, 2) }}</td>
                </tr>
                <tr>
                    <td style="border: none; padding: 3px 0;">Transportation Fee</td>
                    <td style="border: none; padding: 3px 0; text-align: right;">PHP{{ number_format($quotation->transportation_fee, 2) }}</td>
                </tr>
                <tr>
                    <td colspan="2" style="border: none; padding: 0;">
                        <div style="border-top: 1px solid #16a34a; margin: 8px 0;"></div>
                    </td>
                </tr>
                <tr>
                    <td style="border: none; font-weight: bold; font-size: 14px; color: #16a34a;">TOTAL AMOUNT</td>
                    <td style="border: none; font-weight: bold; font-size: 14px; color: #16a34a; text-align: right;">PHP{{ number_format($quotation->total_amount, 2) }}</td>
                </tr>
            </table>
        </div>

        {{-- Note --}}
        <div class="note">
            <strong>Note:</strong> This quotation is valid for 30 days from the approval date.
            Prices may vary based on actual site conditions and material availability.
            Contact TataMawing Solar for more information.
        </div>

        {{-- Footer --}}
        <div class="footer">
            <p>Generated by TataMawing Solar Power Quotation System &bull; {{ now()->format('F d, Y h:i A') }}</p>
            <p>This is a computer-generated document. No signature required.</p>
        </div>

    </div>
</body>
</html>