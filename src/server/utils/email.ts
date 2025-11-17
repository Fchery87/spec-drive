import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@spec-drive.com';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!sendgridApiKey) {
      console.warn(
        'SendGrid API key not configured. Email would be sent to:',
        options.to
      );
      // Log the email content for development
      console.log('Email subject:', options.subject);
      console.log('Email body:', options.html);
      return true; // Return true for dev mode
    }

    await sgMail.send({
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string
): Promise<boolean> {
  const verificationUrl = `${APP_URL}/verify-email?token=${verificationToken}`;

  const html = `
    <h2>Welcome to Spec-Drive!</h2>
    <p>Please verify your email address to complete your registration.</p>
    <p>
      <a href="${verificationUrl}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">
        Verify Email
      </a>
    </p>
    <p>Or copy and paste this link in your browser:</p>
    <p>${verificationUrl}</p>
    <p>This link will expire in 24 hours.</p>
    <hr />
    <p><small>If you didn't create this account, you can ignore this email.</small></p>
  `;

  const text = `
    Welcome to Spec-Drive!

    Please verify your email address by clicking the link below:
    ${verificationUrl}

    This link will expire in 24 hours.

    If you didn't create this account, you can ignore this email.
  `;

  return sendEmail({
    to: email,
    subject: 'Verify Your Email - Spec-Drive',
    html,
    text,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  const html = `
    <h2>Reset Your Password</h2>
    <p>We received a request to reset your password. Click the link below to create a new password:</p>
    <p>
      <a href="${resetUrl}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">
        Reset Password
      </a>
    </p>
    <p>Or copy and paste this link in your browser:</p>
    <p>${resetUrl}</p>
    <p><strong>This link will expire in 1 hour.</strong></p>
    <hr />
    <p><small>If you didn't request a password reset, you can safely ignore this email. Your account is secure.</small></p>
  `;

  const text = `
    Reset Your Password

    We received a request to reset your password. Click the link below to create a new password:
    ${resetUrl}

    This link will expire in 1 hour.

    If you didn't request a password reset, you can safely ignore this email. Your account is secure.
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - Spec-Drive',
    html,
    text,
  });
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<boolean> {
  const html = `
    <h2>Welcome to Spec-Drive, ${name}!</h2>
    <p>Your email has been verified and your account is now active.</p>
    <p>You can now:</p>
    <ul>
      <li>Create and manage projects</li>
      <li>Generate specifications and documentation</li>
      <li>Track project phases and artifacts</li>
      <li>Collaborate with your team</li>
    </ul>
    <p>
      <a href="${APP_URL}/dashboard" style="padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">
        Go to Dashboard
      </a>
    </p>
    <hr />
    <p>Questions? Check out our <a href="${APP_URL}/docs">documentation</a> or contact support.</p>
  `;

  const text = `
    Welcome to Spec-Drive, ${name}!

    Your email has been verified and your account is now active.

    You can now:
    - Create and manage projects
    - Generate specifications and documentation
    - Track project phases and artifacts
    - Collaborate with your team

    Go to your dashboard: ${APP_URL}/dashboard

    Questions? Check out our documentation or contact support.
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Spec-Drive!',
    html,
    text,
  });
}
