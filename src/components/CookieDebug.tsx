// components/CookieDebug.tsx
import { useState } from 'react';
import api from '../api/axiosInstance';

export const CookieDebug = () => {
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testSetCookies = async () => {
    addLog('Testing /set-test-cookie endpoint...');
    try {
      const response = await api.get('/auth/set-test-cookie', {
        withCredentials: true
      });
      
      addLog(`✅ Status: ${response.status}`);
      addLog(`📦 Response: ${JSON.stringify(response.data)}`);
      
      // Check Set-Cookie header
      const setCookieHeader = response.headers['set-cookie'];
      addLog(`🍪 Set-Cookie headers: ${JSON.stringify(setCookieHeader)}`);
      
      // Wait a moment then check
      setTimeout(() => testCheckCookies(), 1000);
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  const testCheckCookies = async () => {
    addLog('Checking if cookies were received...');
    try {
      const response = await api.get('/auth/check-test-cookie', {
        withCredentials: true
      });
      
      addLog(`✅ Check response: ${JSON.stringify(response.data)}`);
      
      // Also check document.cookie
      addLog(`📝 document.cookie: ${document.cookie}`);
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  const testLogin = async () => {
    addLog('Testing login flow...');
    try {
      const response = await api.post('/auth/login', {
        username: 'test', // Use your test credentials
        password: 'test'
      }, {
        withCredentials: true
      });
      
      addLog(`✅ Login response status: ${response.status}`);
      addLog(`📦 Login data: ${JSON.stringify(response.data)}`);
      
      const setCookieHeader = response.headers['set-cookie'];
      addLog(`🍪 Login Set-Cookie headers: ${JSON.stringify(setCookieHeader)}`);
      
    } catch (error: any) {
      addLog(`❌ Login error: ${error.message}`);
      if (error.response) {
        addLog(`❌ Response status: ${error.response.status}`);
        addLog(`❌ Response data: ${JSON.stringify(error.response.data)}`);
      }
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="p-4 border rounded-lg bg-gray-900 text-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">🍪 Cookie Debugger</h3>
        <button 
          onClick={clearLogs}
          className="px-3 py-1 bg-red-600 rounded text-sm"
        >
          Clear Logs
        </button>
      </div>
      
      <div className="space-x-2 mb-4">
        <button 
          onClick={testSetCookies}
          className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700"
        >
          Test Set Cookies
        </button>
        <button 
          onClick={testCheckCookies}
          className="px-3 py-1 bg-green-600 rounded hover:bg-green-700"
        >
          Check Cookies
        </button>
        <button 
          onClick={testLogin}
          className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-700"
        >
          Test Login
        </button>
      </div>
      
      <div className="mt-4">
        <h4 className="font-bold mb-2">Logs:</h4>
        <div className="bg-black p-3 rounded max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="font-mono text-sm mb-1">
              {log}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-300">
        <p>Frontend: {window.location.origin}</p>
        <p>Backend: http://192.168.5.117:7777</p>
        <p>Same origin: {window.location.origin === 'http://192.168.5.117:7777' ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};