import React, { useState } from 'react';
import { ArrowLeft, Bell, Download, UserPlus, Trash2, HelpCircle, FileText, MessageSquare, CreditCard } from 'lucide-react';
import SMSSetup from './SMSSetup';

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [defaultPrivacy, setDefaultPrivacy] = useState('private');
  const [reminderFrequency, setReminderFrequency] = useState('weekly');
  const [enableReminders, setEnableReminders] = useState(true);
  const [activeSection, setActiveSection] = useState('');
  
  // Mock user ID for demo purposes - in a real app, this would come from auth context
  const userId = "user123";

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-0 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 pt-8 text-clay-brown bg-soft-beige rounded-2xl shadow-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center mb-6">
          <button 
            onClick={onClose}
            className="mr-4 text-clay-brown hover:text-black transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold flex-1">Settings</h1>
        </div>

        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-warm-sand">
          {/* Account Info */}
          <section>
            <h2 className="text-lg font-medium mb-3 text-clay-brown">Account</h2>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between py-1 border-b border-warm-sand">
                <span className="text-dusty-taupe">Name</span>
                <span className="font-medium">Demo User</span>
              </p>
              <p className="flex justify-between py-1 border-b border-warm-sand">
                <span className="text-dusty-taupe">Phone</span>
                <span className="font-medium">(xxx) xxx-xxxx</span>
              </p>
              <p className="flex justify-between py-1 border-b border-warm-sand">
                <span className="text-dusty-taupe">Role</span>
                <span className="font-medium">Parent</span>
              </p>
            </div>
          </section>

          {/* Subscription Management - NEW SECTION */}
          <section>
            <h2 className="text-lg font-medium mb-3 text-clay-brown flex items-center">
              <CreditCard size={18} className="mr-2" /> Subscription
            </h2>
            <div className="bg-soft-beige p-4 rounded-xl mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Current Plan:</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Trial (14 days)
                </span>
              </div>
              <div className="text-sm text-dusty-taupe mb-3">
                Your trial ends on May 1, 2025
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 bg-clay-brown text-white text-sm rounded-xl hover:bg-blush-pink transition-colors font-medium">
                  Upgrade Now
                </button>
                <button className="px-4 py-2 bg-warm-sand text-clay-brown text-sm rounded-xl hover:bg-blush-pink transition-colors font-medium">
                  View Plans
                </button>
                <button className="px-4 py-2 bg-warm-sand text-clay-brown text-sm rounded-xl hover:bg-blush-pink transition-colors font-medium">
                  Billing History
                </button>
              </div>
            </div>
          </section>

          {/* SMS Setup - NEW SECTION */}
          <section>
            <h2 
              className="text-lg font-medium mb-3 text-clay-brown flex items-center cursor-pointer"
              onClick={() => setActiveSection(activeSection === 'sms' ? '' : 'sms')}
            >
              <MessageSquare size={18} className="mr-2" /> SMS Journal
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">New</span>
            </h2>
            <p className="text-sm text-dusty-taupe mb-3">
              Create journal entries by sending text messages.
            </p>
            {activeSection === 'sms' ? (
              <SMSSetup userId={userId} />
            ) : (
              <button 
                onClick={() => setActiveSection('sms')}
                className="px-4 py-2 bg-warm-sand text-clay-brown text-sm rounded-xl hover:bg-blush-pink transition-colors font-medium"
              >
                Set Up SMS Journal
              </button>
            )}
          </section>

          {/* Caregivers */}
          <section>
            <h2 className="text-lg font-medium mb-3 text-clay-brown flex items-center">
              <UserPlus size={18} className="mr-2" /> Caregivers
            </h2>
            <p className="text-sm text-dusty-taupe mb-3">Manage who can view or contribute to your journal.</p>
            <button className="px-4 py-2 bg-warm-sand text-clay-brown text-sm rounded-2xl hover:bg-blush-pink transition-colors font-medium flex items-center">
              <UserPlus size={16} className="mr-2" /> Invite New Caregiver
            </button>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center p-3 bg-soft-beige rounded-xl">
                <div>
                  <p className="font-medium">Jane Smith</p>
                  <p className="text-xs text-dusty-taupe">Co-parent • Added Apr 10</p>
                </div>
                <button className="text-red-400 hover:text-red-600" aria-label="Remove">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h2 className="text-lg font-medium mb-3 text-clay-brown flex items-center">
              <Bell size={18} className="mr-2" /> Reminders
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox" 
                  className="rounded text-clay-brown focus:ring-blush-pink" 
                  checked={enableReminders}
                  onChange={(e) => setEnableReminders(e.target.checked)}
                />
                Get nudges to save memories
              </label>
              
              {enableReminders && (
                <div className="ml-6 mt-2">
                  <label className="block text-sm text-dusty-taupe mb-1">Frequency</label>
                  <select 
                    className="w-full border border-warm-sand rounded-xl px-3 py-2 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
                    value={reminderFrequency}
                    onChange={(e) => setReminderFrequency(e.target.value)}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="occasionally">Occasionally</option>
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="text-lg font-medium mb-3 text-clay-brown">Privacy & Sharing</h2>
            <label className="block text-sm text-dusty-taupe mb-1">Default privacy for new entries</label>
            <select 
              className="w-full border border-warm-sand rounded-xl px-3 py-2 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
              value={defaultPrivacy}
              onChange={(e) => setDefaultPrivacy(e.target.value)}
            >
              <option value="private">Private (only you)</option>
              <option value="shared">Shared (you and co-parents)</option>
            </select>
          </section>

          {/* Export & Backup */}
          <section>
            <h2 className="text-lg font-medium mb-3 text-clay-brown flex items-center">
              <Download size={18} className="mr-2" /> Export & Backup
            </h2>
            <p className="text-sm text-dusty-taupe mb-3">You can export your full journal at any time.</p>
            <div className="flex space-x-2">
              <button 
                onClick={() => window.location.href = '/api/export/pdf'}
                className="px-4 py-2 bg-warm-sand text-clay-brown text-sm rounded-xl hover:bg-blush-pink transition-colors font-medium"
              >
                Download as PDF
              </button>
              <button 
                onClick={() => window.location.href = '/api/export/csv'}
                className="px-4 py-2 bg-warm-sand text-clay-brown text-sm rounded-xl hover:bg-blush-pink transition-colors font-medium"
              >
                Export as CSV
              </button>
            </div>
          </section>

          {/* Help & Info */}
          <section>
            <h2 className="text-lg font-medium mb-3 text-clay-brown flex items-center">
              <HelpCircle size={18} className="mr-2" /> Help & Info
            </h2>
            <ul className="space-y-2">
              <li>
                <a href="#" className="flex items-center text-sm text-clay-brown hover:text-black transition-colors">
                  <HelpCircle size={16} className="mr-2 text-dusty-taupe" /> 
                  <span>FAQs</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-sm text-clay-brown hover:text-black transition-colors">
                  <FileText size={16} className="mr-2 text-dusty-taupe" /> 
                  <span>Terms of Service</span>
                </a>
              </li>
              <li>
                <button className="flex items-center text-sm text-red-500 hover:text-red-700 transition-colors">
                  <Trash2 size={16} className="mr-2" /> 
                  <span>Delete Account</span>
                </button>
              </li>
            </ul>
          </section>
        </div>
        
        <div className="text-center mt-8 text-xs text-dusty-taupe">
          <p>Hatchling v1.0.0</p>
          <p className="mt-1">© 2025 Pocket Parent</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
