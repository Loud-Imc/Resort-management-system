import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { ALL_SYSTEM_PERMISSIONS_LIST, PROPERTY_PERMISSIONS_LIST } from '../constants/permissions.constant';

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

        const globalRoles = user.roles.map(ur => ur.role.name);
        const staffRoles = user.propertyStaff.map(ps => ps.role.name);
        const roles = Array.from(new Set([...globalRoles, ...staffRoles]));

        let permissions: string[] = [];
        if (roles.includes('SuperAdmin')) {
            permissions = [...ALL_SYSTEM_PERMISSIONS_LIST];
        } else if (roles.includes('PropertyOwner')) {
            permissions = [...PROPERTY_PERMISSIONS_LIST];
        } else {
            const globalPermissions = user.roles.flatMap(ur =>
                ur.role.permissions.map(rp => rp.permission.name)
            );
            const staffPermissions = user.propertyStaff.flatMap(ps =>
                ps.role.permissions.map(rp => rp.permission.name)
            );
            permissions = Array.from(new Set([...globalPermissions, ...staffPermissions]));
        }

        return {
            id: user.id,
            email: user.email,
            propertyId: (user as any).propertyId,
            roles,
            permissions,
            ownedProperties: user.ownedProperties || [],
            propertyStaff: user.propertyStaff || [],
        };
    }
}

