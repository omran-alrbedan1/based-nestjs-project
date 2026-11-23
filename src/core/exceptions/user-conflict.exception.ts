import { HttpException, HttpStatus } from "@nestjs/common";

export class UserConflictException extends HttpException {
    constructor(message: string = 'User conflicts with an existing record') {
        super(message, HttpStatus.CONFLICT)
    }
}
