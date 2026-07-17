import { useState, useEffect } from 'react';
import { Receipt, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/apiWithCache';

export default function PagosRealizados() {
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [proveedorFilter, setProveedorFilter] = useState('');
  const [editFecha, setEditFecha] = useState<Record<string, string>>({});
  const [editMonto, setEditMonto] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => { loadPagos(); }, []);

  const loadPagos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pagos');
      setPagos(res.data);
    } finally {
      setLoading(false);
    }
  };

  // Una fila por PagoFactura
  const rows = pagos.flatMap((pago: any) =>
    (pago.facturas || []).map((pf: any) => ({ pago, pf }))
  );

  const proveedores = Array.from(new Set(rows.map(r => r.pf.factura?.proveedor || ''))).filter(Boolean).sort();

  const filtered = proveedorFilter
    ? rows.filter(r => r.pf.factura?.proveedor === proveedorFilter)
    : rows;

  const saveFecha = async (pagoId: string, fecha: string) => {
    if (!fecha) return;
    setSaving(s => ({ ...s, [pagoId]: true }));
    try {
      await api.put(`/pagos/${pagoId}`, { fechaPago: fecha });
      await loadPagos();
      setEditFecha(s => { const n = { ...s }; delete n[pagoId]; return n; });
    } finally {
      setSaving(s => { const n = { ...s }; delete n[pagoId]; return n; });
    }
  };

  const saveMonto = async (pfId: string, monto: string) => {
    const val = parseFloat(monto);
    if (isNaN(val)) return;
    setSaving(s => ({ ...s, [pfId]: true }));
    try {
      await api.put(`/pagos/imputacion/${pfId}`, { monto: val });
      await loadPagos();
      setEditMonto(s => { const n = { ...s }; delete n[pfId]; return n; });
    } finally {
      setSaving(s => { const n = { ...s }; delete n[pfId]; return n; });
    }
  };

  const saveMoneda = async (pfId: string, monedaPago: string) => {
    setSaving(s => ({ ...s, [pfId]: true }));
    try {
      await api.put(`/pagos/imputacion/${pfId}`, { monedaPago });
      await loadPagos();
    } finally {
      setSaving(s => { const n = { ...s }; delete n[pfId]; return n; });
    }
  };

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  const totalARS = filtered.filter(r => r.pf.monedaPago === 'ARS').reduce((s, r) => s + r.pf.monto, 0);
  const totalUSD = filtered.filter(r => r.pf.monedaPago === 'USD').reduce((s, r) => s + r.pf.monto, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/contabilidad" className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver a Contabilidad
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Receipt className="w-8 h-8" />
            <span>Pagos Realizados</span>
          </h1>
          <p className="text-gray-600 mt-1">Historial de pagos de facturas</p>
        </div>
      </div>

      {/* Filtro y totales */}
      <div className="card mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Proveedor</label>
          <select
            value={proveedorFilter}
            onChange={e => setProveedorFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
          >
            <option value="">Todos</option>
            {proveedores.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="ml-auto flex gap-6 text-sm">
          <span className="text-gray-600">Total ARS: <strong className="text-gray-900">${fmt(totalARS)}</strong></span>
          {totalUSD > 0 && <span className="text-gray-600">Total USD: <strong className="text-gray-900">U$S {fmt(totalUSD)}</strong></span>}
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-x-auto p-0">
        {loading ? (
          <p className="text-center py-12 text-gray-500">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-gray-500">No hay pagos registrados</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Factura</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forma de Pago</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Moneda</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(({ pago, pf }) => {
                const fechaVal = editFecha[pago.id] ?? pago.fechaPago?.split('T')[0] ?? '';
                const montoVal = editMonto[pf.id] ?? pf.monto?.toFixed(2) ?? '';
                return (
                  <tr key={pf.id} className="hover:bg-gray-50">
                    {/* Fecha editable */}
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={fechaVal}
                        onChange={e => setEditFecha(s => ({ ...s, [pago.id]: e.target.value }))}
                        onBlur={e => saveFecha(pago.id, e.target.value)}
                        disabled={saving[pago.id]}
                        className="text-sm border border-gray-300 rounded px-2 py-1 w-36"
                      />
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">{pf.factura?.proveedor || '-'}</td>
                    <td className="px-4 py-2 text-gray-500">{pf.factura?.numeroFactura || '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{pago.formaPago}</td>
                    <td className="px-4 py-2 text-gray-500">{pago.cuenta?.nombre || '-'}</td>
                    {/* Moneda editable */}
                    <td className="px-4 py-2 text-center">
                      <select
                        value={pf.monedaPago}
                        onChange={e => saveMoneda(pf.id, e.target.value)}
                        disabled={saving[pf.id]}
                        className="text-xs border border-gray-300 rounded px-1 py-1 bg-white"
                      >
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </select>
                    </td>
                    {/* Monto editable */}
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        value={montoVal}
                        onChange={e => setEditMonto(s => ({ ...s, [pf.id]: e.target.value }))}
                        onBlur={e => saveMonto(pf.id, e.target.value)}
                        disabled={saving[pf.id]}
                        className="text-sm border border-gray-300 rounded px-2 py-1 w-32 text-right"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
