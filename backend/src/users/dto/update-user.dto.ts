import { PartialType } from '@nestjs/swagger';
import { CreateUserWithRoleDto } from './create-user-with-role.dto';

export class UpdateUserDto extends PartialType(CreateUserWithRoleDto) { }
