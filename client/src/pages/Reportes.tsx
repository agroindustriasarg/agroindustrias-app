// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import api from '../services/apiWithCache';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  MapPin,
  Package,
  Calendar,
  Wrench,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

type ReportType = 'campos' | 'servicios' | 'stock' | 'gastos' | 'rendimientos' | 'contabilidad';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function Reportes() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('campos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [loading, setLoading] = useState(false);

  // Filtros adicionales
  const [selectedCampos, setSelectedCampos] = useState<string[]>([]);
  const [selectedLotes, setSelectedLotes] = useState<string[]>([]);
  const [selectedMaquinarias, setSelectedMaquinarias] = useState<string[]>([]);
  const [selectedContratistas, setSelectedContratistas] = useState<string[]>([]);

  // Estados para dropdowns abiertos
  const [camposOpen, setCamposOpen] = useState(false);
  const [lotesOpen, setLotesOpen] = useState(false);
  const [maquinariasOpen, setMaquinariasOpen] = useState(false);
  const [contratistasOpen, setContratistasOpen] = useState(false);

  // Datos para selectores
  const [campos, setCampos] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [maquinarias, setMaquinarias] = useState<any[]>([]);
  const [contratistas, setContratistas] = useState<any[]>([]);

  // Filtros específicos para rendimientos
  const [selectedCultivos, setSelectedCultivos] = useState<string[]>([]);
  const [cultivosOpen, setCultivosOpen] = useState(false);

  // Data states
  const [resumenData, setResumenData] = useState<any>(null);
  const [categoriaData, setCategoriaData] = useState<any[]>([]);
  const [cuentaData, setCuentaData] = useState<any[]>([]);
  const [campoData, setCampoData] = useState<any[]>([]);
  const [serviciosData, setServiciosData] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [rendimientosData, setRendimientosData] = useState<any[]>([]);

  useEffect(() => {
    // Set default dates (último mes)
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);

    setFechaFin(hoy.toISOString().split('T')[0]);
    setFechaInicio(haceUnMes.toISOString().split('T')[0]);

    // Cargar datos para filtros
    loadFilterData();
  }, []);

  const loadFilterData = async () => {
    try {
      const [camposRes, maquinariasRes, contratistasRes] = await Promise.all([
        api.get('/campos'),
        api.get('/maquinarias'),
        api.get('/contratistas')
      ]);

      setCampos(camposRes.data);
      setMaquinarias(maquinariasRes.data);
      setContratistas(contratistasRes.data);

      // Cargar todos los lotes de todos los campos
      const todosLotes: any[] = [];
      camposRes.data.forEach((campo: any) => {
        if (campo.lotes) {
          todosLotes.push(...campo.lotes.map((lote: any) => ({
            ...lote,
            campoNombre: campo.nombre
          })));
        }
      });
      setLotes(todosLotes);
    } catch (error) {
      console.error('Error al cargar datos de filtros:', error);
    }
  };

  // Limpiar filtros al cambiar de reporte
  useEffect(() => {
    setSelectedCampos([]);
    setSelectedLotes([]);
    setSelectedMaquinarias([]);
    setSelectedContratistas([]);
    setSelectedCultivos([]);
  }, [selectedReport]);

  useEffect(() => {
    const loadReportData = async () => {
      if (!fechaInicio || !fechaFin) return;

      setLoading(true);
      try {
        let params = `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;

        // Agregar filtros adicionales según el reporte
        if (selectedCampos.length > 0 && (selectedReport === 'categoria' || selectedReport === 'cuenta' || selectedReport === 'servicios' || selectedReport === 'stock')) {
          params += `&campoIds=${selectedCampos.join(',')}`;
        }

        if (selectedLotes.length > 0) {
          params += `&loteIds=${selectedLotes.join(',')}`;
        }

        if (selectedMaquinarias.length > 0 && selectedReport === 'stock') {
          params += `&maquinariaIds=${selectedMaquinarias.join(',')}`;
        }

        if (selectedContratistas.length > 0 && selectedReport === 'servicios') {
          params += `&contratistaIds=${selectedContratistas.join(',')}`;
        }

        if (selectedCultivos.length > 0 && selectedReport === 'rendimientos') {
          params += `&cultivos=${selectedCultivos.join(',')}`;
        }

        switch (selectedReport) {
          case 'campos':
            const campo = await api.get(`/reportes/gastos-por-campo${params}`);
            setCampoData(campo.data);
            break;
          case 'servicios':
            const servicios = await api.get(`/reportes/servicios-realizados${params}`);
            setServiciosData(servicios.data);
            break;
          case 'stock':
            const stock = await api.get(`/reportes/consumo-stock${params}`);
            setStockData(stock.data);
            break;
          case 'gastos':
            const categoria = await api.get(`/reportes/gastos-por-categoria${params}`);
            setCategoriaData(categoria.data);
            break;
          case 'rendimientos':
            const rendimientos = await api.get(`/reportes/rendimientos${params}`);
            setRendimientosData(rendimientos.data);
            break;
          case 'contabilidad':
            const resumen = await api.get(`/reportes/resumen-general${params}`);
            setResumenData(resumen.data);
            break;
        }
      } catch (error) {
        console.error('Error al cargar reporte:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [selectedReport, fechaInicio, fechaFin, selectedCampos, selectedLotes, selectedMaquinarias, selectedContratistas, selectedCultivos]);

  const menuItems = [
    { id: 'campos' as ReportType, label: 'Campos', icon: MapPin },
    { id: 'servicios' as ReportType, label: 'Servicios', icon: Wrench },
    { id: 'stock' as ReportType, label: 'Stock', icon: Package },
    { id: 'gastos' as ReportType, label: 'Gastos', icon: TrendingUp },
    { id: 'rendimientos' as ReportType, label: 'Rendimientos', icon: BarChart3 },
    { id: 'contabilidad' as ReportType, label: 'Contabilidad', icon: PieChart },
  ];

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <div className="card sticky top-6">
          <h2 className="text-lg font-bold mb-4 text-gray-900">Reportes</h2>

          {/* Filtros de fecha */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex items-center text-sm font-medium text-gray-700 mb-3">
              <Calendar className="w-4 h-4 mr-2" />
              Período
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Desde</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hasta</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                />
              </div>
            </div>
          </div>

          {/* Filtros adicionales */}
          {selectedReport !== 'resumen' && (
            <div className="mb-6 pb-6 border-b">
              <div className="text-sm font-medium text-gray-700 mb-3">Filtros</div>
              <div className="space-y-4">
                {/* Filtro por campos (para categoría, cuenta, servicios, stock y rendimientos) */}
                {(selectedReport === 'categoria' || selectedReport === 'cuenta' || selectedReport === 'servicios' || selectedReport === 'stock' || selectedReport === 'rendimientos') && (
                  <div className="relative">
                    <label className="block text-xs text-gray-600 mb-2">Campos</label>
                    <button
                      type="button"
                      onClick={() => setCamposOpen(!camposOpen)}
                      className="w-full text-xs border border-gray-300 rounded p-2 bg-white flex items-center justify-between hover:bg-gray-50"
                    >
                      <span className="truncate">
                        {selectedCampos.length === 0
                          ? 'Seleccionar campos...'
                          : `${selectedCampos.length} seleccionado${selectedCampos.length > 1 ? 's' : ''}`}
                      </span>
                      {camposOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {camposOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                        {campos.length === 0 ? (
                          <p className="text-xs text-gray-400 p-2">No hay campos</p>
                        ) : (
                          <div className="p-2 space-y-1">
                            {campos.map((campo) => (
                              <label key={campo.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedCampos.includes(campo.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCampos([...selectedCampos, campo.id]);
                                    } else {
                                      setSelectedCampos(selectedCampos.filter(id => id !== campo.id));
                                    }
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs">{campo.nombre}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Filtro por lotes (para todos excepto resumen) */}
                <div className="relative">
                  <label className="block text-xs text-gray-600 mb-2">Lotes</label>
                  <button
                    type="button"
                    onClick={() => setLotesOpen(!lotesOpen)}
                    className="w-full text-xs border border-gray-300 rounded p-2 bg-white flex items-center justify-between hover:bg-gray-50"
                  >
                    <span className="truncate">
                      {selectedLotes.length === 0
                        ? 'Seleccionar lotes...'
                        : `${selectedLotes.length} seleccionado${selectedLotes.length > 1 ? 's' : ''}`}
                    </span>
                    {lotesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {lotesOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                      {lotes.length === 0 ? (
                        <p className="text-xs text-gray-400 p-2">No hay lotes</p>
                      ) : (
                        <div className="p-2 space-y-1">
                          {lotes.map((lote) => (
                            <label key={lote.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                              <input
                                type="checkbox"
                                checked={selectedLotes.includes(lote.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLotes([...selectedLotes, lote.id]);
                                  } else {
                                    setSelectedLotes(selectedLotes.filter(id => id !== lote.id));
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs">{lote.nombre} <span className="text-gray-400">({lote.campoNombre})</span></span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Filtro por maquinarias (solo para stock) */}
                {selectedReport === 'stock' && (
                  <div className="relative">
                    <label className="block text-xs text-gray-600 mb-2">Maquinarias</label>
                    <button
                      type="button"
                      onClick={() => setMaquinariasOpen(!maquinariasOpen)}
                      className="w-full text-xs border border-gray-300 rounded p-2 bg-white flex items-center justify-between hover:bg-gray-50"
                    >
                      <span className="truncate">
                        {selectedMaquinarias.length === 0
                          ? 'Seleccionar maquinarias...'
                          : `${selectedMaquinarias.length} seleccionado${selectedMaquinarias.length > 1 ? 's' : ''}`}
                      </span>
                      {maquinariasOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {maquinariasOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                        {maquinarias.length === 0 ? (
                          <p className="text-xs text-gray-400 p-2">No hay maquinarias</p>
                        ) : (
                          <div className="p-2 space-y-1">
                            {maquinarias.map((maq) => (
                              <label key={maq.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedMaquinarias.includes(maq.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedMaquinarias([...selectedMaquinarias, maq.id]);
                                    } else {
                                      setSelectedMaquinarias(selectedMaquinarias.filter(id => id !== maq.id));
                                    }
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs">{maq.nombre}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Filtro por contratistas (solo para servicios) */}
                {selectedReport === 'servicios' && (
                  <div className="relative">
                    <label className="block text-xs text-gray-600 mb-2">Contratistas</label>
                    <button
                      type="button"
                      onClick={() => setContratistasOpen(!contratistasOpen)}
                      className="w-full text-xs border border-gray-300 rounded p-2 bg-white flex items-center justify-between hover:bg-gray-50"
                    >
                      <span className="truncate">
                        {selectedContratistas.length === 0
                          ? 'Seleccionar contratistas...'
                          : `${selectedContratistas.length} seleccionado${selectedContratistas.length > 1 ? 's' : ''}`}
                      </span>
                      {contratistasOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {contratistasOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                        {contratistas.length === 0 ? (
                          <p className="text-xs text-gray-400 p-2">No hay contratistas</p>
                        ) : (
                          <div className="p-2 space-y-1">
                            {contratistas.map((contratista) => (
                              <label key={contratista.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedContratistas.includes(contratista.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedContratistas([...selectedContratistas, contratista.id]);
                                    } else {
                                      setSelectedContratistas(selectedContratistas.filter(id => id !== contratista.id));
                                    }
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs">{contratista.nombre} {contratista.apellido || ''}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Filtro por cultivos (solo para rendimientos) */}
                {selectedReport === 'rendimientos' && (
                  <div className="relative">
                    <label className="block text-xs text-gray-600 mb-2">Cultivos</label>
                    <button
                      type="button"
                      onClick={() => setCultivosOpen(!cultivosOpen)}
                      className="w-full text-xs border border-gray-300 rounded p-2 bg-white flex items-center justify-between hover:bg-gray-50"
                    >
                      <span className="truncate">
                        {selectedCultivos.length === 0
                          ? 'Seleccionar cultivos...'
                          : `${selectedCultivos.length} seleccionado${selectedCultivos.length > 1 ? 's' : ''}`}
                      </span>
                      {cultivosOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {cultivosOpen && rendimientosData && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                        {(() => {
                          // Extraer cultivos únicos del reporte de rendimientos
                          const cultivosUnicos = Array.from(new Set(
                            rendimientosData.flatMap((r: any) => r.cultivos?.map((c: any) => c.cultivo) || [])
                          )) as string[];

                          return cultivosUnicos.length === 0 ? (
                            <p className="text-xs text-gray-400 p-2">No hay cultivos disponibles</p>
                          ) : (
                            <div className="p-2 space-y-1">
                              {cultivosUnicos.map((cultivo) => (
                                <label key={cultivo} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                                  <input
                                    type="checkbox"
                                    checked={selectedCultivos.includes(cultivo)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedCultivos([...selectedCultivos, cultivo]);
                                      } else {
                                        setSelectedCultivos(selectedCultivos.filter(c => c !== cultivo));
                                      }
                                    }}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs">{cultivo}</span>
                                </label>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Botón limpiar filtros */}
                {(selectedCampos.length > 0 || selectedLotes.length > 0 || selectedMaquinarias.length > 0 || selectedContratistas.length > 0 || selectedCultivos.length > 0) && (
                  <button
                    onClick={() => {
                      setSelectedCampos([]);
                      setSelectedLotes([]);
                      setSelectedMaquinarias([]);
                      setSelectedContratistas([]);
                      setSelectedCultivos([]);
                    }}
                    className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Menu items */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedReport(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    selectedReport === item.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {loading ? (
          <div className="card">
            <div className="text-center py-12 text-gray-500">Cargando reporte...</div>
          </div>
        ) : (
          <>
            {selectedReport === 'campos' && <GastosPorCampo data={campoData} />}
            {selectedReport === 'servicios' && (
              <ServiciosRealizados
                data={serviciosData}
                filtros={{
                  fechaInicio,
                  fechaFin,
                  campos: campos.filter(c => selectedCampos.includes(c.id)),
                  lotes: lotes.filter(l => selectedLotes.includes(l.id)),
                  contratistas: contratistas.filter(c => selectedContratistas.includes(c.id))
                }}
              />
            )}
            {selectedReport === 'stock' && <ConsumoStock data={stockData} />}
            {selectedReport === 'gastos' && <GastosPorCategoria data={categoriaData} />}
            {selectedReport === 'rendimientos' && (
              <ReporteRendimientos
                data={rendimientosData}
                filtros={{
                  fechaInicio,
                  fechaFin,
                  campos: campos.filter(c => selectedCampos.includes(c.id)),
                  lotes: lotes.filter(l => selectedLotes.includes(l.id)),
                  cultivos: selectedCultivos
                }}
              />
            )}
            {selectedReport === 'contabilidad' && resumenData && <ResumenGeneral data={resumenData} />}
          </>
        )}
      </div>
    </div>
  );
}

// Componente: Resumen General
function ResumenGeneral({ data }: { data: any }) {
  if (!data || !data.topCategorias || !data.gastosPorMes) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Resumen General</h1>
        <p className="text-gray-500 text-center py-12">No hay datos disponibles para el período seleccionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resumen General</h1>
        <p className="text-gray-600 mt-1">Vista general de gastos y tendencias</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
          <p className="text-sm text-blue-700 mb-1">Total Gastos</p>
          <p className="text-3xl font-bold text-blue-900">
            ${(data.totalGastos || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-blue-600 mt-2">{data.cantidadGastos || 0} gastos registrados</p>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <p className="text-sm text-green-700 mb-1">Promedio por Gasto</p>
          <p className="text-3xl font-bold text-green-900">
            ${data.cantidadGastos > 0
              ? (data.totalGastos / data.cantidadGastos).toLocaleString('es-AR', { minimumFractionDigits: 2 })
              : '0.00'}
          </p>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
          <p className="text-sm text-purple-700 mb-1">Categorías Activas</p>
          <p className="text-3xl font-bold text-purple-900">{data.topCategorias.length}</p>
        </div>
      </div>

      {/* Gráfico de tendencia mensual */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Tendencia de Gastos (Últimos 6 Meses)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.gastosPorMes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip formatter={(value: number) => `$${value.toLocaleString('es-AR')}`} />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total Gastos" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top categorías */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Top 5 Categorías</h3>
        <div className="space-y-3">
          {data.topCategorias.map((cat: any, index: number) => (
            <div key={cat.categoria} className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div>
                  <p className="font-medium">{cat.categoria}</p>
                  <p className="text-xs text-gray-600">{cat.cantidad} gastos</p>
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900">
                ${cat.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Componente: Gastos por Categoría
function GastosPorCategoria({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Gastos por Categoría</h1>
        <p className="text-gray-500 text-center py-12">No hay datos disponibles para el período seleccionado</p>
      </div>
    );
  }

  const pieData = data.map((item) => ({
    name: item.categoria,
    value: item.total,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gastos por Categoría</h1>
        <p className="text-gray-600 mt-1">Distribución de gastos por categoría</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de torta */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Distribución</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${value.toLocaleString('es-AR')}`} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla de datos */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Detalle por Categoría</h3>
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={item.categoria} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <p className="font-medium">{item.categoria}</p>
                    <p className="text-xs text-gray-600">{item.cantidad} gastos</p>
                  </div>
                </div>
                <p className="font-bold text-gray-900">
                  ${item.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Comparativa</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="categoria" />
            <YAxis />
            <Tooltip formatter={(value: number) => `$${value.toLocaleString('es-AR')}`} />
            <Legend />
            <Bar dataKey="total" fill="#3b82f6" name="Total" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Componente: Gastos por Cuenta
function GastosPorCuenta({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Gastos por Cuenta</h1>
        <p className="text-gray-500 text-center py-12">No hay datos disponibles para el período seleccionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gastos por Cuenta</h1>
        <p className="text-gray-600 mt-1">Análisis de gastos por cuenta bancaria</p>
      </div>

      {/* Gráfico de barras */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Comparativa de Cuentas</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="cuentaNombre" />
            <YAxis />
            <Tooltip formatter={(value: number) => `$${value.toLocaleString('es-AR')}`} />
            <Legend />
            <Bar dataKey="total" fill="#10b981" name="Total" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla detallada */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Detalle por Cuenta</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((cuenta) => (
                <tr key={cuenta.cuentaId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{cuenta.cuentaNombre}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      cuenta.cuentaTipo === 'EMPRESA' ? 'bg-blue-100 text-blue-800' :
                      cuenta.cuentaTipo === 'PERSONAL' ? 'bg-purple-100 text-purple-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {cuenta.cuentaTipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{cuenta.cantidad}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    ${cuenta.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Componente: Gastos por Campo
function GastosPorCampo({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Gastos por Campo</h1>
        <p className="text-gray-500 text-center py-12">No hay datos disponibles para el período seleccionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gastos por Campo</h1>
        <p className="text-gray-600 mt-1">Análisis de inversión por campo</p>
      </div>

      {/* Gráfico de barras */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Total por Campo</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="campoNombre" />
            <YAxis />
            <Tooltip formatter={(value: number) => `$${value.toLocaleString('es-AR')}`} />
            <Legend />
            <Bar dataKey="total" fill="#f59e0b" name="Total Invertido" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla con costo por hectárea */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Detalle por Campo</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hectáreas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gastos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">$/Ha</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((campo) => (
                <tr key={campo.campoId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{campo.campoNombre}</td>
                  <td className="px-4 py-3 text-right">{campo.hectareas.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{campo.cantidad}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    ${campo.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 font-semibold">
                    ${campo.costoPorHectarea.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Componente: Servicios Realizados
function ServiciosRealizados({
  data,
  filtros
}: {
  data: any[];
  filtros: {
    fechaInicio: string;
    fechaFin: string;
    campos: any[];
    lotes: any[];
    contratistas: any[];
  };
}) {
  const reportRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Servicios Realizados</h1>
        <p className="text-gray-500 text-center py-12">No hay datos disponibles para el período seleccionado</p>
      </div>
    );
  }

  const totalCosto = data.reduce((sum, srv) => sum + srv.totalCosto, 0);
  const totalHectareas = data.reduce((sum, srv) => sum + srv.totalHectareas, 0);

  const descargarPDF = async () => {
    if (!reportRef.current) return;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;

      // Encabezado personalizado
      pdf.setFillColor(0, 100, 0); // Verde oscuro
      pdf.rect(0, 0, pageWidth, 40, 'F');

      // Nombre de la empresa
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('AGROINDUSTRIAS ARGENTINAS SRL', pageWidth / 2, 18, { align: 'center' });

      // Fecha de generación
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const fechaGeneracion = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      pdf.text(`Fecha de generación: ${fechaGeneracion}`, pageWidth / 2, 28, { align: 'center' });

      yPosition = 50;

      // Título del reporte
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REPORTE DE SERVICIOS REALIZADOS', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Filtros aplicados
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);

      const filtrosTexto: string[] = [];

      // Periodo
      if (filtros.fechaInicio && filtros.fechaFin) {
        const fechaInicioFormat = new Date(filtros.fechaInicio).toLocaleDateString('es-AR');
        const fechaFinFormat = new Date(filtros.fechaFin).toLocaleDateString('es-AR');
        filtrosTexto.push(`Período: ${fechaInicioFormat} - ${fechaFinFormat}`);
      }

      // Campos
      if (filtros.campos.length > 0) {
        const camposNombres = filtros.campos.map(c => c.nombre).join(', ');
        filtrosTexto.push(`Campos: ${camposNombres}`);
      }

      // Lotes
      if (filtros.lotes.length > 0) {
        const lotesNombres = filtros.lotes.map(l => l.nombre).join(', ');
        filtrosTexto.push(`Lotes: ${lotesNombres}`);
      }

      // Contratistas
      if (filtros.contratistas.length > 0) {
        const contratistasNombres = filtros.contratistas.map(c => `${c.nombre} ${c.apellido || ''}`).join(', ');
        filtrosTexto.push(`Contratistas: ${contratistasNombres}`);
      }

      // Si hay filtros, mostrarlos
      if (filtrosTexto.length > 0) {
        filtrosTexto.forEach(linea => {
          pdf.text(linea, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 5;
        });
      } else {
        pdf.text('Sin filtros aplicados', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 5;
      }

      yPosition += 5; // Espacio adicional antes del contenido

      // Capturar el contenido del reporte
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 20; // Márgenes de 10mm a cada lado
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Verificar si necesitamos múltiples páginas
      const remainingHeight = pageHeight - yPosition - 10;
      if (imgHeight > remainingHeight) {
        // Agregar imagen con ajuste
        pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, Math.min(imgHeight, remainingHeight));

        // Si la imagen es muy grande, agregar más páginas
        let remainingImgHeight = imgHeight - remainingHeight;
        let srcYOffset = remainingHeight;

        while (remainingImgHeight > 0) {
          pdf.addPage();
          const nextPageHeight = Math.min(remainingImgHeight, pageHeight - 20);
          pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, nextPageHeight);
          srcYOffset += nextPageHeight;
          remainingImgHeight -= nextPageHeight;
        }
      } else {
        pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);
      }

      // Pie de página
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      pdf.save(`Servicios-Realizados-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicios Realizados</h1>
          <p className="text-gray-600 mt-1">Análisis de servicios por tipo</p>
        </div>
        <button
          onClick={descargarPDF}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
        >
          <Download className="w-5 h-5" />
          <span>Descargar PDF</span>
        </button>
      </div>

      <div ref={reportRef}>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
          <p className="text-sm text-purple-700 mb-1">Total Invertido</p>
          <p className="text-3xl font-bold text-purple-900">
            ${totalCosto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <p className="text-sm text-green-700 mb-1">Total Hectáreas</p>
          <p className="text-3xl font-bold text-green-900">
            {totalHectareas.toFixed(2)} ha
          </p>
        </div>
        <div className="card bg-gradient-to-br from-orange-50 to-orange-100">
          <p className="text-sm text-orange-700 mb-1">Costo Promedio/Ha</p>
          <p className="text-3xl font-bold text-orange-900">
            ${totalHectareas > 0 ? (totalCosto / totalHectareas).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0.00'}
          </p>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Costo Total por Tipo de Servicio</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tipo" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
            />
            <Legend />
            <Bar dataKey="totalCosto" fill="#8b5cf6" name="Costo Total" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla detallada */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Detalle por Tipo de Servicio</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hectáreas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">$/Ha</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((servicio) => (
                <tr key={servicio.tipo} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{servicio.tipo}</td>
                  <td className="px-4 py-3 text-right">{servicio.cantidad}</td>
                  <td className="px-4 py-3 text-right">{servicio.totalHectareas.toFixed(2)} ha</td>
                  <td className="px-4 py-3 text-right font-bold">
                    ${servicio.totalCosto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-purple-600 font-semibold">
                    ${servicio.costoPorHectarea.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}

// Componente: Consumo de Stock
function ConsumoStock({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Consumo de Stock</h1>
        <p className="text-gray-500 text-center py-12">No hay datos disponibles para el período seleccionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consumo de Stock</h1>
        <p className="text-gray-600 mt-1">Productos más consumidos en el período</p>
      </div>

      {/* Gráfico de barras */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Top 10 Productos Consumidos</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="nombre" type="category" width={150} />
            <Tooltip />
            <Legend />
            <Bar dataKey="cantidadConsumida" fill="#8b5cf6" name="Cantidad Consumida" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla detallada */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Detalle de Consumo</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Consumido</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Movimientos</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item) => (
                <tr key={item.stockId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.nombre}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {item.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {item.cantidadConsumida.toFixed(2)} {item.unidad}
                  </td>
                  <td className="px-4 py-3 text-right">{item.cantidadMovimientos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Componente: Reporte de Rendimientos
function ReporteRendimientos({
  data,
  filtros
}: {
  data: any[];
  filtros: {
    fechaInicio: string;
    fechaFin: string;
    campos: any[];
    lotes: any[];
    cultivos: string[];
  };
}) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Reporte de Rendimientos</h1>
        <p className="text-gray-500 text-center py-12">No hay datos disponibles para el período seleccionado</p>
      </div>
    );
  }

  // Calcular totales
  const totalSuperficie = data.reduce((sum, item) => sum + (item.totalSuperficie || 0), 0);
  const totalProduccion = data.reduce((sum, item) => sum + (item.totalCantidad || 0), 0);
  const promedioRendimiento = totalSuperficie > 0 ? totalProduccion / totalSuperficie : 0;

  // Preparar datos para gráfico por cultivo
  const dataPorCultivo = data.flatMap(campo =>
    campo.cultivos?.map((c: any) => ({
      cultivo: c.cultivo,
      rendimiento: c.promedioRendimiento,
      superficie: c.totalSuperficie,
      cantidad: c.totalCantidad
    })) || []
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reporte de Rendimientos</h1>
        <p className="text-gray-600 mt-1">Análisis de producción por campo, lote y cultivo</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <p className="text-sm text-green-700 mb-1">Superficie Total</p>
          <p className="text-3xl font-bold text-green-900">
            {totalSuperficie.toFixed(2)} ha
          </p>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100">
          <p className="text-sm text-yellow-700 mb-1">Producción Total</p>
          <p className="text-3xl font-bold text-yellow-900">
            {totalProduccion.toFixed(2)} tn
          </p>
        </div>
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
          <p className="text-sm text-blue-700 mb-1">Rendimiento Promedio</p>
          <p className="text-3xl font-bold text-blue-900">
            {promedioRendimiento.toFixed(2)} tn/ha
          </p>
        </div>
      </div>

      {/* Gráfico de rendimientos por cultivo */}
      {dataPorCultivo.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Rendimiento por Cultivo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataPorCultivo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="cultivo" />
              <YAxis label={{ value: 'tn/ha', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(2)} tn/ha`}
              />
              <Legend />
              <Bar dataKey="rendimiento" fill="#10b981" name="Rendimiento (tn/ha)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla detallada por campo */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Detalle por Campo y Cultivo</h3>
        <div className="space-y-4">
          {data.map((campo) => (
            <div key={campo.campoId} className="border rounded-lg p-4">
              <h4 className="font-bold text-lg text-gray-900 mb-3">
                {campo.campoNombre || 'Campo sin nombre'}
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cultivo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cosechas</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Superficie (ha)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Producción (tn)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rendimiento (tn/ha)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {campo.cultivos?.map((cultivo: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {cultivo.cultivo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{cultivo.cantidad}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {cultivo.totalSuperficie.toFixed(2)} ha
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-yellow-600">
                          {cultivo.totalCantidad.toFixed(2)} tn
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-600">
                          {cultivo.promedioRendimiento.toFixed(2)} tn/ha
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
