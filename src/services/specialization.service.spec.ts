import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { SpecializationService } from './specialization.service';
import { Specialization } from '../models/specialization.entity';
import { CreateSpecializationDto } from '../dto/createSpecialization.dto';
import { UpdateSpecializationDto } from '../dto/updateSpecialization.dto';

describe('SpecializationService', () => {
  let service: SpecializationService;
  let repository: jest.Mocked<Repository<Specialization>>;

  const mockSpecialization = {
    id: 1,
    name: 'Anxiety Therapy',
    description: 'Treatment for anxiety disorders',
  } as Specialization;

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecializationService,
        {
          provide: getRepositoryToken(Specialization),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SpecializationService>(SpecializationService);
    repository = module.get(getRepositoryToken(Specialization));
  });

  describe('findAll', () => {
    it('should return array of specializations', async () => {
      // Arrange
      const expectedSpecializations = [mockSpecialization];
      repository.find.mockResolvedValue(expectedSpecializations);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(expectedSpecializations);
      expect(repository.find).toHaveBeenCalled();
    });

    it('should return empty array when no specializations found', async () => {
      // Arrange
      repository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
      expect(repository.find).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      // Arrange
      repository.find.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.findAll()).rejects.toThrow('Database connection failed');
    });
  });

  describe('create', () => {
    const createDto: CreateSpecializationDto = {
      name: 'Depression Therapy',
      description: 'Treatment for depression',
    };

    it('should create specialization successfully', async () => {
      // Arrange
      const createdSpecialization = { id: 2, ...createDto } as Specialization;
      repository.create.mockReturnValue(createdSpecialization);
      repository.save.mockResolvedValue(createdSpecialization);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(createdSpecialization);
      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(createdSpecialization);
    });

    it('should handle creation with minimal data', async () => {
      // Arrange
      const minimalDto = { name: 'PTSD Therapy' } as CreateSpecializationDto;
      const minimalSpecialization = { id: 3, name: 'PTSD Therapy' } as Specialization;

      repository.create.mockReturnValue(minimalSpecialization);
      repository.save.mockResolvedValue(minimalSpecialization);

      // Act
      const result = await service.create(minimalDto);

      // Assert
      expect(result.name).toBe('PTSD Therapy');
      expect(repository.create).toHaveBeenCalledWith(minimalDto);
    });

    it('should handle empty name gracefully', async () => {
      // Arrange
      const emptyNameDto = { name: '', description: 'Some description' };
      const emptyNameSpec = { id: 4, ...emptyNameDto } as Specialization;

      repository.create.mockReturnValue(emptyNameSpec);
      repository.save.mockResolvedValue(emptyNameSpec);

      // Act
      const result = await service.create(emptyNameDto);

      // Assert
      expect(result.name).toBe('');
    });

    it('should handle database errors during creation', async () => {
      // Arrange
      repository.create.mockReturnValue(mockSpecialization);
      repository.save.mockRejectedValue(new Error('Database save failed'));

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow('Database save failed');
    });
  });

  describe('update', () => {
    const specializationId = 1;
    const updateDto: UpdateSpecializationDto = {
      name: 'Updated Anxiety Therapy',
      description: 'Updated treatment for anxiety disorders',
    };

    it('should update specialization successfully', async () => {
      // Arrange
      const existingSpecialization = { ...mockSpecialization };
      const updatedSpecialization = { ...mockSpecialization, ...updateDto };

      repository.findOneBy.mockResolvedValue(existingSpecialization);
      repository.save.mockResolvedValue(updatedSpecialization);

      // Act
      const result = await service.update(specializationId, updateDto);

      // Assert
      expect(result).toEqual(updatedSpecialization);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: specializationId });
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when specialization not found', async () => {
      // Arrange
      repository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 999 });
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      // Arrange
      const partialUpdate = { name: 'Partially Updated Name' };
      const existingSpecialization = { ...mockSpecialization };
      const partiallyUpdatedSpecialization = { ...mockSpecialization, name: 'Partially Updated Name' };

      repository.findOneBy.mockResolvedValue(existingSpecialization);
      repository.save.mockResolvedValue(partiallyUpdatedSpecialization);

      // Act
      const result = await service.update(specializationId, partialUpdate);

      // Assert
      expect(result.name).toBe('Partially Updated Name');
      expect(result.description).toBe(mockSpecialization.description); // Unchanged
    });

    it('should handle empty update object', async () => {
      // Arrange
      const emptyUpdate = {};
      const existingSpecialization = { ...mockSpecialization };

      repository.findOneBy.mockResolvedValue(existingSpecialization);
      repository.save.mockResolvedValue(existingSpecialization);

      // Act
      const result = await service.update(specializationId, emptyUpdate);

      // Assert
      expect(result).toEqual(mockSpecialization);
    });

    it('should use Object.assign correctly to merge updates', async () => {
      // Arrange
      const updateData = { description: 'New description only' };
      const existingSpec = { id: 1, name: 'Original Name', description: 'Original description' };
      const expectedSpec = { id: 1, name: 'Original Name', description: 'New description only' };

      repository.findOneBy.mockResolvedValue(existingSpec as Specialization);
      repository.save.mockResolvedValue(existingSpec as Specialization);

      // Act
      const result = await service.update(1, updateData);

      // Assert
      expect(result.name).toBe('Original Name'); // Should remain unchanged
      expect(result.description).toBe('New description only'); // Should be updated
    });

    it('should handle database errors during update', async () => {
      // Arrange
      repository.findOneBy.mockResolvedValue(mockSpecialization);
      repository.save.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(service.update(specializationId, updateDto)).rejects.toThrow('Update failed');
    });
  });

  describe('remove', () => {
    it('should remove specialization successfully', async () => {
      // Arrange
      repository.delete.mockResolvedValue({ affected: 1, raw: {} });

      // Act
      await service.remove(1);

      // Assert
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should handle removal of non-existent specialization', async () => {
      // Arrange
      repository.delete.mockResolvedValue({ affected: 0, raw: {} });

      // Act
      await service.remove(999);

      // Assert
      expect(repository.delete).toHaveBeenCalledWith(999);
    });

    it('should handle zero id', async () => {
      // Arrange
      repository.delete.mockResolvedValue({ affected: 0, raw: {} });

      // Act
      await service.remove(0);

      // Assert
      expect(repository.delete).toHaveBeenCalledWith(0);
    });

    it('should handle negative id', async () => {
      // Arrange
      repository.delete.mockResolvedValue({ affected: 0, raw: {} });

      // Act
      await service.remove(-1);

      // Assert
      expect(repository.delete).toHaveBeenCalledWith(-1);
    });

    it('should handle database errors during deletion', async () => {
      // Arrange
      repository.delete.mockRejectedValue(new Error('Deletion failed'));

      // Act & Assert
      await expect(service.remove(1)).rejects.toThrow('Deletion failed');
    });

    it('should handle foreign key constraint errors', async () => {
      // Arrange
      const constraintError = new Error('FOREIGN KEY constraint failed');
      repository.delete.mockRejectedValue(constraintError);

      // Act & Assert
      await expect(service.remove(1)).rejects.toThrow('FOREIGN KEY constraint failed');
    });
  });
});