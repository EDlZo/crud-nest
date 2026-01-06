import { Injectable, Logger } from '@nestjs/common';
import * as postmark from 'postmark';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';

// Ensure environment variables from .env are loaded when service is instantiated
dotenvConfig();

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

    // Additional SMTP fallback (generic) via SMTP_HOST/PORT/USER/PASS
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 0);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (!this.client && !this.transporter && smtpHost && smtpPort && smtpUser && smtpPass) {
      try {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
        this.fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;
        this.logger.log(`Nodemailer SMTP transporter configured (${smtpHost}:${smtpPort})`);
      } catch (err) {
        this.logger.error('Failed to configure SMTP transporter', err);
      }
    }
  }

  async sendEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
    const recipients = Array.isArray(to) ? to : [to];
    this.logger.log(`Attempting to send email to: ${recipients.join(', ')}`);

    // Prefer Postmark if available
    if (this.client) {
      const failed: string[] = [];
      for (const recipient of recipients) {
        try {
          const result = await this.client.sendEmail({
            From: this.fromEmail,
            To: recipient,
            Subject: subject,
            HtmlBody: html,
          });
          this.logger.log(`Postmark: Email sent to ${recipient}. MessageID: ${result.MessageID}`);
        } catch (error) {
          this.logger.error(`Postmark send failed for ${recipient}: ${String(error)}`);
          failed.push(recipient);
        }
      }
      // If Postmark succeeded for everyone, we're done
      if (failed.length === 0) return true;
      this.logger.warn(`Postmark failed for recipients: ${failed.join(', ')}`);
      // otherwise fall through to transporter/file fallback
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
        // continue to file fallback
      }
    }

    // Development-friendly fallback: write email to local file for inspection
    try {
      const outDir = path.join(process.cwd(), 'tmp', 'emails');
      fs.mkdirSync(outDir, { recursive: true });
      const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}_${recipients.join('_').replace(/[@,]/g, '_')}.html`;
      const filePath = path.join(outDir, filename);
      const fileContent = `<!-- To: ${recipients.join(', ')} -->\n<!-- Subject: ${subject} -->\n\n${html}`;
      fs.writeFileSync(filePath, fileContent, 'utf8');
      this.logger.warn(`No email transport configured. Email written to ${filePath} for inspection.`);
      return true;
    } catch (fileErr) {
      this.logger.error('Failed to write email to local file fallback:', fileErr);
    }

    this.logger.error('No email transport available and file fallback failed. Set POSTMARK_API_TOKEN or SMTP/GMAIL credentials.');
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
    items?: Array<any>,
    recordId?: string,
  ): Promise<boolean> {
    this.logger.log(`Preparing billing reminder: company=${companyName}, billingDate=${billingDate}, daysUntil=${daysUntilBilling}, recipients=${Array.isArray(to) ? to.length : 0}`);
    const isDueToday = daysUntilBilling === 0;
    const subject = isDueToday
      ? `🔔 Billing Due Today: ${companyName}`
      : `📅 แจ้งเตือนการเรียกเก็บเงินของบริษัท : ${companyName} - ในอีก ${daysUntilBilling} วัน`;

    const primaryColor = isDueToday ? '#dc3545' : '#4e73df'; // Red for due today, Blue for upcoming
    const headerText = isDueToday ? 'Billing Due Today' : 'Upcoming Billing';

    const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatEmailDate = (iso: string) => {
      try {
        const parts = iso.split('T')[0].split('-');
        if (parts.length === 3) {
          const dd = parts[2];
          const mon = MONTHS_SHORT[parseInt(parts[1]) - 1];
          const yyyy = parts[0];
          return `${dd} ${mon} ${yyyy}`;
        }
      } catch (e) { }
      return iso;
    };

    const formattedBillingDate = formatEmailDate(billingDate);

    const amountStr = amountDue && typeof amountDue === 'number'
      ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amountDue)
      : new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(0);

    const defaultHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Billing Notification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #333; line-height: 1.6;">
        <div style="padding: 40px 0;">
          <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border-top: 6px solid #0d6efd;">
            
            <div style="padding: 40px 50px;">
              <!-- Header Section -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 40px;">
                <tr>
                  <td valign="top">
                    <h2 style="margin: 0; color: #111827; font-size: 24px; font-weight: 700;">${companyName}</h2>
                  </td>
                  <td valign="top" style="text-align: right;">
                    <h1 style="margin: 0; color: #e5e7eb; font-size: 36px; letter-spacing: 2px; font-weight: 900; line-height: 1;">INVOICE</h1>
                    <div style="margin-top: 8px;">
                      <span style="color: #6b7280; font-size: 13px; font-weight: 500; display: block;">Date</span>
                      <span style="color: #111827; font-size: 16px; font-weight: 700;">${formattedBillingDate}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Line Items Table (Bordered Box) -->
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #f9fafb;">
                      <th style="padding: 12px 20px; text-align: left; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e7eb;">Description</th>
                      <th style="padding: 12px 20px; text-align: right; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e7eb;">Qty</th>
                      <th style="padding: 12px 20px; text-align: right; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e7eb;">Unit Price</th>
                      <th style="padding: 12px 20px; text-align: right; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e7eb;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="padding: 20px; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 15px; font-weight: 500;">
                        Service / Billing Charge
                        <div style="font-size: 12px; color: #9ca3af; margin-top: 4px; font-weight: 400;">Cycle: ${billingCycle || 'Standard'}</div>
                      </td>
                      <td style="padding: 20px; border-bottom: 1px solid #f3f4f6; text-align: right; color: #4b5563; font-size: 14px;">1</td>
                      <td style="padding: 20px; border-bottom: 1px solid #f3f4f6; text-align: right; color: #4b5563; font-size: 14px;">${amountStr}</td>
                      <td style="padding: 20px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 700; color: #111827; font-size: 15px;">${amountStr}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Totals Section (Right Aligned Gray Box) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 40px;">
                <tr>
                  <td width="50%"></td>
                  <td width="50%" align="right">
                    <div style="background-color: #f9fafb; padding: 24px; border-radius: 8px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="padding-bottom: 10px; color: #4b5563; font-size: 14px;">Subtotal</td>
                          <td style="padding-bottom: 10px; text-align: right; color: #111827; font-weight: 600;">${amountStr}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 14px;">Tax</td>
                          <td style="padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: 600;">฿0.00</td>
                        </tr>
                        <tr>
                          <td style="padding-top: 15px; color: #111827; font-size: 16px; font-weight: 700;">Total</td>
                          <td style="padding-top: 15px; text-align: right; color: #0d6efd; font-size: 18px; font-weight: 700;">${amountStr}</td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Notification / Buttons -->
               <div style="text-align: center; margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 30px;">
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
                   ${isDueToday
        ? `Payment for this invoice is due <strong>today</strong>.`
        : `Payment is coming up in <strong>${daysUntilBilling} days</strong>.`
      }
                </p>
                <a href="${process.env.FRONTEND_URL || 'https://protrain-crm.web.app'}/billing${recordId ? `?recordId=${recordId}` : `?companyId=${companyId}`}" 
                   style="display: inline-block; background-color: #0d6efd; color: #ffffff; padding: 12px 30px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                  View Invoice
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #ffffff; padding: 20px; text-align: center; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">This is an automated notification.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    let html = customTemplate
      ? customTemplate
        .replace(/\{\{companyName\}\}/g, companyName)
        .replace(/\{\{companyId\}\}/g, companyId)
        .replace(/\{\{billingDate\}\}/g, formattedBillingDate)
        .replace(/\{\{billingCycle\}\}/g, billingCycle)
        .replace(/\{\{daysUntilBilling\}\}/g, String(daysUntilBilling))
        .replace(/\{\{amountDue\}\}/g, amountStr)
      : defaultHtml;

    // If items provided, inject item rows into any <tbody> or replace {{items}} placeholder
    try {
      // build items HTML table (Item / Description / Qty / Total) - ไม่มี Unit Price
      let itemsHtml = '';
      const safeNum = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      if (Array.isArray(items) && items.length > 0) {
        console.log('ITEMS DEBUG:', items);
        itemsHtml = '';
        items.forEach((it: any, idx: number) => {
          let itemName = it.name || it.description || it.item || it.title || it.service || '-';
          let total = 0;
          if (typeof it.price === 'number' && typeof it.quantity === 'number') {
            total = safeNum(it.price) * safeNum(it.quantity);
          } else if (typeof it.amount === 'number') {
            total = safeNum(it.amount);
          } else if (typeof it.price === 'number') {
            total = safeNum(it.price);
          } else if (typeof it.total === 'number') {
            total = safeNum(it.total);
          }
          const totalStr = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(total);
          // Debug log
          console.log(`Row ${idx + 1} itemName:`, itemName, 'total:', total, 'raw:', it);
          // Render row: แสดงแค่ item name และ total
          itemsHtml += `<tr><td style="padding:8px 6px;border-bottom:1px solid #f3f4f6">${itemName}</td><td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:right">${totalStr}</td></tr>`;
        });
      }

      // Replace any <tbody>...</tbody> blocks with generated rows if itemsHtml is present
      if (itemsHtml) {
        if (/\<tbody[\s\S]*?>[\s\S]*?<\/tbody>/i.test(html)) {
          html = html.replace(/<tbody[\s\S]*?>[\s\S]*?<\/tbody>/gmi, `<tbody>${itemsHtml.replace(/^<tbody>/, '').replace(/<\/tbody>$/, '')}</tbody>`);
        }
        // Replace {{items}} placeholder too
        html = html.replace(/{{\s*items\s*}}/gi, itemsHtml);
      }
    } catch (err) {
      this.logger.error('Failed to inject items into custom template', err);
    }

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
