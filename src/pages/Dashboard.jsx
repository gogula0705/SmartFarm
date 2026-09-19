import { useAuth } from '../context/useAuth';
import DashboardWelcome from '../components/dashboard/DashboardWelcome';
import QuickServices from '../components/dashboard/QuickServices';
import MyActivity from '../components/dashboard/MyActivity';
import MyProductsHighlight from '../components/dashboard/MyProductsHighlight';
import MarketplaceHighlight from '../components/dashboard/MarketplaceHighlight';
import SmartFarmUpdates from '../components/dashboard/SmartFarmUpdates';
import ProfileSummaryCard from '../components/dashboard/ProfileSummaryCard';

function Dashboard() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto py-6 animate-pulse">
        <div className="h-48 bg-gray-200 rounded-3xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 bg-gray-200 rounded-2xl"></div>
          <div className="h-40 bg-gray-200 rounded-2xl"></div>
          <div className="h-40 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const fullName = userProfile?.fullName || user?.displayName || '';

  return (
    <div className="space-y-10 pb-12">
      {/* 1. Hero / Welcome Section */}
      <DashboardWelcome fullName={fullName} />

      {/* 2. Quick Services (Buy Seeds, Rent Tools, Buy Crops) */}
      <QuickServices />

      {/* 3. My Products Highlight */}
      <MyProductsHighlight />

      {/* 4. My Activity (My Products, My Orders, My Bookings, Reviews) */}
      <MyActivity />

      {/* 5. Marketplace Highlight */}
      <MarketplaceHighlight />

      {/* 6. SmartFarm Information / Future Features */}
      <SmartFarmUpdates />

      {/* 7. User Profile Summary */}
      <ProfileSummaryCard userProfile={userProfile} userEmail={user?.email} />
    </div>
  );
}

export default Dashboard;
