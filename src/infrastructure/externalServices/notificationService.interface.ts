// Re-export from new ports location for backward compatibility
// TODO: Update all imports to use @shared/ports/externalServices directly
export type {
  ILowStockAlertNotification,
  INotificationService,
  IStockThresholdExceededNotification,
} from '@shared/ports/externalServices';
