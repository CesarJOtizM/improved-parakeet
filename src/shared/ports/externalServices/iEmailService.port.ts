/**
 * Email request data transfer object
 */
export interface IEmailRequest {
  to: string;
  subject: string;
  body: string;
  template?: string;
  variables?: Record<string, unknown>;
  orgId: string;
}

/**
 * Email response data transfer object
 */
export interface IEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email service port interface
 * Output port for sending emails following Hexagonal Architecture
 */
export interface IEmailService {
  sendEmail(request: IEmailRequest): Promise<IEmailResponse>;
  sendWelcomeEmail(
    email: string,
    firstName: string,
    lastName: string,
    orgId: string
  ): Promise<IEmailResponse>;
  sendNewUserNotificationToAdmin(
    adminEmail: string,
    newUserEmail: string,
    firstName: string,
    lastName: string,
    orgId: string
  ): Promise<IEmailResponse>;
  sendAccountActivationEmail(
    email: string,
    firstName: string,
    lastName: string,
    orgId: string
  ): Promise<IEmailResponse>;
  sendPasswordResetOtpEmail(
    email: string,
    firstName: string,
    lastName: string,
    otpCode: string,
    orgId: string,
    expiryMinutes?: number
  ): Promise<IEmailResponse>;
  sendWelcomeWithCredentialsEmail(
    email: string,
    firstName: string,
    lastName: string,
    temporaryPassword: string,
    orgId: string
  ): Promise<IEmailResponse>;
  sendAccountDeactivationEmail(
    email: string,
    firstName: string,
    lastName: string,
    orgId: string,
    reason?: string
  ): Promise<IEmailResponse>;
}
