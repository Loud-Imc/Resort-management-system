import { PartialType } from '@nestjs/swagger';
import { CreateBookingSourceDto } from './create-booking-source.dto';

export class UpdateBookingSourceDto extends PartialType(CreateBookingSourceDto) { }
