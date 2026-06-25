import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';

interface NewIntegrationDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave?: (data: IntegrationFormData) => void;
}

export interface IntegrationFormData {
  applicationName: string;
  applicationUrl: string;
}

function NewIntegrationDialog({ open, onOpenChange, onSave }: NewIntegrationDialogProps) {
  const [formData, setFormData] = useState<IntegrationFormData>({
    applicationName: '',
    applicationUrl: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof IntegrationFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof IntegrationFormData, string>> = {};

    if (!formData.applicationName.trim()) {
      newErrors.applicationName = 'Application name is required';
    }

    if (!formData.applicationUrl.trim()) {
      newErrors.applicationUrl = 'Application URL is required';
    } else {
      try {
        const url = new URL(formData.applicationUrl);
        if (!url.protocol.startsWith('http')) {
          newErrors.applicationUrl = 'URL must start with http:// or https://';
        }
      } catch {
        newErrors.applicationUrl = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
      try {
        
      if (onSave) {
        onSave(formData);
      }
      
      // Reset form and close dialog
      resetForm();
      if (onOpenChange) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Failed to save integration:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof IntegrationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const resetForm = () => {
    setFormData({
      applicationName: '',
      applicationUrl: '',
    });
    setErrors({});
  };

  const handleCancel = () => {
    resetForm();
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-xl focus:outline-none overflow-hidden"
          onEscapeKeyDown={handleCancel}
          onInteractOutside={handleCancel}
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#A1C2BD] p-6">
              <Dialog.Title className="text-xl font-semibold text-[#19183B]">
                New API Integration
              </Dialog.Title>
              
              <Dialog.Close asChild>
                <button
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  aria-label="Close"
                  type="button"
                  onClick={handleCancel}
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Body */}
            <div className="p-6">
              <Dialog.Description className="mb-6 text-gray-600">
                Add new external Information System by providing the necessary details.
              </Dialog.Description>

              {/* Form Fields */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-start mb-2">
                    <label 
                      htmlFor="application-name" 
                      className="block text-sm font-medium text-gray-700 w-[20%] pt-2"
                    >
                      Application Name
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="w-[80%]">
                      <input
                        id="application-name"
                        type="text"
                        value={formData.applicationName}
                        onChange={(e) => handleInputChange('applicationName', e.target.value)}
                        className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-[#19183B] focus:border-transparent focus:outline-none transition-all ${
                          errors.applicationName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter application name"
                        disabled={isSubmitting}
                      />
                      {errors.applicationName && (
                        <p className="mt-1 text-sm text-red-500">{errors.applicationName}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start mb-2">
                    <label 
                      htmlFor="application-url" 
                      className="block text-sm font-medium text-gray-700 w-[20%] pt-2"
                    >
                      Application URL
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="w-[80%]">
                      <input
                        id="application-url"
                        type="url"
                        value={formData.applicationUrl}
                        onChange={(e) => handleInputChange('applicationUrl', e.target.value)}
                        className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-[#19183B] focus:border-transparent focus:outline-none transition-all ${
                          errors.applicationUrl ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="https://example.com/api"
                        disabled={isSubmitting}
                      />
                      {errors.applicationUrl && (
                        <p className="mt-1 text-sm text-red-500">{errors.applicationUrl}</p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
                        Must be a valid URL starting with http:// or https://
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-[#A1C2BD] p-6 bg-gray-50">
              <button
                type="button"
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-[#19183B] text-white rounded-lg hover:bg-[#708993] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Saving...
                  </>
                ) : (
                  'Save Integration'
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default NewIntegrationDialog;