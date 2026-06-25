import { Lock, User, Mail, Calendar, Shield, Eye, EyeOff } from 'lucide-react'
import type { Role } from '@/types/auth';
import { useEffect, useState } from 'react';
import api from '@/api/axiosInstance';
import { useAuth } from '@/auth/useAuth';
import toast from 'react-hot-toast';


interface UserAccount {
  id: string;
  username: string;
  email: string;
  password: string;
  role: [
    {
      id: number,
      name: string;
    }
  ];
  roles: Role[];
  createdAt: string;
  updatedAt: string;
  tempEmailSent: boolean;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}


function MyProfiles() {

    const [profile, setProfile] = useState<UserAccount>();
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
      current: false,
      new: false,
      confirm: false
    });
    const [passwordForm, setPasswordForm] = useState<PasswordForm>({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    const { user } = useAuth();


    useEffect(() => {
        loadProfile()
    }, []) // Added dependency array to prevent infinite loop

    const loadProfile = async () => {
        try {
            const response = await api.get(`v1/users/id/${user?.id}`)
            setProfile(response.data)
        } catch (error: any) {
            toast.error("Error loading profile")
        }
    }

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPasswordForm({
        ...passwordForm,
        [e.target.name]: e.target.value
      });
    };

    const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
      setShowPasswords({
        ...showPasswords,
        [field]: !showPasswords[field]
      });
    };

    const validatePassword = () => {
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        toast.error('All fields are required');
        return false;
      }

      if (passwordForm.newPassword.length < 8) {
        toast.error('New password must be at least 8 characters long');
        return false;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('New passwords do not match');
        return false;
      }

      if (passwordForm.currentPassword === passwordForm.newPassword) {
        toast.error('New password must be different from current password');
        return false;
      }

      return true;
    };

    const handleSubmitPasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validatePassword()) return;

      setLoading(true);
      try {
          await api.put(`v1/users/${user?.id}/change-password`, null, {
              params: {
                newPassword: passwordForm.newPassword
            }
          
        });
        
        toast.success('Password changed successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowChangePassword(false);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to change password');
      } finally {
        setLoading(false);
      }
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return (
        <div className="relative min-h-screen bg-[#E7F2EF] p-8">
            {/* Background image with blur */}
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
                style={{
                backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)`,
                }}>
            </div>
            {/* Optional dark overlay for better contrast */}
            <div className="absolute inset-0 bg-black/30"></div>

            <div className="relative max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 border border-[#A1C2BD]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-[#A1C2BD] rounded-lg shrink-0">
                      <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-[#19183B]"/>
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-xl sm:text-3xl font-bold text-[#19183B] truncate">My Profile</h1>
                      <p className="text-xs sm:text-sm text-[#708993]">View profiles and change password.</p>
                    </div>
                  </div>
                </div>
                    

                <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden">
                    {/* Profile Information */}
                    <div className="p-4 sm:p-6 border-b border-[#A1C2BD]">
                      <h2 className="text-lg sm:text-xl font-semibold text-[#19183B] mb-4">Profile Information</h2>

                      {profile ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          {/* Username */}
                          <div className="flex items-start gap-3 p-3 sm:p-0 bg-[#F5FAF9] sm:bg-transparent rounded-lg sm:rounded-none">
                            <div className="p-2 bg-[#E7F2EF] rounded-lg shrink-0">
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#19183B]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm text-[#708993]">Username</p>
                              <p className="text-sm sm:text-base text-[#19183B] font-medium truncate">{profile.username}</p>
                            </div>
                          </div>

                          {/* Email */}
                          <div className="flex items-start gap-3 p-3 sm:p-0 bg-[#F5FAF9] sm:bg-transparent rounded-lg sm:rounded-none">
                            <div className="p-2 bg-[#E7F2EF] rounded-lg shrink-0">
                              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-[#19183B]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm text-[#708993]">Email</p>
                              <p className="text-sm sm:text-base text-[#19183B] font-medium break-all">{profile.email}</p>
                            </div>
                          </div>

                          {/* Role */}
                          <div className="flex items-start gap-3 p-3 sm:p-0 bg-[#F5FAF9] sm:bg-transparent rounded-lg sm:rounded-none">
                            <div className="p-2 bg-[#E7F2EF] rounded-lg shrink-0">
                              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[#19183B]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm text-[#708993]">Role</p>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {profile.role?.map((r) => (
                                  <span key={r.id} className="px-2.5 py-0.5 bg-[#A1C2BD] text-[#19183B] rounded-full text-xs sm:text-sm font-medium">
                                    {r.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Member Since */}
                          <div className="flex items-start gap-3 p-3 sm:p-0 bg-[#F5FAF9] sm:bg-transparent rounded-lg sm:rounded-none">
                            <div className="p-2 bg-[#E7F2EF] rounded-lg shrink-0">
                              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#19183B]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm text-[#708993]">Member Since</p>
                              <p className="text-sm sm:text-base text-[#19183B] font-medium">{formatDate(profile.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-[#708993] text-sm">Loading profile...</div>
                      )}
                    </div>

                    {/* Change Password Section */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-[#19183B]">Security</h2>
                        <button
                          onClick={() => setShowChangePassword(!showChangePassword)}
                          className="px-4 py-2 bg-[#19183B] text-white rounded-lg hover:bg-[#2d2b54] transition-colors"
                        >
                          {showChangePassword ? 'Cancel' : 'Change Password'}
                        </button>
                      </div>

                      {showChangePassword && (
                        <form onSubmit={handleSubmitPasswordChange} className="max-w-md space-y-4">
                          {/* Current Password */}
                          <div>
                            <label className="block text-sm font-medium text-[#19183B] mb-2">
                              Current Password
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.current ? 'text' : 'password'}
                                name="currentPassword"
                                value={passwordForm.currentPassword}
                                onChange={handlePasswordChange}
                                className="w-full px-4 py-2 pr-10 border border-[#A1C2BD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]"
                                placeholder="Enter current password"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility('current')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#708993] hover:text-[#19183B]"
                              >
                                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          {/* New Password */}
                          <div>
                            <label className="block text-sm font-medium text-[#19183B] mb-2">
                              New Password
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.new ? 'text' : 'password'}
                                name="newPassword"
                                value={passwordForm.newPassword}
                                onChange={handlePasswordChange}
                                className="w-full px-4 py-2 pr-10 border border-[#A1C2BD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]"
                                placeholder="Enter new password"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility('new')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#708993] hover:text-[#19183B]"
                              >
                                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          {/* Confirm Password */}
                          <div>
                            <label className="block text-sm font-medium text-[#19183B] mb-2">
                              Confirm New Password
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                name="confirmPassword"
                                value={passwordForm.confirmPassword}
                                onChange={handlePasswordChange}
                                className="w-full px-4 py-2 pr-10 border border-[#A1C2BD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]"
                                placeholder="Confirm new password"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility('confirm')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#708993] hover:text-[#19183B]"
                              >
                                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          {/* Submit Button */}
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-2 bg-[#A1C2BD] text-[#19183B] rounded-lg hover:bg-[#8db3ad] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Updating...' : 'Update Password'}
                          </button>
                        </form>
                      )}
                    </div>
                </div>
                
            </div>
        </div>
    )
}

export default MyProfiles