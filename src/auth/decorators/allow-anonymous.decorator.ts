import { SetMetadata } from '@nestjs/common';
import { ALLOW_ANONYMOUS_KEY } from '../constants/auth.constants.js';

export const AllowAnonymous = () => {
    return(target:any, propertyKey:string , propertyDescription:PropertyDescriptor)=>{
        console.log('')
    }
};
