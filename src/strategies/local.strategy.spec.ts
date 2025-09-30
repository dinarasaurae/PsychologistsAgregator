import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.entity';
import { Role } from '../enums/userRoles.enum';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password_hash: 'hashedpassword',
    full_name: 'Test User',
    role: Role.User,
    created_at: new Date(),
  } as User;

  beforeEach(async () => {
    const mockAuthService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  describe('validate', () => {
    const validEmail = 'test@example.com';
    const validPassword = 'password123';

    it('should return user when credentials are valid', async () => {
      // Arrange
      authService.validateUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(validEmail, validPassword);

      // Assert
      expect(result).toEqual(mockUser);
      expect(authService.validateUser).toHaveBeenCalledWith(validEmail, validPassword);
    });

    it('should throw UnauthorizedException when AuthService throws UnauthorizedException', async () => {
      // Arrange
      authService.validateUser.mockRejectedValue(new UnauthorizedException('Invalid email or password'));

      // Act & Assert
      await expect(strategy.validate(validEmail, validPassword)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when AuthService throws any error', async () => {
      // Arrange
      authService.validateUser.mockRejectedValue(new Error('Some error'));

      // Act & Assert
      await expect(strategy.validate(validEmail, validPassword)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle empty email', async () => {
      // Arrange
      const emptyEmail = '';
      authService.validateUser.mockRejectedValue(new UnauthorizedException());

      // Act & Assert
      await expect(strategy.validate(emptyEmail, validPassword)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle empty password', async () => {
      // Arrange
      const emptyPassword = '';
      authService.validateUser.mockRejectedValue(new UnauthorizedException());

      // Act & Assert
      await expect(strategy.validate(validEmail, emptyPassword)).rejects.toThrow(UnauthorizedException);
    });

    it('should propagate AuthService calls correctly', async () => {
      // Arrange
      authService.validateUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(validEmail, validPassword);

      // Assert
      expect(authService.validateUser).toHaveBeenCalledWith(validEmail, validPassword);
      expect(result).toEqual(mockUser);
    });

    it('should handle special characters in credentials', async () => {
      // Arrange
      const specialEmail = 'test+special@example.com';
      const specialPassword = 'p@ssw0rd!@#$%';
      authService.validateUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(specialEmail, specialPassword);

      // Assert
      expect(result).toEqual(mockUser);
      expect(authService.validateUser).toHaveBeenCalledWith(specialEmail, specialPassword);
    });

    it('should handle very long credentials', async () => {
      // Arrange
      const longEmail = 'a'.repeat(100) + '@example.com';
      const longPassword = 'p'.repeat(200);
      authService.validateUser.mockRejectedValue(new UnauthorizedException());

      // Act & Assert
      await expect(strategy.validate(longEmail, longPassword)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle concurrent validation calls', async () => {
      // Arrange
      authService.validateUser.mockResolvedValue(mockUser);

      // Act
      const promises = Array.from({ length: 5 }, (_, i) =>
        strategy.validate(`user${i}@example.com`, `password${i}`)
      );
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(5);
      results.forEach(result => expect(result).toEqual(mockUser));
      expect(authService.validateUser).toHaveBeenCalledTimes(5);
    });
  });
});