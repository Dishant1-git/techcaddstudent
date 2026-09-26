import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Printer, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from '../../context/ToastContext';

export function ExportReports({
  title = 'Attendance Report',
  records = [],
  filename = 'attendance_report',
  summary = null
}) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // 1. Export CSV
  const exportCSV = () => {
    try {
      if (records.length === 0) {
        toast.warning('No records available to export.');
        return;
      }

      const headers = ['Student ID', 'Student Name', 'Course', 'Batch', 'Date', 'Session', 'Check-In Time', 'Status', 'Verified By', 'Rejection Reason'];
      const rows = records.map(r => [
        r.student_code || 'N/A',
        `"${r.student_name || ''}"`,
        `"${r.course_name || ''}"`,
        `"${r.batch_name || ''}"`,
        r.date || '',
        `"${r.session || ''}"`,
        r.check_in_time || '',
        r.status || '',
        `"${r.trainer_name || r.verified_by_name || ''}"`,
        `"${r.rejection_reason || ''}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('CSV Report downloaded successfully!');
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to export CSV report.');
    }
  };

  // 2. Export Excel (.xlsx)
  const exportExcel = () => {
    try {
      if (records.length === 0) {
        toast.warning('No records available to export.');
        return;
      }

      const excelData = records.map(r => ({
        'Student ID': r.student_code || 'N/A',
        'Student Name': r.student_name || '',
        'Email': r.student_email || '',
        'Course': r.course_name || '',
        'Batch': r.batch_name || '',
        'Date': r.date || '',
        'Session': r.session || '',
        'Check-In Time': r.check_in_time || '',
        'Attendance Status': r.status || '',
        'Verified By': r.trainer_name || r.verified_by_name || 'N/A',
        'Rejection Reason': r.rejection_reason || 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast.success('Excel workbook exported successfully!');
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Excel report.');
    }
  };

  // 3. Export PDF
  const exportPDF = () => {
    try {
      if (records.length === 0) {
        toast.warning('No records available to export.');
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape' });

      // Title & Header
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text(title, 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${records.length}`, 14, 28);

      if (summary) {
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(
          `Summary: Verified: ${summary.verifiedCount || 0} | Pending: ${summary.pendingCount || 0} | Rejected: ${summary.rejectedCount || 0} | Rate: ${summary.overallPercentage || 0}%`,
          14,
          35
        );
      }

      const tableRows = records.map(r => [
        r.student_code || 'N/A',
        r.student_name || '',
        r.batch_name || '',
        r.date || '',
        r.session || '',
        r.check_in_time || '',
        r.status || '',
        r.trainer_name || r.verified_by_name || '-'
      ]);

      doc.autoTable({
        startY: summary ? 42 : 35,
        head: [['ID', 'Student Name', 'Batch', 'Date', 'Session', 'Check-In', 'Status', 'Verified By']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF report generated and downloaded!');
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF document.');
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
      >
        <Download className="w-4 h-4" />
        Export Report
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200/80 p-2 z-30 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-1">
              <button
                onClick={exportCSV}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-colors text-left"
              >
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Export as CSV</div>
                  <div className="text-[10px] text-slate-400">Comma separated data</div>
                </div>
              </button>

              <button
                onClick={exportExcel}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-colors text-left mt-1"
              >
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Export as Excel (.xlsx)</div>
                  <div className="text-[10px] text-slate-400">Formatted spreadsheet</div>
                </div>
              </button>

              <button
                onClick={exportPDF}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-colors text-left mt-1"
              >
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Download PDF Report</div>
                  <div className="text-[10px] text-slate-400">Printable document</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
