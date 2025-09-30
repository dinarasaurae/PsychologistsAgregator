import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../enums/appointmentStatus.enum';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  clientId: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  psychologistId: number;

  @ApiProperty()
  @IsDateString()
  start_time: Date;

  @ApiProperty()
  @IsDateString()
  end_time: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
