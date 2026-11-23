import { Injectable } from '@nestjs/common';
import { HashingProvider } from './hashing.provider.js';
import bcrypt from 'bcrypt';

@Injectable()
export class BcryptProvider implements HashingProvider {
    private readonly saltRounds = 10;

    public async hashPassword(password: string | Buffer): Promise<string> {
        const salt = await bcrypt.genSalt(this.saltRounds);
        return bcrypt.hash(password, salt);
    }

    public async comparePassword(plainPassword: string | Buffer, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
}
