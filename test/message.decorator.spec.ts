import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { lastValueFrom, of, throwError } from 'rxjs';
import { expect, it } from 'vitest';
import { Message } from '../src/core/decorators/message.decorator.js';
import { MessageInterceptor } from '../src/core/interceptors/message.interceptor.js';

class ExampleController {
  @Message('Saved')
  save() {}
  list() {}
}

const interceptor = new MessageInterceptor(new Reflector());
const context = new ExecutionContextHost([], ExampleController, ExampleController.prototype.save);

it('adds a default message to undecorated routes', async () => {
  const listContext = new ExecutionContextHost([], ExampleController, ExampleController.prototype.list);
  const page = { data: [], meta: {}, links: {} };
  const response = interceptor.intercept(listContext, { handle: () => of(page) });
  await expect(lastValueFrom(response)).resolves.toEqual({ message: 'common.request_success', data: page });
});

it('adds the configured message and preserves the handler result', async () => {
  const data = { id: 1 };
  const response = await interceptor.intercept(context, { handle: () => of(data) });
  await expect(lastValueFrom(response)).resolves.toEqual({ message: 'Saved', data });
});

it('propagates the original exception without a success message', async () => {
  const error = new NotFoundException();
  const response = await interceptor.intercept(context, { handle: () => throwError(() => error) });
  await expect(lastValueFrom(response)).rejects.toBe(error);
});
