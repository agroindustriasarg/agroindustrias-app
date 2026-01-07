import { Calculator } from 'lucide-react';

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

      <div className="card">
        <p className="text-gray-600">
          Módulo de contabilidad en desarrollo...
        </p>
      </div>
    </div>
  );
}
