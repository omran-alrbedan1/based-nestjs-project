import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "../../users/entities/user.entity.js";
import type { Hashtag } from "../../hashtag/entities/hashtag.entity.js";

    @Entity()
export class Tweet {
    @PrimaryGeneratedColumn()
    id:number;

    @Column({
        type:'text',
        nullable:false
    })
    text:string;
    @Column({
        type:'text',
        nullable:true
    })
    image:string;

    @ManyToOne('User',(user:User)=>user.tweets,{onDelete:'CASCADE',eager:true})
    user:User;

    @ManyToMany('Hashtag',(hashtag:Hashtag)=>hashtag.tweets,{cascade:true,eager:true})
    @JoinTable()
    hashtags?:Hashtag[];

    @CreateDateColumn()
    createdAt:Date;

    @UpdateDateColumn()
    updatedAt:Date;
}
