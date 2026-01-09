import { Calculator, FileText, CreditCard, BookCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Contabilidad() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Calculator className="w-8 h-8" />
            <span>Contabilidad</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Análisis contable y financiero
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/contabilidad/facturas"
          className="card group cursor-pointer"
        >
          <div className="flex items-start space-x-4">
            <div className="bg-blue-500 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                Facturas
              </h3>
              <p className="text-gray-600 mt-1">Gestión de facturas de compra y venta</p>
            </div>
          </div>
        </Link>

        <Link
          to="/contabilidad/pago-proveedores"
          className="card group cursor-pointer"
        >
          <div className="flex items-start space-x-4">
            <div className="bg-green-500 p-3 rounded-lg">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                Pago Proveedores
              </h3>
              <p className="text-gray-600 mt-1">Registro y seguimiento de pagos a proveedores</p>
            </div>
          </div>
        </Link>

        <Link
          to="/contabilidad/chequera"
          className="card group cursor-pointer"
        >
          <div className="flex items-start space-x-4">
            <div className="bg-purple-500 p-3 rounded-lg">
              <BookCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                Chequera
              </h3>
              <p className="text-gray-600 mt-1">Gestión y control de cheques</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
