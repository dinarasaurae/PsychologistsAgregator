import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      // Arrange
      const dto = new RegisterDto();
      dto.email = 'test@example.com';
      dto.full_name = 'Test User';
      dto.password = 'password123';
      dto.phone = '+1234567890';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should pass validation without optional phone field', async () => {
      // Arrange
      const dto = new RegisterDto();
      dto.email = 'test@example.com';
      dto.full_name = 'Test User';
      dto.password = 'password123';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid email', async () => {
      // Arrange
      const dto = new RegisterDto();
      dto.email = 'invalid-email';
      dto.full_name = 'Test User';
      dto.password = 'password123';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail validation with missing email', async () => {
      // Arrange
      const dto = new RegisterDto();
      dto.full_name = 'Test User';
      dto.password = 'password123';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail validation with missing full_name', async () => {
      // Arrange
      const dto = new RegisterDto();
      dto.email = 'test@example.com';
      dto.password = 'password123';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('full_name');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation with short password', async () => {
      // Arrange
      const dto = new RegisterDto();
      dto.email = 'test@example.com';
      dto.full_name = 'Test User';
      dto.password = '123'; 
      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints).toHaveProperty('minLength');
    });

    it('should fail validation with missing password', async () => {
      // Arrange
      const dto = new RegisterDto();
      dto.email = 'test@example.com';
      dto.full_name = 'Test User';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints).toHaveProperty('minLength');
    });

    it('should fail validation with non-string phone', async () => {
      // Arrange
      const dto = new RegisterDto();
      dto.email = 'test@example.com';
      dto.full_name = 'Test User';
      dto.password = 'password123';
      (dto as any).phone = 123456789;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('phone');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation with multiple invalid fields', async () => {
      // Arrange
      const dto = new RegisterDto();
      dto.email = 'invalid-email';
      dto.password = '123';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThanOrEqual(2);
      const properties = errors.map(error => error.property);
      expect(properties).toContain('email');
      expect(properties).toContain('password');
      expect(properties).toContain('full_name');
    });

    it('should pass validation with minimum valid password length', async () => {
      // Arrange
      const dto = new RegisterDto();
      dto.email = 'test@example.com';
      dto.full_name = 'Test User';
      dto.password = '123456'; 

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });
  });
});