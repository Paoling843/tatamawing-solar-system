<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; background: #eef3ef; color: #20332b; font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #eef3ef; padding: 32px 16px;">
        <tr><td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff;">
                <tr><td style="background: #123c2b; padding: 26px 36px;">
                    <div style="color: #f4c95d; font-size: 12px; font-weight: bold; letter-spacing: 2px;">TATAMAWING SOLAR</div>
                    <div style="color: #ffffff; font-size: 24px; font-weight: bold; margin-top: 8px;">Password help</div>
                </td></tr>
                <tr><td style="padding: 40px 36px 24px;">
                    <h1 style="margin: 0 0 10px; color: #123c2b; font-size: 26px; line-height: 1.2;">Reset your password</h1>
                    <p style="margin: 0 0 18px;">Hello {{ $name }},</p>
                    <p style="margin: 0 0 24px;">We got a request to reset the password for your TataMawing Solar account. Click the button below to choose a new one.</p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr><td style="background: #123c2b; border-radius: 8px;">
                            <a href="{{ $url }}" style="display: inline-block; padding: 14px 26px; color: #ffffff; font-size: 15px; font-weight: bold; text-decoration: none;">Reset your password</a>
                        </td></tr>
                    </table>
                    <p style="margin: 24px 0 0; color: #4f5a54; font-size: 14px;">This link works for {{ $expiresMinutes }} minutes and can only be used once.</p>
                    <p style="margin: 12px 0 0; color: #4f5a54; font-size: 14px;">If the button doesn't work, copy this link into your browser:<br>
                        <a href="{{ $url }}" style="color: #17613e; word-break: break-all;">{{ $url }}</a>
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 26px; background: #f7f9f6; border-left: 4px solid #f4c95d;">
                        <tr><td style="padding: 14px 18px; font-size: 14px;">Didn't ask for this? You can ignore this email. Your password stays the same.</td></tr>
                    </table>
                </td></tr>
                <tr><td style="border-top: 1px solid #e5ebe6; padding: 22px 36px; color: #718079; font-size: 12px;">TataMawing Solar &bull; Powering better days</td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>
