import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { User } from '../../users/entities/user.entity.js';

@Entity()
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 100,
  })
  firstName?: string;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 100,
  })
  lastName?: string;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 100,
  })
  gender?: string;

  @Column({
    type: 'date',
    nullable: true,
  })
  dateOfBirth?: Date;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  bio?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  profileImage?: string;

  @OneToOne('User', (user: User) => user.profile,{onDelete:'CASCADE'})
  @JoinColumn()
  user: User;
}
