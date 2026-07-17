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
  const [selectedCampana, setSelectedCampana] = useState('');

  // Filtro por campaña (para gastos/servicios)
  const [campanas, setCampanas] = useState<any[]>([]);
  const [selectedCampanaFilter, setSelectedCampanaFilter] = useState('');

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
      const [camposRes, maquinariasRes, contratistasRes, campanasRes] = await Promise.all([
        api.get('/campos'),
        api.get('/maquinarias'),
        api.get('/contratistas'),
        api.get('/campanas'),
      ]);

      setCampos(camposRes.data);
      setMaquinarias(maquinariasRes.data);
      setContratistas(contratistasRes.data);
      const camps = campanasRes.data;
      setCampanas(camps);
      if (camps.length > 0) {
        setSelectedCampana(prev => prev || camps[0].nombre);
      }

      // Cargar todos los lotes de todos los campos
      const todosLotes: any[] = [];
      camposRes.data.forEach((campo: any) => {
        if (campo.lotes) {
          todosLotes.push(...campo.lotes.map((lote: any) => ({
            ...lote,
            campoId: campo.id,
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
    setSelectedCampanaFilter('');
  }, [selectedReport]);

  useEffect(() => {
    const loadReportData = async () => {
      const hasFechas = !!(fechaInicio && fechaFin);
      const isRendimientos = selectedReport === 'rendimientos';
      const canRun = hasFechas || selectedCampanaFilter || isRendimientos;
      if (!canRun) return;

      setLoading(true);
      try {
        const parts: string[] = [];
        if (hasFechas) parts.push(`fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);

        // Agregar filtros adicionales según el reporte
        if (selectedCampos.length > 0 && (selectedReport === 'categoria' || selectedReport === 'cuenta' || selectedReport === 'servicios' || selectedReport === 'stock' || selectedReport === 'campos' || selectedReport === 'gastos')) {
          parts.push(`campoIds=${selectedCampos.join(',')}`);
        }

        if (selectedLotes.length > 0) {
          parts.push(`loteIds=${selectedLotes.join(',')}`);
        }

        if (selectedMaquinarias.length > 0 && selectedReport === 'stock') {
          parts.push(`maquinariaIds=${selectedMaquinarias.join(',')}`);
        }

        if (selectedContratistas.length > 0 && selectedReport === 'servicios') {
          parts.push(`contratistaIds=${selectedContratistas.join(',')}`);
        }

        if (selectedCampanaFilter && (selectedReport === 'gastos' || selectedReport === 'servicios' || selectedReport === 'campos' || selectedReport === 'stock')) {
          parts.push(`campanaId=${selectedCampanaFilter}`);
        }


        const params = parts.length > 0 ? `?${parts.join('&')}` : '';

        switch (selectedReport) {
          case 'campos':
            const [gastosRes, srvRes, stckRes, rndRes] = await Promise.all([
              api.get(`/reportes/gastos-por-categoria${params}`),
              api.get(`/reportes/servicios-realizados${params}`),
              api.get(`/reportes/consumo-stock${params}`),
              api.get(`/reportes/rendimientos${params}`),
            ]);
            setCategoriaData(gastosRes.data);
            setServiciosData(srvRes.data);
            setStockData(stckRes.data);
            setRendimientosData(rndRes.data);
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
          case 'rendimientos': {
            let rndParams = `?campana=${encodeURIComponent(selectedCampana)}`;
            if (selectedCampos.length > 0) rndParams += `&campoIds=${selectedCampos.join(',')}`;
            if (selectedLotes.length > 0) rndParams += `&loteIds=${selectedLotes.join(',')}`;
            const rndRes2 = await api.get(`/reportes/rendimientos${rndParams}`);
            setRendimientosData(rndRes2.data);
            break;
          }
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
  }, [selectedReport, fechaInicio, fechaFin, selectedCampos, selectedLotes, selectedMaquinarias, selectedContratistas, selectedCampana, selectedCampanaFilter]);

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
        <div className="card sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
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
                {/* Filtro por campos */}
                {(selectedReport === 'categoria' || selectedReport === 'cuenta' || selectedReport === 'servicios' || selectedReport === 'stock' || selectedReport === 'rendimientos' || selectedReport === 'campos' || selectedReport === 'gastos') && (
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
                                      setSelectedLotes(prev => prev.filter(loteId => {
                                        const lote = lotes.find(l => l.id === loteId);
                                        return lote && lote.campoId !== campo.id;
                                      }));
                                    }
                                    setCamposOpen(false);
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
                  {lotesOpen && (() => {
                    const lotesFiltrados = selectedCampos.length > 0
                      ? lotes.filter(l => selectedCampos.includes(l.campoId))
                      : lotes;
                    return (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                      {lotesFiltrados.length === 0 ? (
                        <p className="text-xs text-gray-400 p-2">No hay lotes</p>
                      ) : (
                        <div className="p-2 space-y-1">
                          {lotesFiltrados.map((lote) => (
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
                                  setLotesOpen(false);
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs">{lote.nombre} <span className="text-gray-400">({lote.campoNombre})</span></span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    );
                  })()}
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
                                    setMaquinariasOpen(false);
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
                                    setContratistasOpen(false);
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

                {/* Filtro por campaña (gastos/servicios/stock/campos) */}
                {(selectedReport === 'gastos' || selectedReport === 'servicios' || selectedReport === 'campos' || selectedReport === 'stock') && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Campaña</label>
                    <select
                      value={selectedCampanaFilter}
                      onChange={e => {
                        setSelectedCampanaFilter(e.target.value);
                        if (e.target.value) { setFechaInicio(''); setFechaFin(''); }
                      }}
                      className="w-full text-xs border border-gray-300 rounded p-2 bg-white"
                    >
                      <option value="">Todas las campañas</option>
                      {campanas.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Filtro por campaña (solo para rendimientos) */}
                {selectedReport === 'rendimientos' && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Campaña</label>
                    <select
                      value={selectedCampana}
                      onChange={e => {
                        setSelectedCampana(e.target.value);
                        setFechaInicio('');
                        setFechaFin('');
                      }}
                      className="w-full text-xs border border-gray-300 rounded p-2 bg-white"
                    >
                      {campanas.map(c => (
                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}


                {/* Botón limpiar filtros */}
                {(selectedCampos.length > 0 || selectedLotes.length > 0 || selectedMaquinarias.length > 0 || selectedContratistas.length > 0) && (
                  <button
                    onClick={() => {
                      setSelectedCampos([]);
                      setSelectedLotes([]);
                      setSelectedMaquinarias([]);
                      setSelectedContratistas([]);
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
            {selectedReport === 'campos' && (
              <ReporteCampo
                gastos={categoriaData}
                servicios={serviciosData}
                stock={stockData}
                rendimientos={rendimientosData}
                campoNombre={selectedCampos.length === 1 ? (campos.find(c => c.id === selectedCampos[0])?.nombre || '') : selectedCampos.length > 1 ? `${selectedCampos.length} campos` : ''}
                hectareas={
                  selectedLotes.length > 0
                    ? lotes.filter(l => selectedLotes.includes(l.id)).reduce((s, l) => s + (l.hectareas || 0), 0)
                    : selectedCampos.length > 0
                      ? campos.filter(c => selectedCampos.includes(c.id)).reduce((s, c) => s + (c.hectareas || 0), 0)
                      : 0
                }
              />
            )}
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
                campana={selectedCampana}
              />
            )}
            {selectedReport === 'contabilidad' && resumenData && <ResumenGeneral data={resumenData} />}
          </>
        )}
      </div>
    </div>
  );
}

// Componente: Reporte Completo por Campo/Lote
function ReporteCampo({
  gastos,
  servicios,
  stock,
  rendimientos,
  campoNombre,
  hectareas,
}: {
  gastos: any[];
  servicios: any[];
  stock: any[];
  rendimientos: any[];
  campoNombre: string;
  hectareas: number;
}) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [preciosUnitarios, setPreciosUnitarios] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    stock.forEach((item: any) => {
      if (item.precioUnitario != null) {
        initial[item.stockId] = item.precioUnitario.toFixed(2);
      }
    });
    setPreciosUnitarios(initial);
  }, [stock]);

  const handlePrecioBlur = async (stockId: string, value: string) => {
    const precioNum = value !== '' ? parseFloat(value) : null;
    try {
      await api.put(`/stock/${stockId}`, { precioUnitario: precioNum });
    } catch (error) {
      console.error('Error al guardar precio unitario:', error);
    }
  };

  const sinDatos = gastos.length === 0 && servicios.length === 0 && stock.length === 0 && rendimientos.length === 0;

  const totalGastosARS = gastos.filter(g => g.moneda !== 'USD').reduce((s, g) => s + g.total, 0);
  const totalGastosUSD = gastos.filter(g => g.moneda === 'USD').reduce((s, g) => s + g.total, 0);
  const totalServiciosARS = servicios.filter(s => s.moneda !== 'USD').reduce((s, srv) => s + srv.totalCosto, 0);
  const totalServiciosUSD = servicios.filter(s => s.moneda === 'USD').reduce((s, srv) => s + srv.totalCosto, 0);
  const totalProduccion = rendimientos.reduce((s, r) => s + (r.totalCantidad || 0), 0);
  const CATEGORIAS_USD = ['Agroquímicos'];
  const esUSD = (categoria: string) => CATEGORIAS_USD.includes(categoria);

  const getPrecioEfectivo = (item: any) => {
    const pu = preciosUnitarios[item.stockId];
    const puVal = pu !== undefined && pu !== '' ? parseFloat(pu) : null;
    return puVal != null && !isNaN(puVal) ? puVal : item.precioPromedio;
  };

  const totalInsumosARS = stock.reduce((acc: number, item: any) => {
    if (esUSD(item.categoria)) return acc;
    const p = getPrecioEfectivo(item);
    if (p != null && !isNaN(p)) return acc + p * item.cantidadConsumida;
    return acc;
  }, 0);
  const totalInsumosUSD = stock.reduce((acc: number, item: any) => {
    if (!esUSD(item.categoria)) return acc;
    const p = getPrecioEfectivo(item);
    if (p != null && !isNaN(p)) return acc + p * item.cantidadConsumida;
    return acc;
  }, 0);

  const costoPorHa = hectareas > 0 ? (totalGastosARS + totalServiciosARS + totalInsumosARS) / hectareas : 0;
  const costoPorHaUSD = hectareas > 0 ? (totalGastosUSD + totalServiciosUSD + totalInsumosUSD) / hectareas : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Informe de Campo {campoNombre ? `- ${campoNombre}` : ''}
          </h1>
          <p className="text-gray-600 mt-1">Resumen completo: gastos, servicios, stock y rendimientos</p>
        </div>
        <button
          onClick={() => generarPDF(reportRef, `INFORME DE CAMPO${campoNombre ? ' - ' + campoNombre : ''}`, 'Informe-Campo')}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
        >
          <Download className="w-5 h-5" />
          <span>Descargar PDF</span>
        </button>
      </div>

      {sinDatos ? (
        <div className="card">
          <p className="text-gray-500 text-center py-12">No hay datos disponibles para el período y filtros seleccionados</p>
        </div>
      ) : (
        <div ref={reportRef} className="space-y-6">

          {/* KPIs resumen */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Gastos */}
            <div className="overflow-hidden rounded-xl border border-blue-200 shadow-sm">
              <div className="bg-blue-50 px-4 py-3">
                <p className="text-xs text-blue-600 font-medium mb-1">Gastos · ARS</p>
                <p className="text-lg font-bold text-blue-900">${totalGastosARS.toLocaleString('es-AR', { minimumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-blue-100 px-4 py-3">
                <p className="text-xs text-blue-600 font-medium mb-1">Gastos · USD</p>
                <p className="text-lg font-bold text-blue-800">{totalGastosUSD > 0 ? `USD ${totalGastosUSD.toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : '-'}</p>
              </div>
            </div>
            {/* Servicios */}
            <div className="overflow-hidden rounded-xl border border-purple-200 shadow-sm">
              <div className="bg-purple-50 px-4 py-3">
                <p className="text-xs text-purple-600 font-medium mb-1">Servicios · ARS</p>
                <p className="text-lg font-bold text-purple-900">${totalServiciosARS.toLocaleString('es-AR', { minimumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-purple-100 px-4 py-3">
                <p className="text-xs text-purple-600 font-medium mb-1">Servicios · USD</p>
                <p className="text-lg font-bold text-purple-800">{totalServiciosUSD > 0 ? `USD ${totalServiciosUSD.toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : '-'}</p>
              </div>
            </div>
            {/* Costo por Ha */}
            <div className="overflow-hidden rounded-xl border border-green-200 shadow-sm">
              <div className="bg-green-50 px-4 py-3">
                <p className="text-xs text-green-600 font-medium mb-1">Costo/Ha · ARS</p>
                <p className="text-lg font-bold text-green-900">{hectareas > 0 ? `$${costoPorHa.toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : '-'}</p>
                {hectareas > 0 && <p className="text-xs text-green-600 mt-1">{hectareas.toFixed(1)} ha</p>}
              </div>
              <div className="bg-green-100 px-4 py-3">
                <p className="text-xs text-green-600 font-medium mb-1">Costo/Ha · USD</p>
                <p className="text-lg font-bold text-green-800">{hectareas > 0 && costoPorHaUSD > 0 ? `USD ${costoPorHaUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'}</p>
              </div>
            </div>
            {/* Producción */}
            <div className="overflow-hidden rounded-xl border border-yellow-200 shadow-sm">
              <div className="bg-yellow-50 px-4 py-3">
                <p className="text-xs text-yellow-600 font-medium mb-1">Producción total</p>
                <p className="text-lg font-bold text-yellow-900">{totalProduccion.toFixed(2)} tn</p>
              </div>
              <div className="bg-yellow-100 px-4 py-3 flex items-center justify-center">
                <p className="text-xs text-yellow-500 italic">—</p>
              </div>
            </div>
            {/* Insumos */}
            <div className="overflow-hidden rounded-xl border border-orange-200 shadow-sm">
              <div className="bg-orange-50 px-4 py-3">
                <p className="text-xs text-orange-600 font-medium mb-1">Insumos · ARS</p>
                <p className="text-lg font-bold text-orange-900">{totalInsumosARS > 0 ? `$${totalInsumosARS.toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : '-'}</p>
              </div>
              <div className="bg-orange-100 px-4 py-3">
                <p className="text-xs text-orange-600 font-medium mb-1">Insumos · USD</p>
                <p className="text-lg font-bold text-orange-800">{totalInsumosUSD > 0 ? `USD ${totalInsumosUSD.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</p>
                {stock.some((item: any) => {
                  const p = getPrecioEfectivo(item);
                  return p == null || isNaN(p);
                }) && <p className="text-xs text-orange-500 mt-1">* parcial</p>}
              </div>
            </div>
            {/* Total */}
            <div className="overflow-hidden rounded-xl border border-gray-300 shadow-sm">
              <div className="bg-gray-100 px-4 py-3">
                <p className="text-xs text-gray-600 font-medium mb-1">Total · ARS</p>
                <p className="text-lg font-bold text-gray-900">${(totalGastosARS + totalServiciosARS + totalInsumosARS).toLocaleString('es-AR', { minimumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-gray-200 px-4 py-3">
                <p className="text-xs text-gray-600 font-medium mb-1">Total · USD</p>
                <p className="text-lg font-bold text-gray-800">{(totalGastosUSD + totalServiciosUSD + totalInsumosUSD) > 0 ? `USD ${(totalGastosUSD + totalServiciosUSD + totalInsumosUSD).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</p>
              </div>
            </div>
          </div>

          {/* Sección Gastos */}
          {gastos.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4 text-blue-800 border-b pb-2">Gastos por Categoría</h3>
              <div className="space-y-2">
                {gastos.map((item, index) => (
                  <div key={`${item.categoria}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.categoria}</p>
                      <p className="text-xs text-gray-500">{item.cantidad} gastos</p>
                    </div>
                    <p className="font-bold">
                      {item.moneda === 'USD' ? 'USD ' : '$'}
                      {item.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección Servicios */}
          {servicios.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4 text-purple-800 border-b pb-2">Servicios Realizados</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hectáreas</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {servicios.map((srv) => (
                      <tr key={`${srv.tipo}-${srv.moneda}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">
                          {srv.tipo}
                          {srv.moneda === 'USD' && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">USD</span>}
                        </td>
                        <td className="px-4 py-3 text-right">{srv.cantidad}</td>
                        <td className="px-4 py-3 text-right">{srv.totalHectareas.toFixed(2)} ha</td>
                        <td className="px-4 py-3 text-right font-bold">
                          {srv.moneda === 'USD' ? 'USD ' : '$'}{srv.totalCosto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sección Stock */}
          {stock.length > 0 && (() => {
            const categoriaBadge: Record<string, string> = {
              'Agroquímicos': 'bg-orange-100 text-orange-800',
              'Semillas': 'bg-green-100 text-green-800',
              'Fertilizantes': 'bg-blue-100 text-blue-800',
              'Combustibles': 'bg-yellow-100 text-yellow-800',
              'Lubricantes': 'bg-gray-200 text-gray-800',
              'Repuestos': 'bg-purple-100 text-purple-800',
              'Herramientas': 'bg-red-100 text-red-800',
            };
            const getBadge = (cat: string) => categoriaBadge[cat] || 'bg-gray-100 text-gray-700';

            const grupos: Record<string, typeof stock> = {};
            stock.forEach((item: any) => {
              if (!grupos[item.categoria]) grupos[item.categoria] = [];
              grupos[item.categoria].push(item);
            });

            return (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 text-orange-800 border-b pb-2">Consumo de Stock / Insumos</h3>
                {Object.entries(grupos).map(([categoria, items]) => (
                  <div key={categoria} className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getBadge(categoria)}`}>{categoria}</span>
                      <span className="text-xs text-gray-400">{items.length} producto{items.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Consumido</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Sugerido</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Unitario</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Estimado</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {items.map((item: any) => {
                            const moneda = esUSD(categoria) ? 'USD' : '$';
                            const precioEfectivo = getPrecioEfectivo(item);
                            const costoEstimado = precioEfectivo != null && !isNaN(precioEfectivo) ? precioEfectivo * item.cantidadConsumida : null;
                            return (
                              <tr key={item.stockId} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{item.nombre}</td>
                                <td className="px-4 py-3 text-right font-bold">{item.cantidadConsumida.toFixed(2)} {item.unidad}</td>
                                <td className="px-4 py-3 text-right text-gray-500 text-sm">
                                  {item.precioPromedio != null ? `${moneda} ${parseFloat(item.precioPromedio.toFixed(2)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-gray-400">-</span>}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={preciosUnitarios[item.stockId] ?? ''}
                                    onChange={(e) => setPreciosUnitarios((prev) => ({ ...prev, [item.stockId]: e.target.value }))}
                                    onBlur={(e) => handlePrecioBlur(item.stockId, e.target.value)}
                                    placeholder="-"
                                    className="w-28 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                                  />
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {costoEstimado != null
                                    ? `${moneda} ${costoEstimado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : <span className="text-gray-400">-</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {(() => {
                          const moneda = esUSD(categoria) ? 'USD' : '$';
                          const totalCosto = items.reduce((acc: number, item: any) => {
                            const p = getPrecioEfectivo(item);
                            if (p != null && !isNaN(p)) return acc + p * item.cantidadConsumida;
                            return acc;
                          }, 0);
                          const hayPrecios = items.some((item: any) => {
                            const p = getPrecioEfectivo(item);
                            return p != null && !isNaN(p);
                          });
                          return hayPrecios ? (
                            <tfoot className="bg-gray-50">
                              <tr>
                                <td className="px-4 py-2 text-xs font-semibold text-gray-600" colSpan={4}>Total estimado</td>
                                <td className="px-4 py-2 text-right text-sm font-bold text-gray-800">
                                  {moneda} {totalCosto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tfoot>
                          ) : null;
                        })()}
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Sección Rendimientos */}
          {rendimientos.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4 text-green-800 border-b pb-2">Rendimientos / Cosechas</h3>
              {rendimientos.map((campo) => (
                <div key={campo.campoId} className="mb-4">
                  {rendimientos.length > 1 && (
                    <h4 className="font-semibold text-gray-700 mb-2">{campo.campoNombre}</h4>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cultivo</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cosechas</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Superficie (ha)</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Producción (tn)</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rend. (tn/ha)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {campo.cultivos?.map((cultivo: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{cultivo.cultivo}</span>
                            </td>
                            <td className="px-4 py-3 text-right">{cultivo.cantidad}</td>
                            <td className="px-4 py-3 text-right">{cultivo.totalSuperficie.toFixed(2)} ha</td>
                            <td className="px-4 py-3 text-right font-semibold text-yellow-600">{cultivo.totalCantidad.toFixed(2)} tn</td>
                            <td className="px-4 py-3 text-right font-bold text-blue-600">{cultivo.promedioRendimiento.toFixed(2)} tn/ha</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// Helper: Generar PDF reutilizable
async function generarPDF(ref: React.RefObject<HTMLDivElement>, titulo: string, nombreArchivo: string) {
  if (!ref.current) return;
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 15;

    pdf.setFillColor(0, 100, 0);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(import.meta.env.VITE_COMPANY_NAME || 'AGROINDUSTRIAS ARGENTINAS SRL', pageWidth / 2, 18, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const fechaGeneracion = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    pdf.text(`Fecha de generación: ${fechaGeneracion}`, pageWidth / 2, 28, { align: 'center' });

    yPosition = 50;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(titulo, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Clonar el contenido y reemplazar inputs por texto plano
    const clone = ref.current.cloneNode(true) as HTMLElement;
    clone.style.width = '800px';
    clone.style.fontSize = '13px';
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.background = 'white';

    // Reemplazar cada input por un span con su valor
    const inputs = clone.querySelectorAll('input');
    inputs.forEach((input) => {
      const span = document.createElement('span');
      span.textContent = (input as HTMLInputElement).value || '-';
      span.style.fontSize = '13px';
      span.style.fontWeight = '500';
      input.parentNode?.replaceChild(span, input);
    });

    document.body.appendChild(clone);

    const canvas = await html2canvas(clone, {
      scale: 2,
      logging: false,
      useCORS: true,
      width: 800,
      windowWidth: 800,
    });

    document.body.removeChild(clone);

    const imgWidth = pageWidth - 20;
    const scale = imgWidth / canvas.width;
    const pageContentHeightPx = (pageHeight - yPosition - 10) / scale;
    const pageHeightPx = (pageHeight - 20) / scale;

    let sourceY = 0;
    let currentTopMm = yPosition;

    while (sourceY < canvas.height) {
      const sliceHeightPx = sourceY === 0 ? pageContentHeightPx : pageHeightPx;
      const actualSlicePx = Math.min(sliceHeightPx, canvas.height - sourceY);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = actualSlicePx;
      const ctx = tempCanvas.getContext('2d')!;
      ctx.drawImage(canvas, 0, sourceY, canvas.width, actualSlicePx, 0, 0, canvas.width, actualSlicePx);

      const sliceHeightMm = actualSlicePx * scale;
      pdf.addImage(tempCanvas.toDataURL('image/png'), 'PNG', 10, currentTopMm, imgWidth, sliceHeightMm);

      sourceY += actualSlicePx;
      if (sourceY < canvas.height) {
        pdf.addPage();
        currentTopMm = 10;
      }
    }

    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    pdf.save(`${nombreArchivo}-${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    alert('Error al generar el PDF');
  }
}

// Componente: Resumen General
function ResumenGeneral({ data }: { data: any }) {
  const reportRef = useRef<HTMLDivElement>(null);

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resumen General</h1>
          <p className="text-gray-600 mt-1">Vista general de gastos y tendencias</p>
        </div>
        <button
          onClick={() => generarPDF(reportRef, 'RESUMEN GENERAL DE GASTOS', 'Resumen-General')}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
        >
          <Download className="w-5 h-5" />
          <span>Descargar PDF</span>
        </button>
      </div>

      <div ref={reportRef}>

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
    </div>
  );
}

// Componente: Gastos por Categoría
function GastosPorCategoria({ data }: { data: any[] }) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const toggleCat = (cat: string) => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos por Categoría</h1>
          <p className="text-gray-600 mt-1">Distribución de gastos por categoría</p>
        </div>
        <button
          onClick={() => generarPDF(reportRef, 'GASTOS POR CATEGORÍA', 'Gastos-por-Categoria')}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
        >
          <Download className="w-5 h-5" />
          <span>Descargar PDF</span>
        </button>
      </div>

      <div ref={reportRef}>

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
              <div key={item.categoria}>
                <button
                  type="button"
                  onClick={() => toggleCat(item.categoria)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <div className="text-left">
                      <p className="font-medium">{item.categoria}</p>
                      <p className="text-xs text-gray-600">{item.cantidad} gastos</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="font-bold text-gray-900">${item.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                    {expandedCats[item.categoria] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                {expandedCats[item.categoria] && (
                  <div className="mt-1 ml-7 border-l-2 border-gray-200 pl-3 space-y-1">
                    {(item.gastos?.length > 0) ? item.gastos.map((g: any) => (
                      <div key={g.id} className="flex items-center justify-between py-1.5 px-2 text-sm hover:bg-gray-50 rounded">
                        <div>
                          <span className="text-gray-800">{g.concepto}</span>
                          {g.descripcion && <span className="text-gray-400 ml-2 text-xs">— {g.descripcion}</span>}
                          <span className="text-gray-400 ml-2 text-xs">{new Date(g.fecha).toLocaleDateString('es-AR')}</span>
                        </div>
                        <span className="font-medium text-gray-700 ml-4 flex-shrink-0">${g.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-gray-400 py-2 px-2">Sin detalle disponible</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      </div>
    </div>
  );
}

// Componente: Gastos por Cuenta
function GastosPorCuenta({ data }: { data: any[] }) {
  const reportRef = useRef<HTMLDivElement>(null);

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos por Cuenta</h1>
          <p className="text-gray-600 mt-1">Análisis de gastos por cuenta bancaria</p>
        </div>
        <button
          onClick={() => generarPDF(reportRef, 'GASTOS POR CUENTA', 'Gastos-por-Cuenta')}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
        >
          <Download className="w-5 h-5" />
          <span>Descargar PDF</span>
        </button>
      </div>

      <div ref={reportRef}>

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
    </div>
  );
}

// Componente: Gastos por Campo
function GastosPorCampo({ data }: { data: any[] }) {
  const reportRef = useRef<HTMLDivElement>(null);

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos por Campo</h1>
          <p className="text-gray-600 mt-1">Análisis de inversión por campo</p>
        </div>
        <button
          onClick={() => generarPDF(reportRef, 'GASTOS POR CAMPO', 'Gastos-por-Campo')}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
        >
          <Download className="w-5 h-5" />
          <span>Descargar PDF</span>
        </button>
      </div>

      <div ref={reportRef}>

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

  const totalCostoARS = data.filter(s => s.moneda !== 'USD').reduce((sum, srv) => sum + srv.totalCosto, 0);
  const totalCostoUSD = data.filter(s => s.moneda === 'USD').reduce((sum, srv) => sum + srv.totalCosto, 0);
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
      pdf.text(import.meta.env.VITE_COMPANY_NAME || 'AGROINDUSTRIAS ARGENTINAS SRL', pageWidth / 2, 18, { align: 'center' });

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
            ${totalCostoARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          {totalCostoUSD > 0 && (
            <p className="text-lg font-semibold text-blue-700 mt-1">
              USD {totalCostoUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          )}
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
            ${totalHectareas > 0 ? (totalCostoARS / totalHectareas).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0.00'}
          </p>
          {totalCostoUSD > 0 && (
            <p className="text-lg font-semibold text-blue-700 mt-1">
              USD {totalHectareas > 0 ? (totalCostoUSD / totalHectareas).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0.00'}
            </p>
          )}
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Costo Total por Tipo de Servicio</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.map(d => ({ ...d, label: d.moneda === 'USD' ? `${d.tipo} (USD)` : d.tipo }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip
              formatter={(value: number, _name: string, props: any) => {
                const prefijo = props.payload.moneda === 'USD' ? 'USD ' : '$';
                return `${prefijo}${value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
              }}
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
              {data.map((servicio) => {
                const prefijo = servicio.moneda === 'USD' ? 'USD ' : '$';
                return (
                <tr key={`${servicio.tipo}-${servicio.moneda}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {servicio.tipo}
                    {servicio.moneda === 'USD' && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">USD</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{servicio.cantidad}</td>
                  <td className="px-4 py-3 text-right">{servicio.totalHectareas.toFixed(2)} ha</td>
                  <td className="px-4 py-3 text-right font-bold">
                    {prefijo}{servicio.totalCosto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-purple-600 font-semibold">
                    {prefijo}{servicio.costoPorHectarea.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                );
              })}
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
  const reportRef = useRef<HTMLDivElement>(null);
  const [preciosUnitarios, setPreciosUnitarios] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    data.forEach((item: any) => {
      if (item.precioUnitario != null) {
        initial[item.stockId] = item.precioUnitario.toFixed(2);
      }
    });
    setPreciosUnitarios(initial);
  }, [data]);

  const handlePrecioBlur = async (stockId: string, value: string) => {
    const precioNum = value !== '' ? parseFloat(value) : null;
    try {
      await api.put(`/stock/${stockId}`, { precioUnitario: precioNum });
    } catch (error) {
      console.error('Error al guardar precio unitario:', error);
    }
  };

  const getPrecioEfectivo = (item: any) => {
    const pu = preciosUnitarios[item.stockId];
    const puVal = pu !== undefined && pu !== '' ? parseFloat(pu) : null;
    return puVal != null && !isNaN(puVal) ? puVal : item.precioPromedio;
  };

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consumo de Stock</h1>
          <p className="text-gray-600 mt-1">Productos más consumidos en el período</p>
        </div>
        <button
          onClick={() => generarPDF(reportRef, 'CONSUMO DE STOCK', 'Consumo-Stock')}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
        >
          <Download className="w-5 h-5" />
          <span>Descargar PDF</span>
        </button>
      </div>

      <div ref={reportRef}>

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

      {/* Tabla detallada agrupada por categoría */}
      {(() => {
        const CATEGORIAS_USD_CS = ['Agroquímicos'];
        const esUSDCat = (cat: string) => CATEGORIAS_USD_CS.includes(cat);
        const categoriaBadge: Record<string, string> = {
          'Agroquímicos': 'bg-orange-100 text-orange-800',
          'Semillas': 'bg-green-100 text-green-800',
          'Fertilizantes': 'bg-blue-100 text-blue-800',
          'Combustibles': 'bg-yellow-100 text-yellow-800',
          'Lubricantes': 'bg-gray-200 text-gray-800',
          'Repuestos': 'bg-purple-100 text-purple-800',
          'Herramientas': 'bg-red-100 text-red-800',
        };
        const getBadge = (cat: string) => categoriaBadge[cat] || 'bg-gray-100 text-gray-700';

        const grupos: Record<string, typeof data> = {};
        data.forEach((item) => {
          if (!grupos[item.categoria]) grupos[item.categoria] = [];
          grupos[item.categoria].push(item);
        });

        return (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Detalle de Consumo</h3>
            {Object.entries(grupos).map(([categoria, items]) => (
              <div key={categoria} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getBadge(categoria)}`}>{categoria}</span>
                  <span className="text-xs text-gray-400">{items.length} producto{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Consumido</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Sugerido</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Unitario</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Estimado</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item) => {
                        const moneda = esUSDCat(categoria) ? 'USD' : '$';
                        const precioEfectivo = getPrecioEfectivo(item);
                        const costoEstimado = precioEfectivo != null && !isNaN(precioEfectivo) ? precioEfectivo * item.cantidadConsumida : null;
                        return (
                          <tr key={item.stockId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{item.nombre}</td>
                            <td className="px-4 py-3 text-right font-bold">{item.cantidadConsumida.toFixed(2)} {item.unidad}</td>
                            <td className="px-4 py-3 text-right text-gray-500 text-sm">
                              {item.precioPromedio != null ? `${moneda} ${parseFloat(item.precioPromedio.toFixed(2)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={preciosUnitarios[item.stockId] ?? ''}
                                onChange={(e) => setPreciosUnitarios((prev) => ({ ...prev, [item.stockId]: e.target.value }))}
                                onBlur={(e) => handlePrecioBlur(item.stockId, e.target.value)}
                                placeholder="-"
                                className="w-28 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              {costoEstimado != null
                                ? `${moneda} ${costoEstimado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : <span className="text-gray-400">-</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {(() => {
                      const moneda = esUSDCat(categoria) ? 'USD' : '$';
                      const totalCosto = items.reduce((acc, item) => {
                        const p = getPrecioEfectivo(item);
                        if (p != null && !isNaN(p)) return acc + p * item.cantidadConsumida;
                        return acc;
                      }, 0);
                      const hayPrecios = items.some((item) => {
                        const p = getPrecioEfectivo(item);
                        return p != null && !isNaN(p);
                      });
                      return hayPrecios ? (
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td className="px-4 py-2 text-xs font-semibold text-gray-600" colSpan={4}>Total estimado</td>
                            <td className="px-4 py-2 text-right text-sm font-bold text-gray-800">
                              {moneda} {totalCosto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      ) : null;
                    })()}
                  </table>
                </div>
              </div>
            ))}
          </div>
        );
      })()}
      </div>
    </div>
  );
}

// Componente: Reporte de Rendimientos
function ReporteRendimientos({ data, campana }: { data: any[]; campana: string }) {
  const reportRef = useRef<HTMLDivElement>(null);

  const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const fmt2 = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Reporte de Rendimientos</h1>
        <p className="text-gray-500 text-center py-12">No hay datos disponibles para la campaña {campana}</p>
      </div>
    );
  }

  // Totales generales
  const totalKgBrutos = data.flatMap(c => c.lotes).flatMap((l: any) => l.grupos).reduce((s: number, g: any) => s + g.totalKgBrutos, 0);
  const totalDescuentos = data.flatMap(c => c.lotes).flatMap((l: any) => l.grupos).reduce((s: number, g: any) => s + g.totalDescuentos, 0);
  const totalKgNetos = data.flatMap(c => c.lotes).flatMap((l: any) => l.grupos).reduce((s: number, g: any) => s + g.totalKgNetos, 0);

  // Datos para gráfico kg/ha por cultivo+variedad
  const gruposPorCultivo: Record<string, { label: string; kgNetos: number; hectareas: number }> = {};
  data.forEach(campo => {
    campo.lotes?.forEach((lote: any) => {
      lote.grupos?.forEach((g: any) => {
        const label = g.variedad ? `${g.cultivo} ${g.variedad}` : g.cultivo;
        const ha = g.grupoHectareas || lote.loteHectareas || 0;
        if (!gruposPorCultivo[label]) gruposPorCultivo[label] = { label, kgNetos: 0, hectareas: 0 };
        gruposPorCultivo[label].kgNetos += g.totalKgNetos;
        gruposPorCultivo[label].hectareas += ha;
      });
    });
  });
  const dataCultivo = Object.values(gruposPorCultivo).map(d => ({
    label: d.label,
    kgHa: d.hectareas > 0 ? Math.round(d.kgNetos / d.hectareas) : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporte de Rendimientos</h1>
          <p className="text-gray-600 mt-1">Campaña {campana} — por campo, lote, cultivo y variedad</p>
        </div>
        <button
          onClick={() => generarPDF(reportRef, 'REPORTE DE RENDIMIENTOS', 'Rendimientos')}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
        >
          <Download className="w-5 h-5" />
          <span>Descargar PDF</span>
        </button>
      </div>

      <div ref={reportRef}>
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card bg-gradient-to-br from-gray-50 to-gray-100">
            <p className="text-sm text-gray-600 mb-1">Kg Brutos Totales</p>
            <p className="text-3xl font-bold text-gray-900">{fmt(totalKgBrutos)}</p>
          </div>
          <div className="card bg-gradient-to-br from-red-50 to-red-100">
            <p className="text-sm text-red-700 mb-1">Total Descuentos</p>
            <p className="text-3xl font-bold text-red-700">-{fmt(totalDescuentos)}</p>
          </div>
          <div className="card bg-gradient-to-br from-green-50 to-green-100">
            <p className="text-sm text-green-700 mb-1">Kg Netos Totales</p>
            <p className="text-3xl font-bold text-green-900">{fmt(totalKgNetos)}</p>
          </div>
        </div>

        {/* Gráfico por cultivo */}
        {dataCultivo.length > 0 && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">Kg/Ha por Variedad</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dataCultivo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => fmt2(v)} />
                <Tooltip formatter={(v: number) => [`${fmt2(v)} kg/ha`, '']} />
                <Bar dataKey="kgHa" fill="#10b981" name="Kg/Ha" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Detalle por campo > lote > cultivo/variedad */}
        <div className="space-y-4">
          {data.map((campo) => (
            <div key={campo.campoId} className="card overflow-hidden p-0">
              <div className="bg-gray-100 px-4 py-3 font-bold text-gray-900 text-base border-b">
                {campo.campoNombre}
              </div>
              {campo.lotes?.map((lote: any) => (
                <div key={lote.loteId}>
                  <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 border-b flex items-center space-x-2">
                    <span>{lote.loteNombre}</span>
                    <span className="text-gray-400 font-normal">({lote.loteHectareas} ha)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-white border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cultivo</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variedad</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Entregas</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Kg Brutos</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Descuentos</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Kg Netos</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Kg/ha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lote.grupos?.map((g: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {g.cultivo}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-gray-500">{g.variedad || '-'}</td>
                            <td className="px-4 py-2 text-right text-gray-600">{g.entregas}</td>
                            <td className="px-4 py-2 text-right">{fmt(g.totalKgBrutos)}</td>
                            <td className="px-4 py-2 text-right text-red-500">-{fmt(g.totalDescuentos)}</td>
                            <td className="px-4 py-2 text-right font-bold text-green-700">{fmt(g.totalKgNetos)}</td>
                            <td className="px-4 py-2 text-right font-semibold text-blue-700">
                              {g.kgNetosPorHa !== null ? fmt2(g.kgNetosPorHa) : '-'}
                            </td>
                          </tr>
                        ))}
                        {/* Subtotal lote */}
                        {lote.grupos?.length > 1 && (
                          <tr className="bg-gray-50 font-semibold">
                            <td className="px-4 py-2 text-xs text-gray-500" colSpan={3}>Total lote</td>
                            <td className="px-4 py-2 text-right text-xs">{fmt(lote.grupos.reduce((s: number, g: any) => s + g.totalKgBrutos, 0))}</td>
                            <td className="px-4 py-2 text-right text-xs text-red-500">-{fmt(lote.grupos.reduce((s: number, g: any) => s + g.totalDescuentos, 0))}</td>
                            <td className="px-4 py-2 text-right text-xs text-green-700">{fmt(lote.grupos.reduce((s: number, g: any) => s + g.totalKgNetos, 0))}</td>
                            <td className="px-4 py-2 text-right text-xs text-blue-700">
                              {lote.loteHectareas > 0
                                ? fmt2(lote.grupos.reduce((s: number, g: any) => s + g.totalKgNetos, 0) / lote.loteHectareas)
                                : '-'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
