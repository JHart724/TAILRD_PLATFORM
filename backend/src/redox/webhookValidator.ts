import { Request } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { RedoxWebhookPayload } from './webhookHandler';

/**
 * Redox Webhook Validator
 * Validates webhook signatures and payload structure
 * Ensures security and data integrity
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class RedoxWebhookValidator {
  private readonly webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.REDOX_WEBHOOK_SECRET || '';
    if (!this.webhookSecret) {
      logger.warn('REDOX_WEBHOOK_SECRET not configured - webhook signature validation disabled');
    }
  }

  /**
   * Validate webhook signature
   */
  validateSignature(req: Request): boolean {
    if (!this.webhookSecret) {
      logger.warn('Webhook signature validation skipped - no secret configured');
      return true; // Allow in development, but log warning
    }

    const receivedSignature = req.headers['x-redox-signature'] as string;
    if (!receivedSignature) {
      logger.error('Missing webhook signature header');
      return false;
    }

    try {
      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const expectedSignatureHeader = `sha256=${expectedSignature}`;
      
      // Use timing-safe comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignatureHeader)
      );

      if (!isValid) {
        logger.error('Webhook signature validation failed', {
          received: receivedSignature,
          expected: expectedSignatureHeader.substring(0, 10) + '...'
        });
      }

      return isValid;

    } catch (error) {
      logger.error('Webhook signature validation error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Validate webhook payload structure
   */
  validatePayload(payload: RedoxWebhookPayload): ValidationResult {
    const errors: string[] = [];

    try {
      // Validate Meta section
      if (!payload.Meta) {
        errors.push('Missing Meta section');
      } else {
        if (!payload.Meta.DataModel) {
          errors.push('Missing Meta.DataModel');
        }
        if (!payload.Meta.EventType) {
          errors.push('Missing Meta.EventType');
        }
        if (!payload.Meta.EventDateTime) {
          errors.push('Missing Meta.EventDateTime');
        } else {
          // Validate EventDateTime format
          const eventDate = new Date(payload.Meta.EventDateTime);
          if (isNaN(eventDate.getTime())) {
            errors.push('Invalid Meta.EventDateTime format');
          }
        }
        if (!payload.Meta.Source) {
          errors.push('Missing Meta.Source');
        } else {
          if (!payload.Meta.Source.ID) {
            errors.push('Missing Meta.Source.ID');
          }
          if (!payload.Meta.Source.Name) {
            errors.push('Missing Meta.Source.Name');
          }
        }
        if (!payload.Meta.FacilityCode) {
          errors.push('Missing Meta.FacilityCode');
        }
      }

      // Validate data model specific requirements
      if (payload.Meta?.DataModel) {
        switch (payload.Meta.DataModel) {
          case 'PatientAdmin':
            errors.push(...this.validatePatientAdminPayload(payload));
            break;
          case 'Results':
            errors.push(...this.validateResultsPayload(payload));
            break;
          case 'Orders':
            errors.push(...this.validateOrdersPayload(payload));
            break;
          // Add other data models as needed
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      logger.error('Payload validation error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        isValid: false,
        errors: ['Payload validation failed due to parsing error']
      };
    }
  }

  /**
   * Validate PatientAdmin specific payload
   */
  private validatePatientAdminPayload(payload: RedoxWebhookPayload): string[] {
    const errors: string[] = [];

    if (!payload.Patient) {
      errors.push('PatientAdmin: Missing Patient section');
    } else {
      if (!payload.Patient.Identifiers || payload.Patient.Identifiers.length === 0) {
        errors.push('PatientAdmin: Missing Patient.Identifiers');
      } else {
        payload.Patient.Identifiers.forEach((identifier, index) => {
          if (!identifier.ID) {
            errors.push(`PatientAdmin: Missing Patient.Identifiers[${index}].ID`);
          }
          if (!identifier.IDType) {
            errors.push(`PatientAdmin: Missing Patient.Identifiers[${index}].IDType`);
          }
        });
      }

      if (!payload.Patient.Demographics) {
        errors.push('PatientAdmin: Missing Patient.Demographics');
      } else {
        const demo = payload.Patient.Demographics;
        if (!demo.FirstName) {
          errors.push('PatientAdmin: Missing Patient.Demographics.FirstName');
        }
        if (!demo.LastName) {
          errors.push('PatientAdmin: Missing Patient.Demographics.LastName');
        }
        if (!demo.DOB) {
          errors.push('PatientAdmin: Missing Patient.Demographics.DOB');
        } else {
          const dob = new Date(demo.DOB);
          if (isNaN(dob.getTime())) {
            errors.push('PatientAdmin: Invalid Patient.Demographics.DOB format');
          }
        }
        if (!demo.Sex) {
          errors.push('PatientAdmin: Missing Patient.Demographics.Sex');
        }
      }
    }

    if (!payload.Visit) {
      errors.push('PatientAdmin: Missing Visit section');
    } else {
      if (!payload.Visit.VisitNumber) {
        errors.push('PatientAdmin: Missing Visit.VisitNumber');
      }
      if (!payload.Visit.PatientClass) {
        errors.push('PatientAdmin: Missing Visit.PatientClass');
      }
      if (!payload.Visit.VisitDateTime) {
        errors.push('PatientAdmin: Missing Visit.VisitDateTime');
      } else {
        const visitDate = new Date(payload.Visit.VisitDateTime);
        if (isNaN(visitDate.getTime())) {
          errors.push('PatientAdmin: Invalid Visit.VisitDateTime format');
        }
      }
    }

    return errors;
  }

  /**
   * Validate Results specific payload
   */
  private validateResultsPayload(payload: RedoxWebhookPayload): string[] {
    const errors: string[] = [];

    if (!payload.Patient) {
      errors.push('Results: Missing Patient section');
    }

    if (!payload.Orders || payload.Orders.length === 0) {
      errors.push('Results: Missing Orders section');
    } else {
      payload.Orders.forEach((order, orderIndex) => {
        if (!order.ID) {
          errors.push(`Results: Missing Orders[${orderIndex}].ID`);
        }
        if (!order.Procedure) {
          errors.push(`Results: Missing Orders[${orderIndex}].Procedure`);
        } else {
          if (!order.Procedure.Code) {
            errors.push(`Results: Missing Orders[${orderIndex}].Procedure.Code`);
          }
          if (!order.Procedure.Description) {
            errors.push(`Results: Missing Orders[${orderIndex}].Procedure.Description`);
          }
        }
        
        if (order.Results && order.Results.length > 0) {
          order.Results.forEach((result, resultIndex) => {
            if (!result.Code) {
              errors.push(`Results: Missing Orders[${orderIndex}].Results[${resultIndex}].Code`);
            }
            if (!result.Description) {
              errors.push(`Results: Missing Orders[${orderIndex}].Results[${resultIndex}].Description`);
            }
            if (result.Value === undefined || result.Value === null) {
              errors.push(`Results: Missing Orders[${orderIndex}].Results[${resultIndex}].Value`);
            }
            if (!result.Status) {
              errors.push(`Results: Missing Orders[${orderIndex}].Results[${resultIndex}].Status`);
            }
          });
        }
      });
    }

    return errors;
  }

  /**
   * Validate Orders specific payload
   */
  private validateOrdersPayload(payload: RedoxWebhookPayload): string[] {
    const errors: string[] = [];

    if (!payload.Patient) {
      errors.push('Orders: Missing Patient section');
    }

    if (!payload.Orders || payload.Orders.length === 0) {
      errors.push('Orders: Missing Orders section');
    } else {
      payload.Orders.forEach((order, index) => {
        if (!order.ID) {
          errors.push(`Orders: Missing Orders[${index}].ID`);
        }
        if (!order.TransactionDateTime) {
          errors.push(`Orders: Missing Orders[${index}].TransactionDateTime`);
        } else {
          const transactionDate = new Date(order.TransactionDateTime);
          if (isNaN(transactionDate.getTime())) {
            errors.push(`Orders: Invalid Orders[${index}].TransactionDateTime format`);
          }
        }
        if (!order.Provider) {
          errors.push(`Orders: Missing Orders[${index}].Provider`);
        }
        if (!order.Procedure) {
          errors.push(`Orders: Missing Orders[${index}].Procedure`);
        }
      });
    }

    return errors;
  }

  /**
   * Validate IP whitelist (if configured)
   */
  validateIPWhitelist(req: Request): boolean {
    const ipWhitelist = process.env.REDOX_IP_WHITELIST?.split(',').map(ip => ip.trim());
    if (!ipWhitelist || ipWhitelist.length === 0) {
      return true; // No IP whitelist configured
    }

    const clientIP = this.getClientIP(req);
    const isAllowed = ipWhitelist.includes(clientIP);

    if (!isAllowed) {
      logger.warn('IP not in whitelist', {
        clientIP,
        whitelist: ipWhitelist
      });
    }

    return isAllowed;
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      'unknown'
    );
  }
}