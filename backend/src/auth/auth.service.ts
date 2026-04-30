import * as bcrypt from 'bcrypt';
import { FirebaseService } from './firebase.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordOtpDto } from './dto/reset-password-otp.dto';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { normalizePhone } from 'src/common/utils/phone';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private firebaseService: FirebaseService,
        private prisma: PrismaService,
        private mailService: MailService,
        private notificationsService: NotificationsService,
    ) { }

    async register(registerDto: RegisterDto) {
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        const user = await this.usersService.create({
            ...registerDto,
            password: hashedPassword,
        });

        const { password, ...result } = user;
        return result;
    }

    async login(loginDto: LoginDto) {
        const identifier = loginDto.email.trim();
        console.log(`[AuthService] Login attempt for identifier: ${identifier}`);

        let user: any = await this.usersService.findByEmail(identifier);
        if (user) {
            console.log(`[AuthService] User found by email: ${identifier}`);
        } else {
            const normalizedPhone = normalizePhone(identifier);
            console.log(`[AuthService] User NOT found by email. Trying phone normalization: ${normalizedPhone}`);
            if (normalizedPhone && normalizedPhone.length >= 10) {
                user = await this.usersService.findByPhone(normalizedPhone);
                if (user) {
                    console.log(`[AuthService] User found by phone: ${normalizedPhone}`);
                } else {
                    console.log(`[AuthService] User NOT found by phone: ${normalizedPhone}`);
                }
            }
        }

        if (!user) {
            console.warn(`[AuthService] Login failed: User not found for identifier: ${identifier}`);
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.password) {
            throw new UnauthorizedException('Please log in with OTP');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        console.log(`[AuthService] Password validation result for user ${user.id}: ${isPasswordValid}`);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isActive) {
            console.warn(`[AuthService] Login failed: User ${user.id} is inactive`);
            throw new UnauthorizedException('Account is inactive');
        }

        console.log(`[AuthService] Login successful for user: ${user.id}`);
        return this.generateTokens(user);
    }

    async loginWithPhone(idToken: string) {
        try {
            const decodedToken = await this.firebaseService.verifyToken(idToken);
            const phoneNumber = normalizePhone(decodedToken.phone_number);

            if (!phoneNumber) {
                throw new UnauthorizedException('Phone number not found in token');
            }

            let user: any = await this.usersService.findByPhone(phoneNumber);

            // If user doesn't exist, we might want to register them automatically or throw error
            // For now, let's assume registration is a separate step or handled here
            if (!user) {
                // For this implementation, let's auto-register if it's a new phone number.
                user = await this.usersService.createWithPhone(phoneNumber);
            }

            if (!user) {
                throw new UnauthorizedException('User could not be found or created');
            }

            if (!user.isActive) {
                throw new UnauthorizedException('Account is inactive');
            }

            return this.generateTokens(user as any);
        } catch (error) {
            console.error('Phone login error:', error);
            throw new UnauthorizedException('Invalid phone token');
        }
    }

    private getPriorityRole(roles: string[]): string {
        const priority = ['SuperAdmin', 'Admin', 'PropertyOwner', 'ChannelPartner', 'Customer', 'Staff'];
        for (const roleName of priority) {
            if (roles.includes(roleName)) return roleName;
        }
        return roles[0] || 'Staff';
    }

    private generateTokens(user: any) {
        // Collect roles from both global UserRole and property-specific PropertyStaff
        const globalRoles = user.roles.map(ur => ur.role.name);
        const staffRoles = (user.propertyStaff || []).map(ps => ps.role.name);
        const roleNames = Array.from(new Set([...globalRoles, ...staffRoles]));

        const primaryRole = this.getPriorityRole(roleNames);

        const payload = {
            sub: user.id,
            email: user.email,
            roles: roleNames,
        };

        // Collect permissions from both global and staff roles
        const globalPermissions = user.roles.flatMap(ur => ur.role.permissions.map(rp => rp.permission.name));
        const staffPermissions = (user.propertyStaff || []).flatMap(ps => ps.role.permissions.map(rp => rp.permission.name));
        const permissions = Array.from(new Set([...globalPermissions, ...staffPermissions]));

        return {
            accessToken: this.jwtService.sign({ ...payload, permissions }),
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                role: primaryRole,
                roles: roleNames,
                permissions: permissions,
                commissionPercentage: Number(user.commissionPercentage),
            },
        };
    }

    async validateUser(userId: string) {
        return this.usersService.findOne(userId);
    }

    async requestPasswordReset(dto: RequestOtpDto) {
        const identifier = dto.identifier.trim();
        let user = await this.usersService.findByEmail(identifier);
        let normalizedPhone = '';

        if (!user) {
            normalizedPhone = normalizePhone(identifier);
            if (normalizedPhone) {
                user = await this.usersService.findByPhone(normalizedPhone);
            }
        }

        if (!user) {
            // To prevent user enumeration, we return success even if user not found
            // but in a controlled environment like this, we might want to be explicit
            throw new NotFoundException('No account found with this email or phone number');
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Clear any existing reset OTPs for this identifier
        await (this.prisma as any).oneTimePassword.deleteMany({
            where: {
                OR: [
                    { email: user.email },
                    { phone: user.phone }
                ],
                type: 'PASSWORD_RESET'
            }
        });

        // Save new OTP
        await (this.prisma as any).oneTimePassword.create({
            data: {
                email: user.email,
                phone: user.phone,
                code,
                type: 'PASSWORD_RESET',
                expiresAt
            }
        });

        // Send OTP via Email
        if (user.email) {
            await this.mailService.sendPasswordResetOtp(user.email, code);
        }

        // Send OTP via SMS
        if (user.phone) {
            const message = `Your password reset verification code for Route Guide is ${code}. It expires in 10 minutes.`;
            await this.notificationsService.sendSMS(user.phone, message, { otp: code });
        }

        return {
            message: 'Verification code sent to your registered email and phone number',
            identifier: user.email || user.phone
        };
    }

    async verifyOtp(dto: VerifyOtpDto) {
        const identifier = dto.identifier.trim();
        const normalizedPhone = normalizePhone(identifier);

        const otp = await (this.prisma as any).oneTimePassword.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { phone: normalizedPhone || identifier }
                ],
                code: dto.code,
                type: 'PASSWORD_RESET',
                expiresAt: { gte: new Date() }
            }
        });

        if (!otp) {
            throw new BadRequestException('Invalid or expired verification code');
        }

        return { success: true, message: 'OTP verified successfully' };
    }

    async resetPasswordWithOtp(dto: ResetPasswordOtpDto) {
        const identifier = dto.identifier.trim();
        const normalizedPhone = normalizePhone(identifier);

        const otp = await (this.prisma as any).oneTimePassword.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { phone: normalizedPhone || identifier }
                ],
                code: dto.code,
                type: 'PASSWORD_RESET',
                expiresAt: { gte: new Date() }
            }
        });

        if (!otp) {
            throw new BadRequestException('Invalid or expired verification code');
        }

        let user = await this.usersService.findByEmail(otp.email || identifier);
        if (!user && otp.phone) {
            user = await this.usersService.findByPhone(otp.phone);
        }

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        // Delete OTP after successful reset
        await (this.prisma as any).oneTimePassword.delete({
            where: { id: otp.id }
        });

        return { success: true, message: 'Password has been reset successfully' };
    }
}
