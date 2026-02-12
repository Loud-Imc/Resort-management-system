import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        this.logger.error(
            `\n--------------------------------------------------------------------------------\n` +
            `🛑 Status: ${status}\n` +
            `🛑 Path:   ${request.url}\n` +
            `🛑 Error:  ${JSON.stringify(exceptionResponse, null, 2)}\n` +
            `--------------------------------------------------------------------------------`,
        );

        const message = typeof exceptionResponse === 'object' && (exceptionResponse as any).message
            ? (exceptionResponse as any).message
            : exceptionResponse;

        response
            .status(status)
            .json({
                statusCode: status,
                timestamp: new Date().toISOString(),
                path: request.url,
                message: message,
            });
    }
}
