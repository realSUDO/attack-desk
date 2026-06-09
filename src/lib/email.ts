import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");

export function buildVerificationEmailHtml(
  name: string | null,
  token: string,
): string {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/verify?token=${token}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f0eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0eb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:28px;font-weight:700;color:#f28a5c;letter-spacing:-0.5px;">AttackDesk</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;padding:40px 36px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e1b15;">Verify your email</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#5e5b55;line-height:1.5;">
                Hi${name ? ` ${name}` : ""},<br />
                Click the button below to verify your AttackDesk account. This link expires in 24 hours.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" style="background-color:#f28a5c;border-radius:8px;padding:0;">
                    <a href="${verifyUrl}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Verify Email</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 4px;font-size:13px;color:#8e8a85;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0;font-size:13px;color:#8e8a85;word-break:break-all;">
                <a href="${verifyUrl}" style="color:#f28a5c;">${verifyUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#8e8a85;">
                AttackDesk &middot; A visual execution workspace
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(
  email: string,
  name: string | null,
  token: string,
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email send");
    return;
  }

  const { data, error } = await resend.emails.send({
    from: "AttackDesk <verify@mail.sudohq.me>",
    to: email,
    subject: "Verify your AttackDesk email",
    html: buildVerificationEmailHtml(name, token),
  });

  if (error) {
    console.error("Resend email failed:", error);
  }
}
