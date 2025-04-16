import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Search,
  Filter,
  RefreshCw,
  UserPlus,
  Mail,
  AlertTriangle
} from 'lucide-react';
import { UserRole, getRoleIcon, getRoleName } from './RoleBasedPermissions';

interface AdminPanelProps {
  onClose: () => void;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'pending';
  lastActive: string;
  journalCount: number;
  subscription: 'trial' | 'basic' | 'premium' | 'none';
}

const mockUsers: AdminUser[] = [
  {
    id: '1',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1234567890',
    role: 'parent',
    status: 'active',
    lastActive: '2025-04-15T10:30:00Z',
    journalCount: 42,
    subscription: 'premium'
  },
  {
    id: '2',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1987654321',
    role: 'co-parent',
    status: 'active',
    lastActive: '2025-04-14T15:45:00Z',
    journalCount: 18,
    subscription: 'basic'
  },
  {
    id: '3',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    phone: '+1122334455',
    role: 'caregiver',
    status: 'inactive',
    lastActive: '2025-03-20T09:15:00Z',
    journalCount: 5,
    subscription: 'none'
  },
  {
    id: '4',
    name: 'Michael Brown',
    email: 'michael@example.com',
    phone: '+1555666777',
    role: 'parent',
    status: 'pending',
    lastActive: '2025-04-16T08:00:00Z',
    journalCount: 0,
    subscription: 'trial'
  }
];

interface ErrorLog {
  id: string;
  timestamp: string;
  type: 'sms' | 'ai' | 'auth' | 'payment';
  message: string;
  resolved: boolean;
}

