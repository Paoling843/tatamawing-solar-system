<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Quotation approved</title>
</head>
<body style="margin: 0; padding: 0; background: #eef3ef; color: #20332b; font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #eef3ef; padding: 32px 16px;">
        <tr><td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff;">
                <tr><td style="background: #123c2b; padding: 26px 36px;">
                    <div style="color: #f4c95d; font-size: 12px; font-weight: bold; letter-spacing: 2px;">TATAMAWING SOLAR</div>
                    <div style="color: #ffffff; font-size: 24px; font-weight: bold; margin-top: 8px;">A brighter plan is ready</div>
                </td></tr>
                <tr><td style="padding: 40px 36px 24px;">
                    <div style="display: inline-block; background: #e7f3ea; color: #17613e; font-size: 12px; font-weight: bold; letter-spacing: 1px; padding: 7px 11px;">QUOTATION APPROVED</div>
                    <h1 style="margin: 18px 0 10px; color: #123c2b; font-size: 28px; line-height: 1.2;">Your solar quotation is approved</h1>
                    <p style="margin: 0 0 18px;">Hello {{ $quotation->quotationRequest->customer->user->name }},</p>
                    @php
                        $priceChange = $quotation->priceChange();
                        $estimate = $quotation->estimatedCost();
                    @endphp
                    @if($priceChange === null)
                    <p style="margin: 0 0 22px;">Your quotation has been approved and is ready for your review. Here is the approved total for your solar system:</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f7f9f6; border-left: 4px solid #f4c95d;">
                        <tr><td style="padding: 18px;"><div style="color: #718079; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Approved total</div><div style="color: #123c2b; font-size: 26px; font-weight: bold; margin-top: 4px;">PHP {{ number_format($quotation->total_amount, 2) }}</div></td></tr>
                    </table>
                    @else
                    {{-- The approved total isn't the estimate the customer saw: say so clearly --}}
                    <p style="margin: 0 0 22px;">Your quotation has been approved and is ready for your review. <strong>The price has been updated</strong> from your original estimate after our team reviewed your request:</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fdf6e3; border-left: 4px solid #f4c95d;">
                        <tr><td style="padding: 18px;">
                            <div style="color: #8a6d1d; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Price updated</div>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 10px; font-size: 14px;">
                                <tr>
                                    <td style="padding: 4px 0; color: #718079;">Your original estimate</td>
                                    <td align="right" style="padding: 4px 0; color: #718079; text-decoration: line-through;">PHP {{ number_format($estimate, 2) }}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 4px 0;">Base system cost</td>
                                    <td align="right" style="padding: 4px 0;">PHP {{ number_format($quotation->adjusted_cost, 2) }}</td>
                                </tr>
                                @if((float) $quotation->labor_fee > 0)
                                <tr>
                                    <td style="padding: 4px 0;">Labor fee</td>
                                    <td align="right" style="padding: 4px 0;">PHP {{ number_format($quotation->labor_fee, 2) }}</td>
                                </tr>
                                @endif
                                @if((float) $quotation->transportation_fee > 0)
                                <tr>
                                    <td style="padding: 4px 0;">Transportation fee</td>
                                    <td align="right" style="padding: 4px 0;">PHP {{ number_format($quotation->transportation_fee, 2) }}</td>
                                </tr>
                                @endif
                                <tr>
                                    <td style="padding: 10px 0 0; border-top: 1px solid #ecdcae; color: #123c2b; font-weight: bold;">Approved total</td>
                                    <td align="right" style="padding: 10px 0 0; border-top: 1px solid #ecdcae; color: #123c2b; font-size: 22px; font-weight: bold;">PHP {{ number_format($quotation->total_amount, 2) }}</td>
                                </tr>
                                <tr>
                                    <td colspan="2" align="right" style="padding: 2px 0 0; color: #718079; font-size: 13px;">
                                        {{ $priceChange > 0 ? 'PHP ' . number_format($priceChange, 2) . ' more' : 'PHP ' . number_format(abs($priceChange), 2) . ' less' }} than your estimate
                                    </td>
                                </tr>
                            </table>
                            @if($quotation->price_note)
                            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #ecdcae;">
                                <div style="color: #8a6d1d; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Why the price changed</div>
                                <div style="margin-top: 4px; white-space: pre-wrap;">{{ $quotation->price_note }}</div>
                            </div>
                            @endif
                        </td></tr>
                    </table>
                    <p style="margin: 18px 0 0;">If you have questions about the new price, reply on Messenger or ask about this quotation in your account.</p>
                    @endif
                    <p style="margin: 28px 0 0;">Please sign in to your TataMawing Solar account to review the full quotation and continue with your installation request.</p>
                </td></tr>
                <tr><td style="border-top: 1px solid #e5ebe6; padding: 22px 36px; color: #718079; font-size: 12px;">TataMawing Solar &bull; Powering better days</td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>