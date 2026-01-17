"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBookingSourceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_booking_source_dto_1 = require("./create-booking-source.dto");
class UpdateBookingSourceDto extends (0, swagger_1.PartialType)(create_booking_source_dto_1.CreateBookingSourceDto) {
}
exports.UpdateBookingSourceDto = UpdateBookingSourceDto;
//# sourceMappingURL=update-booking-source.dto.js.map