const mockErrorLogs: ErrorLog[] = [
  {
    id: '1',
    timestamp: '2025-04-16T12:34:56Z',
    type: 'sms',
    message: 'Failed to send SMS to +1234567890: Invalid number format',
    resolved: false
  },
  {
    id: '2',
    timestamp: '2025-04-15T10:22:33Z',
    type: 'ai',
    message: 'AI tag generation failed for entry #123: Content too short',
    resolved: true
  },
  {
    id: '3',
    timestamp: '2025-04-14T08:11:22Z',
    type: 'auth',
    message: 'Too many failed login attempts for user john@example.com',
    resolved: false
  },
  {
    id: '4',
    timestamp: '2025-04-13T16:55:44Z',
    type: 'payment',
    message: 'Payment failed for subscription renewal: Card declined',
    resolved: true
  }
];

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [users, setUsers] = useState<AdminUser[]>(mockUsers);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>(mockErrorLogs);
  const [userFilter, setUserFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = userFilter === '' || 
      user.name.toLowerCase().includes(userFilter.toLowerCase()) ||
      user.email.toLowerCase().includes(userFilter.toLowerCase()) ||
      user.phone.includes(userFilter);
    
    const matchesRole = roleFilter === '' || user.role === roleFilter;
    const matchesStatus = statusFilter === '' || user.status === statusFilter;
    const matchesSubscription = subscriptionFilter === '' || user.subscription === subscriptionFilter;
    
    return matchesSearch && matchesRole && matchesStatus && matchesSubscription;
  });

  // Filter logs based on type
  const [logTypeFilter, setLogTypeFilter] = useState<string>('');
  const [logResolvedFilter, setLogResolvedFilter] = useState<string>('');
  
  const filteredLogs = errorLogs.filter(log => {
    const matchesType = logTypeFilter === '' || log.type === logTypeFilter;
    const matchesResolved = logResolvedFilter === '' || 
      (logResolvedFilter === 'resolved' && log.resolved) ||
      (logResolvedFilter === 'unresolved' && !log.resolved);
    
    return matchesType && matchesResolved;
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Simulate loading data
  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  // Simulate sending invite
  const sendInvite = (userId: string) => {
    alert(`Invite sent to user ${userId}`);
    setUsers(prev => 
      prev.map(user => 
        user.id === userId 
          ? { ...user, status: 'pending' } 
          : user
      )
    );
  };

  // Simulate resolving error
  const resolveError = (errorId: string) => {
    setErrorLogs(prev => 
      prev.map(log => 
        log.id === errorId 
          ? { ...log, resolved: true } 
          : log
      )
    );
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-0">
      <div className="bg-soft-beige rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="bg-white p-4 border-b border-warm-sand flex justify-between items-center">
          <h2 className="text-xl font-semibold text-clay-brown flex items-center">
            <Shield size={20} className="mr-2" /> Admin Panel
          </h2>
          <button
            onClick={onClose}
            className="text-dusty-taupe hover:text-clay-brown"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        {/* Tabs */}
        <div className="bg-white border-b border-warm-sand flex">
          <button
            className={`px-4 py-3 text-sm font-medium flex items-center ${
              activeTab === 'users' 
                ? 'text-clay-brown border-b-2 border-clay-brown' 
                : 'text-dusty-taupe hover:text-clay-brown'
            }`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} className="mr-2" /> Users
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium flex items-center ${
              activeTab === 'logs' 
                ? 'text-clay-brown border-b-2 border-clay-brown' 
                : 'text-dusty-taupe hover:text-clay-brown'
            }`}
            onClick={() => setActiveTab('logs')}
          >
            <AlertTriangle size={16} className="mr-2" /> Error Logs
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'users' ? (
            <div>
              {/* User filters */}
              <div className="bg-white rounded-xl p-4 mb-4 border border-warm-sand">
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Search size={14} className="text-dusty-taupe" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="w-full rounded-lg border border-warm-sand pl-9 pr-3 py-1.5 text-sm placeholder-dusty-taupe bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
                    />
                  </div>
                  
                  {/* Role filter */}
                  <div>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                      className="rounded-lg border border-warm-sand px-3 py-1.5 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
                    >
                      <option value="">All roles</option>
                      <option value="parent">Parent</option>
                      <option value="co-parent">Co-Parent</option>
                      <option value="caregiver">Caregiver</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  {/* Status filter */}
                  <div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-lg border border-warm-sand px-3 py-1.5 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
                    >
                      <option value="">All statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  
                  {/* Subscription filter */}
                  <div>
                    <select
                      value={subscriptionFilter}
                      onChange={(e) => setSubscriptionFilter(e.target.value)}
                      className="rounded-lg border border-warm-sand px-3 py-1.5 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
                    >
                      <option value="">All subscriptions</option>
                      <option value="trial">Trial</option>
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  
                  {/* Refresh button */}
                  <button
                    onClick={refreshData}
                    className={`rounded-lg border border-warm-sand px-3 py-1.5 text-sm bg-white text-clay-brown hover:bg-blush-pink transition-colors flex items-center ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isLoading}
                  >
                    <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
              
              {/* Users table */}
              <div className="bg-white rounded-xl border border-warm-sand overflow-hidden">
                <table className="min-w-full divide-y divide-warm-sand">
                  <thead className="bg-soft-beige">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-clay-brown uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-clay-brown uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-clay-brown uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-clay-brown uppercase tracking-wider">
                        Last Active
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-clay-brown uppercase tracking-wider">
                        Subscription
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-clay-brown uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-warm-sand">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-dusty-taupe">
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-clay-brown"></div>
                            <span className="ml-2">Loading users...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-dusty-taupe">
                          No users found matching your filters
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-soft-beige">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blush-pink flex items-center justify-center text-clay-brown">
                                {user.name.charAt(0)}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-clay-brown">{user.name}</div>
                                <div className="text-xs text-dusty-taupe">{user.email}</div>
                                <div className="text-xs text-dusty-taupe">{user.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              {getRoleIcon(user.role)}
                              <span className="ml-1 text-sm text-clay-brown">{getRoleName(user.role)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : user.status === 'inactive'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.status}
                            </span>
                            <div className="text-xs text-dusty-taupe mt-1">
                              {user.journalCount} entries
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-clay-brown">
                            {formatDate(user.lastActive)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.subscription === 'premium' 
                                ? 'bg-purple-100 text-purple-800' 
                                : user.subscription === 'basic'
                                ? 'bg-blue-100 text-blue-800'
                                : user.subscription === 'trial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.subscription}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => sendInvite(user.id)}
                                className="text-dusty-taupe hover:text-clay-brown"
                                title="Send invite"
                              >
                                <Mail size={16} />
                              </button>
                              <button
                                className="text-dusty-taupe hover:text-clay-brown"
                                title="Edit user"
                              >
                                <SettingsIcon size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>
              {/* Error log filters */}
              <div className="bg-white rounded-xl p-4 mb-4 border border-warm-sand">
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Type filter */}
                  <div>
                    <select
                      value={logTypeFilter}
                      onChange={(e) => setLogTypeFilter(e.target.value)}
                      className="rounded-lg border border-warm-sand px-3 py-1.5 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
                    >
                      <option value="">All types</option>
                      <option value="sms">SMS</option>
                      <option value="ai">AI</option>
                      <option value="auth">Auth</option>
                      <option value="payment">Payment</option>
                    </select>
                  </div>
                  
                  {/* Resolved filter */}
                  <div>
                    <select
                      value={logResolvedFilter}
                      onChange={(e) => setLogResolvedFilter(e.target.value)}
                      className="rounded-lg border border-warm-sand px-3 py-1.5 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
                    >
                      <option value="">All status</option>
                      <option value="resolved">Resolved</option>
                      <option value="unresolved">Unresolved</option>
                    </select>
                  </div>
                  
                  {/* Refresh button */}
                  <button
                    onClick={refreshData}
                    className={`rounded-lg border border-warm-sand px-3 py-1.5 text-sm bg-white text-clay-brown hover:bg-blush-pink transition-colors flex items-center ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isLoading}
                  >
                    <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
              
              {/* Error logs */}
              <div className="space-y-3">
                {isLoading ? (
                  <div className="bg-white rounded-xl p-8 border border-warm-sand text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-clay-brown"></div>
                      <span className="ml-2 text-dusty-taupe">Loading error logs...</span>
                    </div>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="bg-white rounded-xl p-8 border border-warm-sand text-center text-dusty-taupe">
                    No error logs found matching your filters
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`bg-white rounded-xl p-4 border ${
                        log.resolved ? 'border-warm-sand' : 'border-red-200'
                      }`}
                    >
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            log.type === 'sms' 
                              ? 'bg-blue-100 text-blue-800' 
                              : log.type === 'ai'
                              ? 'bg-purple-100 text-purple-800'
                              : log.type === 'auth'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {log.type.toUpperCase()}
                          </span>
                          <span className="ml-2 text-xs text-dusty-taupe">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        <div>
                          {log.resolved ? (
                            <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Resolved
                            </span>
                          ) : (
                            <button
                              onClick={() => resolveError(log.id)}
                              className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 hover:bg-red-200"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-clay-brown">{log.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
