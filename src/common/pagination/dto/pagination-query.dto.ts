import { Type } from "class-transformer"
import { IsInt, IsOptional, IsPositive, Max } from "class-validator"


export class PaginationQueryDto {
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Max(100)
    @Type(()=>Number)
    limit?:number
    
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Type(()=>Number)
    page?:number
}