import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface PDFData {
    patient: {
        first_name: string;
        last_name_1: string;
        last_name_2?: string;
        cip: string;
        dni?: string;
        birth_date?: string;
    };
    practitioner: {
        first_name: string;
        last_name_1: string;
        license_number?: string;
    };
    consultation: {
        motivo: string;
        exploracion: string;
        tratamiento: string;
        aproximacion: string;
        diagnoses: { code: string; description: string }[];
        date: string;
    };
    vitals?: {
        weight?: string;
        height?: string;
        systolic?: string;
        diastolic?: string;
        heartRate?: string;
        temp?: string;
        satO2?: string;
    };
    signatureUrl?: string;
    headerImageUrl?: string;
}

export async function generateConsultationPDF(data: PDFData): Promise<{ blob: Blob; filename: string }> {
    const doc = new jsPDF() as any;
    const { patient, practitioner, consultation, vitals, signatureUrl, headerImageUrl } = data;

    // --- ADMINISTRATIVE HEADER ---
    if (headerImageUrl) {
        try {
            // Header image at the very top
            doc.addImage(headerImageUrl, 'PNG', 0, 0, 210, 40);
        } catch (e) {
            console.error('Error adding header image:', e);
            // Fallback to simple styled header
            doc.setFillColor(245, 247, 250);
            doc.rect(0, 0, 210, 40, 'F');
            doc.setFontSize(22);
            doc.setTextColor(26, 54, 93);
            doc.setFont("helvetica", "bold");
            doc.text("SANIA - INFORME CLÍNICO", 105, 20, { align: 'center' });
        }
    } else {
        // Styled Header Box
        doc.setFillColor(245, 247, 250);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setFontSize(22);
        doc.setTextColor(26, 54, 93);
        doc.setFont("helvetica", "bold");
        doc.text("SANIA - INFORME CLÍNICO", 105, 20, { align: 'center' });
    }

    doc.setFontSize(10);
    doc.setTextColor(113, 128, 150);
    doc.setFont("helvetica", "normal");
    doc.text("Documento generado automáticamente por el sistema de gestión clínica", 105, 48, { align: 'center' });

    // --- HORIZONTAL SEPARATOR ---
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 55, 190, 55);

    // --- DATA GRID: PATIENT & PRACTITIONER ---
    let y = 65;

    const drawSectionHeader = (title: string, posY: number) => {
        doc.setFillColor(237, 242, 247);
        doc.rect(20, posY - 5, 170, 7, 'F');
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(45, 55, 72);
        doc.text(title, 25, posY);
    };

    drawSectionHeader("INFORMACIÓN DEL PACIENTE", y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.text(`Nombre Completo:`, 25, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${patient.first_name} ${patient.last_name_1} ${patient.last_name_2 || ''}`, 60, y);

    doc.setFont("helvetica", "normal");
    doc.text(`DNI / Pasaporte:`, 130, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${patient.dni || '---'}`, 160, y);

    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`CIP de Salud:`, 25, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${patient.cip}`, 60, y);

    doc.setFont("helvetica", "normal");
    doc.text(`Fecha Nacimiento:`, 130, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${patient.birth_date ? format(new Date(patient.birth_date), 'dd/MM/yyyy') : '---'}`, 165, y);

    y += 15;
    drawSectionHeader("RESPONSABLE CLÍNICO", y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Facultativo:`, 25, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${practitioner.first_name} ${practitioner.last_name_1}`, 50, y);

    doc.setFont("helvetica", "normal");
    doc.text(`Nº Colegiado:`, 130, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${practitioner.license_number || '---'}`, 160, y);

    y += 15;
    drawSectionHeader("DATOS DE LA CONSULTA", y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha y Hora:`, 25, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${format(new Date(consultation.date), 'dd/MM/yyyy HH:mm')}`, 55, y);

    // --- CLINICAL CONTENT ---
    y += 12;
    const addClinicalBlock = (title: string, content: string) => {
        // Check for page overflow
        if (y > 260) {
            doc.addPage();
            y = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(74, 85, 104);
        doc.text(title, 25, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0);
        const lines = doc.splitTextToSize(content || 'Sin datos registrados', 165);
        doc.text(lines, 25, y);
        y += (lines.length * 5) + 8;
    };

    addClinicalBlock("MOTIVO DE LA CONSULTA", consultation.motivo);

    if (consultation.diagnoses.length > 0) {
        const diagList = consultation.diagnoses.map(d => `[${d.code}] ${d.description}`).join('\n');
        addClinicalBlock("DIAGNÓSTICO(S)", diagList);
    }

    addClinicalBlock("EXPLORACIÓN FÍSICA Y HALLAZGOS", consultation.exploracion);

    // --- VITALS MINI TABLE ---
    if (vitals && Object.values(vitals).some(v => v !== undefined && v !== '')) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(74, 85, 104);
        doc.text("CONSTANTES VITALES", 25, y);
        y += 4;

        const tableBody = [
            ['Tensión Art.', `${vitals.systolic || '---'}/${vitals.diastolic || '---'} mmHg`, 'Frec. Cardíaca', `${vitals.heartRate || '---'} lpm`],
            ['Sat. Oxígeno', `${vitals.satO2 || '---'} %`, 'Temperatura', `${vitals.temp || '---'} ºC`],
            ['Peso', `${vitals.weight || '---'} kg`, 'Altura', `${vitals.height || '---'} cm`]
        ];

        autoTable(doc, {
            startY: y,
            margin: { left: 25, right: 15 },
            body: tableBody,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { fontStyle: 'bold', textColor: [100, 100, 100], cellWidth: 35 },
                2: { fontStyle: 'bold', textColor: [100, 100, 100], cellWidth: 35 }
            }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
    }

    addClinicalBlock("IMPRESIÓN CLÍNICA / PLAN / TRATAMIENTO", `${consultation.aproximacion}\n\n${consultation.tratamiento}`);

    // --- SIGNATURE AREA ---
    if (y > 230) { doc.addPage(); y = 20; }
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 72);
    doc.text("Firma del Facultativo:", 130, y);

    if (signatureUrl) {
        try {
            // Signature image below the text
            doc.addImage(signatureUrl, 'PNG', 130, y + 5, 45, 20);
            y += 30;
        } catch (e) {
            console.error('Error adding signature image:', e);
            y += 20;
        }
    } else {
        y += 25;
    }

    doc.setDrawColor(200);
    doc.line(130, y, 185, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${practitioner.first_name} ${practitioner.last_name_1}`, 130, y);
    if (practitioner.license_number) {
        y += 4;
        doc.text(`Col. Nº: ${practitioner.license_number}`, 130, y);
    }

    // --- FOOTER ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text(`Hoja ${i} de ${pageCount}`, 105, 285, { align: 'center' });
        doc.text(`Código de Verificación: ${Math.random().toString(36).substring(2, 12).toUpperCase()}`, 20, 285);
        doc.text(`Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 190, 285, { align: 'right' });
    }

    // --- FILENAME GENERATION ---
    // convention: diagnostico_cip_fecha
    // Using first diagnosis code for simplicity and CIP for uniqueness
    const diagCode = consultation.diagnoses[0]?.code?.replace(/[^a-z0-9]/gi, '') || 'CONS';
    const cleanCip = patient.cip.replace(/[^a-z0-9]/gi, '');
    const dateStr = format(new Date(consultation.date), 'yyyy-MM-dd');
    const filename = `${diagCode}_${cleanCip}_${dateStr}.pdf`;

    return {
        blob: doc.output('blob'),
        filename
    };
}
