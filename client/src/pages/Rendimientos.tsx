import { useState, useEffect } from 'react';
import api from '../services/apiWithCache';
import { Plus, Trash2, Edit, ChevronDown, ChevronRight, X, Warehouse } from 'lucide-react';

const CAMPANAS = ['24/25', '25/26', '26/27'];
const CULTIVOS = ['Soja', 'Maíz', 'Poroto', 'Trigo', 'Girasol', 'Sorgo', 'Otro'];

interface Destino {
  id: string;
  nombre: string;
}

interface Rendimiento {
  id: string;
  campana: string;
  campoId: string;
  loteId: string;
  cultivo: string;
  variedad?: string;
  fecha: string;
  kgBrutos: number;
  descCuerposExtranos: number;
  descQuebrados: number;
  descTotalDaniados: number;
  descHumedad: number;
  descVolatil: number;
  descTemperatura: number;
  descGranosVerdes: number;
  kgNetos: number;
  destinoId?: string;
  numeroCTG?: string;
  observaciones?: string;
  campo: { id: string; nombre: string };
  lote: { id: string; nombre: string; hectareas: number };
  destino?: { id: string; nombre: string };
}

interface Lote {
  id: string;
  nombre: string;
  hectareas: number;
}

interface Campo {
  id: string;
  nombre: string;
  lotes: Lote[];
}

const emptyForm = {
  campana: '25/26',
  campoId: '',
  loteId: '',
  cultivo: 'Soja',
  variedad: '',
  fecha: new Date().toISOString().split('T')[0],
  kgBrutos: '',
  descCuerposExtranos: '',
  descQuebrados: '',
  descTotalDaniados: '',
  descHumedad: '',
  descVolatil: '',
  descTemperatura: '',
  descGranosVerdes: '',
  destinoId: '',
  numeroCTG: '',
  observaciones: '',
};

