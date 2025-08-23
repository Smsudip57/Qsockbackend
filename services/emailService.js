const nodemailer = require("nodemailer");

// Create transporter instance
const transporter = nodemailer.createTransport({
  host: "premium247.web-hosting.com",
  port: 465,
  secure: true,
  auth: {
    user: "noreply@qsocks.net",
    pass: "xY8Hvai4uMjjA2s",
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000
});

// Base email template
const getBaseTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 1px solid #eee;
    }
    .logo {
      max-width: 150px;
      margin: 0 auto;
      display: block;
    }
    .content {
      padding: 30px 20px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #eee;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      margin: 20px 0;
      background-color: #33BA57;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
    }
    .amount {
      font-size: 24px;
      font-weight: bold;
      color: #33BA57;
      text-align: center;
      margin: 20px 0;
    }
    .transaction-details {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #495057;
    }
    .detail-value {
      color: #6c757d;
    }
    a {
      color: #33BA57 !important;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .success-icon {
      width: 60px;
      height: 60px;
      background-color: #33BA57;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      color: white;
      font-size: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${process.env.Current_Url}/logo.png" alt="QSocks Logo" class="logo" />
      <h2>${title}</h2>
    </div>
    
    <div class="content">
      ${content}
    </div>
    
    <div class="footer">
      <p>&copy; 2025 QSocks. All rights reserved.</p>
      <p>Your privacy is important to us. View our <a href="https://qsocks.net/privacy">Privacy Policy</a>.</p>
      <p>Need help? <a href="https://qsocks.net/support">Contact our support team</a></p>
    </div>
  </div>
</body>
</html>
`;

// Email templates
const emailTemplates = {
  depositConfirmation: (data) => ({
    subject: "Deposit Confirmation - QSocks",
    html: getBaseTemplate("Deposit Confirmed", `
      <div class="success-icon">✓</div>
      <h3 style="text-align: center; color: #33BA57;">Deposit Successful!</h3>
      <p>Hello <strong>${data.userEmail}</strong>,</p>
      <p>Your deposit has been successfully processed and added to your account balance.</p>
      
      <div class="amount">$${data.amount}</div>
      
      <div class="transaction-details">
        <div class="detail-row">
          <span class="detail-label">Transaction ID:</span>
          <span class="detail-value">${data.orderId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount:</span>
          <span class="detail-value">$${data.amount}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Method:</span>
          <span class="detail-value">${data.currency || 'Cryptocurrency'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">New Balance:</span>
          <span class="detail-value">$${data.newBalance}</span>
        </div>
      </div>
      
      <p>You can now use your balance to purchase proxy plans and services.</p>
      
      <div style="text-align: center;">
        <a href="${process.env.Client_Url}/onboard" class="button">View Dashboard</a>
      </div>
    `)
  }),

  purchaseConfirmation: (data) => ({
    subject: "Purchase Confirmation - QSocks",
    html: getBaseTemplate("Purchase Confirmed", `
      <div class="success-icon">🎉</div>
      <h3 style="text-align: center; color: #33BA57;">Purchase Successful!</h3>
      <p>Hello <strong>${data.userEmail}</strong>,</p>
      <p>Thank you for your purchase! Your order has been successfully processed.</p>
      
      <div class="transaction-details">
        <div class="detail-row">
          <span class="detail-label">Product:</span>
          <span class="detail-value">${data.productType}</span>
        </div>
        ${data.planName ? `
        <div class="detail-row">
          <span class="detail-label">Plan:</span>
          <span class="detail-value">${data.planName}</span>
        </div>` : ''}
        ${data.quantity ? `
        <div class="detail-row">
          <span class="detail-label">Quantity:</span>
          <span class="detail-value">${data.quantity}</span>
        </div>` : ''}
        <div class="detail-row">
          <span class="detail-label">Amount:</span>
          <span class="detail-value">$${data.amount}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Method:</span>
          <span class="detail-value">Account Balance</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Remaining Balance:</span>
          <span class="detail-value">$${data.remainingBalance}</span>
        </div>
      </div>
      
      ${data.proxyDetails ? `
      <div style="background-color: #e8f5e8; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #33BA57;">Your Proxy Details:</h4>
        <p style="font-family: monospace; background-color: white; padding: 10px; border-radius: 4px; word-break: break-all;">
          ${data.proxyDetails}
        </p>
        <p style="font-size: 12px; margin-bottom: 0;">
          <em>Keep this information secure and do not share it with others.</em>
        </p>
      </div>` : ''}
      
      ${data.trafficAmount ? `
      <p><strong>Traffic Added:</strong> ${data.trafficAmount} GB has been added to your account.</p>` : ''}
      
      <div style="text-align: center;">
        <a href="${process.env.Client_Url}/onboard" class="button">View Dashboard</a>
        <a href="${process.env.Client_Url}/onboard/proxy-history" class="button" style="margin-left: 10px; background-color: #6c757d;">View History</a>
      </div>
    `)
  }),

  verificationCode: (data) => ({
    subject: "Your Verification Code",
    html: getBaseTemplate("Email Verification", `
      <h3>Hello!</h3>
      <p>Thank you for choosing Qsocks. To complete your registration, please use the verification code below:</p>
      
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #33BA57; padding: 15px; margin: 20px 0; background-color: rgba(51, 186, 87, 0.12); border-radius: 6px; display: inline-block; text-align: center; width: 100%; box-sizing: border-box;">
        ${data.verificationCode}
      </div>
      
      <p>This code will expire in 60 seconds.</p>
      
      <div style="font-size: 14px; margin: 20px 0; padding: 10px; background-color: #fffef0; border-left: 4px solid #ffd700;">
        <strong>Security Note:</strong> If you didn't request this code, please ignore this email or contact our support team.
      </div>
    `)
  }),

  passwordReset: (data) => ({
    subject: "Password Reset Code",
    html: getBaseTemplate("Password Reset", `
      <h3>Hello!</h3>
      <p>We received a request to reset your password. Please use the code below to reset your password:</p>
      
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #33BA57; padding: 15px; margin: 20px 0; background-color: rgba(51, 186, 87, 0.12); border-radius: 6px; display: inline-block; text-align: center; width: 100%; box-sizing: border-box;">
        ${data.verificationCode}
      </div>
      
      <p>This code will expire in 1 hour.</p>
      
      <div style="font-size: 14px; margin: 20px 0; padding: 10px; background-color: #fffef0; border-left: 4px solid #ffd700;">
        <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email or contact our support team immediately.
      </div>
    `)
  }),

  balanceUpdate: (data) => ({
    subject: "Account Balance Updated - QSocks",
    html: getBaseTemplate("Balance Updated", `
      <div class="success-icon">💰</div>
      <h3 style="text-align: center; color: #33BA57;">Balance Updated!</h3>
      <p>Hello <strong>${data.userEmail}</strong>,</p>
      <p>Your account balance has been updated by an administrator.</p>
      
      <div class="transaction-details">
        <div class="detail-row">
          <span class="detail-label">Action:</span>
          <span class="detail-value">${data.action === 'add' ? 'Balance Added' : 'Balance Deducted'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount:</span>
          <span class="detail-value" style="color: ${data.action === 'add' ? '#33BA57' : '#dc3545'};">
            ${data.action === 'add' ? '+' : '-'}$${data.amount}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">New Balance:</span>
          <span class="detail-value">$${data.newBalance}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</span>
        </div>
        ${data.note ? `
        <div class="detail-row">
          <span class="detail-label">Note:</span>
          <span class="detail-value">${data.note}</span>
        </div>` : ''}
      </div>
      
      <div style="text-align: center;">
        <a href="${process.env.Client_Url}/onboard" class="button">View Dashboard</a>
      </div>
    `)
  })
};

// Main email service class
class EmailService {
  /**
   * Send an email using a predefined template
   * @param {string} templateName - Name of the email template
   * @param {string} toEmail - Recipient email address
   * @param {Object} data - Data to populate the template
   * @returns {Promise<boolean>} - Success status
   */
  static async sendEmail(templateName, toEmail, data = {}) {
    try {
      const template = emailTemplates[templateName];
      if (!template) {
        console.error(`Email template '${templateName}' not found`);
        return false;
      }

      const emailContent = template(data);
      const mailOptions = {
        from: '"Qsocks Support" <noreply@qsocks.net>',
        to: toEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully: ${templateName} to ${toEmail}`, info.response);
      return true;
    } catch (error) {
      console.error(`Error sending email: ${templateName} to ${toEmail}`, error);
      return false;
    }
  }

  /**
   * Send custom email with custom content
   * @param {string} toEmail - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} content - HTML content
   * @returns {Promise<boolean>} - Success status
   */
  static async sendCustomEmail(toEmail, subject, content) {
    try {
      const mailOptions = {
        from: '"Qsocks Support" <noreply@qsocks.net>',
        to: toEmail,
        subject: subject,
        html: getBaseTemplate(subject, content),
        text: content.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`Custom email sent successfully to ${toEmail}`, info.response);
      return true;
    } catch (error) {
      console.error(`Error sending custom email to ${toEmail}`, error);
      return false;
    }
  }

  // Convenience methods for specific email types
  static async sendDepositConfirmation(userEmail, depositData) {
    return this.sendEmail('depositConfirmation', userEmail, {
      userEmail,
      ...depositData
    });
  }

  static async sendPurchaseConfirmation(userEmail, purchaseData) {
    return this.sendEmail('purchaseConfirmation', userEmail, {
      userEmail,
      ...purchaseData
    });
  }

  static async sendVerificationCode(userEmail, verificationCode) {
    return this.sendEmail('verificationCode', userEmail, {
      verificationCode
    });
  }

  static async sendPasswordResetCode(userEmail, verificationCode) {
    return this.sendEmail('passwordReset', userEmail, {
      verificationCode
    });
  }

  static async sendBalanceUpdate(userEmail, balanceData) {
    return this.sendEmail('balanceUpdate', userEmail, {
      userEmail,
      ...balanceData
    });
  }

  /**
   * Test email connectivity
   * @returns {Promise<boolean>} - Connection status
   */
  static async testConnection() {
    try {
      await transporter.verify();
      console.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = EmailService;
