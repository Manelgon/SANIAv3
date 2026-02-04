import { Activity, Thermometer, Scale, Ruler, Heart, Droplet } from 'lucide-react';
import type { ConsultationConstant } from './types';

interface ConsultationVitalsProps {
    constants: ConsultationConstant[];
}

export function ConsultationVitals({ constants }: ConsultationVitalsProps) {
    const getConstantIcon = (code: string) => {
        switch (code) {
            case 'WEIGHT': return <Scale className="h-4 w-4" />;
            case 'HEIGHT': return <Ruler className="h-4 w-4" />;
            case 'BP_SYS':
            case 'BP_DIA': return <Activity className="h-4 w-4" />;
            case 'HEART_RATE': return <Heart className="h-4 w-4" />;
            case 'TEMP': return <Thermometer className="h-4 w-4" />;
            case 'SATO2': return <Droplet className="h-4 w-4" />;
            default: return <Activity className="h-4 w-4" />;
        }
    };

    return (
        <div className="col-span-3 space-y-6">
            <div className="flex items-center gap-2 px-1 border-b border-gray-100 pb-2">
                <Activity className="h-4 w-4 text-brand-500" />
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Biometría y Constantes</h5>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
                {constants.length > 0 ? constants.map((c, idx) => (
                    <div key={idx} className="bg-gray-50/50 border border-gray-100 rounded-lg px-3 py-2.5 flex items-center justify-between transition-colors hover:bg-white hover:border-brand-100 shadow-sm">
                        <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 bg-white rounded-md flex items-center justify-center text-gray-400 border border-gray-100">
                                {getConstantIcon(c.constant?.code)}
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                {c.constant?.code?.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <div className="text-right flex items-baseline gap-1">
                            <span className="text-sm font-black text-gray-900">{c.value}</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase">{c.constant?.unit}</span>
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center py-10 bg-gray-50/30 rounded-xl border border-dashed border-gray-200">
                        <Activity className="h-6 w-6 text-gray-200 mb-2" />
                        <p className="text-[9px] text-gray-400 font-black uppercase">Sin registros</p>
                    </div>
                )}
            </div>
        </div>
    );
}
