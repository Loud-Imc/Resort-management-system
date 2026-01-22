import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
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

        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.roles.map(ur => ur.role.name),
        };

        // Flatten permissions from all roles
        const permissions = Array.from(new Set(
            user.roles.flatMap(ur => ur.role.permissions.map(rp => rp.permission.name))
        ));

        return {
            accessToken: this.jwtService.sign({ ...payload, permissions }), // Also include in token if needed, or just return in body
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
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
