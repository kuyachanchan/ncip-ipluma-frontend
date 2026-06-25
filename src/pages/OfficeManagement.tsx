import React, { useState, useEffect } from 'react';
import { Building2, Mail, Users, Search, Filter, ChevronDown } from 'lucide-react';

// Types based on your API data
interface Office {
  id: number;
  long_name: string;
  short_name: string;
  email: string;
  status: 'Active' | 'Inactive';
  parent_office_id: number | null;
  office_code: string;
  created_at: string;
  updated_at: string;
  parent_office: Office | null;
}

interface ApiResponse {
  success: boolean;
  data: Office[];
}

const OfficeManagement: React.FC = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [filteredOffices, setFilteredOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [officeTypeFilter, setOfficeTypeFilter] = useState<'All' | 'Parent' | 'Child'>('All');

  // Fetch offices from API
  useEffect(() => {
    const fetchOffices = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://drip.ncip.gov.ph/api/offices');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch offices: ${response.status}`);
        }
        
        const data: ApiResponse = await response.json();
        
        if (data.success) {
          setOffices(data.data);
          setFilteredOffices(data.data);
        } else {
          throw new Error('API returned unsuccessful response');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while fetching offices');
        console.error('Error fetching offices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOffices();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let result = offices;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(office =>
        office.long_name.toLowerCase().includes(searchLower) ||
        office.short_name.toLowerCase().includes(searchLower) ||
        office.office_code.toLowerCase().includes(searchLower) ||
        office.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== 'All') {
      result = result.filter(office => office.status === statusFilter);
    }

    // Apply office type filter
    if (officeTypeFilter !== 'All') {
      if (officeTypeFilter === 'Parent') {
        result = result.filter(office => office.parent_office_id === null);
      } else if (officeTypeFilter === 'Child') {
        result = result.filter(office => office.parent_office_id !== null);
      }
    }

    setFilteredOffices(result);
  }, [offices, searchTerm, statusFilter, officeTypeFilter]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)` }}>
        </div>
        <div className="absolute inset-0 bg-black/30"></div>
        
        {/* Loading Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading offices...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
          style={{ backgroundImage: "url(/background.jpg)" }}>
        </div>
        <div className="absolute inset-0 bg-black/30"></div>
        
        {/* Error Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-lg max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Offices</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background image with blur */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
        style={{ backgroundImage: "url(/background.jpg)" }}>
      </div>
      {/* Dark overlay for better contrast */}
      <div className="absolute inset-0 bg-black/30"></div>

      {/* Main Content - This needs relative positioning and z-index */}
      <div className="relative z-10">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-600 rounded-xl">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">NCIP Offices</h1>
                  <p className="text-gray-600 mt-1">
                    {filteredOffices.length} office{filteredOffices.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search offices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Active' | 'Inactive')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active Only</option>
                  <option value="Inactive">Inactive Only</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>

              {/* Office Type Filter */}
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={officeTypeFilter}
                  onChange={(e) => setOfficeTypeFilter(e.target.value as 'All' | 'Parent' | 'Child')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
                >
                  <option value="All">All Offices</option>
                  <option value="Parent">Parent Offices Only</option>
                  <option value="Child">Child Offices Only</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Offices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffices.map((office) => (
              <div
                key={office.id}
                className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 hover:bg-white"
              >
                {/* Header */}
                <div className={`p-6 border-b ${office.status === 'Active' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${office.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">
                          {office.short_name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${office.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {office.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {office.long_name}
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Office Code */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Office Code:</span>
                    <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                      {office.office_code}
                    </span>
                  </div>

                  {/* Email */}
                  <div className="flex items-start space-x-3">
                    <Mail className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-500 mb-1">Email</p>
                      <a
                        href={`mailto:${office.email}`}
                        className="text-sm text-blue-600 hover:text-blue-800 truncate block"
                      >
                        {office.email}
                      </a>
                    </div>
                  </div>

                  {/* Parent Office */}
                  {office.parent_office && (
                    <div className="flex items-start space-x-3">
                      <Users className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-500 mb-1">Parent Office</p>
                        <p className="text-sm text-gray-900 truncate">
                          {office.parent_office.short_name}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* No Parent (This is a parent office) */}
                  {!office.parent_office && officeTypeFilter === 'All' && (
                    <div className="flex items-start space-x-3">
                      <Users className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-500 mb-1">Office Type</p>
                        <p className="text-sm text-gray-900">Parent Office</p>
                      </div>
                    </div>
                  )}

                  {/* Last Updated */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Last updated</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(office.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredOffices.length === 0 && !loading && (
            <div className="text-center py-12 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No offices found</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'All' || officeTypeFilter !== 'All'
                  ? 'Try adjusting your search or filters to find what you\'re looking for.'
                  : 'No offices are currently available.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white/90 backdrop-blur-sm border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-gray-500 text-sm">
              <p>National Commission on Indigenous Peoples (NCIP) Offices Directory</p>
              <p className="mt-2">Data sourced from DRIP System</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficeManagement;