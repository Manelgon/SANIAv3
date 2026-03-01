import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// ── IA Analysis PDF ────────────────────────────────────────────────────────────

export interface IAAnalysisPDFData {
    patient: {
        first_name: string;
        last_name_1: string;
        last_name_2?: string;
        cip: string;
    };
    practitioner: {
        first_name: string;
        last_name_1: string;
        license_number?: string;
    };
    analyzedDocuments: {
        title: string;
        type: string;
        created_at: string;
    }[];
    analysis: {
        summary?: string;
        findings?: { document: string; finding: string }[];
        recommendations?: string[];
        full_analysis?: string;
        [key: string]: any;
    };
    generatedAt: string;
}

export async function generateIAAnalysisPDF(data: IAAnalysisPDFData): Promise<{ blob: Blob; filename: string }> {
    const doc = new jsPDF() as any;
    const { patient, practitioner, analyzedDocuments, analysis, generatedAt } = data;
    const PAGE_W = 210;
    const MARGIN = 20;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    let y = 0;

    const checkPage = (needed = 20) => {
        if (y + needed > 272) { doc.addPage(); y = 20; }
    };

    // ── HEADER ──────────────────────────────────────────────────────
    doc.setFillColor(15, 77, 63); // primary teal
    doc.rect(0, 0, PAGE_W, 38, 'F');

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('SanIA · Informe de Análisis IA', MARGIN, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(189, 247, 235); // accent
    doc.text('Documento generado automáticamente mediante inteligencia artificial', MARGIN, 27);
    doc.text(`Generado el ${format(new Date(generatedAt), 'dd/MM/yyyy HH:mm')}`, MARGIN, 34);

    y = 50;

    // ── PATIENT & PRACTITIONER ───────────────────────────────────────
    const drawSection = (title: string) => {
        checkPage(14);
        doc.setFillColor(237, 245, 243);
        doc.rect(MARGIN, y - 5, CONTENT_W, 8, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 77, 63);
        doc.text(title.toUpperCase(), MARGIN + 3, y);
        y += 8;
    };

    const drawRow = (label: string, value: string, x = MARGIN + 3, col2x?: number, label2?: string, value2?: string) => {
        checkPage(8);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(label, x, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(value, x + 35, y);
        if (col2x && label2 && value2) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(label2, col2x, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(value2, col2x + 35, y);
        }
        y += 7;
    };

    drawSection('Datos del Paciente');
    drawRow('Paciente:', `${patient.first_name} ${patient.last_name_1} ${patient.last_name_2 || ''}`.trim(), MARGIN + 3, 120, 'CIP:', patient.cip);
    y += 3;

    drawSection('Responsable Clínico');
    drawRow('Facultativo:', `${practitioner.first_name} ${practitioner.last_name_1}`, MARGIN + 3, 120, 'Nº Colegiado:', practitioner.license_number || '---');
    y += 5;

    // ── ANALYZED DOCUMENTS TABLE ─────────────────────────────────────
    drawSection(`Documentos Analizados (${analyzedDocuments.length})`);
    y += 2;

    autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Documento', 'Tipo', 'Fecha']],
        body: analyzedDocuments.map(d => [
            d.title,
            d.type,
            format(new Date(d.created_at), 'dd/MM/yyyy'),
        ]),
        theme: 'striped',
        headStyles: {
            fillColor: [15, 77, 63],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8,
        },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [240, 253, 250] },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 50 }, 2: { cellWidth: 30 } },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ── ANALYSIS CONTENT ─────────────────────────────────────────────
    const addTextBlock = (title: string, content: string) => {
        checkPage(20);
        drawSection(title);
        y += 2;
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        const lines = doc.splitTextToSize(content || 'Sin datos', CONTENT_W - 6);
        lines.forEach((line: string) => {
            checkPage(7);
            doc.text(line, MARGIN + 3, y);
            y += 5.5;
        });
        y += 4;
    };

    if (analysis.summary) addTextBlock('Resumen del Análisis', analysis.summary);

    if (analysis.findings && analysis.findings.length > 0) {
        checkPage(20);
        drawSection('Hallazgos por Documento');
        y += 2;
        analysis.findings.forEach((f: { document: string; finding: string }, i: number) => {
            checkPage(18);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 77, 63);
            doc.text(`${i + 1}. ${f.document}`, MARGIN + 3, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            const lines = doc.splitTextToSize(f.finding, CONTENT_W - 10);
            lines.forEach((line: string) => {
                checkPage(6);
                doc.text(line, MARGIN + 6, y);
                y += 5;
            });
            y += 3;
        });
    }

    if (analysis.recommendations && analysis.recommendations.length > 0) {
        checkPage(20);
        drawSection('Recomendaciones');
        y += 2;
        analysis.recommendations.forEach((rec: string) => {
            checkPage(8);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            const lines = doc.splitTextToSize(`• ${rec}`, CONTENT_W - 6);
            lines.forEach((line: string) => {
                checkPage(6);
                doc.text(line, MARGIN + 3, y);
                y += 5.5;
            });
        });
        y += 4;
    }

    if (analysis.full_analysis && !analysis.summary) {
        addTextBlock('Análisis Completo', analysis.full_analysis);
    }

    // ── DISCLAIMER ───────────────────────────────────────────────────
    checkPage(20);
    y += 5;
    doc.setFillColor(255, 251, 235);
    doc.rect(MARGIN, y, CONTENT_W, 18, 'F');
    doc.setDrawColor(217, 119, 6);
    doc.rect(MARGIN, y, CONTENT_W, 18, 'S');
    y += 6;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('AVISO LEGAL', MARGIN + 4, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 80, 20);
    doc.text('Este informe ha sido generado mediante inteligencia artificial y es de carácter orientativo.', MARGIN + 4, y);
    y += 4;
    doc.text('No sustituye el criterio clínico del facultativo ni tiene valor diagnóstico definitivo.', MARGIN + 4, y);

    // ── FOOTER ───────────────────────────────────────────────────────
    const pages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(160);
        doc.text(`Página ${i} de ${pages}`, 105, 287, { align: 'center' });
        doc.text('SanIA · Análisis IA', MARGIN, 287);
        doc.text(format(new Date(generatedAt), 'dd/MM/yyyy HH:mm'), PAGE_W - MARGIN, 287, { align: 'right' });
    }

    const cleanCip = patient.cip.replace(/[^a-z0-9]/gi, '');
    const dateStr = format(new Date(generatedAt), 'yyyy-MM-dd_HHmm');
    return {
        blob: doc.output('blob'),
        filename: `IA_ANALYSIS_${cleanCip}_${dateStr}.pdf`,
    };
}

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

    doc.setFontSize(9);
    doc.setTextColor(113, 128, 150);
    doc.setFont("helvetica", "normal");
    doc.text("Documento generado automáticamente", 105, 48, { align: 'center' });

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

    // --- SIGNATURE AREA (AT THE END) ---
    // Check if we need a new page for signature
    if (y > 220) {
        doc.addPage();
        y = 20;
    } else {
        y += 15;
    }

    // Signature section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 72);
    doc.text("Firma del Facultativo:", 130, y);

    if (signatureUrl) {
        try {
            // Signature image below the text (square format)
            doc.addImage(signatureUrl, 'PNG', 130, y + 5, 30, 30);
            y += 40;
        } catch (e) {
            console.error('Error adding signature image:', e);
            y += 20;
        }
    } else {
        y += 25;
    }

    // Signature line
    doc.setDrawColor(200);
    doc.line(130, y, 185, y);
    y += 5;

    // Practitioner details below signature
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(45, 55, 72);
    doc.text(`${practitioner.first_name} ${practitioner.last_name_1}`, 130, y);
    y += 4;

    if (practitioner.license_number) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
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
