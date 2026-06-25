import { createContext} from 'react';
import type { Auth } from '../types/auth';


export const AuthContext = createContext<Auth | undefined>(undefined);



