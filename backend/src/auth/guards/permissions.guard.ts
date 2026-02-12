import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class PermissionsGuard implements CanActivate {
    private readonly logger = new Logger(PermissionsGuard.name);

    constructor(private reflector: Reflector) { }

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if (!user || !user.permissions) {
            this.logger.warn(`User missing or has no permissions property. User: ${JSON.stringify(user)}`);
            return false;
        }

        const hasPermission = requiredPermissions.every((permission) =>
            user.permissions?.includes(permission)
        );

        if (!hasPermission) {
            const missing = requiredPermissions.filter(p => !user.permissions.includes(p));
            this.logger.warn(
                `\n🚫 ---------------- ACCESS DENIED ---------------- 🚫\n` +
                `👤 User:      ${user.email}\n` +
                `🎭 Roles:     ${user.roles}\n` +
                `🔐 Required:  ${JSON.stringify(requiredPermissions)}\n` +
                `❌ Missing:   ${JSON.stringify(missing)}\n` +
                `---------------------------------------------------`
            );
        }

        return hasPermission;
    }
}
