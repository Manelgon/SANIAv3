

export type ConsultationStatus = 'draft' | 'signed' | 'closed';

export interface ClinicalConstant {
    name: string;
    unit: string;
    code: string;
}

export interface ConsultationConstant {
    value: number;
    constant: ClinicalConstant;
}

export interface Diagnosis {
    descripcion: string;
}

export interface ConsultationDiagnosis {
    motivo: string;
    exploracion: string;
    tratamiento: string;
    aproximacion: string;
    diagnosis_code: string;
    status: 'confirmed' | 'pending' | 'unconfirmed' | 'inactive'; // Adjusted based on usages
    diagnosis: Diagnosis | null;
}

export interface Practitioner {
    id: string;
    first_name: string;
    last_name_1: string;
    fid: string;
}

export interface Patient {
    id: string;
    first_name: string;
    last_name_1: string;
    last_name_2: string | null;
    cip: string;
}

export interface ConsultationDetail {
    id: string;
    status: ConsultationStatus;
    created_at: string;
    practitioner: Practitioner | null;
    patient: Patient | null;
    diagnoses: ConsultationDiagnosis[];
    constants: ConsultationConstant[];
}
