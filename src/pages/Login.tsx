/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState } from 'react';
import * as Form from '@radix-ui/react-form';
import * as Label from '@radix-ui/react-label';
import { useAuth } from '../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { type User } from "../types/auth";

import ReCAPTCHA from 'react-google-recaptcha'
import toast from 'react-hot-toast';

interface LoginFormData {
  username: string;
  password: string;
}


const Login: React.FC = () => {
  const [isVerified, setIsVerified] = useState(false)
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError,] = useState('');
  const [success, setSuccess] = useState(false);

  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleCaptchaChange = (token: string | null) => {
    if (token) {
      setIsVerified(true);
      console.log("Token received: ", token);
    } else {
      // Token expired or captcha reset
      setIsVerified(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');

  };
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isVerified) {
      toast.error("Please complete the captcha first.");
      return;
    }



    setIsLoading(true);

    try {
      const user: User = await login(formData.username, formData.password);
      setSuccess(true);
      setIsLoading(false);

      recaptchaRef.current?.reset();
      if (user.roles.includes("ROLE_SUPERADMIN")) {
        navigate('/dashboard');
      } else if (user.roles.includes("ROLE_ADMIN")) {
        navigate('/users-admin');
      } else {
        navigate('/my-documents');
      }
    } catch (err: any) {
      setSuccess(false);
      setError(err.response?.data?.message || 'Login failed');

      recaptchaRef.current?.reset();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)` }}
    >
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>

      <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border border-white/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#19183B] rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#19183B] mb-2">Welcome Back</h1>
          <p className="text-[#708993]">Sign in to continue to your account</p>
        </div>

        {success ? (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-green-600 text-lg font-semibold mb-2">
              Login Successful!
            </div>
            <p className="text-green-700">Redirecting to dashboard...</p>
          </div>
        ) : (
          <Form.Root onSubmit={handleSubmit} className="space-y-6">
            <Form.Field name="username">
              <div className="flex items-baseline justify-between mb-2">
                <Label.Root
                  htmlFor="username"
                  className="text-sm font-semibold text-[#19183B]"
                >
                  Username
                </Label.Root>
                <Form.Message
                  match="valueMissing"
                  className="text-xs text-red-600"
                >
                  Please enter your username
                </Form.Message>
              </div>
              <Form.Control asChild>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  maxLength={50}
                  required
                  className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all placeholder:text-[#A1C2BD]"
                  placeholder="Enter your username"
                  disabled={isLoading}
                />
              </Form.Control>
            </Form.Field>

            <Form.Field name="password">
              <div className="flex items-baseline justify-between mb-2">
                <Label.Root
                  htmlFor="password"
                  className="text-sm font-semibold text-[#19183B]"
                >
                  Password
                </Label.Root>
                <Form.Message
                  match="valueMissing"
                  className="text-xs text-red-600"
                >
                  Please enter your password
                </Form.Message>
              </div>
              <Form.Control asChild>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  maxLength={50}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all placeholder:text-[#A1C2BD] ${passwordError
                    ? 'border-red-400 focus:ring-red-300 focus:border-red-400'
                    : 'border-[#A1C2BD] focus:ring-[#708993] focus:border-[#708993]'
                    }`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </Form.Control>

              {passwordError && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {passwordError}
                </p>
              )}
            </Form.Field>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-red-700 text-sm">{error}</div>
              </div>
            )}

            {/* Captcha Section */}
            <div className="space-y-3">
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={import.meta.env.VITE_APP_RECAPTCHA_SITE_KEY}
                  onChange={handleCaptchaChange}
                  theme='light'
                  size='normal'
                />
              </div>

              <div className="text-center">
                <p className="text-[10px] text-gray-400">
                  Protected by reCAPTCHA.{' '}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-600"
                  >
                    Privacy
                  </a>{' '}
                  &{' '}
                  <a
                    href="https://policies.google.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-600"
                  >
                    Terms
                  </a>
                </p>
              </div>
            </div>

            <Form.Submit asChild>
              <button
                type="submit"
                disabled={isLoading || !!passwordError}
                className="w-full bg-[#19183B] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#2a2850] focus:outline-none focus:ring-2 focus:ring-[#708993] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In
                  </span>
                )}
              </button>
            </Form.Submit>
          </Form.Root>
        )}

        <div className="mt-6 text-center">
          {/*<a
            href="#"
            className="text-sm text-[#708993] hover:text-[#19183B] font-medium transition-colors inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Forgot your password?
          </a>*/}
        </div>
      </div>
    </div>
  );
};

export default Login;