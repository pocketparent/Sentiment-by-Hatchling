import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto px-6 py-10 text-neutral-800">
      <h1 className="text-3xl font-bold mb-8 text-center">Settings</h1>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-2">Account</h2>
        <div className="space-y-2">
          <p className="text-sm">Phone: (placeholder)</p>
          <button className="text-sm text-blue-600 hover:underline">Edit Info</button>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-2">Caregivers</h2>
        <p className="text-sm mb-2 text-neutral-600">Manage who can view or add to your journal.</p>
        <button className="bg-neutral-800 text-white px-4 py-2 rounded hover:bg-neutral-700 text-sm">
          Manage Access
        </button>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-2">Reminders</h2>
        <label className="flex items-center space-x-3 text-sm">
          <input type="checkbox" className="accent-neutral-800" />
          <span>Send me nudges to log a memory</span>
        </label>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-2">Privacy</h2>
        <p className="text-sm mb-2 text-neutral-600">Your entries are private by default.</p>
        <button className="text-sm text-blue-600 hover:underline">Change Defaults</button>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Export & Backup</h2>
        <button className="bg-neutral-800 text-white px-4 py-2 rounded hover:bg-neutral-700 text-sm">
          Export Journal
        </button>
      </section>
    </div>
  );
};

export default Settings;