export default function Rendimientos() {
  const [rendimientos, setRendimientos] = useState<Rendimiento[]>([]);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [loading, setLoading] = useState(true);
  const [campanaSeleccionada, setCampanaSeleccionada] = useState('25/26');

  // Modal entrega
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [selectedCampo, setSelectedCampo] = useState<Campo | null>(null);

  // Destinos panel
  const [showDestinos, setShowDestinos] = useState(false);
  const [nuevoDestino, setNuevoDestino] = useState('');

  // Grupos expandidos
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [rRes, cRes, dRes] = await Promise.all([
        api.get('/rendimientos'),
        api.get('/campos'),
        api.get('/destinos'),
      ]);
      setRendimientos(rRes.data);
      setCampos(cRes.data);
      setDestinos(dRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ── Grupos ──────────────────────────────────────────────────────────────
  const filtrados = rendimientos.filter(r => r.campana === campanaSeleccionada);

  type Grupo = {
    key: string;
    campoNombre: string;
    loteNombre: string;
    loteHectareas: number;
    cultivo: string;
    variedad: string;
    entregas: Rendimiento[];
    totalKgBrutos: number;
    totalDescHumedad: number;
    totalDescCuerpos: number;
    totalDescVolatiles: number;
    totalKgNetos: number;
    kgNetosPorHa: number | null;
  };

  const gruposMap: Record<string, Grupo> = {};
  filtrados.forEach(r => {
    const key = `${r.campoId}|${r.loteId}|${r.cultivo}|${r.variedad || ''}`;
    if (!gruposMap[key]) {
      gruposMap[key] = {
        key,
        campoNombre: r.campo?.nombre || '',
        loteNombre: r.lote?.nombre || '',
        loteHectareas: r.lote?.hectareas || 0,
        cultivo: r.cultivo,
        variedad: r.variedad || '',
        entregas: [],
        totalKgBrutos: 0,
        totalDescHumedad: 0,
        totalDescCuerpos: 0,
        totalDescVolatiles: 0,
        totalKgNetos: 0,
        kgNetosPorHa: null,
      };
    }
    gruposMap[key].entregas.push(r);
    gruposMap[key].totalKgBrutos += r.kgBrutos;
    gruposMap[key].totalDescHumedad += r.descHumedad;
    gruposMap[key].totalDescCuerpos += r.descCuerposExtranos;
    gruposMap[key].totalDescVolatiles += r.descVolatil;
    gruposMap[key].totalKgNetos += r.kgNetos;
  });

  const grupos = Object.values(gruposMap).map(g => ({
    ...g,
    kgNetosPorHa: g.loteHectareas > 0 ? g.totalKgNetos / g.loteHectareas : null,
    entregas: [...g.entregas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
  }));

  // Ordenar grupos: por campo, luego lote
  grupos.sort((a, b) => a.campoNombre.localeCompare(b.campoNombre) || a.loteNombre.localeCompare(b.loteNombre));

  // ── Handlers ────────────────────────────────────────────────────────────
  const toggleGrupo = (key: string) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleCampoChange = (campoId: string) => {
    setForm(f => ({ ...f, campoId, loteId: '' }));
    setSelectedCampo(campos.find(c => c.id === campoId) || null);
  };

  const abrirNuevo = () => {
    setEditingId(null);
    setForm({ ...emptyForm, campana: campanaSeleccionada });
    setSelectedCampo(null);
    setShowModal(true);
  };

  const abrirEditar = (r: Rendimiento) => {
    setEditingId(r.id);
    setForm({
      campana: r.campana,
      campoId: r.campoId,
      loteId: r.loteId,
      cultivo: r.cultivo,
      variedad: r.variedad || '',
      fecha: r.fecha.split('T')[0],
      kgBrutos: r.kgBrutos.toString(),
      descCuerposExtranos: r.descCuerposExtranos.toString(),
      descQuebrados: r.descQuebrados.toString(),
      descTotalDaniados: r.descTotalDaniados.toString(),
      descHumedad: r.descHumedad.toString(),
      descVolatil: r.descVolatil.toString(),
      descTemperatura: r.descTemperatura.toString(),
      descGranosVerdes: r.descGranosVerdes.toString(),
      destinoId: r.destinoId || '',
      numeroCTG: r.numeroCTG || '',
      observaciones: r.observaciones || '',
    });
    setSelectedCampo(campos.find(c => c.id === r.campoId) || null);
    setShowModal(true);
  };

  const calcKgNetos = () => {
    const brutos = parseFloat(form.kgBrutos) || 0;
    const cuerpos = parseFloat(form.descCuerposExtranos) || 0;
    const quebrados = parseFloat(form.descQuebrados) || 0;
    const daniados = parseFloat(form.descTotalDaniados) || 0;
    const humedad = parseFloat(form.descHumedad) || 0;
    const volatil = parseFloat(form.descVolatil) || 0;
    const temperatura = parseFloat(form.descTemperatura) || 0;
    const verdes = parseFloat(form.descGranosVerdes) || 0;
    return brutos - cuerpos - quebrados - daniados - humedad - volatil - temperatura - verdes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.campoId || !form.loteId || !form.kgBrutos) {
      alert('Campo, lote y kg brutos son obligatorios');
      return;
    }
    try {
      const payload = { ...form };
      if (editingId) {
        await api.put(`/rendimientos/${editingId}`, payload);
      } else {
        await api.post('/rendimientos', payload);
      }
      setShowModal(false);
      fetchAll();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al guardar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta entrega?')) return;
    try {
      await api.delete(`/rendimientos/${id}`);
      fetchAll();
    } catch {
      alert('Error al eliminar');
    }
  };

  // ── Destinos ─────────────────────────────────────────────────────────────
  const handleAgregarDestino = async () => {
    if (!nuevoDestino.trim()) return;
    try {
      await api.post('/destinos', { nombre: nuevoDestino.trim() });
      setNuevoDestino('');
      const res = await api.get('/destinos');
      setDestinos(res.data);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al agregar destino');
    }
  };

  const handleEliminarDestino = async (id: string) => {
    if (!confirm('¿Eliminar este destino?')) return;
    try {
      await api.delete(`/destinos/${id}`);
      const res = await api.get('/destinos');
      setDestinos(res.data);
    } catch {
      alert('Error al eliminar destino');
    }
  };

  const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const fmt2 = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtFecha = (f: string) => new Date(f.split('T')[0] + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (loading) return <div className="text-center py-12">Cargando...</div>;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rendimientos</h1>
          <p className="text-gray-600 mt-1">Registro de entregas por lote y cultivo</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDestinos(!showDestinos)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Warehouse className="w-4 h-4" />
            <span>Destinos</span>
          </button>
          <button onClick={abrirNuevo} className="btn-primary flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Nueva Entrega</span>
          </button>
        </div>
      </div>

      {/* ── Panel Destinos ── */}
      {showDestinos && (
        <div className="card mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Gestionar Destinos</h3>
          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              className="input flex-1"
              placeholder="Nombre del destino (acopio, empresa...)"
              value={nuevoDestino}
              onChange={e => setNuevoDestino(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAgregarDestino()}
            />
            <button onClick={handleAgregarDestino} className="btn-primary flex items-center space-x-1">
              <Plus className="w-4 h-4" />
              <span>Agregar</span>
            </button>
          </div>
          {destinos.length === 0 ? (
            <p className="text-sm text-gray-400">No hay destinos cargados.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {destinos.map(d => (
                <span key={d.id} className="inline-flex items-center space-x-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  <span>{d.nombre}</span>
                  <button onClick={() => handleEliminarDestino(d.id)} className="text-gray-400 hover:text-red-500 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Filtro campaña ── */}
      <div className="flex space-x-2 mb-6">
        {CAMPANAS.map(c => (
          <button
            key={c}
            onClick={() => setCampanaSeleccionada(c)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              campanaSeleccionada === c
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Campaña {c}
          </button>
        ))}
      </div>

      {/* ── Lista de grupos ── */}
      {grupos.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          No hay entregas registradas para la campaña {campanaSeleccionada}.
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map(g => (
            <div key={g.key} className="card overflow-hidden p-0">
              {/* Header del grupo */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleGrupo(g.key)}
              >
                <div className="flex items-center space-x-3">
                  {expandidos.has(g.key) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">
                      {g.campoNombre} › {g.loteNombre}
                      <span className="text-gray-400 font-normal text-sm ml-2">({g.loteHectareas} ha)</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                        {g.cultivo}{g.variedad ? ` ${g.variedad}` : ''}
                      </span>
                      <span className="ml-2">{g.entregas.length} {g.entregas.length === 1 ? 'entrega' : 'entregas'}</span>
                    </div>
                  </div>
                </div>

                {/* Totales del grupo */}
                <div className="grid grid-cols-4 gap-6 text-right">
                  <div>
                    <p className="text-xs text-gray-400">Kg Brutos</p>
                    <p className="font-semibold text-gray-700">{fmt(g.totalKgBrutos)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Descuentos</p>
                    <p className="font-semibold text-red-500">
                      -{fmt(g.totalDescHumedad + g.totalDescCuerpos + g.totalDescVolatiles)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Kg Netos</p>
                    <p className="font-bold text-green-700">{fmt(g.totalKgNetos)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Kg/ha</p>
                    <p className="font-bold text-blue-700">
                      {g.kgNetosPorHa !== null ? fmt2(g.kgNetosPorHa) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detalle de entregas */}
              {expandidos.has(g.key) && (
                <div className="border-t border-gray-100">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Kg Brutos</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cuerpos Ext.</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quebrados</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Dañados</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Humedad</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Volátil</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Temp.</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Gr. Verdes</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Kg Netos</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Destino</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CTG</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {g.entregas.map(e => (
                        <tr key={e.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap">{fmtFecha(e.fecha)}</td>
                          <td className="px-4 py-2 text-right">{fmt(e.kgBrutos)}</td>
                          <td className="px-4 py-2 text-right text-red-500">{e.descCuerposExtranos > 0 ? `-${fmt(e.descCuerposExtranos)}` : '-'}</td>
                          <td className="px-4 py-2 text-right text-red-500">{e.descQuebrados > 0 ? `-${fmt(e.descQuebrados)}` : '-'}</td>
                          <td className="px-4 py-2 text-right text-red-500">{e.descTotalDaniados > 0 ? `-${fmt(e.descTotalDaniados)}` : '-'}</td>
                          <td className="px-4 py-2 text-right text-red-500">{e.descHumedad > 0 ? `-${fmt(e.descHumedad)}` : '-'}</td>
                          <td className="px-4 py-2 text-right text-red-500">{e.descVolatil > 0 ? `-${fmt(e.descVolatil)}` : '-'}</td>
                          <td className="px-4 py-2 text-right text-red-500">{e.descTemperatura > 0 ? `-${fmt(e.descTemperatura)}` : '-'}</td>
                          <td className="px-4 py-2 text-right text-red-500">{e.descGranosVerdes > 0 ? `-${fmt(e.descGranosVerdes)}` : '-'}</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-700">{fmt(e.kgNetos)}</td>
                          <td className="px-4 py-2">{e.destino?.nombre || '-'}</td>
                          <td className="px-4 py-2 text-gray-500">{e.numeroCTG || '-'}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-center space-x-2">
                              <button onClick={() => abrirEditar(e)} className="text-blue-500 hover:text-blue-700">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(e.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal nueva/editar entrega ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Editar entrega' : 'Nueva entrega'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Campaña + Campo + Lote */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaña *</label>
                  <select
                    className="input w-full"
                    value={form.campana}
                    onChange={e => setForm(f => ({ ...f, campana: e.target.value }))}
                  >
                    {CAMPANAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campo *</label>
                  <select
                    className="input w-full"
                    value={form.campoId}
                    onChange={e => handleCampoChange(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {campos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lote *</label>
                  <select
                    className="input w-full"
                    value={form.loteId}
                    onChange={e => setForm(f => ({ ...f, loteId: e.target.value }))}
                    disabled={!selectedCampo}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {selectedCampo?.lotes.map(l => (
                      <option key={l.id} value={l.id}>{l.nombre} ({l.hectareas} ha)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cultivo + Variedad + Fecha */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cultivo *</label>
                  <select
                    className="input w-full"
                    value={form.cultivo}
                    onChange={e => setForm(f => ({ ...f, cultivo: e.target.value }))}
                  >
                    {CULTIVOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variedad</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Ej: 6320, 7976..."
                    value={form.variedad}
                    onChange={e => setForm(f => ({ ...f, variedad: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Kg brutos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kg Brutos *</label>
                <input
                  type="number"
                  step="1"
                  className="input w-full"
                  placeholder="Ej: 30000"
                  value={form.kgBrutos}
                  onChange={e => setForm(f => ({ ...f, kgBrutos: e.target.value }))}
                  required
                />
              </div>

              {/* Descuentos */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Descuentos del acopio (en kg)</p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cuerpos extraños</label>
                    <input type="number" step="1" className="input w-full" placeholder="0"
                      value={form.descCuerposExtranos}
                      onChange={e => setForm(f => ({ ...f, descCuerposExtranos: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quebrados</label>
                    <input type="number" step="1" className="input w-full" placeholder="0"
                      value={form.descQuebrados}
                      onChange={e => setForm(f => ({ ...f, descQuebrados: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Total dañados</label>
                    <input type="number" step="1" className="input w-full" placeholder="0"
                      value={form.descTotalDaniados}
                      onChange={e => setForm(f => ({ ...f, descTotalDaniados: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Humedad</label>
                    <input type="number" step="1" className="input w-full" placeholder="0"
                      value={form.descHumedad}
                      onChange={e => setForm(f => ({ ...f, descHumedad: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Volátil</label>
                    <input type="number" step="1" className="input w-full" placeholder="0"
                      value={form.descVolatil}
                      onChange={e => setForm(f => ({ ...f, descVolatil: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Temperatura</label>
                    <input type="number" step="1" className="input w-full" placeholder="0"
                      value={form.descTemperatura}
                      onChange={e => setForm(f => ({ ...f, descTemperatura: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Granos verdes</label>
                    <input type="number" step="1" className="input w-full" placeholder="0"
                      value={form.descGranosVerdes}
                      onChange={e => setForm(f => ({ ...f, descGranosVerdes: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Kg Netos calculado */}
              <div className="bg-green-50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">Kg Netos</span>
                <span className="text-xl font-bold text-green-700">
                  {calcKgNetos() >= 0 ? fmt(calcKgNetos()) : 0} kg
                </span>
              </div>

              {/* Destino + CTG */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                  <select
                    className="input w-full"
                    value={form.destinoId}
                    onChange={e => setForm(f => ({ ...f, destinoId: e.target.value }))}
                  >
                    <option value="">Sin destino</option>
                    {destinos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                  {destinos.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Agregá destinos desde el botón "Destinos" en la página.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° CTG</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Número de CTG"
                    value={form.numeroCTG}
                    onChange={e => setForm(f => ({ ...f, numeroCTG: e.target.value }))}
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Guardar cambios' : 'Registrar entrega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
