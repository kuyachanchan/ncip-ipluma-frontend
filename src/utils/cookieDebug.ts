// utils/cookieDebug.ts
export const debugCookieTransmission = async () => {
  console.log('🍪 ===== COOKIE DEBUG =====');
  
  // 1. Check browser cookie support
  console.log('1. Browser cookie enabled:', navigator.cookieEnabled);
  
  // 2. List all cookies
  console.log('2. Document cookies:', document.cookie);
  
  // 3. Test cookie set/get
  try {
    // Set a test cookie
    document.cookie = "test_cookie=hello_world; path=/; samesite=lax";
    console.log('3. Test cookie set');
    
    // Check if test cookie exists
    const hasTestCookie = document.cookie.includes('test_cookie');
    console.log('4. Test cookie found:', hasTestCookie);
  } catch (e) {
    console.error('Cookie test failed:', e);
  }
  
  // 4. Test API call with credentials
  try {
    console.log('5. Testing API call with credentials...');
    
    const response = await fetch('http://192.168.5.117:7777/api/auth/debug-cookies', {
      method: 'POST',
      credentials: 'include', // Important!
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    console.log('6. Debug cookies response:', data);
    
    return data;
  } catch (error) {
    console.error('7. API test failed:', error);
    return null;
  }
};