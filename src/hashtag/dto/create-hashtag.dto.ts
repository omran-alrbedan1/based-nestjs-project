import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateHashtagDto {

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name:string;
}
