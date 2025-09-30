import { ConfigService } from '@nestjs/config';
import { UserService } from '../services/user.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtPayload } from '../types/jwt-payload.type';
import { Role } from '../enums/userRoles.enum';

type MockedConfigService = {
  get: jest.Mock<string | undefined, [key: string]>;
};

type MockedUserService = {
  findByEmail?: jest.Mock;
  create?: jest.Mock;
};

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;
  let configService: MockedConfigService;
  let userService: MockedUserService;

  const mockJwtSecret = 'test-super-secret-key-123';
  const mockPayload: JwtPayload = {
    sub: 123,
    email: 'test@example.com',
    role: Role.User,
  };

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue(mockJwtSecret),
    };

    userService = {
    };

    jwtStrategy = new JwtStrategy(
      configService as unknown as ConfigService,
      userService as unknown as UserService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance successfully when JWT_SECRET is provided', () => {
      // Arrange
      configService.get.mockReturnValue(mockJwtSecret);

      // Act
      const createStrategy = () => new JwtStrategy(
        configService as unknown as ConfigService,
        userService as unknown as UserService
      );

      // Assert
      expect(createStrategy).not.toThrow();
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });

    it('should throw error when JWT_SECRET is undefined', () => {
      // Arrange
      configService.get.mockReturnValue(undefined);

      // Act & Assert
      expect(() => new JwtStrategy(
        configService as unknown as ConfigService,
        userService as unknown as UserService
      )).toThrow('JWT_SECRET is undefined');
    });

    it('should throw error when JWT_SECRET is empty string', () => {
      // Arrange
      configService.get.mockReturnValue('');

      // Act & Assert
      expect(() => new JwtStrategy(
        configService as unknown as ConfigService,
        userService as unknown as UserService
      )).toThrow('JWT_SECRET is undefined');
    });
  });

  describe('validate', () => {
    it('should return the exact same payload that was provided', async () => {
      // Act
      const result = await jwtStrategy.validate(mockPayload);

      // Assert
      expect(result).toEqual(mockPayload);
    });

    it('should work with USER role', async () => {
      // Arrange
      const userPayload: JwtPayload = {
        sub: 1,
        email: 'user@test.com',
        role: Role.User,
      };

      // Act
      const result = await jwtStrategy.validate(userPayload);

      // Assert
      expect(result).toEqual(userPayload);
      expect(result.role).toBe(Role.User);
    });

    it('should work with ADMINISTRATOR role', async () => {
      // Arrange
      const adminPayload: JwtPayload = {
        sub: 2,
        email: 'admin@test.com',
        role: Role.Administrator,
      };

      // Act
      const result = await jwtStrategy.validate(adminPayload);

      // Assert
      expect(result).toEqual(adminPayload);
      expect(result.role).toBe(Role.Administrator);
    });

    it('should handle multiple validate calls correctly', async () => {
      // Arrange
      const payload1: JwtPayload = { 
        sub: 1, 
        email: 'one@test.com', 
        role: Role.User,
      };
      const payload2: JwtPayload = { 
        sub: 2, 
        email: 'two@test.com', 
        role: Role.Administrator,
      };

      // Act
      const result1 = await jwtStrategy.validate(payload1);
      const result2 = await jwtStrategy.validate(payload2);

      // Assert
      expect(result1).toEqual(payload1);
      expect(result2).toEqual(payload2);
      expect(result1.role).toBe(Role.User);
      expect(result2.role).toBe(Role.Administrator);
    });

    it('should return payload with correct types', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 123,
        email: 'test@example.com',
        role: Role.User,
      };

      // Act
      const result = await jwtStrategy.validate(payload);

      // Assert
      expect(typeof result.sub).toBe('number');
      expect(typeof result.email).toBe('string');
      expect(Object.values(Role)).toContain(result.role);
    });
  });

  describe('edge cases', () => {
    it('should work with minimal valid payload', async () => {
      // Arrange
      const minimalPayload: JwtPayload = {
        sub: 999,
        email: 'min@test.com',
        role: Role.User,
      };

      // Act
      const result = await jwtStrategy.validate(minimalPayload);

      // Assert
      expect(result.sub).toBe(999);
      expect(result.email).toBe('min@test.com');
      expect(result.role).toBe(Role.User);
    });

    it('should work with different numeric sub values', async () => {
      // Arrange
      const payloads: JwtPayload[] = [
        { sub: 0, email: 'zero@test.com', role: Role.User },
        { sub: 1, email: 'one@test.com', role: Role.Administrator },
        { sub: 999999, email: 'large@test.com', role: Role.User },
      ];

      // Act & Assert
      for (const payload of payloads) {
        const result = await jwtStrategy.validate(payload);
        expect(result).toEqual(payload);                
      }
    });
  });
});