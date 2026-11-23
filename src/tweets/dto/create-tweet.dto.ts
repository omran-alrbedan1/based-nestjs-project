import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTweetDto {
    
    @IsString()
    @IsNotEmpty()
    text:string;

    @IsOptional()
    image?:string;

    @IsOptional()
    @IsArray()
    @IsInt({each:true})
    hashtag?:number[];
}
