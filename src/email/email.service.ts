import { Injectable, Logger } from '@nestjs/common';
import * as postmark from 'postmark';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: postmark.ServerClient | null = null;
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string = 'notifications@schoolsync.ai';

  constructor() {
    this.initPostmark();
  }

  private initPostmark() {
    const apiToken = process.env.POSTMARK_API_TOKEN;
    const fromEmail = process.env.POSTMARK_FROM_EMAIL;

    this.logger.log(`Initializing Postmark with API token: ${apiToken ? apiToken.substring(0, 8) + '***' : 'NOT SET'}`);

    if (apiToken) {
      this.client = new postmark.ServerClient(apiToken);
      this.logger.log('Postmark client configured');
    } else {
      this.logger.warn('POSTMARK_API_TOKEN not configured. Will attempt SMTP fallback if configured.');
    }
    if (fromEmail) {
      this.fromEmail = fromEmail;
    }
    this.logger.log(`Postmark initialized. From email: ${this.fromEmail}`);

    // Setup nodemailer fallback (Gmail SMTP with app password)
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (!this.client && gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });
      this.fromEmail = gmailUser;
      this.logger.log('Nodemailer Gmail transporter configured as fallback');
    }
  }

  async sendEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
    const recipients = Array.isArray(to) ? to : [to];
    this.logger.log(`Attempting to send email to: ${recipients.join(', ')}`);

    // Prefer Postmark if available
    if (this.client) {
      let atLeastOneSent = false;
      for (const recipient of recipients) {
        try {
          const result = await this.client.sendEmail({
            From: this.fromEmail,
            To: recipient,
            Subject: subject,
            HtmlBody: html,
          });
          this.logger.log(`Postmark: Email sent to ${recipient}. MessageID: ${result.MessageID}`);
          atLeastOneSent = true;
        } catch (error) {
          this.logger.error(`Postmark send failed for ${recipient}:`, error);
          // continue to next recipient
        }
      }
      if (atLeastOneSent) return true;
      // if all failed or no recipients, we might fall through to transporter
    }

    // Fallback to nodemailer if configured
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.fromEmail,
          to: recipients.join(','),
          subject,
          html,
        });
        this.logger.log(`Nodemailer: Email sent to ${recipients.join(',')}`);
        return true;
      } catch (err) {
        this.logger.error('Nodemailer send failed:', err);
        return false;
      }
    }

    this.logger.error('No email transport configured (Postmark or Gmail). Set POSTMARK_API_TOKEN or GMAIL_USER & GMAIL_APP_PASSWORD.');
    return false;
  }

  async sendBillingReminder(
    to: string[],
    companyName: string,
    companyId: string,
    billingDate: string,
    billingCycle: string,
    daysUntilBilling: number,
    amountDue?: number,
    customTemplate?: string,
    recordId?: string,
  ): Promise<boolean> {
    const isDueToday = daysUntilBilling === 0;
    const subject = isDueToday
      ? `🔔 Billing Due Today: ${companyName}`
      : `📅 แจ้งเตือนการเรียกเก็บเงินของบริษัท : ${companyName} - ในอีก ${daysUntilBilling} วัน`;

    const primaryColor = isDueToday ? '#dc3545' : '#4e73df'; // Red for due today, Blue for upcoming
    const headerText = isDueToday ? 'Billing Due Today' : 'Upcoming Billing';

    const amountStr = amountDue && typeof amountDue === 'number'
      ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amountDue)
      : new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(0);

    const defaultHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Billing Reminder</title>
        <style>
          body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background-color: ${primaryColor}; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 18px; margin-bottom: 20px; color: #2c3e50; }
          .message { margin-bottom: 30px; color: #5a6b7c; }
          .card { background-color: #f8f9fc; border-left: 4px solid ${primaryColor}; border-radius: 6px; padding: 20px; margin-bottom: 30px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #eef2f7; padding-bottom: 12px; }
          .info-row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
          .label { font-size: 13px; color: #858796; text-transform: uppercase; font-weight: 600; }
          .value { font-size: 15px; color: #2c3e50; font-weight: 600; text-align: right; }
          .btn-container { text-align: center; margin-top: 30px; }
          .btn { display: inline-block; padding: 12px 24px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
          .btn:hover { opacity: 0.9; }
          .footer { background-color: #f8f9fc; padding: 20px; text-align: center; font-size: 12px; color: #858796; border-top: 1px solid #eef2f7; }
          .footer p { margin: 5px 0; }
          @media only screen and (max-width: 600px) {
            .container { margin: 0; border-radius: 0; }
            .content { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${headerText}</h1>
          </div>
          <div class="content">
            <p class="greeting">Hello Admin,</p>
            <p class="message">
              ${isDueToday
        ? `This is an urgent reminder that the billing for <strong>${companyName}</strong> is due <strong>today</strong>.`
        : `This is a reminder that the billing for <strong>${companyName}</strong> is coming up in <strong>${daysUntilBilling} days</strong>.`
      }
              Please ensure the invoice is prepared and sent to the client.
            </p>
            
            <div class="card">
              <div class="info-row">
                <span class="label">Company : </span>
                <span class="value">&nbsp;${companyName}</span>
              </div>
              <div class="info-row">
                <span class="label">Billing Date : </span>
                <span class="value">&nbsp;${billingDate}</span>
              </div>
              <div class="info-row">
                <span class="label">Status : </span>
                <span class="value" style="color: ${primaryColor}">&nbsp;${isDueToday ? 'Due Today' : 'Upcoming'}</span>
              </div>
              <div class="info-row">
                <span class="label">Amount Due : </span>
                <span class="value">&nbsp;${amountStr}</span>
              </div>
            </div>

            <div class="btn-container">
              <a href="${process.env.FRONTEND_URL || 'https://protrain-crm.web.app'}/billing${recordId ? `?recordId=${recordId}` : `?companyId=${companyId}`}" class="btn">View Billing</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Protrain CRM. All rights reserved.</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const html = customTemplate
      ? customTemplate
        .replace(/\{\{companyName\}\}/g, companyName)
        .replace(/\{\{companyId\}\}/g, companyId)
        .replace(/\{\{billingDate\}\}/g, billingDate)
        .replace(/\{\{billingCycle\}\}/g, billingCycle)
        .replace(/\{\{daysUntilBilling\}\}/g, String(daysUntilBilling))
        .replace(/\{\{amountDue\}\}/g, amountStr)
      : defaultHtml;

    return this.sendEmail(to, subject, html);
  }

  async sendTestEmail(to: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Email</title>
        <style>
          body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background-color: #28a745; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }
          .content { padding: 40px 30px; text-align: center; }
          .message { margin-bottom: 30px; color: #5a6b7c; font-size: 16px; }
          .icon { font-size: 48px; margin-bottom: 20px; display: block; }
          .footer { background-color: #f8f9fc; padding: 20px; text-align: center; font-size: 12px; color: #858796; border-top: 1px solid #eef2f7; }
          .footer p { margin: 5px 0; }
          @media only screen and (max-width: 600px) {
            .container { margin: 0; border-radius: 0; }
            .content { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Test Email Successful</h1>
          </div>
          <div class="content">
            <span class="icon">✅</span>
            <p class="message">
              Your email notification system is configured correctly!
              <br><br>
              You will receive billing reminders at this email address.
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Protrain CRM. All rights reserved.</p>
            <p>This is an automated notification.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(to, '✅ Protrain CRM - Test Email', html);
  }
}
