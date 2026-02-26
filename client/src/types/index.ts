export interface User {
  id: string;
  usuario: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'ADMIN' | 'GERENTE' | 'OPERARIO' | 'VISOR';
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Campo {
  id: string;
  nombre: string;
  ubicacion: string;
  hectareas: number;
  descripcion?: string;
  activo: boolean;
  lotes?: Lote[];
}

export interface Lote {
  id: string;
  nombre: string;
  hectareas: number;
  cultivo?: string;
  estado?: string;
  descripcion?: string;
  campoId: string;
}

export interface Maquinaria {
  id: string;
  nombre: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  patente?: string;
  estado: string;
  horasUso: number;
  ultimoMantenimiento?: string;
  proximoMantenimiento?: string;
  descripcion?: string;
}

export interface Stock {
  id: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  precioUnitario?: number;
  stockMinimo?: number;
  ubicacion?: string;
  descripcion?: string;
  droga?: string;
  nombreComercial?: string;
  tipo?: string;
}

export interface Cuenta {
  id: string;
  nombre: string;
  tipo: 'EMPRESA' | 'PERSONAL' | 'TERCEROS';
  titular?: string;
  descripcion?: string;
  activo: boolean;
  _count?: { gastos: number };
}

export interface Gasto {
  id: string;
  concepto: string;
  categoria: string;
  monto: number;
  fecha: string;
  descripcion?: string;
  tipoFactura?: string;
  numeroFactura?: string;
  campoId?: string;
  maquinariaId?: string;
  cuentaId?: string;
  grupoId?: string;
  campo?: { nombre: string };
  lotes?: { lote: { id: string; nombre: string } }[];
  lote?: { nombre: string };
  maquinaria?: { nombre: string };
  implemento?: { nombre: string };
  cuenta?: { nombre: string; tipo: string };
  usuario?: { nombre: string; apellido: string };
}

export interface GastoAgrupado {
  grupoId: string;
  concepto: string;
  categoria: string;
  montoTotal: number;
  fecha: string;
  tipoFactura?: string;
  numeroFactura?: string;
  cuenta?: { nombre: string; tipo: string };
  maquinaria?: { nombre: string };
  implemento?: { nombre: string };
  usuario?: { nombre: string; apellido: string };
  gastos: Gasto[];
}

export interface Contratista {
  id: string;
  nombre: string;
  apellido?: string;
  empresa?: string;
  telefono?: string;
  email?: string;
  especialidad?: string;
  activo: boolean;
}

export interface Servicio {
  id: string;
  tipo: string;
  fecha: string;
  descripcion?: string;
  hectareas?: number;
  costoPorHa?: number;
  total?: number;
  moneda: string;
  estado: string;
  variedad?: string;
  tipoFertilizante?: string;
  dosisKgHa?: number;
  unidadDosis?: string;
  caldo?: number;
  receta?: string;
  campoId: string;
  loteId?: string;
  maquinariaId?: string;
  contratistaId?: string;
  campo?: { nombre: string };
  lote?: { nombre: string };
  maquinaria?: { nombre: string };
  contratista?: { nombre: string; apellido?: string; empresa?: string };
  usuario?: { nombre: string; apellido: string };
}
