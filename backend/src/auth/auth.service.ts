import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

import { FirebaseService } from './firebase.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private firebaseService: FirebaseService,
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
        const user = await this.usersService.findByEmail(loginDto.email);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account is inactive');
        }

        return this.generateTokens(user);
    }

    async loginWithPhone(idToken: string) {
        try {
            const decodedToken = await this.firebaseService.verifyToken(idToken);
            const phoneNumber = decodedToken.phone_number;

            if (!phoneNumber) {
                throw new UnauthorizedException('Phone number not found in token');
            }

            let user = await this.usersService.findByPhone(phoneNumber);

            // If user doesn't exist, we might want to register them automatically or throw error
            // For now, let's assume registration is a separate step or handled here
            if (!user) {
                // Check if user exists by email as fallback? Probably not.
                // Let's create a new user or throw if registration required.
                // For this implementation, let's auto-register if it's a new phone number.
                user = await this.usersService.createWithPhone(phoneNumber);
            }

            if (!user.isActive) {
                throw new UnauthorizedException('Account is inactive');
            }

            return this.generateTokens(user);
        } catch (error) {
            console.error('Phone login error:', error);
            throw new UnauthorizedException('Invalid phone token');
        }
    }

    private generateTokens(user: any) {
        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.roles.map(ur => ur.role.name),
        };

        const permissions = Array.from(new Set(
            user.roles.flatMap(ur => ur.role.permissions.map(rp => rp.permission.name))
        ));

        return {
            accessToken: this.jwtService.sign({ ...payload, permissions }),
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                role: user.roles[0]?.role.name || 'Staff',
                roles: user.roles.map(ur => ur.role.name),
                permissions: permissions,
                commissionPercentage: Number(user.commissionPercentage),
            },
        };
    }

    async validateUser(userId: string) {
        return this.usersService.findOne(userId);
    }
}
