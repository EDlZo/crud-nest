import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });
    }

    async sendEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
        try {
            const recipients = Array.isArray(to) ? to.join(', ') : to;
            await this.transporter.sendMail({
                from: process.env.GMAIL_USER,
                to: recipients,
                subject,
                html,
            });
            this.logger.log(`Email sent successfully to ${recipients}`);
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
                .replace('{{companyName}}', companyName)
                .replace('{{billingDate}}', billingDate)
                .replace('{{billingCycle}}', billingCycle)
                .replace('{{daysUntilBilling}}', String(daysUntilBilling))
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
