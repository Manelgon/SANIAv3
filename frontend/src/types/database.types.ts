export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string
                    role: 'super_admin' | 'practitioner' | 'assistant' | 'billing' | 'patient'
                    practitioner_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    email: string
                    role: 'super_admin' | 'practitioner' | 'assistant' | 'billing' | 'patient'
                    practitioner_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    role?: 'super_admin' | 'practitioner' | 'assistant' | 'billing' | 'patient'
                    practitioner_id?: string | null
                    created_at?: string
                }
            }
            practitioners: {
                Row: {
                    id: string
                    user_id: string
                    fid: string | null
                    license_number: string
                    first_name: string
                    last_name_1: string
                    last_name_2: string | null
                    dni: string | null
                    specialty: string | null
                    bio: string | null
                    birth_date: string | null
                    address: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    fid?: string | null
                    license_number: string
                    first_name: string
                    last_name_1: string
                    last_name_2?: string | null
                    dni?: string | null
                    specialty?: string | null
                    bio?: string | null
                    birth_date?: string | null
                    address?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    fid?: string | null
                    license_number?: string
                    first_name?: string
                    last_name_1?: string
                    last_name_2?: string | null
                    dni?: string | null
                    specialty?: string | null
                    bio?: string | null
                    birth_date?: string | null
                    address?: Json | null
                    created_at?: string
                }
            }
            staff: {
                Row: {
                    id: string
                    user_id: string
                    practitioner_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    practitioner_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    practitioner_id?: string
                    created_at?: string
                }
            }
            patients: {
                Row: {
                    id: string
                    practitioner_id: string | null
                    user_id: string | null
                    cip: string | null
                    first_name: string
                    last_name_1: string
                    last_name_2: string | null
                    dni: string | null
                    birth_date: string | null
                    address: Json | null
                    insured_number: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    practitioner_id?: string | null
                    user_id?: string | null
                    cip?: string | null
                    first_name: string
                    last_name_1: string
                    last_name_2?: string | null
                    dni?: string | null
                    birth_date?: string | null
                    address?: Json | null
                    insured_number?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    practitioner_id?: string | null
                    user_id?: string | null
                    cip?: string | null
                    first_name?: string
                    last_name_1?: string
                    last_name_2?: string | null
                    dni?: string | null
                    birth_date?: string | null
                    address?: Json | null
                    insured_number?: string | null
                    created_at?: string
                }
            }
            portfolios: {
                Row: {
                    id: string
                    practitioner_id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    practitioner_id: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    practitioner_id?: string
                    name?: string
                    created_at?: string
                }
            }
            consultations: {
                Row: {
                    id: string
                    patient_id: string
                    practitioner_id: string
                    status: 'draft' | 'signed' | 'closed'
                    scheduled_at: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    patient_id: string
                    practitioner_id: string
                    status?: 'draft' | 'signed' | 'closed'
                    scheduled_at: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    patient_id?: string
                    practitioner_id?: string
                    status?: 'draft' | 'signed' | 'closed'
                    scheduled_at?: string
                    created_at?: string
                }
            }
            diagnoses: {
                Row: {
                    id: string
                    consultation_id: string
                    code: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    consultation_id: string
                    code: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    consultation_id?: string
                    code?: string
                    name?: string
                    created_at?: string
                }
            }
            specialties: {
                Row: {
                    id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    created_at?: string
                }
            }
            practitioner_documents: {
                Row: {
                    id: string
                    practitioner_id: string
                    name: string
                    url: string
                    type: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    practitioner_id: string
                    name: string
                    url: string
                    type: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    practitioner_id?: string
                    name?: string
                    url?: string
                    type?: string
                    created_at?: string
                }
            }
            patient_documents: {
                Row: {
                    id: string
                    patient_id: string
                    name: string
                    url: string
                    type: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    patient_id: string
                    name: string
                    url: string
                    type: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    patient_id?: string
                    name?: string
                    url?: string
                    type?: string
                    created_at?: string
                }
            }
            audit_events: {
                Row: {
                    id: string
                    user_id: string
                    action: string
                    details: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    action: string
                    details?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    action?: string
                    details?: Json | null
                    created_at?: string
                }
            }
        }
    }
}
