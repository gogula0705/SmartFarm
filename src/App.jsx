  import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageContextProvider } from './context/LanguageContext';
import { AuthContextProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

// Public Views
import Home from './pages/Home';
import NotFound from './pages/NotFound';

// Auth Views
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Protected Views
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import ProductDetails from './pages/ProductDetails';
import MyProducts from './pages/MyProducts';
import AddProduct from './pages/AddProduct';
import EditProduct from './pages/EditProduct';
import Orders from './pages/Orders';
import Bookings from './pages/Bookings';
import Community from './pages/Community';
import PostDiscussion from './pages/PostDiscussion';
import Profile from './pages/Profile';

function App() {
  return (
    <LanguageContextProvider>
      <AuthContextProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Public Entry */}
              <Route index element={<Home />} />

              {/* Public Auth Routes (Redirects to /dashboard if already logged in) */}
              <Route element={<PublicRoute />}>
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
              </Route>

              {/* Protected Routes (Redirects to /login if unauthenticated) */}
              <Route element={<ProtectedRoute />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="marketplace" element={<Marketplace />} />
                <Route path="marketplace/product/:id" element={<ProductDetails />} />
                <Route path="my-products" element={<MyProducts />} />
                <Route path="add-product" element={<AddProduct />} />
                <Route path="edit-product/:id" element={<EditProduct />} />
                <Route path="orders" element={<Orders />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="community" element={<Community />} />
                <Route path="community/post/:id" element={<PostDiscussion />} />
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Fallback 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthContextProvider>
    </LanguageContextProvider>
  );
}

export default App;
