import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditInterceptor.name);

    constructor(private readonly auditService: AuditService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, user, body, ip } = request;
        const userAgent = request.get('user-agent');

        // Only log mutations (POST, PATCH, PUT, DELETE) by Admin users
        const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
        const isAdmin = user?.roles?.some(role => ['SuperAdmin', 'Admin'].includes(role));

        if (isMutation && isAdmin) {
            return next.handle().pipe(
                tap(async () => {
                    try {
                        // Extract entity and entityId from URL
                        const urlParts = url.split('?')[0].split('/').filter(p => !!p);
                        let entity = 'system';
                        let entityId = 'bulk';

                        if (urlParts.length >= 1) {
                            const lastPart = urlParts[urlParts.length - 1];
                            const isAction = ['approve', 'status', 'toggle-active', 'reconcile'].includes(lastPart);

                            if (isAction && urlParts.length >= 2) {
                                entityId = urlParts[urlParts.length - 2];
                                entity = urlParts[urlParts.length - 3] || urlParts[0];
                            } else {
                                entityId = lastPart;
                                entity = urlParts[urlParts.length - 2] || urlParts[0];
                            }
                        }

                        await this.auditService.createLog({
                            action: `${method} ${url}`,
                            entity,
                            entityId,
                            userId: user.id,
                            newValue: body,
                            ipAddress: ip,
                            userAgent,
                        });
                    } catch (error) {
                        this.logger.error(`Failed to log audit: ${error.message}`);
                    }
                }),
            );
        }

        return next.handle();
    }
}
