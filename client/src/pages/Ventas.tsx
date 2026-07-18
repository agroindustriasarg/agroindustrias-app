import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check, TrendingUp } from 'lucide-react';
import api from '../services/apiWithCache';

const GRANOS = ['SOJA', 'MAIZ', 'TRIGO', 'GIRASOL', 'SORGO'];

const emptyForm = {
  tipo: 'VENTA',
  fecha: new Date().toISOString().split('T')[0],
  numeroLiquidacion: '',
  numeroContrato: '',
  grano: 'SOJA',
  grado: '',
  kgEntregados: '',
  precioTn: '',
  monedaPrecio: 'ARS',
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
  const [filtroTipo, setFiltroTipo] = useState('');

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

  const filtered = ventas.filter(v =>
    (!filtroCampana || v.campanaId === filtroCampana) &&
    (!filtroCampo || v.campoId === filtroCampo) &&
    (!filtroGrano || v.grano === filtroGrano) &&
    (!filtroTipo || v.tipo === filtroTipo)
  );

  const totalKg = filtered.reduce((s, v) => s + v.kgEntregados, 0);
  const totalNeto = filtered.reduce((s, v) => s + v.importeNeto, 0);
  const totalKgVenta = filtered.filter(v => v.tipo === 'VENTA').reduce((s, v) => s + v.kgEntregados, 0);
  const totalKgCanje = filtered.filter(v => v.tipo === 'CANJE').reduce((s, v) => s + v.kgEntregados, 0);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (v: any) => {
    setEditing(v);
    setForm({
      tipo: v.tipo || 'VENTA',
      fecha: v.fecha.split('T')[0],
      numeroLiquidacion: v.numeroLiquidacion || '',
      numeroContrato: v.numeroContrato || '',
      grano: v.grano,
      grado: v.grado || '',
      kgEntregados: v.kgEntregados.toString(),
      precioTn: v.precioTn.toString(),
      monedaPrecio: v.monedaPrecio || 'ARS',
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
    if (!confirm('¿Eliminar este registro?')) return;
    await api.delete(`/ventas/${id}`);
    await loadAll();
  };

  const set = (k: string, v: string) => {
    setForm(p => {
      const next = { ...p, [k]: v };
      // Auto-calcular importe neto para canjes
      if (next.tipo === 'CANJE' && (k === 'precioTn' || k === 'kgEntregados')) {
        const precio = parseFloat(k === 'precioTn' ? v : next.precioTn) || 0;
        const kg = parseFloat(k === 'kgEntregados' ? v : next.kgEntregados) || 0;
        next.importeNeto = ((kg / 1000) * precio).toFixed(2);
      }
      return next;
    });
  };
  const esCanje = form.tipo === 'CANJE';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-green-600" />
            Ventas de Granos
          </h1>
          <p className="text-gray-600 mt-1">Liquidaciones y canjes de granos</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva
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
        <div>
          <label className="label">Tipo</label>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="input">
            <option value="">Todos</option>
            <option value="VENTA">Venta pizarra</option>
            <option value="CANJE">Canje</option>
          </select>
        </div>
        {(filtroCampana || filtroCampo || filtroGrano || filtroTipo) && (
          <button onClick={() => { setFiltroCampana(''); setFiltroCampo(''); setFiltroGrano(''); setFiltroTipo(''); }}
            className="btn-secondary text-sm">Limpiar</button>
        )}
        <div className="ml-auto flex flex-wrap gap-4 text-sm">
          <span className="text-gray-600">
            Total kg: <strong className="text-gray-900">{totalKg.toLocaleString('es-AR')}</strong>
            {totalKgCanje > 0 && (
              <span className="text-xs text-gray-400 ml-1">
                ({totalKgVenta.toLocaleString('es-AR')} venta + {totalKgCanje.toLocaleString('es-AR')} canje)
              </span>
            )}
          </span>
          <span className="text-gray-600">Total neto: <strong className="text-green-700">${fmt(totalNeto)}</strong></span>
        </div>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <p className="text-center py-12 text-gray-500">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-gray-400">No hay registros</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Ref.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contrato</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grano</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaña</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destino</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kg</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio/tn</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Retenciones</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Importe Neto</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(v => {
                const esCanje = v.tipo === 'CANJE';
                return (
                  <tr key={v.id} className={`hover:bg-gray-50 ${esCanje ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-2">
                      {esCanje
                        ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">CANJE</span>
                        : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">VENTA</span>
                      }
                    </td>
                    <td className="px-4 py-2">{new Date(v.fecha).toLocaleDateString('es-AR')}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{v.numeroLiquidacion || '-'}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{v.numeroContrato || '-'}</td>
                    <td className="px-4 py-2">
                      <span className="font-medium">{v.grano}</span>
                      {v.grado && <span className="ml-1 text-xs text-gray-400">{v.grado}</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{v.campana?.nombre || '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{v.campo?.nombre || '-'}</td>
                    <td className="px-4 py-2 text-gray-500">{v.destino || '-'}</td>
                    <td className="px-4 py-2 text-right font-medium">{v.kgEntregados.toLocaleString('es-AR')}</td>
                    <td className="px-4 py-2 text-right text-gray-500">
                      {v.monedaPrecio === 'USD' ? 'U$S' : '$'}{fmt(v.precioTn)}
                    </td>
                    <td className="px-4 py-2 text-right text-red-500">
                      {esCanje ? <span className="text-gray-300">—</span> : (v.retenciones ? `$${fmt(v.retenciones)}` : '-')}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-green-700">${fmt(v.importeNeto)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(v)} className="text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(v.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 font-semibold">
              <tr>
                <td colSpan={8} className="px-4 py-2 text-xs text-gray-600">TOTAL</td>
                <td className="px-4 py-2 text-right">{totalKg.toLocaleString('es-AR')} kg</td>
                <td colSpan={2}></td>
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
                <h2 className="text-xl font-bold">{editing ? 'Editar' : 'Nuevo registro'}</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Tipo */}
                <div className="flex gap-3">
                  {['VENTA', 'CANJE'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set('tipo', t)}
                      className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${
                        form.tipo === t
                          ? t === 'VENTA'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {t === 'VENTA' ? 'Venta pizarra' : 'Canje'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Fecha *</label>
                    <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className="input" required />
                  </div>
                  <div>
                    <label className="label">{esCanje ? 'N° Romaneo / Referencia' : 'N° Liquidación'}</label>
                    <input type="text" value={form.numeroLiquidacion} onChange={e => set('numeroLiquidacion', e.target.value)} className="input" placeholder={esCanje ? '523709...' : '330131336177'} />
                  </div>
                  <div>
                    <label className="label">N° Contrato</label>
                    <input type="text" value={form.numeroContrato} onChange={e => set('numeroContrato', e.target.value)} className="input" placeholder="N° contrato" />
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
                    <label className="label">{esCanje ? 'Empresa (Bayer SA, etc.)' : 'Destino (acopio)'}</label>
                    <input type="text" value={form.destino} onChange={e => set('destino', e.target.value)} className="input" placeholder={esCanje ? 'Bayer SA, Rizobacter...' : 'AGD, COFCO...'} />
                  </div>
                  <div>
                    <label className="label">Kg Entregados *</label>
                    <input type="number" step="0.01" value={form.kgEntregados} onChange={e => set('kgEntregados', e.target.value)} className="input" required />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                    {esCanje ? 'Valores del canje' : 'Valores de la liquidación'}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">{esCanje ? 'Precio implícito *' : 'Precio pizarra *'}</label>
                      <div className="flex gap-2">
                        <select value={form.monedaPrecio} onChange={e => set('monedaPrecio', e.target.value)} className="input w-24">
                          <option value="ARS">$ ARS</option>
                          <option value="USD">U$S</option>
                        </select>
                        <input type="number" step="0.01" value={form.precioTn} onChange={e => set('precioTn', e.target.value)} className="input flex-1" required placeholder={form.monedaPrecio === 'USD' ? 'ej: 280' : 'ej: 430000'} />
                      </div>
                    </div>
                    {!esCanje && (
                      <>
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
                      </>
                    )}
                    <div className="col-span-2">
                      <label className={`label font-semibold ${esCanje ? 'text-blue-700' : 'text-green-700'}`}>
                        {esCanje ? 'Valor total del canje (se calcula automático)' : 'Importe Neto a Pagar ($) *'}
                      </label>
                      <input
                        type="number" step="0.01" value={form.importeNeto}
                        onChange={e => !esCanje && set('importeNeto', e.target.value)}
                        readOnly={esCanje}
                        className={`input ${esCanje ? 'bg-gray-50 border-blue-200 text-blue-800 cursor-default' : 'border-green-300 focus:border-green-500'}`}
                        required
                      />
                      {esCanje && form.precioTn && form.kgEntregados && (
                        <p className="text-xs text-blue-500 mt-1">
                          {(parseFloat(form.kgEntregados)/1000).toLocaleString('es-AR',{maximumFractionDigits:3})} tn × {form.monedaPrecio === 'USD' ? 'U$S' : '$'}{parseFloat(form.precioTn).toLocaleString('es-AR')}
                        </p>
                      )}
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
