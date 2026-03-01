import { Activity, Thermometer, Scale, Ruler, Heart, Droplet } from 'lucide-react';
import type { ConsultationConstant } from './types';

interface ConsultationVitalsProps {
    constants: ConsultationConstant[];
    isEditMode?: boolean;
    onUpdate?: (constants: ConsultationConstant[]) => void;
}

const CONSTANT_LABELS: Record<string, string> = {
    WEIGHT: 'Peso',
    HEIGHT: 'Talla',
    BP_SYS: 'T.A. Sistólica',
    BP_DIA: 'T.A. Diastólica',
    HEART_RATE: 'FC',
    TEMP: 'Temperatura',
    SATO2: 'SpO₂',
};

export function ConsultationVitals({ constants, isEditMode = false, onUpdate }: ConsultationVitalsProps) {
    const getIcon = (code: string) => {
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
        <div className="w-full space-y-4">
            {/* Constantes section */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    <h5 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Constantes</h5>
                </div>
                {constants.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 p-3">
                        {constants.map((c, idx) => (
                            <div
                                key={idx}
                                className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col items-center justify-center text-center"
                            >
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mb-1">
                                    {CONSTANT_LABELS[c.constant?.code ?? ''] ?? c.constant?.code?.replace(/_/g, ' ')}
                                </span>
                                {isEditMode ? (
                                    <div className="flex items-baseline gap-1 justify-center">
                                        <input
                                            type="number"
                                            value={c.value}
                                            onChange={(e) => {
                                                const newValue = parseFloat(e.target.value);
                                                const updated = constants.map((ci, i) =>
                                                    i === idx ? { ...ci, value: isNaN(newValue) ? 0 : newValue } : ci
                                                );
                                                onUpdate?.(updated);
                                            }}
                                            className="w-16 text-center p-1 text-sm font-bold border border-slate-300 rounded focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            step="0.01"
                                        />
                                        <span className="text-[10px] text-slate-400 font-medium">{c.constant?.unit}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-baseline gap-0.5 justify-center">
                                        <span className="text-base font-bold text-slate-900">{c.value}</span>
                                        <span className="text-[10px] text-slate-400 font-medium ml-0.5">{c.constant?.unit}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Activity className="h-6 w-6 text-slate-200 mb-2" />
                        <p className="text-xs text-slate-400">Sin constantes registradas</p>
                    </div>
                )}
            </div>
        </div>
    );
}
