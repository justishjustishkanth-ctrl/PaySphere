import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Beneficiaries from './pages/Beneficiaries';
import Send from './pages/Send';
import Transactions from './pages/Transactions';
import KYC from './pages/KYC';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import Audit from './pages/Audit';
import ReceiptView from './pages/ReceiptView';

// ── Error Boundary to catch Dashboard render crashes ────────────────────
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔴 DASHBOARD CRASH CAUGHT BY ERROR BOUNDARY:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#060c1a',
          color: '#fff',
          padding: '40px',
          fontFamily: 'monospace'
        }}>
          <h1 style={{ color: '#ef4444', fontSize: '24px', marginBottom: '20px' }}>
            🔴 DASHBOARD RENDER CRASH DETECTED
          </h1>
          <div style={{
            backgroundColor: '#1e1e2e',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h2 style={{ color: '#f59e0b', marginBottom: '10px' }}>Error Message:</h2>
            <pre style={{ color: '#f87171', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {this.state.error?.message}
            </pre>
          </div>
          <div style={{
            backgroundColor: '#1e1e2e',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h2 style={{ color: '#f59e0b', marginBottom: '10px' }}>Stack Trace:</h2>
            <pre style={{ color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '11px' }}>
              {this.state.error?.stack}
            </pre>
          </div>
          <div style={{
            backgroundColor: '#1e1e2e',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h2 style={{ color: '#f59e0b', marginBottom: '10px' }}>Component Stack:</h2>
            <pre style={{ color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '11px' }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
            }}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#06b6d4',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#060c1a] flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  console.log("AUTH CHECK", user);
  if (!user) {
    console.log("REDIRECT TRIGGERED: Not authenticated");
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060c1a] flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  console.log("AUTH CHECK", user);
  if (!user || user.role !== 'ADMIN') {
    console.log("REDIRECT TRIGGERED: Not admin");
    return <Navigate to="/dashboard" />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Customer / Admin Protected Routes */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardErrorBoundary>
                <Dashboard />
              </DashboardErrorBoundary>
            </PrivateRoute>
          } />
          <Route path="/beneficiaries" element={<PrivateRoute><Beneficiaries /></PrivateRoute>} />
          <Route path="/send" element={<PrivateRoute><Send /></PrivateRoute>} />
          <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
          <Route path="/receipts/:id" element={<PrivateRoute><ReceiptView /></PrivateRoute>} />
          <Route path="/kyc" element={<PrivateRoute><KYC /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
          
          {/* Admin Protected Routes */}
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/audit" element={<Navigate to="/admin" />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

