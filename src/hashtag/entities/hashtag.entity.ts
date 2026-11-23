import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { Tweet } from "../../tweets/entities/tweet.entity.js";

@Entity()
export class Hashtag {
    @PrimaryGeneratedColumn()
    id:number;

    @Column({
        type:'varchar',
        nullable:false,
        unique:true,
        length:100
    })
    name:string;

    @ManyToMany('Tweet',(tweet:Tweet)=>tweet.hashtags,{onDelete:'CASCADE'})
    tweets?:Tweet[];

    @CreateDateColumn()
    createdAt:Date;

    @UpdateDateColumn()
    updatedAt:Date;

    @DeleteDateColumn()
    deletedAt:Date;
}
