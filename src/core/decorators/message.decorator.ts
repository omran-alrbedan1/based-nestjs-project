import { SetMetadata } from '@nestjs/common';

export const MESSAGE_KEY = 'response:message';

export function Message(message: string): MethodDecorator {
  return SetMetadata(MESSAGE_KEY, message);
}
