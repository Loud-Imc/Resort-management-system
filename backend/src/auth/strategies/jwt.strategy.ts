import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'secret',
        });
    }

    async validate(payload: any) {
        // Optimized: Uses lightweight lookup and returns null instead of throwing NotFoundException
        const user = await this.usersService.findByIdForAuth(payload.sub);

        if (!user || !user.isActive) {
            // Throw specific UnauthorizedException for auth failures (results in 401 instead of 404)
            throw new UnauthorizedException('Authentication invalid or user inactive');
        }

        return {
            id: user.id,
            email: user.email,
            propertyId: (user as any).propertyId,
            roles: user.roles.map(ur => ur.role.name),
            permissions: user.roles.flatMap(ur =>
                ur.role.permissions.map(rp => rp.permission.name)
            ),
            ownedProperties: user.ownedProperties || [],
            propertyStaff: user.propertyStaff || [],
        };
    }
}
