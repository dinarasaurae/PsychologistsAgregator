import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from '../models/user.entity';
import { Role } from '../enums/userRoles.enum';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password_hash: 'hashedpassword',
    full_name: 'Test User',
    phone: '+1234567890',
    role: Role.User,
    created_at: new Date(),
  } as User;

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      // Arrange
      const expectedUsers = [mockUser];
      repository.find.mockResolvedValue(expectedUsers);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(expectedUsers);
      expect(repository.find).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      // Arrange
      const userId = 1;
      repository.findOneBy.mockResolvedValue(mockUser);

      // Act
      const result = await service.findById(userId);

      // Assert
      expect(result).toEqual(mockUser);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: userId });
    });

    it('should return null when user not found', async () => {
      // Arrange
      const userId = 999;
      repository.findOneBy.mockResolvedValue(null);

      // Act
      const result = await service.findById(userId);

      // Assert
      expect(result).toBeNull();
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: userId });
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      // Arrange
      const email = 'test@example.com';
      repository.findOneBy.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(repository.findOneBy).toHaveBeenCalledWith({ email });
    });
  });

  describe('create', () => {
    it('should create and save new user', async () => {
      // Arrange
      const userData = {
        email: 'new@example.com',
        password_hash: 'hashedpassword',
        full_name: 'New User',
      };
      repository.create.mockReturnValue(mockUser);
      repository.save.mockResolvedValue(mockUser);

      // Act
      const result = await service.create(userData);

      // Assert
      expect(result).toEqual(mockUser);
      expect(repository.create).toHaveBeenCalledWith(userData);
      expect(repository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('update', () => {
    it('should update user and return updated user', async () => {
      // Arrange
      const userId = 1;
      const updateData = { full_name: 'Updated Name' };
      const updatedUser = { ...mockUser, full_name: 'Updated Name' };

      repository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      repository.findOneBy.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(userId, updateData);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(repository.update).toHaveBeenCalledWith(userId, updateData);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: userId });
    });
  });

  describe('remove', () => {
    it('should delete user by id', async () => {
      // Arrange
      const userId = 1;
      const deleteResult = { affected: 1, raw: {} };
      repository.delete.mockResolvedValue(deleteResult);

      // Act
      const result = await service.remove(userId);

      // Assert
      expect(result).toEqual(deleteResult);
      expect(repository.delete).toHaveBeenCalledWith(userId);
    });
  });
});