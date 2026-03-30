import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@shopnova.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'ShopNova';
    
    // Debug: Log what email address is actually being used
    console.log('🔍 Email service initialized with:');
    console.log(`   EMAIL_FROM env var: ${process.env.EMAIL_FROM}`);
    console.log(`   Using email: ${this.fromEmail}`);
    console.log(`   From name: ${this.fromName}`);
    console.log(`   SENDGRID_API_KEY configured: ${process.env.SENDGRID_API_KEY ? 'YES' : 'NO'}`);
    console.log(`   SENDGRID_API_KEY format: ${process.env.SENDGRID_API_KEY?.startsWith('SG.') ? 'VALID' : 'INVALID'}`);
  }

  // Setup domain authentication with SendGrid
  async setupDomainAuthentication(domain: string): Promise<any> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SendGrid API key not configured');
      }

      // This would require SendGrid's v3 API client
      // For now, we'll provide the setup instructions
      console.log(`
🔧 Domain Authentication Setup for ${domain}:
1. Go to: https://app.sendgrid.com/settings/sender_auth
2. Click "Authenticate Your Domain"
3. Select "DNS Host" (recommended)
4. Enter domain: ${domain}
5. Select the IP addresses you want to use
6. Add the DNS records provided by SendGrid

Required DNS Records:
- TXT record for SPF
- CNAME record for DKIM
- TXT record for DMARC
- Optional: BIMI record for brand logo

After setup, update your EMAIL_FROM to use: noreply@${domain}
      `);

      return { message: 'Domain authentication setup instructions provided' };
    } catch (error) {
      console.error('❌ Failed to setup domain authentication:', error);
      throw error;
    }
  }

  // Validate email deliverability
  async validateEmailSetup(): Promise<any> {
    const validation = {
      fromEmail: this.fromEmail,
      domain: this.fromEmail.split('@')[1],
      isCustomDomain: !this.fromEmail.includes('@gmail.com') && !this.fromEmail.includes('@yahoo.com') && !this.fromEmail.includes('@protonmail.com'),
      sendgridConfigured: !!process.env.SENDGRID_API_KEY,
      recommendations: [] as string[]
    };

    if (!validation.isCustomDomain) {
      validation.recommendations.push('Use a custom domain email (noreply@shopnova.com)');
    }

    if (!validation.sendgridConfigured) {
      validation.recommendations.push('Configure SENDGRID_API_KEY environment variable');
    }

    validation.recommendations.push('Set up SPF, DKIM, and DMARC records');
    validation.recommendations.push('Consider BIMI for brand verification');

    return validation;
  }

  // Validate email content for spam prevention
  private validateEmailContent(data: EmailData): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const subject = data.subject.toLowerCase();
    const text = data.text.toLowerCase();

    // Check for spam trigger words
    const spamTriggers = [
      'free', 'winner', 'congratulations', 'click here', 'limited time',
      'act now', 'special promotion', 'urgent', 'guarantee', 'risk free'
    ];

    spamTriggers.forEach(trigger => {
      if (subject.includes(trigger) || text.includes(trigger)) {
        warnings.push(`Contains potential spam trigger: "${trigger}"`);
      }
    });

    // Check subject length
    if (data.subject.length > 50) {
      warnings.push('Subject line is quite long - consider shortening');
    }

    // Check text to HTML ratio
    if (data.html && data.text.length < data.html.length * 0.2) {
      warnings.push('Text content is too short compared to HTML - add more plain text');
    }

    // Check for excessive exclamation marks
    const exclamationCount = (data.subject.match(/!/g) || []).length;
    if (exclamationCount > 2) {
      warnings.push('Too many exclamation marks in subject');
    }

    // Check for all caps
    if (data.subject === data.subject.toUpperCase() && data.subject.length > 10) {
      warnings.push('Subject is in all caps - use normal capitalization');
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  async sendEmail(data: EmailData): Promise<void> {
    // Validate email content for spam prevention
    const validation = this.validateEmailContent(data);
    if (validation.warnings.length > 0) {
      console.log('⚠️  Email content warnings:');
      validation.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    try {
      // Check if SendGrid API key is configured
      if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'SG.your-sendgrid-api-key-here') {
        console.log('📧 SendGrid not configured - Logging email instead:');
        console.log('┌─────────────────────────────────────────');
        console.log(`│ TO: ${data.to}`);
        console.log(`│ FROM: ${this.fromName} <${this.fromEmail}>`);
        console.log(`│ SUBJECT: ${data.subject}`);
        console.log('├─────────────────────────────────────────');
        console.log('│ CONTENT:');
        console.log(data.text);
        if (data.html) {
          console.log('│ HTML: Available');
        }
        console.log('└─────────────────────────────────────────');
        console.log('💡 To send real emails, add SENDGRID_API_KEY to environment variables');
        return;
      }

      const msg = {
        to: data.to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: data.subject,
        text: data.text,
        html: data.html || this.generateHtml(data.text),
        // Basic headers for email delivery
        headers: {
          'X-Priority': '3',
          'List-Unsubscribe': '<https://shopnova.com/unsub>',
          'Reply-To': 'support@shopnova.com',
        },
        // Enable tracking for better analytics
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
          subscriptionTracking: { enable: true },
        },
        // Add custom arguments for deliverability
        customArgs: {
          unsubscribe_url: 'https://shopnova.com/unsub',
        },
      };

      console.log(`📧 Sending email to ${data.to}: ${data.subject}`);
      
      // Add small delay between emails to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await sgMail.send(msg);
      console.log(`✅ Email sent successfully! Message ID: ${response[0].headers['x-message-id']}`);
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      
      // Log detailed error for debugging
      if (error instanceof Error) {
        console.error('Email error details:', error.message);
      }
      
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Email templates
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    const subject = `Welcome to ShopNova, ${userName}!`;
    const text = `
Hi ${userName},

Welcome to ShopNova! Thank you for joining our community.

Your account is now ready. Here's what you can do:
- Browse our latest products and exclusive deals
- Enjoy fast shipping on all orders
- Get personalized recommendations
- Track your orders in real-time

ShopNova is your trusted online store for quality products.

Thank you for choosing us for your shopping needs!

Best regards,
The ShopNova Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ShopNova</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to ShopNova! 🎉</h1>
        </div>
        <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Welcome to ShopNova! We're excited to have you join our community.</p>
            
            <h3>Here's what you can do:</h3>
            <ul>
                <li>Browse our latest products and exclusive deals</li>
                <li>Enjoy fast shipping on all orders</li>
                <li>Get personalized recommendations</li>
                <li>Track your orders in real-time</li>
            </ul>
            
            <a href="https://shopnova.com/shop" class="button">Start Shopping</a>
            
            <p>Thank you for choosing ShopNova for your shopping needs!</p>
            <div class="footer">
                <p>Happy shopping!</p>
                <p>The ShopNova Team</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999;">
                    ShopNova Store<br>
                    123 Commerce Street<br>
                    Charlotte, NC 28215<br>
                    United States
                </p>
                <p style="font-size: 12px; color: #999;">
                    <a href="https://shopnova.com/unsub" style="color: #999;">Unsubscribe</a> | 
                    <a href="https://shopnova.com" style="color: #999;">Visit our store</a>
                </p>
            </div>
        </div>
        <div class="footer">
            <p>&copy; 2024 ShopNova. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;

    await this.sendEmail({
      to: userEmail,
      subject,
      text,
      html
    });
  }

  async sendOrderConfirmationEmail(userEmail: string, userName: string, orderId: string, total: number): Promise<void> {
    const subject = `Order Confirmation #${orderId} ✅`;
    const text = `
Hi ${userName},

Thank you for your order! We've received your purchase and it's being processed.

Order Details:
• Order ID: #${orderId}
• Total Amount: $${total.toFixed(2)}
• Status: Processing

What happens next:
• You'll receive a shipping confirmation email when your order ships
• You can track your order status in your account
• Expected delivery: 3-5 business days

Thank you for shopping at ShopNova!

The ShopNova Team
    `.trim();

    await this.sendEmail({
      to: userEmail,
      subject,
      text
    });
  }

  async sendShippingConfirmationEmail(userEmail: string, userName: string, orderId: string, trackingNumber: string): Promise<void> {
    const subject = `Your Order #${orderId} Has Shipped! 🚚`;
    const text = `
Hi ${userName},

Great news! Your order has been shipped and is on its way to you.

Shipping Details:
• Order ID: #${orderId}
• Tracking Number: ${trackingNumber}
• Carrier: USPS
• Expected Delivery: 3-5 business days

Track your package: https://usps.com/track

Thank you for shopping at ShopNova!

The ShopNova Team
    `.trim();

    await this.sendEmail({
      to: userEmail,
      subject,
      text
    });
  }

  private generateHtml(text: string): string {
    // Basic HTML generation for plain text emails
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ShopNova Notification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; white-space: pre-line; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ShopNova</h1>
        </div>
        <div class="content">
${text}
        </div>
        <div class="footer">
            <p>&copy; 2024 ShopNova. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}

export const emailService = new EmailService();
