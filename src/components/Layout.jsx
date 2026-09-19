import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

function Layout() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname);
  const isHomePage = location.pathname === '/';

  // Standalone layout for authentication pages: No Navbar, No Footer
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-gray-50 to-gray-50 flex flex-col justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8 text-gray-900 selection:bg-emerald-100 selection:text-emerald-900">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar />
      <main className={isHomePage ? 'flex-1 w-full' : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
