import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CreateProfileDto } from '../../profile/dto/create-profile.dto.js';

export class CreateUserDto {
    @IsString({message:'firstName should be a string value'})
    @MinLength(3,{message:'firstName should be at least 3 characters long'})
    @IsNotEmpty()   
    @MaxLength(100)
    firstName: string

    @IsString({message:'lastName should be a string value'})
    @MinLength(3,{message:'lastName should be at least 3 characters long'})
    @IsNotEmpty()
    @MaxLength(100)
    lastName: string

    @IsEmail()
    @IsNotEmpty()
    @MaxLength(100)
    email: string
    
    @IsString()
    @MaxLength(100)
    gender: string
    
    @IsString()
    @IsNotEmpty()
    @MinLength(8,{message:'password should  be at least 8 characters'})
    @MaxLength(100)
    password:string
     
    @IsOptional()
    profile?:CreateProfileDto
}
