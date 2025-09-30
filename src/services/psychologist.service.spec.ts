import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PsychologistService } from './psychologist.service';
import { Psychologist } from '../models/psychologist.entity';
import { User } from '../models/user.entity';
import { CreatePsychologistDto } from '../dto/createPsychologist.dto';
import { UpdatePsychologistDto } from '../dto/updatePsychologist.dto';
import { Role } from '../enums/userRoles.enum';

describe('PsychologistService', () => {
  let service: PsychologistService;
  let psychologistRepository: jest.Mocked<Repository<Psychologist>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser = {
    id: 1,
    email: 'psychologist@example.com',
    password_hash: 'hashedpassword',
    full_name: 'Dr. John Smith',
    role: Role.User,
    created_at: new Date(),
  } as User;

  const mockPsychologist = {
    id: 1,
    user: mockUser,
    experience: 5,
    rating: 4.8,
    bio: 'Experienced clinical psychologist specializing in anxiety and depression.',
    price_per_hour: 150,
    specializations: [],
  } as Psychologist;

  beforeEach(async () => {
    const mockPsychologistRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockUserRepo = {
      findOneBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PsychologistService,
        {
          provide: getRepositoryToken(Psychologist),
          useValue: mockPsychologistRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<PsychologistService>(PsychologistService);
    psychologistRepository = module.get<jest.Mocked<Repository<Psychologist>>>(
      getRepositoryToken(Psychologist),
    );
    userRepository = module.get<jest.Mocked<Repository<User>>>(
      getRepositoryToken(User),
    );
  });

  describe('create', () => {
    const createDto: CreatePsychologistDto = {
      userId: 1,
      experience: 5,
      bio: 'Experienced clinical psychologist',
      price_per_hour: 150,
    };

    it('should create psychologist successfully', async () => {
      // Arrange
      userRepository.findOneBy.mockResolvedValue(mockUser);
      psychologistRepository.create.mockReturnValue(mockPsychologist);
      psychologistRepository.save.mockResolvedValue(mockPsychologist);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockPsychologist);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: createDto.userId });
      expect(psychologistRepository.create).toHaveBeenCalledWith({
        user: mockUser,
        experience: createDto.experience,
        bio: createDto.bio,
        price_per_hour: createDto.price_per_hour,
      });
      expect(psychologistRepository.save).toHaveBeenCalledWith(mockPsychologist);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      userRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: createDto.userId });
      expect(psychologistRepository.create).not.toHaveBeenCalled();
      expect(psychologistRepository.save).not.toHaveBeenCalled();
    });

    it('should handle zero experience', async () => {
      // Arrange
      const dtoWithZeroExp = { ...createDto, experience: 0 };
      const psychologistWithZeroExp = { ...mockPsychologist, experience: 0 };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      psychologistRepository.create.mockReturnValue(psychologistWithZeroExp);
      psychologistRepository.save.mockResolvedValue(psychologistWithZeroExp);

      // Act
      const result = await service.create(dtoWithZeroExp);

      // Assert
      expect(result.experience).toBe(0);
      expect(psychologistRepository.create).toHaveBeenCalledWith({
        user: mockUser,
        experience: 0,
        bio: dtoWithZeroExp.bio,
        price_per_hour: dtoWithZeroExp.price_per_hour,
      });
    });

    it('should handle negative price gracefully', async () => {
      // Arrange
      const dtoWithNegativePrice = { ...createDto, price_per_hour: -50 };
      const psychologistWithNegativePrice = { ...mockPsychologist, price_per_hour: -50 };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      psychologistRepository.create.mockReturnValue(psychologistWithNegativePrice);
      psychologistRepository.save.mockResolvedValue(psychologistWithNegativePrice);

      // Act
      const result = await service.create(dtoWithNegativePrice);

      // Assert
      expect(result.price_per_hour).toBe(-50);
    });

    it('should handle empty bio', async () => {
      // Arrange
      const dtoWithEmptyBio = { ...createDto, bio: '' };
      const psychologistWithEmptyBio = { ...mockPsychologist, bio: '' };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      psychologistRepository.create.mockReturnValue(psychologistWithEmptyBio);
      psychologistRepository.save.mockResolvedValue(psychologistWithEmptyBio);

      // Act
      const result = await service.create(dtoWithEmptyBio);

      // Assert
      expect(result.bio).toBe('');
    });

    it('should handle very long bio', async () => {
      // Arrange
      const longBio = 'a'.repeat(5000);
      const dtoWithLongBio = { ...createDto, bio: longBio };
      const psychologistWithLongBio = { ...mockPsychologist, bio: longBio };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      psychologistRepository.create.mockReturnValue(psychologistWithLongBio);
      psychologistRepository.save.mockResolvedValue(psychologistWithLongBio);

      // Act
      const result = await service.create(dtoWithLongBio);

      // Assert
      expect(result.bio).toBe(longBio);
    });

    it('should handle database errors during save', async () => {
      // Arrange
      userRepository.findOneBy.mockResolvedValue(mockUser);
      psychologistRepository.create.mockReturnValue(mockPsychologist);
      psychologistRepository.save.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow('Database error');
      expect(psychologistRepository.save).toHaveBeenCalledWith(mockPsychologist);
    });
  });

  describe('findAll', () => {
    it('should return all psychologists with relations', async () => {
      // Arrange
      const expectedPsychologists = [mockPsychologist];
      psychologistRepository.find.mockResolvedValue(expectedPsychologists);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(expectedPsychologists);
      expect(psychologistRepository.find).toHaveBeenCalledWith({
        relations: ['user', 'specializations'],
      });
    });

    it('should return empty array when no psychologists found', async () => {
      // Arrange
      psychologistRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      // Arrange
      psychologistRepository.find.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.findAll()).rejects.toThrow('Database connection failed');
    });

    it('should load relations correctly', async () => {
      // Arrange
      const psychologistWithRelations = {
        ...mockPsychologist,
        user: mockUser,
        specializations: [],
      } as Psychologist;
      psychologistRepository.find.mockResolvedValue([psychologistWithRelations]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result[0]).toHaveProperty('user');
      expect(result[0]).toHaveProperty('specializations');
      expect(result[0].user).toEqual(mockUser);
    });
  });

  describe('findOne', () => {
    const psychologistId = 1;

    it('should return psychologist by id with relations', async () => {
      // Arrange
      psychologistRepository.findOne.mockResolvedValue(mockPsychologist);

      // Act
      const result = await service.findOne(psychologistId);

      // Assert
      expect(result).toEqual(mockPsychologist);
      expect(psychologistRepository.findOne).toHaveBeenCalledWith({
        where: { id: psychologistId },
        relations: ['user', 'specializations'],
      });
    });

    it('should return null when psychologist not found', async () => {
      // Arrange
      psychologistRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findOne(999);

      // Assert
      expect(result).toBeNull();
      expect(psychologistRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['user', 'specializations'],
      });
    });

    it('should handle zero id', async () => {
      // Arrange
      psychologistRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findOne(0);

      // Assert
      expect(result).toBeNull();
      expect(psychologistRepository.findOne).toHaveBeenCalledWith({
        where: { id: 0 },
        relations: ['user', 'specializations'],
      });
    });

    it('should handle negative id', async () => {
      // Arrange
      psychologistRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findOne(-1);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      psychologistRepository.findOne.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.findOne(psychologistId)).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    const psychologistId = 1;
    const updateDto: UpdatePsychologistDto = {
      experience: 7,
      bio: 'Updated bio',
      price_per_hour: 180,
    };

    it('should update psychologist successfully', async () => {
      // Arrange
      const updatedPsychologist = { ...mockPsychologist, ...updateDto };
      psychologistRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      psychologistRepository.findOne.mockResolvedValue(updatedPsychologist);

      // Act
      const result = await service.update(psychologistId, updateDto);

      // Assert
      expect(result).toEqual(updatedPsychologist);
      expect(psychologistRepository.update).toHaveBeenCalledWith(psychologistId, updateDto);
      expect(psychologistRepository.findOne).toHaveBeenCalledWith({
        where: { id: psychologistId },
        relations: ['user', 'specializations'],
      });
    });

    it('should return null when psychologist not found after update', async () => {
      // Arrange
      psychologistRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      psychologistRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.update(999, updateDto);

      // Assert
      expect(result).toBeNull();
      expect(psychologistRepository.update).toHaveBeenCalledWith(999, updateDto);
    });

    it('should handle partial updates', async () => {
      // Arrange
      const partialUpdate = { experience: 8 };
      const partiallyUpdatedPsychologist = { ...mockPsychologist, experience: 8 };

      psychologistRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      psychologistRepository.findOne.mockResolvedValue(partiallyUpdatedPsychologist);

      // Act
      const result = await service.update(psychologistId, partialUpdate);

      // Assert
      expect(result).toEqual(partiallyUpdatedPsychologist);
      expect(psychologistRepository.update).toHaveBeenCalledWith(psychologistId, partialUpdate);
    });

    it('should handle empty update object', async () => {
      // Arrange
      const emptyUpdate = {};
      psychologistRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      psychologistRepository.findOne.mockResolvedValue(mockPsychologist);

      // Act
      const result = await service.update(psychologistId, emptyUpdate);

      // Assert
      expect(result).toEqual(mockPsychologist);
      expect(psychologistRepository.update).toHaveBeenCalledWith(psychologistId, emptyUpdate);
    });

    it('should handle database errors during update', async () => {
      // Arrange
      psychologistRepository.update.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(service.update(psychologistId, updateDto)).rejects.toThrow('Update failed');
    });
  });

  describe('remove', () => {
    const psychologistId = 1;

    it('should remove psychologist successfully', async () => {
      // Arrange
      psychologistRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      // Act
      await service.remove(psychologistId);

      // Assert
      expect(psychologistRepository.delete).toHaveBeenCalledWith(psychologistId);
    });

    it('should handle removal of non-existent psychologist', async () => {
      // Arrange
      psychologistRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      // Act
      await service.remove(999);

      // Assert
      expect(psychologistRepository.delete).toHaveBeenCalledWith(999);
    });

    it('should handle zero id', async () => {
      // Arrange
      psychologistRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      // Act
      await service.remove(0);

      // Assert
      expect(psychologistRepository.delete).toHaveBeenCalledWith(0);
    });

    it('should handle negative id', async () => {
      // Arrange
      psychologistRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      // Act
      await service.remove(-1);

      // Assert
      expect(psychologistRepository.delete).toHaveBeenCalledWith(-1);
    });

    it('should handle database errors during deletion', async () => {
      // Arrange
      psychologistRepository.delete.mockRejectedValue(new Error('Deletion failed'));

      // Act & Assert
      await expect(service.remove(psychologistId)).rejects.toThrow('Deletion failed');
      expect(psychologistRepository.delete).toHaveBeenCalledWith(psychologistId);
    });

    it('should handle foreign key constraint errors', async () => {
      // Arrange
      const constraintError = new Error('FOREIGN KEY constraint failed');
      psychologistRepository.delete.mockRejectedValue(constraintError);

      // Act & Assert
      await expect(service.remove(psychologistId)).rejects.toThrow('FOREIGN KEY constraint failed');
    });
  });

  describe('edge cases and performance', () => {
    it('should handle concurrent create operations', async () => {
      // Arrange
      const createDto: CreatePsychologistDto = {
        userId: 1,
        experience: 5,
        bio: 'Test bio',
        price_per_hour: 150,
      };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      psychologistRepository.create.mockReturnValue(mockPsychologist);
      psychologistRepository.save.mockResolvedValue(mockPsychologist);

      // Act
      const promises = Array.from({ length: 3 }, () => service.create(createDto));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      results.forEach(result => expect(result).toEqual(mockPsychologist));
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(3);
      expect(psychologistRepository.save).toHaveBeenCalledTimes(3);
    });

    it('should handle very high price values', async () => {
      // Arrange
      const highPriceDto = {
        userId: 1,
        experience: 5,
        bio: 'Premium service',
        price_per_hour: 999999,
      };
      const highPricePsychologist = { ...mockPsychologist, price_per_hour: 999999 };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      psychologistRepository.create.mockReturnValue(highPricePsychologist);
      psychologistRepository.save.mockResolvedValue(highPricePsychologist);

      // Act
      const result = await service.create(highPriceDto);

      // Assert
      expect(result.price_per_hour).toBe(999999);
    });

    it('should handle very high experience values', async () => {
      // Arrange
      const highExperienceDto = {
        userId: 1,
        experience: 50,
        bio: 'Veteran psychologist',
        price_per_hour: 200,
      };
      const highExperiencePsychologist = { ...mockPsychologist, experience: 50 };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      psychologistRepository.create.mockReturnValue(highExperiencePsychologist);
      psychologistRepository.save.mockResolvedValue(highExperiencePsychologist);

      // Act
      const result = await service.create(highExperienceDto);

      // Assert
      expect(result.experience).toBe(50);
    });
  });
});