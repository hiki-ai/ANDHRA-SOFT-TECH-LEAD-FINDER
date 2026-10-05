import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Navbar } from '../components/navigation/Navbar';
import { QuickCollectionModal } from '../components/dashboard/QuickCollectionModal';

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface-50 text-surface-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          onOpenNewJob={() => setCollectionModalOpen(true)}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet context={{ onOpenNewJob: () => setCollectionModalOpen(true) }} />
          </div>
        </main>
      </div>

      {/* Quick Collection Modal */}
      <QuickCollectionModal
        isOpen={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
      />
    </div>
  );
}

export default DashboardLayout;
