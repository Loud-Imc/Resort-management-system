import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl, body } = req;
        const userAgent = req.get('user-agent') || '';
        const start = Date.now();

        const silentUrls = [
            '/unread-count',
            '/adjustments',
            '/requests',
            '/redemptions',
            '/promotions',
            '/settlements',
            '/channel-partners?page='
        ];
        const isSilent = silentUrls.some(url => originalUrl.includes(url));

        res.on('finish', () => {
            if (isSilent) return;
            const { statusCode } = res;
            const contentLength = res.get('content-length');
            const duration = Date.now() - start;

            this.logger.log(
                `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} +${duration}ms`,
            );
        });

        next();
    }
}
