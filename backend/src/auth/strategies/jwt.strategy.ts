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
        const user = await this.usersService.findOne(payload.sub);

        if (!user || !user.isActive) {
            throw new UnauthorizedException();
        }

        return {
            id: user.id,
            email: user.email,
            roles: user.roles.map(ur => ur.role.name),
            permissions: user.roles.flatMap(ur =>
                ur.role.permissions.map(rp => rp.permission.name)
            ),
        };
    }
}
