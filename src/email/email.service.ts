import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private resend: Resend | null = null;
    private fromEmail: string = 'onboarding@resend.dev'; // Default Resend email

    constructor() {
        this.initResend();
    }

    private initResend() {
        const apiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL;

        this.logger.log(`Initializing Resend with API key: ${apiKey ? apiKey.substring(0, 8) + '***' : 'NOT SET'}`);

        if (!apiKey) {
            this.logger.warn('RESEND_API_KEY not configured. Email sending will not work.');
            return;
        }

        this.resend = new Resend(apiKey);
        if (fromEmail) {
            this.fromEmail = fromEmail;
        }
        this.logger.log(`Resend initialized. From email: ${this.fromEmail}`);
    }

    async sendEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
        if (!this.resend) {
            this.logger.error('Resend not initialized. Check RESEND_API_KEY environment variable.');
            return false;
        }

        try {
            const recipients = Array.isArray(to) ? to : [to];
            this.logger.log(`Attempting to send email to: ${recipients.join(', ')}`);

            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: recipients,
                subject,
                html,
            });

            if (error) {
                this.logger.error('Resend error:', error);
                return false;
            }

            this.logger.log(`Email sent successfully. ID: ${data?.id}`);
            return true;
        } catch (error) {
            this.logger.error('Failed to send email', error);
            return false;
        }
    }

    async sendBillingReminder(
        to: string[],
        companyName: string,
        billingDate: string,
        billingCycle: string,
        daysUntilBilling: number,
        customTemplate?: string,
    ): Promise<boolean> {
        const subject = daysUntilBilling === 0
            ? `🔔 Billing Due Today: ${companyName}`
            : `🔔 Billing Reminder: ${companyName} - Due in ${daysUntilBilling} days`;

        const defaultHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
          .label { color: #6c757d; font-size: 12px; text-transform: uppercase; }
          .value { font-size: 16px; font-weight: bold; color: #333; }
          .footer { text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🔔 Billing Reminder</h1>
          </div>
          <div class="content">
            <p>Dear Admin,</p>
            <p>${daysUntilBilling === 0
                ? 'This is a reminder that the following company has a billing due <strong>today</strong>:'
                : `This is a reminder that the following company has an upcoming billing date in <strong>${daysUntilBilling} days</strong>:`
            }</p>
            
            <div class="info-box">
              <div class="label">Company</div>
              <div class="value">${companyName}</div>
            </div>
            
            <div class="info-box">
              <div class="label">Billing Date</div>
              <div class="value">${billingDate}</div>
            </div>
            
            <div class="info-box">
              <div class="label">Billing Cycle</div>
              <div class="value">${billingCycle}</div>
            </div>

            <p>Please prepare for the billing process.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Protrain CRM</p>
          </div>
        </div>
      </body>
      </html>
    `;

        const html = customTemplate
            ? customTemplate
                .replace(/\{\{companyName\}\}/g, companyName)
                .replace(/\{\{billingDate\}\}/g, billingDate)
                .replace(/\{\{billingCycle\}\}/g, billingCycle)
                .replace(/\{\{daysUntilBilling\}\}/g, String(daysUntilBilling))
            : defaultHtml;

        return this.sendEmail(to, subject, html);
    }

    async sendTestEmail(to: string): Promise<boolean> {
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✅ Test Email Successful</h1>
            <p style="margin: 10px 0 0;">Your email notification is configured correctly!</p>
          </div>
        </div>
      </body>
      </html>
    `;

        return this.sendEmail(to, '✅ Protrain CRM - Test Email', html);
    }
}
