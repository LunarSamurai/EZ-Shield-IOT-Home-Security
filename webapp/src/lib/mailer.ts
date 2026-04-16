import nodemailer from 'nodemailer';
import { buildSmsEmail } from './carriers';

interface NotificationConfig {
  smtp_email: string;
  smtp_password: string;
  emergency_email: string;
  emergency_phone: string;
  phone_carrier: string;
  notify_email_enabled: string;
  notify_sms_enabled: string;
  alarm_message: string;
}

interface AlarmContext {
  zoneName: string;
  eventType: string;
  mode: string;
  timestamp: string;
  value?: string;
}

function createTransport(email: string, password: string) {
  // Detect SMTP host from email domain
  const domain = email.split('@')[1]?.toLowerCase();

  let host = 'smtp.gmail.com';
  let port = 465;
  let secure = true;

  if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') {
    host = 'smtp-mail.outlook.com';
    port = 587;
    secure = false;
  } else if (domain === 'yahoo.com') {
    host = 'smtp.mail.yahoo.com';
    port = 465;
    secure = true;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: email,
      pass: password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function buildEmailHtml(context: AlarmContext, message: string): string {
  const time = new Date(context.timestamp).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: #0a1628; color: #e8edf5; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 36px; font-weight: bold;">
          <span style="color: #FFD700;">EZ</span><span style="color: #e8edf5;">Shield</span>
        </div>
        <div style="color: #888; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px;">Home Security Alert</div>
      </div>

      <div style="background: #1a0000; border: 2px solid #ff1744; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="color: #ff1744; font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 12px;">
          ALARM TRIGGERED
        </div>
        <div style="color: #e8edf5; font-size: 16px; text-align: center; margin-bottom: 16px;">
          ${message}
        </div>
        <table style="width: 100%; color: #aaa; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #888;">Zone:</td>
            <td style="padding: 4px 0; text-align: right; color: #ff1744; font-weight: bold;">${context.zoneName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #888;">Event:</td>
            <td style="padding: 4px 0; text-align: right; color: #e8edf5;">${context.eventType.toUpperCase()}</td>
          </tr>
          ${context.value ? `
          <tr>
            <td style="padding: 4px 0; color: #888;">Distance:</td>
            <td style="padding: 4px 0; text-align: right; color: #e8edf5;">${context.value}cm</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 4px 0; color: #888;">Mode:</td>
            <td style="padding: 4px 0; text-align: right; color: #FFD700; font-weight: bold;">${context.mode.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #888;">Time:</td>
            <td style="padding: 4px 0; text-align: right; color: #e8edf5;">${time}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; color: #666; font-size: 12px;">
        This is an automated alert from your EZShield security system.<br/>
        Log in to your dashboard to disarm or manage your system.
      </div>
    </div>
  `;
}

function buildSmsText(context: AlarmContext, message: string): string {
  return `EZShield ALARM: ${context.zoneName} - ${context.eventType.toUpperCase()} (${context.mode} mode). ${message}`;
}

export interface NotificationResult {
  email: { sent: boolean; error?: string };
  sms: { sent: boolean; error?: string };
}

export async function sendAlarmNotifications(
  config: NotificationConfig,
  context: AlarmContext
): Promise<NotificationResult> {
  const result: NotificationResult = {
    email: { sent: false },
    sms: { sent: false },
  };

  // Validate SMTP credentials exist
  if (!config.smtp_email || !config.smtp_password) {
    result.email.error = 'SMTP not configured';
    result.sms.error = 'SMTP not configured';
    return result;
  }

  const transport = createTransport(config.smtp_email, config.smtp_password);
  const alarmMessage = config.alarm_message || 'Your home security has been triggered.';

  // Send email
  if (config.notify_email_enabled === 'true' && config.emergency_email) {
    try {
      await transport.sendMail({
        from: `"EZShield Security" <${config.smtp_email}>`,
        to: config.emergency_email,
        subject: `EZShield ALARM: ${context.zoneName} - ${context.eventType.toUpperCase()}`,
        html: buildEmailHtml(context, alarmMessage),
        text: buildSmsText(context, alarmMessage),
        priority: 'high',
      });
      result.email.sent = true;
    } catch (err: unknown) {
      result.email.error = err instanceof Error ? err.message : 'Email send failed';
    }
  }

  // Send SMS via email-to-SMS gateway
  if (config.notify_sms_enabled === 'true' && config.emergency_phone && config.phone_carrier) {
    const smsEmail = buildSmsEmail(config.emergency_phone, config.phone_carrier);
    if (smsEmail) {
      try {
        await transport.sendMail({
          from: config.smtp_email,
          to: smsEmail,
          subject: '', // SMS doesn't use subject
          text: buildSmsText(context, alarmMessage),
        });
        result.sms.sent = true;
      } catch (err: unknown) {
        result.sms.error = err instanceof Error ? err.message : 'SMS send failed';
      }
    } else {
      result.sms.error = 'Invalid phone number or carrier';
    }
  }

  transport.close();
  return result;
}
