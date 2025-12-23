/* eslint-disable @typescript-eslint/no-explicit-any */
import { RoleAssignedEventHandler } from '@application/eventHandlers/roleAssignedEventHandler';
import { UserStatusChangedEventHandler } from '@application/eventHandlers/userStatusChangedEventHandler';
import { RoleAssignedEvent } from '@auth/domain/events/roleAssigned.event';
import { UserStatusChangedEvent } from '@auth/domain/events/userStatusChanged.event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DomainEventBus } from '@shared/domain/events/domainEventBus.service';

describe('Event Handlers Integration', () => {
  let eventBus: DomainEventBus;
  let roleAssignedHandler: RoleAssignedEventHandler;
  let userStatusChangedHandler: UserStatusChangedEventHandler;
  let roleAssignedHandlerSpy: ReturnType<typeof jest.spyOn>;
  let userStatusChangedHandlerSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    eventBus = new DomainEventBus();
    roleAssignedHandler = new RoleAssignedEventHandler();
    userStatusChangedHandler = new UserStatusChangedEventHandler();

    // Register handlers
    eventBus.registerHandler('RoleAssigned', roleAssignedHandler);
    eventBus.registerHandler('UserStatusChanged', userStatusChangedHandler);

    // Spy on handler methods
    roleAssignedHandlerSpy = jest.spyOn(roleAssignedHandler, 'handle');
    userStatusChangedHandlerSpy = jest.spyOn(userStatusChangedHandler, 'handle');
  });

  describe('Event Bus Integration', () => {
    it('Given: RoleAssigned event When: publishing event Then: should call registered handler', async () => {
      // Arrange
      const event = new RoleAssignedEvent(
        'user-123',
        'role-456',
        'SUPERVISOR',
        'admin-789',
        'org-123'
      );

      // Act
      await eventBus.publish(event);

      // Assert
      expect(roleAssignedHandlerSpy).toHaveBeenCalledWith(event);
      expect(roleAssignedHandlerSpy).toHaveBeenCalledTimes(1);
    });

    it('Given: UserStatusChanged event When: publishing event Then: should call registered handler', async () => {
      // Arrange
      const event = new UserStatusChangedEvent(
        'user-123',
        'ACTIVE',
        'INACTIVE',
        'admin-789',
        'org-123',
        'User requested deactivation'
      );

      // Act
      await eventBus.publish(event);

      // Assert
      expect(userStatusChangedHandlerSpy).toHaveBeenCalledWith(event);
      expect(userStatusChangedHandlerSpy).toHaveBeenCalledTimes(1);
    });

    it('Given: multiple events When: publishing all events Then: should call all registered handlers', async () => {
      // Arrange
      const roleEvent = new RoleAssignedEvent(
        'user-123',
        'role-456',
        'SUPERVISOR',
        'admin-789',
        'org-123'
      );
      const statusEvent = new UserStatusChangedEvent(
        'user-123',
        'ACTIVE',
        'INACTIVE',
        'admin-789',
        'org-123'
      );

      // Act
      await eventBus.publishAll([roleEvent, statusEvent]);

      // Assert
      expect(roleAssignedHandlerSpy).toHaveBeenCalledWith(roleEvent);
      expect(userStatusChangedHandlerSpy).toHaveBeenCalledWith(statusEvent);
      expect(roleAssignedHandlerSpy).toHaveBeenCalledTimes(1);
      expect(userStatusChangedHandlerSpy).toHaveBeenCalledTimes(1);
    });

    it('Given: event with no registered handler When: publishing event Then: should not throw error', async () => {
      // Arrange
      const unknownEvent = {
        eventName: 'UnknownEvent',
        occurredOn: new Date(),
        markForDispatch: jest.fn(),
        isMarkedForDispatch: true,
      } as any;

      // Act & Assert
      await expect(eventBus.publish(unknownEvent)).resolves.not.toThrow();
    });

    it('Given: handler throws error When: publishing event Then: should catch and log error', async () => {
      // Arrange
      const event = new RoleAssignedEvent(
        'user-123',
        'role-456',
        'SUPERVISOR',
        'admin-789',
        'org-123'
      );

      // Mock handler to throw error
      roleAssignedHandlerSpy.mockRejectedValueOnce(new Error('Handler error'));

      // Spy on eventBus logger to verify error is logged
      const errorLoggerSpy: ReturnType<typeof jest.spyOn> = jest.spyOn(
        (eventBus as any).logger,
        'error'
      );

      // Act
      await eventBus.publish(event);

      // Assert
      // The eventBus should catch the error and log it, not throw
      expect(errorLoggerSpy).toHaveBeenCalled();
      expect(roleAssignedHandlerSpy).toHaveBeenCalled();
    });
  });

  describe('Handler Registration', () => {
    it('Given: multiple handlers for same event When: publishing event Then: should call all handlers', async () => {
      // Arrange
      const handler2 = new RoleAssignedEventHandler();
      const handler2Spy = jest.spyOn(handler2, 'handle');
      eventBus.registerHandler('RoleAssigned', handler2);

      const event = new RoleAssignedEvent(
        'user-123',
        'role-456',
        'SUPERVISOR',
        'admin-789',
        'org-123'
      );

      // Act
      await eventBus.publish(event);

      // Assert
      expect(roleAssignedHandlerSpy).toHaveBeenCalledWith(event);
      expect(handler2Spy).toHaveBeenCalledWith(event);
      expect(roleAssignedHandlerSpy).toHaveBeenCalledTimes(1);
      expect(handler2Spy).toHaveBeenCalledTimes(1);
    });
  });
});
