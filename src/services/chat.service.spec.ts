import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatService } from './chat.service';
import { Chat } from '../models/chat.entity';
import { User } from '../models/user.entity';
import { CreateChatDto } from '../dto/createChat.dto';
import { Role } from '../enums/userRoles.enum';

describe('ChatService', () => {
  let service: ChatService;
  let chatRepository: jest.Mocked<Repository<Chat>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser1 = {
    id: 1,
    email: 'user1@example.com',
    password_hash: 'hashedpassword',
    full_name: 'User One',
    role: Role.User,
    created_at: new Date(),
  } as User;

  const mockUser2 = {
    id: 2,
    email: 'user2@example.com',
    password_hash: 'hashedpassword',
    full_name: 'User Two',
    role: Role.User,
    created_at: new Date(),
  } as User;

  const mockChat = {
    id: 1,
    sender: mockUser1,
    receiver: mockUser2,
    created_at: new Date(),
  } as Chat;

  beforeEach(async () => {
    const mockChatRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const mockUserRepo = {
      findOneByOrFail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(Chat),
          useValue: mockChatRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    chatRepository = module.get(getRepositoryToken(Chat));
    userRepository = module.get(getRepositoryToken(User));
  });

  describe('create', () => {
    const createDto: CreateChatDto = {
      senderId: 1,
      receiverId: 2,
    };

    it('should create chat successfully', async () => {
      // Arrange
      userRepository.findOneByOrFail
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      chatRepository.create.mockReturnValue(mockChat);
      chatRepository.save.mockResolvedValue(mockChat);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockChat);
      expect(userRepository.findOneByOrFail).toHaveBeenCalledTimes(2);
      expect(userRepository.findOneByOrFail).toHaveBeenNthCalledWith(1, { id: createDto.senderId });
      expect(userRepository.findOneByOrFail).toHaveBeenNthCalledWith(2, { id: createDto.receiverId });
      expect(chatRepository.create).toHaveBeenCalledWith({ sender: mockUser1, receiver: mockUser2 });
      expect(chatRepository.save).toHaveBeenCalledWith(mockChat);
    });

    it('should throw error when sender not found', async () => {
      // Arrange
      userRepository.findOneByOrFail.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow('User not found');
      expect(userRepository.findOneByOrFail).toHaveBeenCalledWith({ id: createDto.senderId });
    });

    it('should throw error when receiver not found', async () => {
      // Arrange
      userRepository.findOneByOrFail
        .mockResolvedValueOnce(mockUser1)
        .mockRejectedValueOnce(new Error('User not found'));

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow('User not found');
      expect(userRepository.findOneByOrFail).toHaveBeenCalledWith({ id: createDto.receiverId });
    });

    it('should handle same user as sender and receiver', async () => {
      // Arrange
      const sameSenderReceiver = { senderId: 1, receiverId: 1 };
      userRepository.findOneByOrFail.mockResolvedValue(mockUser1);
      const chatWithSameUser = { ...mockChat, sender: mockUser1, receiver: mockUser1 };
      chatRepository.create.mockReturnValue(chatWithSameUser);
      chatRepository.save.mockResolvedValue(chatWithSameUser);

      // Act
      const result = await service.create(sameSenderReceiver);

      // Assert
      expect(result.sender).toEqual(mockUser1);
      expect(result.receiver).toEqual(mockUser1);
    });
  });

  describe('findAll', () => {
    it('should return all chats with relations', async () => {
      // Arrange
      const expectedChats = [mockChat];
      chatRepository.find.mockResolvedValue(expectedChats);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(expectedChats);
      expect(chatRepository.find).toHaveBeenCalledWith({ relations: ['sender', 'receiver'] });
    });

    it('should return empty array when no chats found', async () => {
      // Arrange
      chatRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      // Arrange
      chatRepository.find.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.findAll()).rejects.toThrow('Database connection failed');
    });
  });

  describe('findOne', () => {
    const chatId = 1;

    it('should return chat by id with relations', async () => {
      // Arrange
      chatRepository.findOne.mockResolvedValue(mockChat);

      // Act
      const result = await service.findOne(chatId);

      // Assert
      expect(result).toEqual(mockChat);
      expect(chatRepository.findOne).toHaveBeenCalledWith({
        where: { id: chatId },
        relations: ['sender', 'receiver'],
      });
    });

    it('should return null when chat not found', async () => {
      // Arrange
      chatRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findOne(999);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle zero id', async () => {
      // Arrange
      chatRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findOne(0);

      // Assert
      expect(result).toBeNull();
      expect(chatRepository.findOne).toHaveBeenCalledWith({
        where: { id: 0 },
        relations: ['sender', 'receiver'],
      });
    });
  });

  describe('remove', () => {
    it('should delete chat successfully', async () => {
      // Arrange
      const chatId = 1;
      const deleteResult = { affected: 1, raw: {} };
      chatRepository.delete.mockResolvedValue(deleteResult);

      // Act
      const result = await service.remove(chatId);

      // Assert
      expect(result).toEqual(deleteResult);
      expect(chatRepository.delete).toHaveBeenCalledWith(chatId);
    });

    it('should handle deletion of non-existent chat', async () => {
      // Arrange
      const deleteResult = { affected: 0, raw: {} };
      chatRepository.delete.mockResolvedValue(deleteResult);

      // Act
      const result = await service.remove(999);

      // Assert
      expect(result).toEqual(deleteResult);
    });

    it('should handle database errors during deletion', async () => {
      // Arrange
      chatRepository.delete.mockRejectedValue(new Error('Deletion failed'));

      // Act & Assert
      await expect(service.remove(1)).rejects.toThrow('Deletion failed');
    });
  });
});