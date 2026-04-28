/**
 * Tests for emailService.
 *
 * Covers both the dispatch path (USE_SES_EMAIL flag, SES success/failure) and
 * the template builders (shape of returned EmailOptions for each transactional
 * flow).
 *
 * The SES client is mocked. Tests use jest.isolateModules so the module-level
 * `useSes` constant is re-evaluated against the per-test env, since it's
 * captured at module load.
 */

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  SendEmailCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('emailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.USE_SES_EMAIL;
    delete process.env.SES_FROM_ADDRESS;
  });

  describe('sendEmail dispatch', () => {
    it('skips SES and logs EMAIL_DISABLED when USE_SES_EMAIL is unset', async () => {
      process.env.USE_SES_EMAIL = 'false';
      let logger: any;
      let sendEmail: any;
      jest.isolateModules(() => {
        logger = require('../../utils/logger').logger;
        sendEmail = require('../emailService').sendEmail;
      });

      await sendEmail({ to: 'u@example.com', subject: 'Hi', html: '<p>x</p>', text: 'x' });

      expect(mockSend).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'EMAIL_DISABLED',
        expect.objectContaining({ to: 'u@example.com', subject: 'Hi' })
      );
    });

    it('skips SES and logs EMAIL_DISABLED when USE_SES_EMAIL is "0"', async () => {
      process.env.USE_SES_EMAIL = '0';
      let logger: any;
      let sendEmail: any;
      jest.isolateModules(() => {
        logger = require('../../utils/logger').logger;
        sendEmail = require('../emailService').sendEmail;
      });

      await sendEmail({ to: 'u@example.com', subject: 'Hi', html: '<p>x</p>', text: 'x' });

      expect(mockSend).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'EMAIL_DISABLED',
        expect.objectContaining({ to: 'u@example.com' })
      );
    });

    it('sends via SES when USE_SES_EMAIL=true', async () => {
      process.env.USE_SES_EMAIL = 'true';
      process.env.SES_FROM_ADDRESS = 'noreply@tailrd-heart.com';
      mockSend.mockResolvedValueOnce({ MessageId: 'abc-123' });
      let logger: any;
      let sendEmail: any;
      jest.isolateModules(() => {
        logger = require('../../utils/logger').logger;
        sendEmail = require('../emailService').sendEmail;
      });

      await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>html body</p>',
        text: 'text body',
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command.input).toEqual({
        Source: 'noreply@tailrd-heart.com',
        Destination: { ToAddresses: ['recipient@example.com'] },
        Message: {
          Subject: { Data: 'Test Subject' },
          Body: {
            Html: { Data: '<p>html body</p>' },
            Text: { Data: 'text body' },
          },
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'EMAIL_SENT',
        expect.objectContaining({ to: 'recipient@example.com', subject: 'Test Subject' })
      );
    });

    it('logs and does not throw when SES rejects', async () => {
      process.env.USE_SES_EMAIL = 'true';
      mockSend.mockRejectedValueOnce(new Error('SES throttled'));
      let logger: any;
      let sendEmail: any;
      jest.isolateModules(() => {
        logger = require('../../utils/logger').logger;
        sendEmail = require('../emailService').sendEmail;
      });

      await expect(
        sendEmail({ to: 'u@example.com', subject: 'Hi', html: '<p>x</p>', text: 'x' })
      ).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        'EMAIL_SEND_FAILED',
        expect.objectContaining({
          to: 'u@example.com',
          subject: 'Hi',
          error: 'SES throttled',
        })
      );
    });
  });

  describe('template builders', () => {
    let builders: any;
    beforeEach(() => {
      jest.isolateModules(() => {
        builders = require('../emailService');
      });
    });

    it('buildInviteEmail produces subject + URL in both HTML and text', () => {
      const out = builders.buildInviteEmail({
        hospitalName: 'Mount Sinai',
        role: 'PHYSICIAN',
        inviteUrl: 'https://app.tailrd-heart.com/invite/abc',
        expiresIn: '48 hours',
      });
      expect(out.subject).toContain('invited');
      expect(out.html).toContain('Mount Sinai');
      expect(out.html).toContain('PHYSICIAN');
      expect(out.html).toContain('https://app.tailrd-heart.com/invite/abc');
      expect(out.text).toContain('Mount Sinai');
      expect(out.text).toContain('https://app.tailrd-heart.com/invite/abc');
      expect(out.text).toContain('48 hours');
      expect(out.to).toBe('');
    });

    it('buildPasswordResetEmail produces reset URL in HTML and text', () => {
      const out = builders.buildPasswordResetEmail({
        resetUrl: 'https://app.tailrd-heart.com/reset/xyz',
        expiresIn: '1 hour',
      });
      expect(out.subject).toContain('Password Reset');
      expect(out.html).toContain('https://app.tailrd-heart.com/reset/xyz');
      expect(out.text).toContain('https://app.tailrd-heart.com/reset/xyz');
      expect(out.text).toContain('1 hour');
    });

    it('buildMFABackupCodesEmail lists every code in HTML and text', () => {
      const codes = ['code-1', 'code-2', 'code-3'];
      const out = builders.buildMFABackupCodesEmail({
        backupCodes: codes,
        userName: 'Dr. Tony',
      });
      expect(out.subject).toContain('MFA Backup Codes');
      for (const c of codes) {
        expect(out.html).toContain(c);
        expect(out.text).toContain(c);
      }
      expect(out.text).toContain('Dr. Tony');
    });

    it('buildSecurityAlertEmail labels each alert type', () => {
      const newIp = builders.buildSecurityAlertEmail({
        alertType: 'new_ip_login',
        details: 'Login from 1.2.3.4',
        ipAddress: '1.2.3.4',
        timestamp: '2026-04-28T10:00:00Z',
      });
      expect(newIp.subject).toContain('Login from New IP Address');
      expect(newIp.html).toContain('1.2.3.4');

      const mfa = builders.buildSecurityAlertEmail({
        alertType: 'mfa_disabled',
        details: 'MFA disabled',
        timestamp: '2026-04-28T10:00:00Z',
      });
      expect(mfa.subject).toContain('MFA Has Been Disabled');

      const spike = builders.buildSecurityAlertEmail({
        alertType: 'failed_login_spike',
        details: '50 failures',
        timestamp: '2026-04-28T10:00:00Z',
      });
      expect(spike.subject).toContain('Multiple Failed Login Attempts');
    });
  });
});
