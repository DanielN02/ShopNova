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
    this.fromEmail = process.env.EMAIL_FROM || 'shopnovastore@protonmail.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'ShopNova';
    
    // Debug: Log what email address is actually being used
    console.log('🔍 Email service initialized with:');
    console.log(`   EMAIL_FROM env var: ${process.env.EMAIL_FROM}`);
    console.log(`   Using email: ${this.fromEmail}`);
    console.log(`   From name: ${this.fromName}`);
    console.log(`   SENDGRID_API_KEY configured: ${process.env.SENDGRID_API_KEY ? 'YES' : 'NO'}`);
    console.log(`   SENDGRID_API_KEY format: ${process.env.SENDGRID_API_KEY?.startsWith('SG.') ? 'VALID' : 'INVALID'}`);
  }

  async sendEmail(data: EmailData): Promise<void> {
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
      };

      console.log(`📧 Sending email to ${data.to}: ${data.subject}`);
      
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
    const subject = 'Welcome to ShopNova! 🎉';
    const text = `
Hi ${userName},

Welcome to ShopNova! We're excited to have you join our community.

Here's what you can do:
• Browse our latest products and exclusive deals
• Enjoy fast shipping on all orders
• Get personalized recommendations
• Track your orders in real-time

Thank you for choosing ShopNova for your shopping needs!

Happy shopping!
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
            
            <a href="https://shopnovastore.netlify.app/catalog" class="button">Start Shopping</a>
            
            <p>Thank you for choosing ShopNova for your shopping needs!</p>
            <div class="footer">
                <p>Happy shopping!</p>
                <p>The ShopNova Team</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999;">
                    ShopNova Store<br>
                    123 Commerce Street<br>
                    Seattle, WA 98101<br>
                    United States
                </p>
                <p style="font-size: 12px; color: #999;">
                    <a href="#" style="color: #999;">Unsubscribe</a> | 
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

Track your package: https://tools.usps.com/track

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
