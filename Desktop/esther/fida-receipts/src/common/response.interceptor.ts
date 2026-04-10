import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  message: string;
  data: T;
}

// Controllers may return either a bare payload or { message, data }.
// When they return { message, data } we pass it through; otherwise we wrap
// with a default message so every response matches the house format.
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'message' in (payload as object) &&
          'data' in (payload as object)
        ) {
          return payload as ApiResponse<T>;
        }
        return { message: 'ok', data: payload as T };
      }),
    );
  }
}
