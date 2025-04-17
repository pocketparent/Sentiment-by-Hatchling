import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axios/axiosInstance';
import { Search, Users, CreditCard, BarChart2, HelpCircle, Shield, FileText, Bell } from 'lucide-react';

interface AdminPanelProps {
  userId: string;
  isAdmin: boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ userId, isAdmin }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch admin data on component mount
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchAdminData = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Fetch users data
        const usersResponse = await axiosInstance.get('/api/admin/users');
        setUsers(usersResponse.data.users || []);
        
        // Fetch subscriptions data
        const subscriptionsResponse = await axiosInstance.get('/api/admin/subscriptions');
        setSubscriptions(subscriptionsResponse.data.subscriptions || []);
      } catch (err: any) {
        console.error('Error fetching admin data:', err);
        setError('Failed to load admin data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdminData();
  }, [isAdmin]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axiosInstance.get(`/api/admin/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (activeTab === 'users') {
        setUsers(response.data.users || []);
      } else if (activeTab === 'subscriptions') {
        setSubscriptions(response.data.subscriptions || []);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-warm-sand max-w-4xl mx-auto">
        <div className="text-center py-8">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-clay-brown mb-2">Access Denied</h2>
          <p className="text-dusty-taupe">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-warm-sand max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-clay-brown mb-6">Admin Dashboard</h2>
      
      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users, subscriptions, or entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full border border-warm-sand rounded-xl pl-10 pr-4 py-2 focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-dusty-taupe" />
          </div>
          <button
            onClick={handleSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-clay-brown hover:text-blush-pink"
          >
            Search
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-warm-sand mb-6">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('users')}
            className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'users'
                ? 'border-clay-brown text-clay-brown'
                : 'border-transparent text-dusty-taupe hover:text-clay-brown hover:border-warm-sand'
            }`}
          >
            <Users className="mr-2 h-5 w-5" />
            Users & Accounts
          </button>
          
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'subscriptions'
                ? 'border-clay-brown text-clay-brown'
                : 'border-transparent text-dusty-taupe hover:text-clay-brown hover:border-warm-sand'
            }`}
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Subscriptions & Billing
          </button>
          
          <button
            onClick={() => setActiveTab('usage')}
            className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'usage'
                ? 'border-clay-brown text-clay-brown'
                : 'border-transparent text-dusty-taupe hover:text-clay-brown hover:border-warm-sand'
            }`}
          >
            <BarChart2 className="mr-2 h-5 w-5" />
            Usage & Engagement
          </button>
          
          <button
            onClick={() => setActiveTab('support')}
            className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'support'
                ? 'border-clay-brown text-clay-brown'
                : 'border-transparent text-dusty-taupe hover:text-clay-brown hover:border-warm-sand'
            }`}
          >
            <HelpCircle className="mr-2 h-5 w-5" />
            Support
          </button>
          
          <button
            onClick={() => setActiveTab('security')}
            className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'security'
                ? 'border-clay-brown text-clay-brown'
                : 'border-transparent text-dusty-taupe hover:text-clay-brown hover:border-warm-sand'
            }`}
          >
            <Shield className="mr-2 h-5 w-5" />
            Security
          </button>
          
          <button
            onClick={() => setActiveTab('reports')}
            className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'reports'
                ? 'border-clay-brown text-clay-brown'
                : 'border-transparent text-dusty-taupe hover:text-clay-brown hover:border-warm-sand'
            }`}
          >
            <FileText className="mr-2 h-5 w-5" />
            Reports
          </button>
          
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'alerts'
                ? 'border-clay-brown text-clay-brown'
                : 'border-transparent text-dusty-taupe hover:text-clay-brown hover:border-warm-sand'
            }`}
          >
            <Bell className="mr-2 h-5 w-5" />
            Alerts
          </button>
        </nav>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}
      
      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clay-brown"></div>
          <span className="ml-2 text-dusty-taupe">Loading...</span>
        </div>
      )}
      
      {/* Tab content */}
      {!loading && (
        <div className="py-4">
          {/* Users & Accounts tab */}
          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-clay-brown">User Accounts</h3>
                <div className="flex space-x-2">
                  <select className="border border-warm-sand rounded-lg px-3 py-1 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink">
                    <option value="">All Plans</option>
                    <option value="trial">Trial</option>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button className="bg-clay-brown text-white rounded-lg px-3 py-1 text-sm hover:bg-blush-pink transition-colors">
                    Export CSV
                  </button>
                </div>
              </div>
              
              {/* Users table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-warm-sand">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-dusty-taupe uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-dusty-taupe uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-dusty-taupe uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-dusty-taupe uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-dusty-taupe uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-dusty-taupe uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-warm-sand">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-dusty-taupe">
                          No users found. Try a different search.
                        </td>
                      </tr>
                    ) : (
                      users.map((user: any) => (
                        <tr key={user.id} className="hover:bg-soft-beige">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-blush-pink flex items-center justify-center text-white font-medium">
                                {user.name.charAt(0)}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-clay-brown">{user.name}</div>
                                <div className="text-xs text-dusty-taupe">ID: {user.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-dusty-taupe">
                            {user.email}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {user.plan}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.status === 'active' ? 'bg-green-100 text-green-800' :
                              user.status === 'trialing' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-dusty-taupe">
                            {user.joined}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-clay-brown hover:text-blush-pink mr-3">
                              View
                            </button>
                            <button className="text-clay-brown hover:text-blush-pink">
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Subscriptions & Billing tab */}
          {activeTab === 'subscriptions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-clay-brown">Subscription Management</h3>
                <div className="flex space-x-2">
                  <select className="border border-warm-sand rounded-lg px-3 py-1 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink">
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="past_due">Past Due</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button className="bg-clay-brown text-white rounded-lg px-3 py-1 text-sm hover:bg-blush-pink transition-colors">
                    Export CSV
                  </button>
                </div>
              </div>
              
              {/* Subscription stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-soft-beige rounded-xl p-4">
                  <h4 className="text-sm font-medium text-dusty-taupe mb-1">Active Subscriptions</h4>
                  <p className="text-2xl font-bold text-clay-brown">247</p>
                </div>
                <div className="bg-soft-beige rounded-xl p-4">
                  <h4 className="text-sm font-medium text-dusty-taupe mb-1">Monthly Recurring Revenue</h4>
                  <p className="text-2xl font-bold text-clay-brown">$3,720</p>
                </div>
                <div className="bg-soft-beige rounded-xl p-4">
                  <h4 className="text-sm font-medium text-dusty-taupe mb-1">Trial Conversions</h4>
                  <p className="text-2xl font-bold text-clay-brown">68%</p>
                </div>
                <div className="bg-soft-beige rounded-xl p-4">
                  <h4 className="text-sm font-medium text-dusty-taupe mb-1">Churn Rate</h4>
                  <p className="text-2xl font-bold text-clay-brown">4.2%</p>
                </div>
              </div>
              
              {/* Subscriptions table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-warm-sand">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-dusty-taupe uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-dusty-taupe uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-dusty-taupe uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-dusty-taupe uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-dusty-taupe uppercase tracking-wider">
                        Start Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-dusty-taupe uppercase tracking-wider">
                        Next Billing
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-dusty-taupe uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-warm-sand">
                    {subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-dusty-taupe">
                          No subscriptions found. Try a different search.
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map((subscription: any) => (
                        <tr key={subscription.id} className="hover:bg-soft-beige">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-clay-brown">{subscription.customer_name}</div>
                            <div className="text-xs text-dusty-taupe">{subscription.customer_email}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-dusty-taupe">
                            {subscription.plan}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-dusty-taupe">
                            ${subscription.amount}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                              subscription.status === 'trialing' ? 'bg-blue-100 text-blue-800' :
                              subscription.status === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {subscription.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-dusty-taupe">
                            {subscription.start_date}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-dusty-taupe">
                            {subscription.next_billing}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-clay-brown hover:text-blush-pink mr-3">
                              Edit
                            </button>
                            <button className="text-red-500 hover:text-red-700">
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Other tabs would be implemented similarly */}
          {activeTab === 'usage' && (
            <div className="py-12 text-center text-dusty-taupe">
              <BarChart2 className="w-16 h-16 mx-auto mb-4 text-clay-brown opacity-50" />
              <h3 className="text-lg font-medium text-clay-brown mb-2">Usage & Engagement Dashboard</h3>
              <p>Feature adoption, activity logs, and user engagement metrics will be displayed here.</p>
            </div>
          )}
          
          {activeTab === 'support' && (
            <div className="py-12 text-center text-dusty-taupe">
              <HelpCircle className="w-16 h-16 mx-auto mb-4 text-clay-brown opacity-50" />
              <h3 className="text-lg font-medium text-clay-brown mb-2">Support Dashboard</h3>
              <p>Ticket management, live chat metrics, and troubleshooting tools will be displayed here.</p>
            </div>
          )}
          
          {activeTab === 'security' && (
            <div className="py-12 text-center text-dusty-taupe">
              <Shield className="w-16 h-16 mx-auto mb-4 text-clay-brown opacity-50" />
              <h3 className="text-lg font-medium text-clay-brown mb-2">Security & Compliance</h3>
              <p>Audit logs, login activity, and permission management will be displayed here.</p>
            </div>
          )}
          
          {activeTab === 'reports' && (
            <div className="py-12 text-center text-dusty-taupe">
              <FileText className="w-16 h-16 mx-auto mb-4 text-clay-brown opacity-50" />
              <h3 className="text-lg font-medium text-clay-brown mb-2">Reports & Exports</h3>
              <p>Custom report builder and scheduled exports will be available here.</p>
            </div>
          )}
          
          {activeTab === 'alerts' && (
            <div className="py-12 text-center text-dusty-taupe">
              <Bell className="w-16 h-16 mx-auto mb-4 text-clay-brown opacity-50" />
              <h3 className="text-lg font-medium text-clay-brown mb-2">Alerts & Notifications</h3>
              <p>Configure threshold alerts and notification settings here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
