import { Link } from 'react-router-dom';
import { MapPin, Truck, Package, DollarSign, FileText, Wrench, Users, Wallet, BarChart3, ShoppingCart, UserCog, Calculator } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const modules = [
  {
    name: 'Campos',
    icon: MapPin,
    description: 'Gestiona campos y lotes',
    path: '/campos',
    color: 'bg-green-500',
    roles: ['ADMIN', 'GERENTE'], // Admin, Contador tienen todo
  },
  {
    name: 'Maquinarias',
    icon: Truck,
    description: 'Control de maquinaria agrícola',
    path: '/maquinarias',
    color: 'bg-blue-500',
    roles: ['ADMIN'], // Admin, Contador tienen todo
  },
  {
    name: 'Servicios',
    icon: Wrench,
    description: 'Registro de servicios',
    path: '/servicios',
    color: 'bg-purple-500',
    roles: ['ADMIN', 'GERENTE', 'OPERARIO'], // Todos tienen acceso
  },
  {
    name: 'Contratistas',
    icon: Users,
    description: 'Gestiona contratistas',
    path: '/contratistas',
    color: 'bg-teal-500',
    roles: ['ADMIN'], // Admin, Contador tienen todo
  },
  {
    name: 'Stock',
    icon: Package,
    description: 'Inventario de insumos',
    path: '/stock',
    color: 'bg-orange-500',
    roles: ['ADMIN', 'GERENTE'], // Admin, Contador tienen todo
  },
  {
    name: 'Compras',
    icon: ShoppingCart,
    description: 'Gestión de compras',
    path: '/compras',
    color: 'bg-cyan-500',
    roles: ['ADMIN'], // Admin, Contador tienen todo
  },
  {
    name: 'Gastos',
    icon: DollarSign,
    description: 'Seguimiento de gastos',
    path: '/gastos',
    color: 'bg-red-500',
    roles: ['ADMIN'], // Admin, Contador tienen todo
  },
  {
    name: 'Cuentas',
    icon: Wallet,
    description: 'Gestiona cuentas',
    path: '/cuentas',
    color: 'bg-emerald-500',
    roles: ['ADMIN'], // Admin, Contador tienen todo
  },
  {
    name: 'Contabilidad',
    icon: Calculator,
    description: 'Análisis contable y financiero',
    path: '/contabilidad',
    color: 'bg-pink-500',
    roles: ['ADMIN'], // Solo Admin
  },
  {
    name: 'Rendimientos',
    icon: BarChart3,
    description: 'Registro de cosechas',
    path: '/rendimientos',
    color: 'bg-yellow-500',
    roles: ['ADMIN', 'GERENTE'], // Admin, Contador tienen todo
  },
  {
    name: 'Reportes',
    icon: FileText,
    description: 'Análisis y reportes',
    path: '/reportes',
    color: 'bg-indigo-500',
    roles: ['ADMIN', 'GERENTE'], // Admin, Contador tienen todo
  },
  {
    name: 'Usuarios',
    icon: UserCog,
    description: 'Administración de usuarios',
    path: '/usuarios',
    color: 'bg-slate-500',
    roles: ['ADMIN'], // Admin, Contador tienen todo
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  // Filtrar módulos según el rol del usuario
  const availableModules = modules.filter((module) =>
    module.roles.includes(user?.rol || '')
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido, {user?.nombre} {user?.apellido}
        </h1>
        <p className="text-gray-600 mt-2">
          Selecciona un módulo para comenzar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.name}
              to={module.path}
              className="card group cursor-pointer"
            >
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
