/**
 * Email Service for TAILRD Heart Platform
 * Dev mode: logs email content to console
 * Production: sends via AWS SES
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const isDev = process.env.NODE_ENV !== 'production';
const fromAddress = process.env.SES_FROM_ADDRESS || 'noreply@tailrd-heart.com';

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (isDev || process.env.LOG_INVITE_URL_TO_CONSOLE === 'true') {
    console.log('═══════════════════════════════════════');
    console.log('EMAIL (dev mode - not sent)');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body:\n${options.text}`);
    console.log('═══════════════════════════════════════');
    return;
  }

  // Production: AWS SES
  // Note: Requires @aws-sdk/client-ses
  // If not available, fall back to console logging with warning
  try {
    const sesModule = await import('@aws-sdk/client-ses' as string);
    const { SESClient, SendEmailCommand } = sesModule;
    const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
    await ses.send(new SendEmailCommand({
      Source: fromAddress,
      Destination: { ToAddresses: [options.to] },
      Message: {
        Subject: { Data: options.subject },
        Body: {
          Html: { Data: options.html },
          Text: { Data: options.text },
        },
      },
    }));
  } catch (err) {
    console.warn('SES send failed, logging email instead:', err);
    console.log(`Would send to ${options.to}: ${options.subject}`);
  }
}

// Template 1: Invite Email
export function buildInviteEmail(params: {
  hospitalName: string;
  role: string;
  inviteUrl: string;
  expiresIn: string;
}): EmailOptions {
  const { hospitalName, role, inviteUrl, expiresIn } = params;
  return {
    to: '', // caller sets this
    subject: "You've been invited to TAILRD Heart",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #2C4A60; font-size: 28px; font-weight: 700; margin: 0;">TAILRD</h1>
          <p style="color: #4A6880; font-size: 14px; margin: 4px 0 0;">Cardiovascular Intelligence Platform</p>
        </div>
        <div style="background: #F8FAFB; border: 1px solid #E2E8F0; border-radius: 8px; padding: 32px;">
          <h2 style="color: #1E293B; font-size: 20px; margin: 0 0 16px;">You've been invited</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
            <strong>${hospitalName}</strong> has invited you to access TAILRD Heart as <strong>${role}</strong>.
          </p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Click the button below to set up your account. This link expires in ${expiresIn}.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${inviteUrl}" style="background: #2C4A60; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
        </div>
        <p style="color: #94A3B8; font-size: 12px; text-align: center; margin-top: 24px;">
          If you did not expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `You've been invited to TAILRD Heart\n\n${hospitalName} has invited you as ${role}.\n\nAccept your invitation: ${inviteUrl}\n\nThis link expires in ${expiresIn}.\n\nIf you did not expect this invitation, ignore this email.`,
  };
}

// Template 2: Password Reset (template only, no endpoint yet)
export function buildPasswordResetEmail(params: {
  resetUrl: string;
  expiresIn: string;
}): EmailOptions {
  return {
    to: '',
    subject: 'TAILRD Heart -- Password Reset Request',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #2C4A60; font-size: 28px; font-weight: 700; margin: 0;">TAILRD</h1>
        </div>
        <div style="background: #F8FAFB; border: 1px solid #E2E8F0; border-radius: 8px; padding: 32px;">
          <h2 style="color: #1E293B; font-size: 20px; margin: 0 0 16px;">Password Reset</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            A password reset was requested for your account. Click below to set a new password. This link expires in ${params.expiresIn}.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${params.resetUrl}" style="background: #2C4A60; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Reset Password
            </a>
          </div>
          <p style="color: #94A3B8; font-size: 13px;">If you didn't request this, no action is needed.</p>
        </div>
      </div>
    `,
    text: `Password Reset Request\n\nReset your password: ${params.resetUrl}\n\nExpires in ${params.expiresIn}. If you didn't request this, ignore this email.`,
  };
}

// Template 3: MFA Backup Codes
export function buildMFABackupCodesEmail(params: {
  backupCodes: string[];
  userName: string;
}): EmailOptions {
  const codeList = params.backupCodes.map((c, i) => `  ${i + 1}. ${c}`).join('\n');
  const codeListHtml = params.backupCodes.map((c, i) =>
    `<div style="font-family: monospace; font-size: 16px; padding: 4px 0; color: #1E293B;">${i + 1}. <strong>${c}</strong></div>`
  ).join('');

  return {
    to: '',
    subject: 'TAILRD Heart -- Your MFA Backup Codes',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #2C4A60; font-size: 28px; font-weight: 700; margin: 0;">TAILRD</h1>
        </div>
        <div style="background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 8px; padding: 32px;">
          <h2 style="color: #1E293B; font-size: 20px; margin: 0 0 8px;">Your Backup Codes</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            ${params.userName}, you've enabled two-factor authentication. Save these backup codes securely -- each can be used once if you lose access to your authenticator app.
          </p>
          <div style="background: white; border: 1px solid #E2E8F0; border-radius: 6px; padding: 16px; margin: 16px 0;">
            ${codeListHtml}
          </div>
          <p style="color: #DC2626; font-size: 13px; font-weight: 600;">
            These codes will not be shown again. Store them in a secure location.
          </p>
        </div>
      </div>
    `,
    text: `TAILRD Heart -- MFA Backup Codes\n\n${params.userName}, save these backup codes:\n\n${codeList}\n\nEach code can be used once. Store securely.`,
  };
}

// Template 4: Security Alert
export function buildSecurityAlertEmail(params: {
  alertType: 'new_ip_login' | 'mfa_disabled' | 'failed_login_spike';
  details: string;
  ipAddress?: string;
  timestamp: string;
}): EmailOptions {
  const alertLabels: Record<string, string> = {
    new_ip_login: 'Login from New IP Address',
    mfa_disabled: 'MFA Has Been Disabled',
    failed_login_spike: 'Multiple Failed Login Attempts',
  };

  return {
    to: '',
    subject: `TAILRD Heart -- Security Alert: ${alertLabels[params.alertType]}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #2C4A60; font-size: 28px; font-weight: 700; margin: 0;">TAILRD</h1>
        </div>
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 32px;">
          <h2 style="color: #991B1B; font-size: 20px; margin: 0 0 16px;">
            ${alertLabels[params.alertType]}
          </h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">${params.details}</p>
          ${params.ipAddress ? `<p style="color: #64748B; font-size: 14px;">IP Address: <code>${params.ipAddress}</code></p>` : ''}
          <p style="color: #64748B; font-size: 14px;">Time: ${params.timestamp}</p>
          <p style="color: #475569; font-size: 14px; margin-top: 16px;">
            If this wasn't you, contact your administrator immediately.
          </p>
        </div>
      </div>
    `,
    text: `Security Alert: ${alertLabels[params.alertType]}\n\n${params.details}\n${params.ipAddress ? `IP: ${params.ipAddress}\n` : ''}Time: ${params.timestamp}\n\nIf this wasn't you, contact your administrator.`,
  };
}
