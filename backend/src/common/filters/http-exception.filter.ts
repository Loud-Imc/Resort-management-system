import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const message = exception instanceof HttpException
            ? exception.getResponse()
            : { message: exception.message || 'Internal server error', error: 'Internal Server Error', statusCode: 500 };

        const errorStack = exception instanceof Error ? exception.stack : '';

        this.logger.error(
            `\n--------------------------------------------------------------------------------\n` +
            `🛑 Status: ${status}\n` +
            `🛑 Path:   ${request.url}\n` +
            `🛑 Error:  ${JSON.stringify(message, null, 2)}\n` +
            (errorStack ? `🛑 Stack:  ${errorStack}\n` : '') +
            `--------------------------------------------------------------------------------`,
        );

        const responseMessage = typeof message === 'object' && (message as any).message
            ? (message as any).message
            : message;

        response
            .status(status)
            .json({
                statusCode: status,
                timestamp: new Date().toISOString(),
                path: request.url,
                message: responseMessage,
            });
    }
}
