import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check, TrendingUp } from 'lucide-react';
import api from '../services/apiWithCache';

const GRANOS = ['SOJA', 'MAIZ', 'TRIGO', 'GIRASOL', 'SORGO'];

const emptyForm = {
  fecha: new Date().toISOString().split('T')[0],
  numeroLiquidacion: '',
  grano: 'SOJA',
  grado: '',
  kgEntregados: '',
  precioTn: '',
  fleteTn: '',
  retenciones: '',
  otrasRetenciones: '',
  deducciones: '',
  importeNeto: '',
  destino: '',
  campanaId: '',
  campoId: '',
  observaciones: '',
};

export default function Ventas() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [campanas, setCampanas] = useState<any[]>([]);
  const [campos, setCampos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Filtros
  const [filtroCampana, setFiltroCampana] = useState('');
  const [filtroCampo, setFiltroCampo] = useState('');
  const [filtroGrano, setFiltroGrano] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [vRes, cRes, camRes] = await Promise.all([
        api.get('/ventas'),
        api.get('/campanas'),
        api.get('/campos'),
      ]);
      setVentas(vRes.data);
      setCampanas(cRes.data);
      setCampos(camRes.data);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtKg = (n: number) => (n / 1000).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filtered = ventas.filter(v =>
    (!filtroCampana || v.campanaId === filtroCampana) &&
    (!filtroCampo || v.campoId === filtroCampo) &&
    (!filtroGrano || v.grano === filtroGrano)
  );

  const totalKg = filtered.reduce((s, v) => s + v.kgEntregados, 0);
  const totalNeto = filtered.reduce((s, v) => s + v.importeNeto, 0);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (v: any) => {
    setEditing(v);
    setForm({
      fecha: v.fecha.split('T')[0],
      numeroLiquidacion: v.numeroLiquidacion || '',
      grano: v.grano,
      grado: v.grado || '',
      kgEntregados: v.kgEntregados.toString(),
      precioTn: v.precioTn.toString(),
      fleteTn: v.fleteTn?.toString() || '',
      retenciones: v.retenciones?.toString() || '',
      otrasRetenciones: v.otrasRetenciones?.toString() || '',
      deducciones: v.deducciones?.toString() || '',
      importeNeto: v.importeNeto.toString(),
      destino: v.destino || '',
      campanaId: v.campanaId || '',
      campoId: v.campoId || '',
      observaciones: v.observaciones || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/ventas/${editing.id}`, form);
      } else {
        await api.post('/ventas', form);
      }
      setShowForm(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    await api.delete(`/ventas/${id}`);
    await loadAll();
  };

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-green-600" />
            Ventas de Granos
          </h1>
          <p className="text-gray-600 mt-1">Registro de liquidaciones de granos</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Venta
        </button>
      </div>

      {/* Filtros */}
      <div className="card mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Campaña</label>
          <select value={filtroCampana} onChange={e => setFiltroCampana(e.target.value)} className="input">
            <option value="">Todas</option>
            {campanas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Campo</label>
          <select value={filtroCampo} onChange={e => setFiltroCampo(e.target.value)} className="input">
            <option value="">Todos</option>
            {campos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Grano</label>
          <select value={filtroGrano} onChange={e => setFiltroGrano(e.target.value)} className="input">
            <option value="">Todos</option>
            {GRANOS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        {(filtroCampana || filtroCampo || filtroGrano) && (
          <button onClick={() => { setFiltroCampana(''); setFiltroCampo(''); setFiltroGrano(''); }}
            className="btn-secondary text-sm">Limpiar</button>
        )}
        <div className="ml-auto flex gap-6 text-sm">
          <span className="text-gray-600">Total kg: <strong className="text-gray-900">{fmtKg(totalKg)} tn</strong></span>
          <span className="text-gray-600">Total neto: <strong className="text-green-700">${fmt(totalNeto)}</strong></span>
        </div>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <p className="text-center py-12 text-gray-500">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-gray-400">No hay ventas registradas</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Liquidación</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grano</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaña</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destino</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kg</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">$/tn</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Flete/tn</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Retenciones</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deducciones</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Importe Neto</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{new Date(v.fecha).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{v.numeroLiquidacion || '-'}</td>
                  <td className="px-4 py-2">
                    <span className="font-medium">{v.grano}</span>
                    {v.grado && <span className="ml-1 text-xs text-gray-400">{v.grado}</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{v.campana?.nombre || '-'}</td>
                  <td className="px-4 py-2 text-gray-600">{v.campo?.nombre || '-'}</td>
                  <td className="px-4 py-2 text-gray-500">{v.destino || '-'}</td>
                  <td className="px-4 py-2 text-right font-medium">{v.kgEntregados.toLocaleString('es-AR')}</td>
                  <td className="px-4 py-2 text-right text-gray-500">${fmt(v.precioTn)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{v.fleteTn ? `$${fmt(v.fleteTn)}` : '-'}</td>
                  <td className="px-4 py-2 text-right text-red-500">{v.retenciones ? `$${fmt(v.retenciones)}` : '-'}</td>
                  <td className="px-4 py-2 text-right text-red-500">{v.deducciones ? `$${fmt(v.deducciones)}` : '-'}</td>
                  <td className="px-4 py-2 text-right font-bold text-green-700">${fmt(v.importeNeto)}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(v)} className="text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(v.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 font-semibold">
              <tr>
                <td colSpan={6} className="px-4 py-2 text-xs text-gray-600">TOTAL</td>
                <td className="px-4 py-2 text-right">{totalKg.toLocaleString('es-AR')} kg</td>
                <td colSpan={4}></td>
                <td className="px-4 py-2 text-right text-green-700">${fmt(totalNeto)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{editing ? 'Editar Venta' : 'Nueva Venta'}</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Fecha *</label>
                    <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className="input" required />
                  </div>
                  <div>
                    <label className="label">N° Liquidación</label>
                    <input type="text" value={form.numeroLiquidacion} onChange={e => set('numeroLiquidacion', e.target.value)} className="input" placeholder="330131336177" />
                  </div>
                  <div>
                    <label className="label">Grano *</label>
                    <select value={form.grano} onChange={e => set('grano', e.target.value)} className="input" required>
                      {GRANOS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Grado</label>
                    <input type="text" value={form.grado} onChange={e => set('grado', e.target.value)} className="input" placeholder="G2" />
                  </div>
                  <div>
                    <label className="label">Campaña</label>
                    <select value={form.campanaId} onChange={e => set('campanaId', e.target.value)} className="input">
                      <option value="">Sin campaña</option>
                      {campanas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Campo</label>
                    <select value={form.campoId} onChange={e => set('campoId', e.target.value)} className="input">
                      <option value="">Sin campo</option>
                      {campos.filter(c => c.activo).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Destino (acopio)</label>
                    <input type="text" value={form.destino} onChange={e => set('destino', e.target.value)} className="input" placeholder="AGD, COFCO..." />
                  </div>
                  <div>
                    <label className="label">Kg Entregados *</label>
                    <input type="number" step="0.01" value={form.kgEntregados} onChange={e => set('kgEntregados', e.target.value)} className="input" required />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Valores de la liquidación</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Precio pizarra ($/tn) *</label>
                      <input type="number" step="0.01" value={form.precioTn} onChange={e => set('precioTn', e.target.value)} className="input" required />
                    </div>
                    <div>
                      <label className="label">Flete ($/tn)</label>
                      <input type="number" step="0.01" value={form.fleteTn} onChange={e => set('fleteTn', e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="label">Total retenciones AFIP ($)</label>
                      <input type="number" step="0.01" value={form.retenciones} onChange={e => set('retenciones', e.target.value)} className="input" placeholder="Ganancias + IVA" />
                    </div>
                    <div>
                      <label className="label">Otras retenciones ($)</label>
                      <input type="number" step="0.01" value={form.otrasRetenciones} onChange={e => set('otrasRetenciones', e.target.value)} className="input" placeholder="IIBB, etc." />
                    </div>
                    <div>
                      <label className="label">Otras deducciones ($)</label>
                      <input type="number" step="0.01" value={form.deducciones} onChange={e => set('deducciones', e.target.value)} className="input" placeholder="Sellado, etc." />
                    </div>
                    <div className="col-span-2">
                      <label className="label text-green-700 font-semibold">Importe Neto a Pagar ($) *</label>
                      <input type="number" step="0.01" value={form.importeNeto} onChange={e => set('importeNeto', e.target.value)} className="input border-green-300 focus:border-green-500" required />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Observaciones</label>
                  <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} className="input" rows={2} />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                    <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
