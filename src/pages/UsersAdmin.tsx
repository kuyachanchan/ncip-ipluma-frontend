/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import * as Form from '@radix-ui/react-form';
import * as Dialog from '@radix-ui/react-dialog';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

import toast from 'react-hot-toast';

import { Check, X, Search, ChevronLeft, ChevronRight, User, Mail, Key, Shield, Users2, Eye, EyeOff} from 'lucide-react';

import api from '@/api/axiosInstance';
import type { Role } from '@/types/auth';
import { useAuth } from '@/auth/useAuth';

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

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  offset: number;
}

const fixSpecialCharacters = (str: string): string => {
  if (!str) return str;
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
};

const SQL_INJECTION_PATTERN = /('|"|;|--|\/\*|\*\/|xp_|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|EXECUTE|CAST|CONVERT|NCHAR|VARCHAR|NVARCHAR|ALTER|BEGIN|END|DECLARE|FETCH|KILL|OPEN|SYSOBJECTS|SYSCOLUMNS)/i;

const hasSQLInjection = (value: string): boolean => SQL_INJECTION_PATTERN.test(value);

const UsersAdmin: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [, setIsLoadingEmployees] = useState(false);
  const [, setShowEmployeeDropdown] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [showPassword, setShowPassword] = useState(false);
    const [roleError, setRoleError] = useState('');
    const [sendingEmailIds, setSendingEmailIds] = useState<Set<string>>(new Set());

  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const itemsPerPageOptions = [5, 10, 25, 50, 100];

  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 5,
    offset: 0,
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (employeeSearch.trim() && !selectedEmployee) {
        fetchEmployees(employeeSearch);
      } else if (!employeeSearch.trim()) {
        setEmployees([]);
        setShowEmployeeDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [employeeSearch, selectedEmployee]);

  const fetchEmployees = async (search: string) => {
    setIsLoadingEmployees(true);
    try {
      const params = new URLSearchParams();
      params.append('search', search);
      const response = await api.get(`v1/employees/?${params.toString()}`);
      const processedData = response.data.map((emp: Employee) => ({
        ...emp,
        firstName: fixSpecialCharacters(emp.firstName || ''),
        lastName: fixSpecialCharacters(emp.lastName || ''),
        email: fixSpecialCharacters(emp.email || '')
      }));
      setEmployees(processedData);
      setShowEmployeeDropdown(true);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      try {
        const altResponse = await api.get("/api/v1/employees/", {
          params: { search },
          paramsSerializer: (params) => Object.keys(params).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&')
        });
        const processedData = altResponse.data.map((emp: Employee) => ({
          ...emp,
          firstName: fixSpecialCharacters(emp.firstName || ''),
          lastName: fixSpecialCharacters(emp.lastName || ''),
          email: fixSpecialCharacters(emp.email || '')
        }));
        setEmployees(processedData);
        setShowEmployeeDropdown(true);
      } catch {
        toast.error('Failed to search employees');
        setEmployees([]);
        setShowEmployeeDropdown(false);
      }
    } finally {
      setIsLoadingEmployees(false);
    }
  };


  const loadUsers = async (page: number = pagination.currentPage, limit: number = pagination.itemsPerPage) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        userId: user?.id || '',
      });
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`v1/users?${params.toString()}`);
      const processedUsers = response.data.data.map((user: UserAccount) => ({
        ...user,
        username: fixSpecialCharacters(user.username || ''),
        email: fixSpecialCharacters(user.email || '')
      }));
      setUsers(processedUsers);
      setPagination(prev => ({
        ...prev,
        currentPage: response.data.total.currentPage,
        totalPages: response.data.total.totalPages,
        totalItems: response.data.total.totalItems,
        itemsPerPage: response.data.total.itemsPerPage,
      }));
      setSelectedUsers(new Set());
    } catch (error) {
      toast.error("Error fetching users");
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1, pagination.itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.itemsPerPage]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUsers(1, pagination.itemsPerPage);
    }, 300);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadUsers(newPage, pagination.itemsPerPage);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setPagination(prev => ({ ...prev, itemsPerPage: newItemsPerPage }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError(hasSQLInjection(value) ? 'Invalid characters detected in password.' : '');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) { setRoleError('Please select a role'); return; }
    if (!username || !email || !password) return;
    if (hasSQLInjection(password)) { setPasswordError('Invalid characters detected in password.'); return; }

    setIsSubmitting(true);
    try {
      const response = await api.post("auth/register", { username, email, password, roles: [role] });
      if (response.status === 200) {
        await loadUsers(pagination.currentPage, pagination.itemsPerPage);
        setCreateDialogOpen(false);
        resetForm();
        toast.success("Successfully created new User");
      } else {
        toast.error("Failed to create new User");
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Failed to create user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setPasswordError('');
    setRole('');
    setShowPassword(false);
    setSelectedEmployee(null);
    setEmployeeSearch('');
    setRoleError('');
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) { newSelected.delete(userId); } else { newSelected.add(userId); }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(user => user.id)));
    }
  };

  const getRoleBadgeColor = (roleName: string) => {
    return roleName === 'ROLE_ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 0) return 'In the future';
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    if (diffDays < 30) { const weeks = Math.floor(diffDays / 7); return `${weeks} week${weeks === 1 ? '' : 's'} ago`; }
    return date.toLocaleDateString();
  };

    async function openSendEmail(u: UserAccount): Promise<void> {
    setSendingEmailIds(prev => new Set(prev).add(u.id));
    try {
        await api.post('v1/email/send', { userId: u.id });
        toast.success('Email sent to user successfully');
        loadUsers();
    } catch (error: any) {
        toast.error('Failed to send email to user');
    } finally {
        setSendingEmailIds(prev => {
        const next = new Set(prev);
        next.delete(u.id);
        return next;
        });
    }
    }

  return (
    <div className="relative min-h-screen bg-[#E7F2EF] p-8">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)` }} />
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <Users2 className="w-6 h-6 text-[#19183B]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#19183B]">User Accounts</h1>
                <p className="text-[#708993]">View and manage user accounts</p>
              </div>
            </div>
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#19183B] text-white rounded-xl font-semibold hover:bg-[#708993] transition-colors"
            >
              <User className="w-4 h-4" />
              Create User
            </button>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#708993] w-5 h-5" />
              <input
                type="text"
                placeholder="Search users by username or email ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#708993] whitespace-nowrap">Show:</span>
              <select
                value={pagination.itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-4 py-3 border-2 border-[#A1C2BD] rounded-xl bg-white focus:ring-2 focus:ring-[#708993] outline-none transition-all cursor-pointer"
              >
                {itemsPerPageOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className="text-sm text-[#708993] whitespace-nowrap">per page</span>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden">
          <div className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                <div className="w-8 h-8 border-4 border-[#A1C2BD] border-t-[#19183B] rounded-full animate-spin mb-4" />
                <p className="text-lg">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                <User className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg mb-2">No users found</p>
                <p className="text-sm">{searchTerm ? 'Try adjusting your search terms' : 'No user accounts found'}</p>
              </div>
            ) : (
              <div className="overflow-hidden border border-gray-200 rounded-xl">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-12 px-6 py-3 text-left">
                        <CheckboxPrimitive.Root
                          checked={selectedUsers.size === users.length && users.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        >
                          <CheckboxPrimitive.Indicator>
                            <Check className="w-3 h-3 text-white" />
                          </CheckboxPrimitive.Indicator>
                        </CheckboxPrimitive.Root>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className={`hover:bg-gray-50 transition-colors ${selectedUsers.has(user.id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <CheckboxPrimitive.Root
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                            className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                          >
                            <CheckboxPrimitive.Indicator>
                              <Check className="w-3 h-3 text-white" />
                            </CheckboxPrimitive.Indicator>
                          </CheckboxPrimitive.Root>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-[#E7F2EF] flex items-center justify-center">
                              <User className="w-4 h-4 text-[#19183B]" />
                            </div>
                            <div className="font-medium text-gray-900">{user.username}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.role.map(r => (
                              <span
                                key={r.id}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(r.name)}`}
                              >
                                <Shield className="w-3 h-3" />
                                {r.name.replace('ROLE_', '')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{formatRelativeDate(user.createdAt)}</div>
                          <div className="text-xs text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4">
                          {user.updatedAt ? (
                            <>
                              <div className="text-sm text-gray-700">{formatRelativeDate(user.updatedAt)}</div>
                              <div className="text-xs text-gray-400">{new Date(user.updatedAt).toLocaleDateString()}</div>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                            onClick={() => {
                                if (sendingEmailIds.has(user.id)) return;
                                openSendEmail(user);
                            }}
                            disabled={sendingEmailIds.has(user.id)}
                            title="Send Temporary Password"
                            className={`p-2 rounded-lg transition-colors ${
                                sendingEmailIds.has(user.id)
                                ? 'text-blue-400 cursor-not-allowed pointer-events-none'
                                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            >
                            {sendingEmailIds.has(user.id)
                                ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                : <Mail className="w-4 h-4" />
                            }
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="border-t border-[#A1C2BD] p-6 bg-[#E7F2EF]/30">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#708993]">
                  Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalItems} items
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const totalPages = pagination.totalPages;
                      const maxVisible = 5;
                      let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisible / 2));
                      const endPage = Math.min(totalPages, startPage + maxVisible - 1);
                      if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
                      return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                            pagination.currentPage === page
                              ? 'bg-[#19183B] text-white'
                              : 'border border-[#A1C2BD] text-[#19183B] hover:bg-[#A1C2BD] hover:text-white'
                          }`}
                        >
                          {page}
                        </button>
                      ));
                    })()}
                  </div>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog.Root open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetForm(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD]">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <User className="w-6 h-6 text-[#19183B]" />
              </div>
              Create User Account
            </Dialog.Title>

            <Form.Root onSubmit={handleCreateSubmit} className="space-y-5">
              {/* Employee Search Field */}
                          {/*<Form.Field name="employee">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B] flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Select Employee
                  </Form.Label>
                </div>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#708993] w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search for employee by name or email..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      onFocus={() => {
                        if (employeeSearch.trim() && employees.length > 0 && !selectedEmployee) {
                          setShowEmployeeDropdown(true);
                        }
                      }}
                      className="w-full pl-10 pr-10 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                    />
                    {selectedEmployee && (
                      <button
                        type="button"
                        onClick={clearEmployeeSelection}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#708993] hover:text-red-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  {showEmployeeDropdown && !selectedEmployee && (
                    <div className="absolute z-10 w-full mt-1 bg-white border-2 border-[#A1C2BD] rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      {isLoadingEmployees ? (
                        <div className="p-4 text-center">
                          <div className="inline-block w-6 h-6 border-2 border-[#A1C2BD] border-t-[#19183B] rounded-full animate-spin" />
                          <p className="mt-2 text-sm text-[#708993]">Searching employees...</p>
                        </div>
                      ) : employees.length === 0 ? (
                        <div className="p-4 text-center text-[#708993]">
                          {employeeSearch.trim() ? 'No employees found' : 'Start typing to search employees'}
                        </div>
                      ) : (
                        <div className="py-1">
                          {employees.map((employee) => (
                            <button
                              key={employee.id}
                              type="button"
                              onClick={() => handleEmployeeSelect(employee)}
                              className="w-full px-4 py-3 text-left hover:bg-[#E7F2EF] transition-colors border-b border-[#A1C2BD]/30 last:border-b-0"
                            >
                              <div className="font-medium text-[#19183B]">{employee.firstName} {employee.lastName}</div>
                              <div className="text-sm text-[#708993]">{employee.email}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Form.Field>*/}

              <Form.Field name="username">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B] flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Username
                  </Form.Label>
                  <Form.Message match="valueMissing" className="text-xs text-red-600">Please enter a username</Form.Message>
                </div>
                <Form.Control asChild>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                  />
                </Form.Control>
              </Form.Field>

              <Form.Field name="email">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B] flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Form.Label>
                  <Form.Message match="valueMissing" className="text-xs text-red-600">Please enter an email</Form.Message>
                  <Form.Message match="typeMismatch" className="text-xs text-red-600">Please enter a valid email</Form.Message>
                </div>
                <Form.Control asChild>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                  />
                </Form.Control>
              </Form.Field>

              <Form.Field name="password">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B] flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Password
                  </Form.Label>
                  <Form.Message match="valueMissing" className="text-xs text-red-600">Please enter a password</Form.Message>
                </div>
                <div className="relative">
                  <Form.Control asChild>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={handlePasswordChange}
                      required
                      className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:ring-2 outline-none transition-all ${
                        passwordError
                          ? 'border-red-400 focus:ring-red-300 focus:border-red-400'
                          : 'border-[#A1C2BD] focus:ring-[#708993] focus:border-[#708993]'
                      }`}
                    />
                  </Form.Control>
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#708993] hover:text-[#19183B] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {passwordError}
                  </p>
                )}
              </Form.Field>

              <Form.Field name="role">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B] flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Role
                  </Form.Label>
                </div>
                <select
                  value={role}
                  onChange={(e) => { setRole(e.target.value as Role); setRoleError(''); }}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#708993] outline-none transition-all bg-white ${
                    roleError ? 'border-red-400 focus:border-red-400' : 'border-[#A1C2BD] focus:border-[#708993]'
                  }`}
                >
                  <option value="" disabled>Select a role...</option>
                  <option value="ROLE_USER">User</option>
                  <option value="ROLE_ADMIN">Admin</option>
                </select>
                {roleError && <p className="mt-1 text-xs text-red-600">{roleError}</p>}
              </Form.Field>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setCreateDialogOpen(false); resetForm(); }}
                  className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] text-[#19183B] rounded-xl font-semibold hover:bg-[#E7F2EF] transition-colors"
                >
                  Cancel
                </button>
                <Form.Submit asChild>
                  <button
                    type="submit"
                    disabled={isSubmitting || !!passwordError}
                    className="flex-1 px-6 py-3 bg-[#19183B] text-white rounded-xl font-semibold hover:bg-[#708993] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Create User
                      </>
                    )}
                  </button>
                </Form.Submit>
              </div>
            </Form.Root>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-[#E7F2EF] rounded-lg transition-colors">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default UsersAdmin;