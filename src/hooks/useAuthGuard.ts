// hooks/useAuthGuard.ts
import { useEffect, useState } from 'react';

export const useAuthGuard = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuthReady = async () => {
      // Check if we have a recent login
      const loginTime = localStorage.getItem('loginTime');
      const now = Date.now();
      
      if (loginTime && (now - parseInt(loginTime)) < 5000) {
        // Recently logged in, wait for cookies
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setIsReady(true);
    };
    
    checkAuthReady();
  }, []);

  return isReady;
};