import { useState, useEffect } from 'react';
import { Receipt, ArrowLeft, Pencil, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/apiWithCache';

export default function PagosRealizados() {
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [proveedorFilter, setProveedorFilter] = useState('');

  // Fila en modo edición (pagoId+pfId)
  const [editingPf, setEditingPf] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ fecha: string; monto: string; monedaPago: string }>({ fecha: '', monto: '', monedaPago: '' });

  // Factura expandida (facturaId)
  const [expandedFactura, setExpandedFactura] = useState<string | null>(null);

  // Edición de ítems: { [itemId]: { cantidad, precioUnitario } }
  const [editItems, setEditItems] = useState<Record<string, { cantidad: string; precioUnitario: string }>>({});

  // Moneda de factura expandida en edición
  const [editMoneda, setEditMoneda] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);

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

  const rows = pagos.flatMap((pago: any) =>
    (pago.facturas || []).map((pf: any) => ({ pago, pf }))
  );

  const proveedores = Array.from(new Set(rows.map(r => r.pf.factura?.proveedor || ''))).filter(Boolean).sort();
  const filtered = proveedorFilter ? rows.filter(r => r.pf.factura?.proveedor === proveedorFilter) : rows;

  const totalARS = filtered.filter(r => r.pf.monedaPago === 'ARS').reduce((s, r) => s + r.pf.monto, 0);
  const totalUSD = filtered.filter(r => r.pf.monedaPago === 'USD').reduce((s, r) => s + r.pf.monto, 0);

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  const startEdit = (pf: any, pago: any) => {
    setEditingPf(pf.id);
    setEditValues({
      fecha: pago.fechaPago?.split('T')[0] ?? '',
      monto: pf.monto?.toFixed(2) ?? '',
      monedaPago: pf.monedaPago ?? 'ARS',
    });
  };

  const cancelEdit = () => setEditingPf(null);

  const saveEdit = async (pago: any, pf: any) => {
    setSaving(true);
    try {
      await Promise.all([
        api.put(`/pagos/${pago.id}`, { fechaPago: editValues.fecha }),
        api.put(`/pagos/imputacion/${pf.id}`, { monto: parseFloat(editValues.monto), monedaPago: editValues.monedaPago }),
      ]);
      setEditingPf(null);
      await loadPagos();
    } finally {
      setSaving(false);
    }
  };

  const toggleFactura = (facturaId: string) => {
    setExpandedFactura(prev => prev === facturaId ? null : facturaId);
    setEditItems({});
  };

  const saveItem = async (itemId: string, _facturaId: string) => {
    const vals = editItems[itemId];
    if (!vals) return;
    setSaving(true);
    try {
      await api.put(`/facturas/items/${itemId}`, {
        cantidad: parseFloat(vals.cantidad),
        precioUnitario: parseFloat(vals.precioUnitario),
      });
      setEditItems(prev => { const n = { ...prev }; delete n[itemId]; return n; });
      await loadPagos();
    } finally {
      setSaving(false);
    }
  };

  const saveMonedaFactura = async (facturaId: string) => {
    const moneda = editMoneda[facturaId];
    if (!moneda) return;
    setSaving(true);
    try {
      await api.patch(`/facturas/${facturaId}/moneda`, { moneda });
      setEditMoneda(prev => { const n = { ...prev }; delete n[facturaId]; return n; });
      await loadPagos();
    } finally {
      setSaving(false);
    }
  };

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
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(({ pago, pf }) => {
                const isEditing = editingPf === pf.id;
                const facturaId = pf.factura?.id;
                const isExpanded = expandedFactura === facturaId;
                const items = pf.factura?.items || [];

                return (
                  <>
                    {/* Fila principal */}
                    <tr key={pf.id} className={`hover:bg-gray-50 ${isEditing ? 'bg-blue-50' : ''}`}>
                      {/* Fecha */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input type="date" value={editValues.fecha}
                            onChange={e => setEditValues(v => ({ ...v, fecha: e.target.value }))}
                            className="text-sm border border-gray-300 rounded px-2 py-1 w-36" />
                        ) : (
                          <span>{pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString('es-AR') : '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-900">{pf.factura?.proveedor || '-'}</td>
                      {/* N° Factura clickeable */}
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => facturaId && toggleFactura(facturaId)}
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          {pf.factura?.numeroFactura || '-'}
                          {facturaId && (isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{pago.formaPago}</td>
                      <td className="px-4 py-2 text-gray-500">{pago.cuenta?.nombre || '-'}</td>
                      {/* Moneda */}
                      <td className="px-4 py-2 text-center">
                        {isEditing ? (
                          <select value={editValues.monedaPago}
                            onChange={e => setEditValues(v => ({ ...v, monedaPago: e.target.value }))}
                            className="text-xs border border-gray-300 rounded px-1 py-1 bg-white">
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                          </select>
                        ) : (
                          <span className="text-xs font-medium text-gray-600">{pf.monedaPago}</span>
                        )}
                      </td>
                      {/* Monto */}
                      <td className="px-4 py-2 text-right font-medium">
                        {isEditing ? (
                          <input type="number" value={editValues.monto}
                            onChange={e => setEditValues(v => ({ ...v, monto: e.target.value }))}
                            className="text-sm border border-gray-300 rounded px-2 py-1 w-32 text-right" />
                        ) : (
                          <span>{fmt(pf.monto)}</span>
                        )}
                      </td>
                      {/* Acciones */}
                      <td className="px-4 py-2 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => saveEdit(pago, pf)} disabled={saving}
                              className="text-green-600 hover:text-green-800">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(pf, pago)} className="text-gray-400 hover:text-blue-600">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Fila expandida: ítems de la factura */}
                    {isExpanded && (
                      <tr key={`${pf.id}-items`}>
                        <td colSpan={8} className="px-0 py-0 bg-gray-50 border-b">
                          <div className="px-8 py-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-700">
                                Composición de factura {pf.factura?.numeroFactura}
                              </h4>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Moneda:</span>
                                <select
                                  value={editMoneda[facturaId] ?? pf.factura?.moneda ?? 'ARS'}
                                  onChange={e => setEditMoneda(prev => ({ ...prev, [facturaId]: e.target.value }))}
                                  onBlur={() => saveMonedaFactura(facturaId)}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                                >
                                  <option value="ARS">ARS</option>
                                  <option value="USD">USD</option>
                                </select>
                              </div>
                            </div>
                            {items.length === 0 ? (
                              <p className="text-xs text-gray-400">Sin ítems registrados</p>
                            ) : (
                              <table className="min-w-full text-sm bg-white rounded border border-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {items.map((item: any) => {
                                    const edit = editItems[item.id];
                                    const prodNombre = item.stock?.nombre || item.movimientoStock?.stock?.nombre || 'Sin nombre';
                                    const qty = edit?.cantidad ?? item.cantidad?.toString() ?? '';
                                    const pu = edit?.precioUnitario ?? item.precioUnitario?.toString() ?? '';
                                    const total = edit
                                      ? (parseFloat(edit.cantidad || '0') * parseFloat(edit.precioUnitario || '0'))
                                      : item.precioTotal;
                                    return (
                                      <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-800">{prodNombre}</td>
                                        <td className="px-3 py-2 text-right">
                                          <input
                                            type="number"
                                            value={qty}
                                            onChange={e => setEditItems(prev => ({ ...prev, [item.id]: { cantidad: e.target.value, precioUnitario: pu } }))}
                                            onBlur={() => saveItem(item.id, facturaId)}
                                            className="w-24 text-sm border border-gray-300 rounded px-2 py-1 text-right"
                                          />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          <input
                                            type="number"
                                            value={pu}
                                            onChange={e => setEditItems(prev => ({ ...prev, [item.id]: { cantidad: qty, precioUnitario: e.target.value } }))}
                                            onBlur={() => saveItem(item.id, facturaId)}
                                            className="w-32 text-sm border border-gray-300 rounded px-2 py-1 text-right"
                                          />
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium text-gray-700">
                                          {fmt(total || 0)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                                    <td className="px-3 py-2 text-xs text-gray-600" colSpan={3}>Total factura</td>
                                    <td className="px-3 py-2 text-right">{fmt(items.reduce((s: number, i: any) => s + (i.precioTotal || 0), 0))}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
