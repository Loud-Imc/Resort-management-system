import { PartialType } from '@nestjs/swagger';
import { CreateOfflineCpDto } from './create-offline-cp.dto';

export class UpdateOfflineCpDto extends PartialType(CreateOfflineCpDto) {}
