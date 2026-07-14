// @ts-nocheck
import { useState } from 'react';
import { useOfflineData } from '../hooks/useOfflineData';
import { EntityType } from '../services/offlineApi';
import { Maquinaria } from '../types';
import { Plus, Truck, Trash2, Tractor, CarFront, Bike, Sprout as Sprayer, Box, Blend, Wheat, Settings, CircleDot } from 'lucide-react';

const categoriasPrincipales = [
  { nombre: 'Máquina', icon: Truck, color: 'bg-blue-500' },
  { nombre: 'Implemento', icon: Settings, color: 'bg-orange-500' },
];

const subcategorias = {
  'Máquina': [
    { nombre: 'Tractor', icon: Tractor, color: 'bg-green-500' },
    { nombre: 'Camión', icon: Truck, color: 'bg-red-500' },
    { nombre: 'Camioneta', icon: CarFront, color: 'bg-blue-500' },
    { nombre: 'Moto', icon: Bike, color: 'bg-purple-500' },
    { nombre: 'Cuatriciclo', icon: Bike, color: 'bg-yellow-500' },
    { nombre: 'Pulverizadora', icon: Sprayer, color: 'bg-cyan-500' },
  ],
  'Implemento': [
    { nombre: 'Desmalezadora', icon: Wheat, color: 'bg-lime-500' },
    { nombre: 'Rastra', icon: Blend, color: 'bg-amber-500' },
    { nombre: 'Sembradora', icon: CircleDot, color: 'bg-emerald-500' },
    { nombre: 'Carro', icon: Box, color: 'bg-slate-500' },
    { nombre: 'Pulverizadora', icon: Sprayer, color: 'bg-cyan-500' },
    { nombre: 'Embolsadora', icon: Box, color: 'bg-indigo-500' },
    { nombre: 'Extractora', icon: Settings, color: 'bg-pink-500' },
    { nombre: 'Chimango', icon: Wheat, color: 'bg-teal-500' },
  ],
};

