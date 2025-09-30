import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentService } from './appointment.service';
import { Appointment } from '../models/appointment.entity';
import { User } from '../models/user.entity';
import { Psychologist } from '../models/psychologist.entity';
import { CreateAppointmentDto } from '../dto/createAppointment.dto';
import { AppointmentStatus } from '../enums/appointmentStatus.enum';
import { Role } from '../enums/userRoles.enum';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let appointmentRepository: jest.Mocked<Repository<Appointment>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let psychologistRepository: jest.Mocked<Repository<Psychologist>>;

  const mockUser = {
    id: 1,
    email: 'client@example.com',
    password_hash: 'hashedpassword',
    full_name: 'Client User',
    phone: '+1234567890',
    role: Role.User,
    created_at: new Date(),
  } as User;

  const mockPsychologist = {
    id: 1,
    user: mockUser,
    experience: 5,
    rating: 4.5,
    bio: 'Experienced psychologist',
    price_per_hour: 100,
    specializations: [],
  } as Psychologist;

  const mockAppointment = {
    id: 1,
    client: mockUser,
    psychologist: mockPsychologist,
    start_time: new Date('2024-01-01T10:00:00Z'),
    end_time: new Date('2024-01-01T11:00:00Z'),
    price: 100,
    status: AppointmentStatus.Pending,
  } as Appointment;

  beforeEach(async () => {
    const mockAppointmentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockUserRepo = {
      findOneByOrFail: jest.fn(),
    };

    const mockPsychologistRepo = {
      findOneByOrFail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: mockAppointmentRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(Psychologist),
          useValue: mockPsychologistRepo,
        },
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
    appointmentRepository = module.get(getRepositoryToken(Appointment));
    userRepository = module.get(getRepositoryToken(User));
    psychologistRepository = module.get(getRepositoryToken(Psychologist));
  });

  describe('create', () => {
    const createDto: CreateAppointmentDto = {
      clientId: 1,
      psychologistId: 1,
      start_time: new Date('2024-01-01T10:00:00Z'),
      end_time: '2024-01-01T11:00:00Z',
      price: 100,
      status: AppointmentStatus.Pending,
    };

    it('should create appointment successfully', async () => {
      // Arrange
      userRepository.findOneByOrFail.mockResolvedValue(mockUser);
      psychologistRepository.findOneByOrFail.mockResolvedValue(mockPsychologist);
      appointmentRepository.create.mockReturnValue(mockAppointment);
      appointmentRepository.save.mockResolvedValue(mockAppointment);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockAppointment);
      expect(userRepository.findOneByOrFail).toHaveBeenCalledWith({ id: createDto.clientId });
      expect(psychologistRepository.findOneByOrFail).toHaveBeenCalledWith({ id: createDto.psychologistId });
      expect(appointmentRepository.create).toHaveBeenCalledWith({
        client: mockUser,
        psychologist: mockPsychologist,
        start_time: createDto.start_time,
        end_time: createDto.end_time,
        price: createDto.price,
        status: createDto.status,
      });
      expect(appointmentRepository.save).toHaveBeenCalledWith(mockAppointment);
    });

    it('should use default status when not provided', async () => {
      // Arrange
      const dtoWithoutStatus = { ...createDto };
      delete dtoWithoutStatus.status;

      userRepository.findOneByOrFail.mockResolvedValue(mockUser);
      psychologistRepository.findOneByOrFail.mockResolvedValue(mockPsychologist);
      appointmentRepository.create.mockReturnValue(mockAppointment);
      appointmentRepository.save.mockResolvedValue(mockAppointment);

      // Act
      await service.create(dtoWithoutStatus);

      // Assert
      expect(appointmentRepository.create).toHaveBeenCalledWith({
        client: mockUser,
        psychologist: mockPsychologist,
        start_time: dtoWithoutStatus.start_time,
        end_time: dtoWithoutStatus.end_time,
        price: dtoWithoutStatus.price,
        status: 'pending',
      });
    });

    it('should throw error when client not found', async () => {
      // Arrange
      userRepository.findOneByOrFail.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow('User not found');
      expect(userRepository.findOneByOrFail).toHaveBeenCalledWith({ id: createDto.clientId });
      expect(psychologistRepository.findOneByOrFail).not.toHaveBeenCalled();
    });

    it('should throw error when psychologist not found', async () => {
      // Arrange
      userRepository.findOneByOrFail.mockResolvedValue(mockUser);
      psychologistRepository.findOneByOrFail.mockRejectedValue(new Error('Psychologist not found'));

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow('Psychologist not found');
      expect(psychologistRepository.findOneByOrFail).toHaveBeenCalledWith({ id: createDto.psychologistId });
    });
  });

  describe('findAll', () => {
    it('should return all appointments with relations', async () => {
      // Arrange
      const expectedAppointments = [mockAppointment];
      appointmentRepository.find.mockResolvedValue(expectedAppointments);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(expectedAppointments);
      expect(appointmentRepository.find).toHaveBeenCalledWith({
        relations: { client: true, psychologist: true },
      });
    });
  });

  describe('findOne', () => {
    it('should return appointment by id with relations', async () => {
      // Arrange
      const appointmentId = 1;
      appointmentRepository.findOne.mockResolvedValue(mockAppointment);

      // Act
      const result = await service.findOne(appointmentId);

      // Assert
      expect(result).toEqual(mockAppointment);
      expect(appointmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: appointmentId },
        relations: { client: true, psychologist: true },
      });
    });
  });

  describe('update', () => {
    it('should update appointment and return updated appointment', async () => {
      // Arrange
      const appointmentId = 1;
      const updateDto = { status: AppointmentStatus.Confirmed };
      const updatedAppointment = { ...mockAppointment, status: AppointmentStatus.Confirmed };

      appointmentRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      appointmentRepository.findOne.mockResolvedValue(updatedAppointment);

      // Act
      const result = await service.update(appointmentId, updateDto);

      // Assert
      expect(result).toEqual(updatedAppointment);
      expect(appointmentRepository.update).toHaveBeenCalledWith(appointmentId, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete appointment by id', async () => {
      // Arrange
      const appointmentId = 1;
      const deleteResult = { affected: 1, raw: {} };
      appointmentRepository.delete.mockResolvedValue(deleteResult);

      // Act
      const result = await service.remove(appointmentId);

      // Assert
      expect(result).toEqual(deleteResult);
      expect(appointmentRepository.delete).toHaveBeenCalledWith(appointmentId);
    });
  });
});