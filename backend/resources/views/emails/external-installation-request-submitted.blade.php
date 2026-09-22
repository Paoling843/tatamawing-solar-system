<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Installation request received</title>
</head>
<body style="margin: 0; padding: 0; background: #eef3ef; color: #20332b; font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #eef3ef; padding: 32px 16px;">
        <tr><td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff;">
                <tr><td style="background: #123c2b; padding: 26px 36px;">
                    <div style="color: #f4c95d; font-size: 12px; font-weight: bold; letter-spacing: 2px;">TATAMAWING SOLAR</div>
                    <div style="color: #ffffff; font-size: 24px; font-weight: bold; margin-top: 8px;">Your next step toward solar</div>
                </td></tr>
                <tr><td style="padding: 40px 36px 24px;">
                    <div style="display: inline-block; background: #e7f3ea; color: #17613e; font-size: 12px; font-weight: bold; letter-spacing: 1px; padding: 7px 11px;">REQUEST RECEIVED</div>
                    <h1 style="margin: 18px 0 10px; color: #123c2b; font-size: 28px; line-height: 1.2;">We have your installation request</h1>
                    <p style="margin: 0 0 18px;">Hello {{ $requestRecord->name }},</p>
                    <p style="margin: 0 0 22px;">Your request to schedule an installation using your existing quotation from <strong>{{ $requestRecord->other_company_name }}</strong> has been received and is now pending staff review.</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f7f9f6; border-left: 4px solid #f4c95d;">
                        <tr><td style="padding: 16px 18px; color: #40534a;">We have not confirmed the installation date yet. You can check the latest status securely at any time.</td></tr>
                    </table>
                    <p style="margin: 28px 0;" align="center"><a href="{{ $statusUrl }}" style="display: inline-block; background: #17613e; color: #ffffff; padding: 14px 24px; text-decoration: none; font-weight: bold;">Check request status</a></p>
                    <p style="margin: 0; color: #718079; font-size: 13px;">This secure link is valid for 30 days.</p>
                </td></tr>
                <tr><td style="border-top: 1px solid #e5ebe6; padding: 22px 36px; color: #718079; font-size: 12px;">TataMawing Solar &bull; Powering better days</td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>
