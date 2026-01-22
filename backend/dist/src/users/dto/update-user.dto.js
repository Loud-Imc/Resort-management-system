"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_user_with_role_dto_1 = require("./create-user-with-role.dto");
class UpdateUserDto extends (0, swagger_1.PartialType)(create_user_with_role_dto_1.CreateUserWithRoleDto) {
}
exports.UpdateUserDto = UpdateUserDto;
//# sourceMappingURL=update-user.dto.js.map