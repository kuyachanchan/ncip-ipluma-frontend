/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import * as Form from '@radix-ui/react-form';
import * as Label from '@radix-ui/react-label';
import * as Progress from '@radix-ui/react-progress';
import { ChevronRight, ChevronLeft, Check, Upload, X, Lock, FileKey, PenTool, FileSignature, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '@/auth/useAuth';

interface SetupFormData {
  changePassword: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  certificate: File | null;
  certificatePassword: string;
  fullSignature: File | null;
  initialSignature: File | null;
}

const Setup: React.FC = () => {

  const { user, updateUserProperty, setUser } = useAuth()
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<SetupFormData>({
    changePassword: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    certificate: null,
    certificatePassword: '',
    fullSignature: null,
    initialSignature: null,
  });

  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    certificatePassword: '',
  });

  const [previewUrls, setPreviewUrls] = useState<{
    fullSignature: string | null;
    initialSignature: string | null;
  }>({
    fullSignature: null,
    initialSignature: null,
  });

  // State for password visibility
  const [showCertificatePassword, setShowCertificatePassword] = useState(false);

  const totalSteps = 4;

  const handlePasswordToggle = (value: boolean) => {
    setFormData(prev => ({
      ...prev,
      changePassword: value,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }));
    setPasswordErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      certificatePassword: '',
    });
    setError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');

    
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'certificate' | 'fullSignature' | 'initialSignature') => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      [fieldName]: file,
    }));

    // Create preview for signature images
    if (file && (fieldName === 'fullSignature' || fieldName === 'initialSignature')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => ({
          ...prev,
          [fieldName]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
    setError('');
  };

  const removeFile = (fieldName: 'certificate' | 'fullSignature' | 'initialSignature') => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: null,
      ...(fieldName === 'certificate' && { certificatePassword: '' }),
    }));
    if (fieldName === 'fullSignature' || fieldName === 'initialSignature') {
      setPreviewUrls(prev => ({
        ...prev,
        [fieldName]: null,
      }));
    }
  };

  const hasAnyPasswordError = (): boolean => {
    return Object.values(passwordErrors).some(e => e !== '');
  };

  const validateStep = (stepToValidate: number = currentStep): boolean => {
    // Don't clear error at the start of validation
    // Move error clearing to the caller
    let isValid = true;
    let errorMessage = '';

    switch (stepToValidate) {
      case 1:
        if (formData.changePassword) {
          if (!formData.currentPassword) {
            errorMessage = 'Please enter your current password';
            isValid = false;
            break;
          }
          if (!formData.newPassword) {
            errorMessage = 'Please enter a new password';
            isValid = false;
            break;
          }
          if (formData.newPassword.length < 8) {
            errorMessage = 'New password must be at least 8 characters';
            isValid = false;
            break;
          }
          if (formData.newPassword !== formData.confirmPassword) {
            errorMessage = 'Passwords do not match';
            isValid = false;
            break;
          }
        }
        break;

      case 2:
        if (!formData.certificate) {
          errorMessage = 'Please upload a certificate file';
          isValid = false;
          break;
        }
        if (!formData.certificate.name.endsWith('.p12')) {
          errorMessage = 'Please upload a valid .p12 certificate file';
          isValid = false;
          break;
        }
        if (!formData.certificatePassword) {
          errorMessage = 'Please enter the certificate password';
          isValid = false;
          break;
        }
        break;

      case 3:
        console.log('Validating step 3');
        if (!formData.fullSignature) {
          errorMessage = 'Please upload your full signature image';
          isValid = false;
          break;
        }
        if (!formData.fullSignature.type.startsWith('image/png')) {
          errorMessage = 'Please upload a PNG image file';
          isValid = false;
          break;
        }
        break;

      case 4:
        console.log('Validating step 4');
        if (!formData.initialSignature) {
          errorMessage = 'Please upload your initial signature image';
          isValid = false;
          break;
        }
        if (!formData.initialSignature.type.startsWith('image/png')) {
          errorMessage = 'Please upload a PNG image file';
          isValid = false;
          break;
        }
        break;
    }

    // Set error only once after all validations
    setError(errorMessage);
    return isValid;
  };


  const handleNext = () => {
    const stepToValidate = currentStep;
    console.log('Validating step:', stepToValidate);

    if (validateStep(stepToValidate)) {
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
        setError(''); // Clear error when moving to next step
      }
    }
  };


  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const stepToValidate = currentStep;
    if (!validateStep(stepToValidate)) {
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const setupData = new FormData();

      if (formData.changePassword) {
        setupData.append('changePassword', 'true');
        setupData.append('currentPassword', formData.currentPassword);
        setupData.append('newPassword', formData.newPassword);
      }

      if (formData.certificate) {
        setupData.append('certificate', formData.certificate);
        setupData.append('certPassword', formData.certificatePassword);
      }

      if (formData.fullSignature) {
        setupData.append('fullSignature', formData.fullSignature);
      }

      if (formData.initialSignature) {
        setupData.append('initialSignature', formData.initialSignature);
      }
      if (user?.id) {
        setupData.append("userId", user.id);
      }

      const response = await api.post('v1/setup', setupData)
      if (response.status === 200 || response.status === 201) {
        toast.success("Setup successfully saved.");

        if (response.data && response.data.finishedSetup !== undefined) {
          setUser(response.data);
        } else {
          updateUserProperty('finishedSetup', true);
        }

        setTimeout(() => {
          navigate('/my-documents', { replace: true });
        }, 1000);
      }


    } catch (err: any) {
      setError(err.response?.data?.message || 'Setup failed. Please try again.');
      //toast.error(`Error: ${error}`)
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-16 h-16 bg-[#19183B]/10 rounded-full mx-auto mb-4">
              <Lock className="w-8 h-8 text-[#19183B]" />
            </div>
            <h2 className="text-2xl font-bold text-[#19183B] text-center">Change Default Password</h2>
            <p className="text-[#708993] text-center">Would you like to change your default password?</p>

            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={() => handlePasswordToggle(true)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${formData.changePassword
                    ? 'bg-[#19183B] text-white shadow-lg'
                    : 'bg-gray-100 text-[#708993] hover:bg-gray-200'
                  }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => handlePasswordToggle(false)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${!formData.changePassword
                    ? 'bg-[#19183B] text-white shadow-lg'
                    : 'bg-gray-100 text-[#708993] hover:bg-gray-200'
                  }`}
              >
                No
              </button>
            </div>

            {formData.changePassword && (
              <div className="space-y-4 mt-6">
                <Form.Field name="currentPassword">
                  <div className="flex items-baseline justify-between mb-2">
                    <Label.Root htmlFor="currentPassword" className="text-sm font-semibold text-[#19183B]">
                      Current Password
                    </Label.Root>
                  </div>
                  <Form.Control asChild>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handlePasswordChange}
                      maxLength={50}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all placeholder:text-[#A1C2BD] ${passwordErrors.currentPassword
                          ? 'border-red-400 focus:ring-red-300 focus:border-red-400'
                          : 'border-[#A1C2BD] focus:ring-[#708993] focus:border-[#708993]'
                        }`}
                      placeholder="Enter current password"
                    />
                  </Form.Control>
                  {passwordErrors.currentPassword && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {passwordErrors.currentPassword}
                    </p>
                  )}
                </Form.Field>

                <Form.Field name="newPassword">
                  <div className="flex items-baseline justify-between mb-2">
                    <Label.Root htmlFor="newPassword" className="text-sm font-semibold text-[#19183B]">
                      New Password
                    </Label.Root>
                  </div>
                  <Form.Control asChild>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handlePasswordChange}
                      maxLength={50}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all placeholder:text-[#A1C2BD] ${passwordErrors.newPassword
                          ? 'border-red-400 focus:ring-red-300 focus:border-red-400'
                          : 'border-[#A1C2BD] focus:ring-[#708993] focus:border-[#708993]'
                        }`}
                      placeholder="Enter new password"
                    />
                  </Form.Control>
                  {passwordErrors.newPassword && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {passwordErrors.newPassword}
                    </p>
                  )}
                </Form.Field>

                <Form.Field name="confirmPassword">
                  <div className="flex items-baseline justify-between mb-2">
                    <Label.Root htmlFor="confirmPassword" className="text-sm font-semibold text-[#19183B]">
                      Confirm Password
                    </Label.Root>
                  </div>
                  <Form.Control asChild>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handlePasswordChange}
                      maxLength={50}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all placeholder:text-[#A1C2BD] ${passwordErrors.confirmPassword
                          ? 'border-red-400 focus:ring-red-300 focus:border-red-400'
                          : 'border-[#A1C2BD] focus:ring-[#708993] focus:border-[#708993]'
                        }`}
                      placeholder="Confirm new password"
                    />
                  </Form.Control>
                  {passwordErrors.confirmPassword && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {passwordErrors.confirmPassword}
                    </p>
                  )}
                </Form.Field>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-16 h-16 bg-[#19183B]/10 rounded-full mx-auto mb-4">
              <FileKey className="w-8 h-8 text-[#19183B]" />
            </div>
            <h2 className="text-2xl font-bold text-[#19183B] text-center">Upload Certificate</h2>
            <p className="text-[#708993] text-center">Uploaded certificate will be set as default</p>

            <div className="mt-6 space-y-4">
              <div>
                <Label.Root htmlFor="certificate" className="text-sm font-semibold text-[#19183B] block mb-2">
                  Certificate File (.p12)
                </Label.Root>

                {!formData.certificate ? (
                  <label
                    htmlFor="certificate"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#A1C2BD] rounded-xl cursor-pointer hover:bg-[#A1C2BD]/10 transition-all"
                  >
                    <Upload className="w-12 h-12 text-[#708993] mb-3" />
                    <span className="text-sm font-medium text-[#19183B]">Click to upload certificate</span>
                    <span className="text-xs text-[#708993] mt-1">.p12 file format</span>
                    <input
                      type="file"
                      id="certificate"
                      accept=".p12"
                      onChange={(e) => handleFileChange(e, 'certificate')}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-4 border-2 border-[#A1C2BD] rounded-xl bg-[#A1C2BD]/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#19183B] rounded-lg flex items-center justify-center">
                        <FileKey className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#19183B]">{formData.certificate.name}</p>
                        <p className="text-xs text-[#708993]">
                          {(formData.certificate.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile('certificate')}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                )}
              </div>

              {formData.certificate && (
                <Form.Field name="certificatePassword">
                  <div className="flex items-baseline justify-between mb-2">
                    <Label.Root htmlFor="certificatePassword" className="text-sm font-semibold text-[#19183B]">
                      Certificate Password
                    </Label.Root>
                  </div>
                  <div className="relative">
                    <Form.Control asChild>
                      <input
                        type={showCertificatePassword ? "text" : "password"}
                        id="certificatePassword"
                        name="certificatePassword"
                        value={formData.certificatePassword}
                        onChange={handlePasswordChange}
                        maxLength={50}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all placeholder:text-[#A1C2BD] pr-12 ${passwordErrors.certificatePassword
                            ? 'border-red-400 focus:ring-red-300 focus:border-red-400'
                            : 'border-[#A1C2BD] focus:ring-[#708993] focus:border-[#708993]'
                          }`}
                        placeholder="Enter certificate password"
                      />
                    </Form.Control>
                    <button
                      type="button"
                      onClick={() => setShowCertificatePassword(!showCertificatePassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#708993] hover:text-[#19183B] transition-colors focus:outline-none"
                      aria-label={showCertificatePassword ? "Hide password" : "Show password"}
                    >
                      {showCertificatePassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {passwordErrors.certificatePassword && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {passwordErrors.certificatePassword}
                    </p>
                  )}
                </Form.Field>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-16 h-16 bg-[#19183B]/10 rounded-full mx-auto mb-4">
              <PenTool className="w-8 h-8 text-[#19183B]" />
            </div>
            <h2 className="text-2xl font-bold text-[#19183B] text-center">Full Signature</h2>
            <p className="text-[#708993] text-center">Uploaded full signature image will be set as default</p>

            <div className="mt-6">
              <Label.Root htmlFor="fullSignature" className="text-sm font-semibold text-[#19183B] block mb-2">
                Full Signature Image (.png)
              </Label.Root>

              {!formData.fullSignature ? (
                <label
                  htmlFor="fullSignature"
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#A1C2BD] rounded-xl cursor-pointer hover:bg-[#A1C2BD]/10 transition-all"
                >
                  <Upload className="w-12 h-12 text-[#708993] mb-3" />
                  <span className="text-sm font-medium text-[#19183B]">Click to upload full signature</span>
                  <span className="text-xs text-[#708993] mt-1">PNG image format</span>
                  <input
                    type="file"
                    id="fullSignature"
                    accept="image/png"
                    onChange={(e) => handleFileChange(e, 'fullSignature')}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-3">
                  {previewUrls.fullSignature && (
                    <div className="border-2 border-[#A1C2BD] rounded-xl p-4 bg-white">
                      <img
                        src={previewUrls.fullSignature}
                        alt="Full Signature Preview"
                        className="max-h-32 mx-auto"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between p-4 border-2 border-[#A1C2BD] rounded-xl bg-[#A1C2BD]/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#19183B] rounded-lg flex items-center justify-center">
                        <PenTool className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#19183B]">{formData.fullSignature.name}</p>
                        <p className="text-xs text-[#708993]">
                          {(formData.fullSignature.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile('fullSignature')}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-16 h-16 bg-[#19183B]/10 rounded-full mx-auto mb-4">
              <FileSignature className="w-8 h-8 text-[#19183B]" />
            </div>
            <h2 className="text-2xl font-bold text-[#19183B] text-center">Initial Signature</h2>
            <p className="text-[#708993] text-center">Uploaded initial signature image will be set as default</p>

            <div className="mt-6">
              <Label.Root htmlFor="initialSignature" className="text-sm font-semibold text-[#19183B] block mb-2">
                Initial Signature Image (.png)
              </Label.Root>

              {!formData.initialSignature ? (
                <label
                  htmlFor="initialSignature"
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#A1C2BD] rounded-xl cursor-pointer hover:bg-[#A1C2BD]/10 transition-all"
                >
                  <Upload className="w-12 h-12 text-[#708993] mb-3" />
                  <span className="text-sm font-medium text-[#19183B]">Click to upload initial signature</span>
                  <span className="text-xs text-[#708993] mt-1">PNG image format</span>
                  <input
                    type="file"
                    id="initialSignature"
                    accept="image/png"
                    onChange={(e) => handleFileChange(e, 'initialSignature')}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-3">
                  {previewUrls.initialSignature && (
                    <div className="border-2 border-[#A1C2BD] rounded-xl p-4 bg-white">
                      <img
                        src={previewUrls.initialSignature}
                        alt="Initial Signature Preview"
                        className="max-h-32 mx-auto"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between p-4 border-2 border-[#A1C2BD] rounded-xl bg-[#A1C2BD]/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#19183B] rounded-lg flex items-center justify-center">
                        <FileSignature className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#19183B]">{formData.initialSignature.name}</p>
                        <p className="text-xs text-[#708993]">
                          {(formData.initialSignature.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile('initialSignature')}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)` }}
    >
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>

      <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#19183B] mb-2">Account Setup</h1>
          <p className="text-[#708993]">Complete your profile setup to get started</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#19183B]">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-[#708993]">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <Progress.Root
            className="relative overflow-hidden bg-[#A1C2BD]/30 rounded-full w-full h-3"
            value={(currentStep / totalSteps) * 100}
          >
            <Progress.Indicator
              className="bg-[#19183B] h-full transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </Progress.Root>

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                        ? 'bg-[#19183B] text-white'
                        : 'bg-[#A1C2BD]/30 text-[#708993]'
                    }`}
                >
                  {step < currentStep ? <Check className="w-4 h-4" /> : step}
                </div>
                <span className="text-xs text-[#708993] mt-1 hidden sm:block">
                  {step === 1 && 'Password'}
                  {step === 2 && 'Certificate'}
                  {step === 3 && 'Full Sign'}
                  {step === 4 && 'Initial Sign'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <Form.Root onSubmit={handleSubmit}>
          {/* Step Content */}
          <div className="mb-8">
            {renderStepContent()}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-red-700 text-sm">{error}</div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isLoading}
                className="flex-1 bg-white border-2 border-[#A1C2BD] text-[#19183B] py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#708993] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center gap-2">
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </span>
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={hasAnyPasswordError()}
                className={`${currentStep === 1 ? 'w-full' : 'flex-1'} bg-[#19183B] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#2a2850] focus:outline-none focus:ring-2 focus:ring-[#708993] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
              >
                <span className="flex items-center justify-center gap-2">
                  Next
                  <ChevronRight className="w-5 h-5" />
                </span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading || hasAnyPasswordError()}
                className="flex-1 bg-[#19183B] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#2a2850] focus:outline-none focus:ring-2 focus:ring-[#708993] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Completing Setup...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    Complete Setup
                  </span>
                )}
              </button>
            )}
          </div>
        </Form.Root>
      </div>
    </div>
  );
};

export default Setup;