import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleService } from './schedule.service';
import { Schedule } from '../models/schedule.entity';
import { Psychologist } from '../models/psychologist.entity';
import { CreateScheduleDto } from '../dto/createSchedule.dto';
import { UpdateScheduleDto } from '../dto/updateSchedule.dto';
import { User } from '../models/user.entity';
import { Role } from '../enums/userRoles.enum';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let scheduleRepository: jest.Mocked<Repository<Schedule>>;
  let psychologistRepository: jest.Mocked<Repository<Psychologist>>;

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
    bio: 'Experienced psychologist',
    price_per_hour: 150,
    specializations: [],
  } as Psychologist;

  const mockSchedule = {
    id: 1,
    psychologist: mockPsychologist,
    day_of_week: 1, // Monday
    start_time: '09:00',
    end_time: '17:00',
  } as Schedule;

  beforeEach(async () => {
    const mockScheduleRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const mockPsychologistRepo = {
      findOneByOrFail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        {
          provide: getRepositoryToken(Schedule),
          useValue: mockScheduleRepo,
        },
        {
          provide: getRepositoryToken(Psychologist),
          useValue: mockPsychologistRepo,
        },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    scheduleRepository = module.get(getRepositoryToken(Schedule));
    psychologistRepository = module.get(getRepositoryToken(Psychologist));
  });

  describe('findAll', () => {
    it('should return all schedules with psychologist relations', async () => {
      // Arrange
      const expectedSchedules = [mockSchedule];
      scheduleRepository.find.mockResolvedValue(expectedSchedules);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(expectedSchedules);
      expect(scheduleRepository.find).toHaveBeenCalledWith({ relations: ['psychologist'] });
    });

    it('should return empty array when no schedules found', async () => {
      // Arrange
      scheduleRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      // Arrange
      scheduleRepository.find.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.findAll()).rejects.toThrow('Database connection failed');
    });
  });

  describe('create', () => {
    const createDto: CreateScheduleDto = {
      psychologistId: 1,
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
    };

    it('should create schedule successfully', async () => {
      // Arrange
      psychologistRepository.findOneByOrFail.mockResolvedValue(mockPsychologist);
      scheduleRepository.create.mockReturnValue(mockSchedule);
      scheduleRepository.save.mockResolvedValue(mockSchedule);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockSchedule);
      expect(psychologistRepository.findOneByOrFail).toHaveBeenCalledWith({ id: createDto.psychologistId });
      expect(scheduleRepository.create).toHaveBeenCalledWith({ ...createDto, psychologist: mockPsychologist });
      expect(scheduleRepository.save).toHaveBeenCalledWith(mockSchedule);
    });

    it('should throw error when psychologist not found', async () => {
      // Arrange
      psychologistRepository.findOneByOrFail.mockRejectedValue(new Error('Psychologist not found'));

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow('Psychologist not found');
      expect(psychologistRepository.findOneByOrFail).toHaveBeenCalledWith({ id: createDto.psychologistId });
      expect(scheduleRepository.create).not.toHaveBeenCalled();
    });

    it('should handle edge case with day_of_week 0 (Sunday)', async () => {
      // Arrange
      const sundayDto = { ...createDto, day_of_week: 0 };
      const sundaySchedule = { ...mockSchedule, day_of_week: 0 };

      psychologistRepository.findOneByOrFail.mockResolvedValue(mockPsychologist);
      scheduleRepository.create.mockReturnValue(sundaySchedule);
      scheduleRepository.save.mockResolvedValue(sundaySchedule);

      // Act
      const result = await service.create(sundayDto);

      // Assert
      expect(result.day_of_week).toBe(0);
      expect(scheduleRepository.create).toHaveBeenCalledWith({ ...sundayDto, psychologist: mockPsychologist });
    });

    it('should handle edge case with day_of_week 6 (Saturday)', async () => {
      // Arrange
      const saturdayDto = { ...createDto, day_of_week: 6 };
      const saturdaySchedule = { ...mockSchedule, day_of_week: 6 };

      psychologistRepository.findOneByOrFail.mockResolvedValue(mockPsychologist);
      scheduleRepository.create.mockReturnValue(saturdaySchedule);
      scheduleRepository.save.mockResolvedValue(saturdaySchedule);

      // Act
      const result = await service.create(saturdayDto);

      // Assert
      expect(result.day_of_week).toBe(6);
    });

    it('should handle different time ranges', async () => {
      // Arrange
      const eveningDto = { ...createDto, start_time: '18:00', end_time: '22:00' };
      const eveningSchedule = { ...mockSchedule, start_time: '18:00', end_time: '22:00' };

      psychologistRepository.findOneByOrFail.mockResolvedValue(mockPsychologist);
      scheduleRepository.create.mockReturnValue(eveningSchedule);
      scheduleRepository.save.mockResolvedValue(eveningSchedule);

      // Act
      const result = await service.create(eveningDto);

      // Assert
      expect(result.start_time).toBe('18:00');
      expect(result.end_time).toBe('22:00');
    });
  });

  describe('update', () => {
    const scheduleId = 1;
    const updateDto: UpdateScheduleDto = {
      start_time: '10:00',
      end_time: '18:00',
    };

    it('should update schedule successfully', async () => {
      // Arrange
      const updatedSchedule = { ...mockSchedule, ...updateDto };
      scheduleRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      scheduleRepository.findOne.mockResolvedValue(updatedSchedule);

      // Act
      const result = await service.update(scheduleId, updateDto);

      // Assert
      expect(result).toEqual(updatedSchedule);
      expect(scheduleRepository.update).toHaveBeenCalledWith(scheduleId, updateDto);
      expect(scheduleRepository.findOne).toHaveBeenCalledWith({
        where: { id: scheduleId },
        relations: ['psychologist'],
      });
    });

    it('should return null when schedule not found after update', async () => {
      // Arrange
      scheduleRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      scheduleRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.update(999, updateDto);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle partial updates', async () => {
      // Arrange
      const partialUpdate = { start_time: '08:00' };
      const partiallyUpdatedSchedule = { ...mockSchedule, start_time: '08:00' };

      scheduleRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      scheduleRepository.findOne.mockResolvedValue(partiallyUpdatedSchedule);

      // Act
      const result = await service.update(scheduleId, partialUpdate);

      // Assert
      expect(result?.start_time).toBe('08:00');
      expect(scheduleRepository.update).toHaveBeenCalledWith(scheduleId, partialUpdate);
    });

    it('should handle empty update object', async () => {
      // Arrange
      const emptyUpdate = {};
      scheduleRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      scheduleRepository.findOne.mockResolvedValue(mockSchedule);

      // Act
      const result = await service.update(scheduleId, emptyUpdate);

      // Assert
      expect(result).toEqual(mockSchedule);
      expect(scheduleRepository.update).toHaveBeenCalledWith(scheduleId, emptyUpdate);
    });
  });

  describe('remove', () => {
    it('should delete schedule successfully', async () => {
      // Arrange
      const scheduleId = 1;
      const deleteResult = { affected: 1, raw: {} };
      scheduleRepository.delete.mockResolvedValue(deleteResult);

      // Act
      const result = await service.remove(scheduleId);

      // Assert
      expect(result).toEqual(deleteResult);
      expect(scheduleRepository.delete).toHaveBeenCalledWith(scheduleId);
    });

    it('should handle deletion of non-existent schedule', async () => {
      // Arrange
      const deleteResult = { affected: 0, raw: {} };
      scheduleRepository.delete.mockResolvedValue(deleteResult);

      // Act
      const result = await service.remove(999);

      // Assert
      expect(result).toEqual(deleteResult);
    });

    it('should handle database errors during deletion', async () => {
      // Arrange
      scheduleRepository.delete.mockRejectedValue(new Error('Deletion failed'));

      // Act & Assert
      await expect(service.remove(1)).rejects.toThrow('Deletion failed');
    });
  });
});