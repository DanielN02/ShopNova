import { Router } from 'express';
import { emailService } from '../emailService';

const router = Router();

// Test email deliverability
router.post('/test-deliverability', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    console.log('🧪 Testing email deliverability to:', email);

    // Send test email with spam-safe content
    await emailService.sendEmail({
      to: email,
      subject: 'ShopNova Test Email - Deliverability Check',
      text: `
Hello,

This is a test email from ShopNova to verify deliverability.

If you received this email, our email system is working correctly.

ShopNova Test Team
    `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ShopNova Test Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #667eea; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ShopNova Test Email</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>This is a test email from ShopNova to verify deliverability.</p>
            <p>If you received this email, our email system is working correctly.</p>
            <p>Best regards,<br>ShopNova Test Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 ShopNova. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
      `
    });

    res.json({ 
      message: 'Test email sent successfully',
      recommendations: [
        'Check if email arrived in inbox (not spam)',
        'If in spam, mark as "Not Spam" to train filters',
        'Add noreply@shopnova.com to contacts',
        'Consider setting up SPF/DKIM/DMARC records'
      ]
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Get email setup recommendations
router.get('/setup-recommendations', async (req, res) => {
  try {
    const validation = await emailService.validateEmailSetup();
    
    res.json({
      currentSetup: validation,
      freeImprovements: [
        '✅ Enhanced email headers with anti-spam markers',
        '✅ Content validation to avoid spam triggers',
        '✅ Shortened URLs under 120 characters',
        '✅ Rate limiting between email sends',
        '✅ Improved subject lines and content',
        '✅ Added unsubscribe headers',
        '✅ Enhanced sender identification'
      ],
      nextSteps: [
        '1. Send test emails to verify deliverability',
        '2. Check spam folder and mark as "Not Spam"',
        '3. Add sender email to contacts',
        '4. Monitor email open rates',
        '5. Consider custom domain for better deliverability (optional)'
      ]
    });

  } catch (error) {
    console.error('Setup recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

export default router;
