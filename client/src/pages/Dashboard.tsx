import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Truck, Package, DollarSign, FileText, Wrench, Users, Wallet, BarChart3, ShoppingCart, UserCog, Calculator, TrendingUp, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/apiWithCache';

const modules = [
  { name: 'Campos', icon: MapPin, description: 'Gestiona campos y lotes', path: '/campos', color: 'bg-green-500', roles: ['ADMIN', 'GERENTE'] },
  { name: 'Maquinarias', icon: Truck, description: 'Control de maquinaria agrícola', path: '/maquinarias', color: 'bg-blue-500', roles: ['ADMIN'] },
  { name: 'Servicios', icon: Wrench, description: 'Registro de servicios', path: '/servicios', color: 'bg-purple-500', roles: ['ADMIN', 'GERENTE', 'OPERARIO'] },
  { name: 'Contratistas', icon: Users, description: 'Gestiona contratistas', path: '/contratistas', color: 'bg-teal-500', roles: ['ADMIN'] },
  { name: 'Stock', icon: Package, description: 'Inventario de insumos', path: '/stock', color: 'bg-orange-500', roles: ['ADMIN', 'GERENTE'] },
  { name: 'Compras', icon: ShoppingCart, description: 'Gestión de compras', path: '/compras', color: 'bg-cyan-500', roles: ['ADMIN'] },
  { name: 'Gastos', icon: DollarSign, description: 'Seguimiento de gastos', path: '/gastos', color: 'bg-red-500', roles: ['ADMIN'] },
  { name: 'Cuentas', icon: Wallet, description: 'Gestiona cuentas', path: '/cuentas', color: 'bg-emerald-500', roles: ['ADMIN'] },
  { name: 'Contabilidad', icon: Calculator, description: 'Análisis contable y financiero', path: '/contabilidad', color: 'bg-pink-500', roles: ['ADMIN'] },
  { name: 'Rendimientos', icon: BarChart3, description: 'Registro de cosechas', path: '/rendimientos', color: 'bg-yellow-500', roles: ['ADMIN', 'GERENTE'] },
  { name: 'Reportes', icon: FileText, description: 'Análisis y reportes', path: '/reportes', color: 'bg-indigo-500', roles: ['ADMIN', 'GERENTE'] },
  { name: 'Usuarios', icon: UserCog, description: 'Administración de usuarios', path: '/usuarios', color: 'bg-slate-500', roles: ['ADMIN'] },
];

const GRANO_EMOJI: Record<string, string> = {
  trigo: '🌾', maíz: '🌽', maiz: '🌽', girasol: '🌻', soja: '🫘', sorgo: '🌿',
};

interface PrecioPizarra { grano: string; ars: string | null; usd: string | null }
interface Pizarra { fecha: string; precios: PrecioPizarra[]; stale?: boolean }

export default function Dashboard() {
  const { user } = useAuth();
  const [pizarra, setPizarra] = useState<Pizarra | null>(null);
  const [loadingPizarra, setLoadingPizarra] = useState(true);

  const fetchPizarra = async () => {
    try {
      setLoadingPizarra(true);
      const res = await api.get('/pizarra');
      setPizarra(res.data);
    } catch {
      setPizarra(null);
    } finally {
      setLoadingPizarra(false);
    }
  };

  useEffect(() => { fetchPizarra(); }, []);

  const availableModules = modules.filter(m => m.roles.includes(user?.rol || ''));

  return (
    <div>
      {/* Precios Pizarra BCR */}
      <div className="card mb-6 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-gray-800 text-sm">
              Precios Pizarra BCR
              {pizarra?.fecha && <span className="ml-2 text-gray-400 font-normal">· {pizarra.fecha}</span>}
              {pizarra?.stale && <span className="ml-2 text-xs text-amber-500">(datos anteriores)</span>}
            </span>
          </div>
          <button
            onClick={fetchPizarra}
            disabled={loadingPizarra}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Actualizar precios"
          >
            <RefreshCw className={`w-4 h-4 ${loadingPizarra ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingPizarra ? (
          <div className="flex gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-1 h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !pizarra || pizarra.precios.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">No se pudieron obtener los precios</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {pizarra.precios.map((p) => {
              const emoji = GRANO_EMOJI[p.grano.toLowerCase()] || '🌱';
              return (
                <div key={p.grano} className="bg-gray-50 rounded-lg px-3 py-2 text-center border border-gray-100">
                  <div className="text-base mb-0.5">{emoji} <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{p.grano}</span></div>
                  {p.ars ? (
                    <div className="text-sm font-bold text-gray-900">${p.ars}</div>
                  ) : (
                    <div className="text-sm text-gray-400">S/C</div>
                  )}
                  {p.usd && (
                    <div className="text-xs text-gray-400">U$S {p.usd}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Saludo y módulos */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido, {user?.nombre} {user?.apellido}
        </h1>
        <p className="text-gray-600 mt-2">Selecciona un módulo para comenzar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.name} to={module.path} className="card group cursor-pointer">
              <div className="flex items-start space-x-4">
                <div className={`${module.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {module.name}
                  </h3>
                  <p className="text-gray-600 mt-1">{module.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
