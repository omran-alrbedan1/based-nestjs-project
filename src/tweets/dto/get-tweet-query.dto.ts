import { IsDate, IsOptional } from "class-validator"
import { PaginationQueryDto } from "../../common/pagination/dto/pagination-query.dto.js"
import { IntersectionType } from "@nestjs/mapped-types"

class GetTweetBaseDto {
    @IsDate()
    @IsOptional()
    startdate:Date
   
    @IsDate()
    @IsOptional()
    enddate:Date
}

export class GetTweetQueryDto extends IntersectionType(
    GetTweetBaseDto,PaginationQueryDto
){}