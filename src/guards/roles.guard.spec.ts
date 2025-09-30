import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/userRoles.enum';
import { JwtPayload } from '../types/jwt-payload.type';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    const mockReflector = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
      getAllAndOverride: jest.fn(),
    };

    reflector = mockReflector as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  describe('canActivate', () => {
    let mockContext: jest.Mocked<ExecutionContext>;
    let mockRequest: { user?: JwtPayload };

    beforeEach(() => {
      mockRequest = {};

      const mockHttpContext = {
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      };

      mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue(mockHttpContext),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
        getType: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
      };
    });

    it('should return true when no roles are required', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(undefined);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    it('should return true when roles array is empty', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([]);
      // Even with empty array, if roles metadata exists but is empty,
      // we should allow access (no specific roles required)

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when user has required role', () => {
      // Arrange
      const requiredRoles = [Role.Administrator];
      const userPayload: JwtPayload = {
        sub: 1,
        email: 'admin@example.com',
        role: Role.Administrator,
      };

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      mockRequest.user = userPayload;

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    it('should return false when user does not have required role', () => {
      // Arrange
      const requiredRoles = [Role.Administrator];
      const userPayload: JwtPayload = {
        sub: 1,
        email: 'user@example.com',
        role: Role.User,
      };

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      mockRequest.user = userPayload;

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when user has one of multiple required roles', () => {
      // Arrange
      const requiredRoles = [Role.Administrator, Role.User];
      const userPayload: JwtPayload = {
        sub: 1,
        email: 'user@example.com',
        role: Role.User,
      };

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      mockRequest.user = userPayload;

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user has none of multiple required roles', () => {
      // Arrange
      const requiredRoles = [Role.Administrator];
      const userPayload: JwtPayload = {
        sub: 1,
        email: 'user@example.com',
        role: Role.User,
      };

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      mockRequest.user = userPayload;

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle undefined user gracefully', () => {
      // Arrange
      const requiredRoles = [Role.Administrator];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      mockRequest.user = undefined;

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow();
    });

    it('should handle null user gracefully', () => {
      // Arrange
      const requiredRoles = [Role.Administrator];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      mockRequest.user = null as any;

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow();
    });

    it('should handle user without role property', () => {
      // Arrange
      const requiredRoles = [Role.Administrator];
      const userPayload = {
        sub: 1,
        email: 'user@example.com',
        // role property missing
      } as any;

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      mockRequest.user = userPayload;

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    it('should be case sensitive for role comparison', () => {
      // Arrange
      const requiredRoles = [Role.Administrator];
      const userPayload: JwtPayload = {
        sub: 1,
        email: 'user@example.com',
        role: 'ADMINISTRATOR' as any, // Wrong case
      };

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      mockRequest.user = userPayload;

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle roles from both handler and class metadata', () => {
      // Arrange
      const requiredRoles = [Role.Administrator, Role.User];
      const userPayload: JwtPayload = {
        sub: 1,
        email: 'user@example.com',
        role: Role.User,
      };

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      mockRequest.user = userPayload;

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    it('should work with different role enum values', () => {
      // Arrange
      const requiredRoles = [Role.User];
      const userPayload: JwtPayload = {
        sub: 1,
        email: 'user@example.com',
        role: Role.User,
      };

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      mockRequest.user = userPayload;

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle single role requirement', () => {
      // Arrange
      const requiredRoles = [Role.Administrator];
      const userPayload: JwtPayload = {
        sub: 1,
        email: 'admin@example.com',
        role: Role.Administrator,
      };

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      mockRequest.user = userPayload;

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle reflector returning null', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(null);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle request without user property', () => {
      // Arrange
      const requiredRoles = [Role.Administrator];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const requestWithoutUser = {}; // No user property
      const mockHttpContext = {
        getRequest: jest.fn().mockReturnValue(requestWithoutUser),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      };
      mockContext.switchToHttp.mockReturnValue(mockHttpContext);

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow();
    });

    it('should verify metadata extraction order', () => {
      // Arrange
      const requiredRoles = [Role.Administrator];
      const userPayload: JwtPayload = {
        sub: 1,
        email: 'admin@example.com',
        role: Role.Administrator,
      };

      reflector.getAllAndOverride.mockReturnValue(requiredRoles);
      mockRequest.user = userPayload;

      // Act
      guard.canActivate(mockContext);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
      expect(mockContext.getHandler).toHaveBeenCalled();
      expect(mockContext.getClass).toHaveBeenCalled();
    });
  });
});