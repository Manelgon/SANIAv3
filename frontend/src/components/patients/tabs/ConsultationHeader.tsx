import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { User, Calendar } from 'lucide-react';
import type { ConsultationDetail } from './types';

interface ConsultationHeaderProps {
    data: ConsultationDetail;
}

export function ConsultationHeader({ data }: ConsultationHeaderProps) {
    return (
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-brand-50 rounded-2xl flex items-center justify-center border border-brand-100 shadow-sm">
                    <User className="h-8 w-8 text-brand-600" />
                </div>
                <div>
                    <h4 className="text-lg font-black text-gray-900 leading-tight">
                        {data.patient?.last_name_1} {data.patient?.last_name_2 ? `${data.patient.last_name_2}, ` : ', '}{data.patient?.first_name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                        <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-600">
                            CIP: {data.patient?.cip || 'N/A'}
                        </span>
                        <span>Ficha Clínica del Paciente</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2 text-sm font-black text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <Calendar className="h-4 w-4 text-brand-500" />
                    {format(new Date(data.created_at), "dd 'de' MMMM, yyyy", { locale: es })}
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${data.status === 'closed'
                    ? 'bg-green-50 text-green-700 border-green-100'
                    : 'bg-orange-50 text-orange-700 border-orange-100'
                    }`}>
                    {data.status === 'closed' ? 'Consulta Finalizada' : 'Borrador de Consulta'}
                </span>
            </div>
        </div>
    );
}
