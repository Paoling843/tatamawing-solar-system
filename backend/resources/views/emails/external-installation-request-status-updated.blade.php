<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Installation request update</title>
</head>
<body style="margin: 0; padding: 0; background: #eef3ef; color: #20332b; font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #eef3ef; padding: 32px 16px;">
        <tr><td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff;">
                <tr><td style="background: #123c2b; padding: 26px 36px;">
                    <div style="color: #f4c95d; font-size: 12px; font-weight: bold; letter-spacing: 2px;">TATAMAWING SOLAR</div>
                    <div style="color: #ffffff; font-size: 24px; font-weight: bold; margin-top: 8px;">Installation request update</div>
                </td></tr>
                <tr><td style="padding: 40px 36px 24px;">
                    @if ($requestRecord->status === 'confirmed')
                        <div style="display: inline-block; background: #e7f3ea; color: #17613e; font-size: 12px; font-weight: bold; letter-spacing: 1px; padding: 7px 11px;">CONFIRMED</div>
                        <h1 style="margin: 18px 0 10px; color: #123c2b; font-size: 28px; line-height: 1.2;">Your installation is confirmed</h1>
                        <p style="margin: 0 0 18px;">Hello {{ $requestRecord->name }},</p>
                        <p style="margin: 0 0 22px;">Your installation request has been confirmed. Our team will contact you with the remaining installation details.</p>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f7f9f6; border-left: 4px solid #f4c95d;">
                            <tr><td style="padding: 16px 18px;"><strong>Scheduled date</strong><br>{{ $requestRecord->installationSchedule?->scheduled_date?->format('F j, Y') }}</td></tr>
                        </table>
                    @else
                        <div style="display: inline-block; background: #fceceb; color: #9a3d35; font-size: 12px; font-weight: bold; letter-spacing: 1px; padding: 7px 11px;">REQUEST UPDATE</div>
                        <h1 style="margin: 18px 0 10px; color: #123c2b; font-size: 28px; line-height: 1.2;">An update on your request</h1>
                        <p style="margin: 0 0 18px;">Hello {{ $requestRecord->name }},</p>
                        <p style="margin: 0 0 22px;">Your installation request was not approved at this time.</p>
                        @if ($requestRecord->rejection_reason)
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fdf7f3; border-left: 4px solid #d98962;">
                                <tr><td style="padding: 16px 18px;"><strong>Reason</strong><br>{{ $requestRecord->rejection_reason }}</td></tr>
                            </table>
                        @endif
                    @endif
                    <p style="margin: 28px 0;" align="center"><a href="{{ $statusUrl }}" style="display: inline-block; background: #17613e; color: #ffffff; padding: 14px 24px; text-decoration: none; font-weight: bold;">Check request status</a></p>
                    <p style="margin: 0; color: #718079; font-size: 13px;">This secure link is valid for 30 days.</p>
                </td></tr>
                <tr><td style="border-top: 1px solid #e5ebe6; padding: 22px 36px; color: #718079; font-size: 12px;">TataMawing Solar &bull; Powering better days</td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>
