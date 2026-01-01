import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Campos from './pages/Campos';
import Maquinarias from './pages/Maquinarias';
import Servicios from './pages/Servicios';
import Contratistas from './pages/Contratistas';
import Stock from './pages/Stock';
import StockDetalle from './pages/StockDetalle';
import Compras from './pages/Compras';
import Gastos from './pages/Gastos';
import Cuentas from './pages/Cuentas';
import CuentaDetalle from './pages/CuentaDetalle';
import Rendimientos from './pages/Rendimientos';
import Reportes from './pages/Reportes';
import Usuarios from './pages/Usuarios';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/campos"
            element={
              <PrivateRoute>
                <Campos />
              </PrivateRoute>
            }
          />
          <Route
            path="/maquinarias"
            element={
              <PrivateRoute>
                <Maquinarias />
              </PrivateRoute>
            }
          />
          <Route
            path="/servicios"
            element={
              <PrivateRoute>
                <Servicios />
              </PrivateRoute>
            }
          />
          <Route
            path="/contratistas"
            element={
              <PrivateRoute>
                <Contratistas />
              </PrivateRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <PrivateRoute>
                <Stock />
              </PrivateRoute>
            }
          />
          <Route
            path="/stock/:id"
            element={
              <PrivateRoute>
                <StockDetalle />
              </PrivateRoute>
            }
          />
          <Route
            path="/compras"
            element={
              <PrivateRoute>
                <Compras />
              </PrivateRoute>
            }
          />
          <Route
            path="/gastos"
            element={
              <PrivateRoute>
                <Gastos />
              </PrivateRoute>
            }
          />
          <Route
            path="/cuentas"
            element={
              <PrivateRoute>
                <Cuentas />
              </PrivateRoute>
            }
          />
          <Route
            path="/cuentas/:id"
            element={
              <PrivateRoute>
                <CuentaDetalle />
              </PrivateRoute>
            }
          />
          <Route
            path="/rendimientos"
            element={
              <PrivateRoute>
                <Rendimientos />
              </PrivateRoute>
            }
          />
          <Route
            path="/reportes"
            element={
              <PrivateRoute>
                <Reportes />
              </PrivateRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <PrivateRoute>
                <Usuarios />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
