import { useState, useEffect } from 'react';
import { Wallet, Search, DollarSign, FileText, ArrowLeft, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Factura {
  id: string;
  numeroFactura: string;
  fechaEmision: string;
  proveedor: string;
  tipoFactura: string;
  moneda: string;
  total: number;
  estado: string;
  formaPago: string;
  fechaPago?: string;
}

interface Servicio {
  id: string;
  tipo: string;
  fecha: string;
  descripcion?: string;
  hectareas?: number;
  costoPorHa?: number;
  total?: number;
  moneda: string;
  estado: string;
  facturable: boolean;
  campo?: { nombre: string };
  lote?: { nombre: string };
  contratista?: { nombre: string; apellido?: string; empresa?: string };
}

export default function CuentasCorrientes() {
  const navigate = useNavigate();
  const [vistaActiva, setVistaActiva] = useState<'facturas' | 'servicios'>('facturas');
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [contratistaNombre, setContratistaNombre] = useState('');
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [contratistas, setContratistas] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Cargar facturas
      const facturasResponse = await api.get('/facturas');
      const facturasData = facturasResponse.data;
      setFacturas(facturasData);

      // Extraer proveedores únicos
      const proveedoresUnicos = Array.from(
        new Set(facturasData.map((f: Factura) => f.proveedor))
      ).sort() as string[];
      setProveedores(proveedoresUnicos);

      // Cargar servicios sin facturar (facturable = true, estado REALIZADO y sin facturaId)
      const serviciosResponse = await api.get('/servicios?facturable=true&estado=REALIZADO&sinFacturar=true');
      const serviciosData = serviciosResponse.data;
      setServicios(serviciosData);

      // Extraer nombres de contratistas únicos
      const contratistasUnicos = Array.from(
        new Set(
          serviciosData
            .filter((s: Servicio) => s.contratista)
            .map((s: Servicio) => {
              const c = s.contratista!;
              return c.empresa || `${c.nombre}${c.apellido ? ' ' + c.apellido : ''}`;
            })
        )
      ).sort() as string[];
      setContratistas(contratistasUnicos);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const facturasFiltradas = facturas.filter((factura) => {
    if (!proveedorFiltro) return true;
    return factura.proveedor === proveedorFiltro;
  });

  const serviciosFiltrados = servicios.filter((servicio) => {
    if (!contratistaNombre) return true;
    const c = servicio.contratista;
    if (!c) return false;
    const nombreCompleto = c.empresa || `${c.nombre}${c.apellido ? ' ' + c.apellido : ''}`;
    return nombreCompleto === contratistaNombre;
  });

  const formatCurrency = (amount: number, currency: string) => {
    const formatted = new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return currency === 'USD' ? `USD ${formatted}` : `$ ${formatted}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const totalPendiente = facturasFiltradas
    .filter((f) => f.estado === 'PENDIENTE')
    .reduce((sum, f) => sum + f.total, 0);

  const totalPagado = facturasFiltradas
    .filter((f) => f.estado === 'PAGADA')
    .reduce((sum, f) => sum + f.total, 0);

  const totalServiciosSinFacturarARS = serviciosFiltrados
    .filter((s) => s.moneda === 'ARS')
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const totalServiciosSinFacturarUSD = serviciosFiltrados
    .filter((s) => s.moneda === 'USD')
    .reduce((sum, s) => sum + (s.total || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Wallet className="w-8 h-8" />
            <span>Cuentas Corrientes</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Gestión de cuentas corrientes por proveedor
          </p>
        </div>
        <button
          onClick={() => navigate('/contabilidad')}
          className="btn-secondary flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Contabilidad</span>
        </button>
      </div>

      {/* Pestañas */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setVistaActiva('facturas')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            vistaActiva === 'facturas'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Facturas</span>
          </div>
        </button>
        <button
          onClick={() => setVistaActiva('servicios')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            vistaActiva === 'servicios'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Briefcase className="w-5 h-5" />
            <span>Servicios sin Facturar</span>
          </div>
        </button>
      </div>

      {/* Filtro */}
      {vistaActiva === 'facturas' ? (
        <div className="card mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="label">Filtrar por Proveedor</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={proveedorFiltro}
                  onChange={(e) => setProveedorFiltro(e.target.value)}
                  className="input pl-10"
                >
                  <option value="">Todos los proveedores</option>
                  {proveedores.map((proveedor) => (
                    <option key={proveedor} value={proveedor}>
                      {proveedor}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {proveedorFiltro && (
              <button
                onClick={() => setProveedorFiltro('')}
                className="btn-secondary mt-6"
              >
                Limpiar Filtro
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="label">Filtrar por Contratista</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={contratistaNombre}
                  onChange={(e) => setContratistaNombre(e.target.value)}
                  className="input pl-10"
                >
                  <option value="">Todos los contratistas</option>
                  {contratistas.map((contratista) => (
                    <option key={contratista} value={contratista}>
                      {contratista}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {contratistaNombre && (
              <button
                onClick={() => setContratistaNombre('')}
                className="btn-secondary mt-6"
              >
                Limpiar Filtro
              </button>
            )}
          </div>
        </div>
      )}

      {/* Resumen */}
      {vistaActiva === 'facturas' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Facturas</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {facturasFiltradas.length}
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="card bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Pendiente de Pago</p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  $ {totalPendiente.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="card bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Pagado</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  $ {totalPagado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="card bg-orange-50 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Servicios sin Facturar</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {serviciosFiltrados.length}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-orange-600" />
            </div>
          </div>

          <div className="card bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Total a Facturar (ARS)</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">
                  $ {totalServiciosSinFacturarARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="card bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total a Facturar (USD)</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  USD {totalServiciosSinFacturarUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tablas */}
      {vistaActiva === 'facturas' ? (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {proveedorFiltro ? `Facturas de ${proveedorFiltro}` : 'Todas las Facturas'}
          </h2>

          {facturasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {proveedorFiltro
                ? `No hay facturas para ${proveedorFiltro}`
                : 'No hay facturas registradas'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proveedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Emisión
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Forma de Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Pago
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {facturasFiltradas.map((factura) => (
                    <tr key={factura.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {factura.numeroFactura}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {factura.proveedor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(factura.fechaEmision)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {factura.tipoFactura}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(factura.total, factura.moneda)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            factura.estado === 'PAGADA'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {factura.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {factura.formaPago}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {factura.fechaPago ? formatDate(factura.fechaPago) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {contratistaNombre ? `Servicios de ${contratistaNombre}` : 'Todos los Servicios sin Facturar'}
          </h2>

          {serviciosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {contratistaNombre
                ? `No hay servicios sin facturar para ${contratistaNombre}`
                : 'No hay servicios sin facturar'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contratista
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campo / Lote
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hectáreas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Costo/Ha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {serviciosFiltrados.map((servicio) => {
                    const c = servicio.contratista;
                    const contratistaDisplay = c ? (c.empresa || `${c.nombre}${c.apellido ? ' ' + c.apellido : ''}`) : '-';

                    return (
                      <tr key={servicio.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(servicio.fecha)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {servicio.tipo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {contratistaDisplay}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {servicio.campo?.nombre || '-'}
                          {servicio.lote && ` / ${servicio.lote.nombre}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {servicio.hectareas ? servicio.hectareas.toFixed(2) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {servicio.costoPorHa ? formatCurrency(servicio.costoPorHa, servicio.moneda) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {servicio.total ? formatCurrency(servicio.total, servicio.moneda) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {servicio.descripcion || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
