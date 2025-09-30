import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { User } from '../models/user.entity';
import { Role } from '../enums/userRoles.enum';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password_hash: '$2b$10$hashedpassword',
    full_name: 'Test User',
    phone: '+1234567890',
    role: Role.User,
    created_at: new Date(),
  } as User;

  beforeEach(async () => {
    const mockUserService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
  });

  describe('validateUser', () => {
    it('should return user when email and password are valid', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      userService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(result).toEqual(mockUser);
      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password_hash);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      const password = 'password123';
      userService.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userService.findByEmail).toHaveBeenCalledWith(email);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'wrongpassword';
      userService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      // Act & Assert
      await expect(service.validateUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password_hash);
    });
  });

  describe('login', () => {
    it('should return access token for valid user', async () => {
      // Arrange
      const expectedToken = 'jwt.token.here';
      jwtService.signAsync.mockResolvedValue(expectedToken);

      // Act
      const result = await service.login(mockUser);

      // Assert
      expect(result).toEqual({ access_token: expectedToken });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'password123',
      full_name: 'New User',
      phone: '+1234567890',
    };

    it('should create new user successfully', async () => {
      // Arrange
      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toEqual(mockUser);
      expect(userService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(userService.create).toHaveBeenCalledWith({
        email: registerDto.email,
        password_hash: 'hashedpassword',
        full_name: registerDto.full_name,
        phone: registerDto.phone,
        role: Role.User,
      });
    });

    it('should throw BadRequestException when user already exists', async () => {
      // Arrange
      userService.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(userService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(userService.create).not.toHaveBeenCalled();
    });
  });
});