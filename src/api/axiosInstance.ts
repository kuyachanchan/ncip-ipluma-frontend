import axios from "axios";

const api = axios.create({
  //baseURL: import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_URL,  // ✅ Use proxy in dev, direct URL in prod
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 10000,
    withCredentials: true,
    headers: {
      //'Accept': 'application/json',
      'X-API-Key': import.meta.env.VITE_APP_KEY,
      'X-App-Name': import.meta.env.VITE_APP_NAME
    },
})

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    /*console.log('📤 Request:', {
      url: config.url,
      method: config.method,
      withCredentials: config.withCredentials,
      headers: config.headers
    });*/
    return config;
  },
  (error) => {
    //console.error('📤 Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    /*console.log('📥 Response:', {
      url: response.config.url,
      status: response.status,
      headers: response.headers
    });*/
    return response;
  },
  (error) => {
    /*console.error('📥 Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });*/
    return Promise.reject(error);
  }
);


export default api;