import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';

// ─── Admin Pages ───
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageClients from './pages/admin/ManageClients';
import SystemSettings from './pages/admin/SystemSettings'; 

// ─── Client Pages ───
import Dashboard from './pages/client/Dashboard';
import OrderPipeline from './pages/client/OrderPipeline';
import AISetup from './pages/client/AISetup';
import ProductCatalog from './pages/client/ProductCatalog';
import CustomerDatabase from './pages/client/CustomerDatabase'; // 💥 NEW: কাস্টমার ডেটাবেস ইম্পোর্ট করা হলো

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ─── Public Route ─── */}
          <Route path="/" element={<Login />} />

          {/* ─── Admin Routes ─── */}
          <Route element={<DashboardLayout allowedRole="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/clients" element={<ManageClients />} />
            <Route path="/admin/settings" element={<SystemSettings />} />
          </Route>

          {/* ─── Client Routes ─── */}
          <Route element={<DashboardLayout allowedRole="user" />}>
            <Route path="/client/dashboard" element={<Dashboard />} />
            <Route path="/client/orders" element={<OrderPipeline />} />
            <Route path="/client/products" element={<ProductCatalog />} />
            <Route path="/client/ai-setup" element={<AISetup />} />
            
            {/* 💥 NEW: কাস্টমার ডেটাবেস রাউট */}
            <Route path="/client/customers" element={<CustomerDatabase />} /> 
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;