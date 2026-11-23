import { Type } from 'class-transformer';
import { IsBoolean, IsDate, isDate, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProfileDto {
    @IsString({ message: 'firstName should be a string value' })
    @MinLength(3, { message: 'firstName should be at least 3 characters long' })
    @IsOptional()
    @MaxLength(100)
    firstName?: string

    @IsString({ message: 'lastName should be a string value' })
    @MinLength(3, { message: 'lastName should be at least 3 characters long' })
    @MaxLength(100)
    @IsOptional()

    lastName?: string

    @IsString()
    @MaxLength(100)
    @IsOptional()
    gender?: string

    @Type(() => Date)
    @IsDate()
    @IsOptional()
    dateOfBirth?: Date

    @IsString()
    @IsOptional()
    bio?: string;

    @IsString()
    @IsOptional()
    profileImage?: string;

}