export default function Maquinarias() {
  const {
    data: maquinarias,
    loading,
    create,
    remove,
  } = useOfflineData<Maquinaria>({
    endpoint: '/maquinarias',
    entityType: EntityType.MAQUINARIA,
  });
  const [showForm, setShowForm] = useState(false);
  const [categoriaPrincipal, setCategoriaPrincipal] = useState<string | null>(null);
  const [subcategoriaSeleccionada, setSubcategoriaSeleccionada] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: '',
    marca: '',
    modelo: '',
    anio: '',
    patente: '',
    estado: 'Operativa',
    horasUso: '',
    descripcion: '',
  });
  const [tipoPersonalizado, setTipoPersonalizado] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tipoFinal = formData.tipo === '__otro__' ? tipoPersonalizado.trim() : formData.tipo;
    if (!tipoFinal) {
      alert('Ingresá el tipo de implemento');
      return;
    }
    try {
      await create({
        ...formData,
        tipo: tipoFinal,
        anio: formData.anio ? parseInt(formData.anio) : undefined,
        horasUso: formData.horasUso ? parseFloat(formData.horasUso) : 0,
      });
      setShowForm(false);
      setTipoPersonalizado('');
      setFormData({
        nombre: '',
        tipo: '',
        marca: '',
        modelo: '',
        anio: '',
        patente: '',
        estado: 'Operativa',
        horasUso: '',
        descripcion: '',
      });
    } catch (error: any) {
      alert(error.message || 'Error al crear maquinaria');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta maquinaria?')) return;
    try {
      await remove(id);
    } catch (error: any) {
      alert(error.message || 'Error al eliminar maquinaria');
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Operativa':
        return 'bg-green-100 text-green-800';
      case 'En mantenimiento':
        return 'bg-yellow-100 text-yellow-800';
      case 'Fuera de servicio':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMaquinariasPorTipo = (tipo: string) => {
    return maquinarias.filter((m) => m.tipo === tipo);
  };

  const maquinariasFiltradas = subcategoriaSeleccionada
    ? getMaquinariasPorTipo(subcategoriaSeleccionada)
    : maquinarias;

  const getAllTipos = () => {
    const tiposSet = new Set<string>();
    Object.values(subcategorias).flat().forEach(sub => tiposSet.add(sub.nombre));
    return Array.from(tiposSet);
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {subcategoriaSeleccionada
              ? `Maquinarias > ${categoriaPrincipal} > ${subcategoriaSeleccionada}`
              : categoriaPrincipal
              ? `Maquinarias > ${categoriaPrincipal}`
              : 'Maquinarias'}
          </h1>
          <p className="text-gray-600 mt-2">Gestiona tu maquinaria agrícola</p>
        </div>
        <div className="flex items-center space-x-3">
          {subcategoriaSeleccionada && (
            <button
              onClick={() => setSubcategoriaSeleccionada(null)}
              className="btn-secondary"
            >
              Volver a {categoriaPrincipal}
            </button>
          )}
          {categoriaPrincipal && !subcategoriaSeleccionada && (
            <button
              onClick={() => setCategoriaPrincipal(null)}
              className="btn-secondary"
            >
              Volver a Categorías
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Maquinaria</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Nueva Maquinaria</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => {
                    setFormData({ ...formData, tipo: e.target.value });
                    if (e.target.value !== '__otro__') setTipoPersonalizado('');
                  }}
                  className="input"
                  required={formData.tipo !== '__otro__'}
                >
                  <option value="">Seleccionar...</option>
                  <optgroup label="Máquina">
                    {subcategorias['Máquina'].map((sub) => (
                      <option key={sub.nombre} value={sub.nombre}>
                        {sub.nombre}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Implemento">
                    {subcategorias['Implemento'].map((sub) => (
                      <option key={sub.nombre} value={sub.nombre}>
                        {sub.nombre}
                      </option>
                    ))}
                  </optgroup>
                  <option value="__otro__">Otro (escribir)...</option>
                </select>
                {formData.tipo === '__otro__' && (
                  <input
                    type="text"
                    value={tipoPersonalizado}
                    onChange={(e) => setTipoPersonalizado(e.target.value)}
                    className="input mt-2"
                    placeholder="Ej: Cisterna, Mixer, Acoplado..."
                    required
                    autoFocus
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="input"
                >
                  <option value="Operativa">Operativa</option>
                  <option value="En mantenimiento">En mantenimiento</option>
                  <option value="Fuera de servicio">Fuera de servicio</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca
                </label>
                <input
                  type="text"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modelo
                </label>
                <input
                  type="text"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Año
                </label>
                <input
                  type="number"
                  value={formData.anio}
                  onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                  className="input"
                  min="1900"
                  max="2100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patente
                </label>
                <input
                  type="text"
                  value={formData.patente}
                  onChange={(e) => setFormData({ ...formData, patente: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horas de Uso
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.horasUso}
                  onChange={(e) => setFormData({ ...formData, horasUso: e.target.value })}
                  className="input"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn-primary">
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!categoriaPrincipal ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categoriasPrincipales.map((categoria) => {
            const Icon = categoria.icon;
            const tiposEnCategoria = subcategorias[categoria.nombre as keyof typeof subcategorias];
            const maquinariasEnCategoria = maquinarias.filter(m =>
              tiposEnCategoria.some(sub => sub.nombre === m.tipo)
            );

            return (
              <div
                key={categoria.nombre}
                onClick={() => setCategoriaPrincipal(categoria.nombre)}
                className="card cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`${categoria.color} p-4 rounded-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{categoria.nombre}</h3>
                    <p className="text-sm text-gray-600">
                      {maquinariasEnCategoria.length} {maquinariasEnCategoria.length === 1 ? 'unidad' : 'unidades'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !subcategoriaSeleccionada ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {subcategorias[categoriaPrincipal as keyof typeof subcategorias]?.map((subcategoria) => {
            const Icon = subcategoria.icon;
            const maquinariasEnSubcategoria = getMaquinariasPorTipo(subcategoria.nombre);

            return (
              <div
                key={subcategoria.nombre}
                onClick={() => setSubcategoriaSeleccionada(subcategoria.nombre)}
                className="card cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col items-center text-center p-4">
                  <div className={`${subcategoria.color} p-4 rounded-lg mb-3`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{subcategoria.nombre}</h3>
                  <p className="text-sm text-gray-600">
                    {maquinariasEnSubcategoria.length} {maquinariasEnSubcategoria.length === 1 ? 'unidad' : 'unidades'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {maquinariasFiltradas.map((maquinaria) => (
          <div key={maquinaria.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{maquinaria.nombre}</h3>
                  <p className="text-sm text-gray-600">{maquinaria.tipo}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(maquinaria.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estado:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(maquinaria.estado)}`}>
                  {maquinaria.estado}
                </span>
              </div>

              {maquinaria.marca && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Marca:</span>
                  <span className="font-medium">{maquinaria.marca}</span>
                </div>
              )}

              {maquinaria.modelo && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Modelo:</span>
                  <span className="font-medium">{maquinaria.modelo}</span>
                </div>
              )}

              {maquinaria.anio && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Año:</span>
                  <span className="font-medium">{maquinaria.anio}</span>
                </div>
              )}

              {maquinaria.patente && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Patente:</span>
                  <span className="font-medium">{maquinaria.patente}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Horas de uso:</span>
                <span className="font-medium">{maquinaria.horasUso} hs</span>
              </div>

              {maquinaria.descripcion && (
                <p className="text-sm text-gray-600 mt-2 pt-2 border-t">
                  {maquinaria.descripcion}
                </p>
              )}
            </div>
          </div>
        ))}
        </div>
      )}

      {!categoriaPrincipal && maquinarias.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          No hay maquinarias registradas. Crea una para comenzar.
        </div>
      )}

      {subcategoriaSeleccionada && maquinariasFiltradas.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          No hay {subcategoriaSeleccionada.toLowerCase()}s registradas. Crea una para comenzar.
        </div>
      )}
    </div>
  );
}
