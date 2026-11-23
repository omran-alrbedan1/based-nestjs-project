import { Injectable, PipeTransform } from '@nestjs/common';

/**
 * Trims whitespace on all string fields of an object argument.
 * Apply per-route (@Body(TrimPipe)) — do NOT register globally:
 * passwords and other secrets can legitimately contain spaces.
 */
@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: unknown) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const body = value as Record<string, unknown>;
      for (const key of Object.keys(body)) {
        if (typeof body[key] === 'string') {
          body[key] = (body[key] as string).trim();
        }
      }
    }
    return value;
  }
}
