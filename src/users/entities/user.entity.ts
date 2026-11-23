import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { Profile } from '../../profile/entities/profile.entity.js';
import { Tweet } from '../../tweets/entities/tweet.entity.js';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 100,
  })
  firstName: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 100,
  })
  lastName: string;

  @Column({
    unique: true,
    type: 'varchar',
    nullable: false,
    length: 100,
  })
  email: string;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 100,
  })
  gender: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 100,
  })
  password: string;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 255,
  })
  refreshToken?: string | null;

  @OneToOne('Profile', (profile: Profile) => profile.user, { cascade: true ,eager:true })
  profile?: Profile;

  @OneToMany('Tweet', (tweet: Tweet) => tweet.user)
  tweets?: Tweet[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
