// Export Utilities for Reports
// Supports: PDF, Excel, CSV, Print-friendly views

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import type {
  DailyReport,
  WeeklyReport,
  MonthlyReport,
  ServiceReport,
  DebtsAgingReport,
  GoalsReport,
} from "./api";

// ============ COMMON UTILITIES ============

const formatDate = (date: Date | string) => {
  return format(new Date(date), "yyyy-MM-dd");
};

const formatDateTime = (date: Date | string) => {
  return format(new Date(date), "yyyy-MM-dd HH:mm:ss");
};

const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
};

// ============ CSV EXPORT ============

export type CSVData = Record<string, string | number | boolean | null | undefined>;

export const exportToCSV = (
  data: CSVData[],
  filename: string,
  headers?: string[]
): void => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Get headers from first row if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    csvHeaders.join(","),
    ...data.map((row) =>
      csvHeaders
        .map((header) => {
          const value = row[header];
          // Handle values that need quoting (strings with commas, quotes, or newlines)
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ].join("\n");

  // Create and download the file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
};

// ============ EXCEL EXPORT ============

export interface ExcelSheet {
  name: string;
  data: CSVData[];
  headers?: string[];
}

export const exportToExcel = (
  sheets: ExcelSheet[],
  filename: string
): void => {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    if (!sheet.data || sheet.data.length === 0) {
      // Add empty sheet with headers only
      const ws = XLSX.utils.aoa_to_sheet([sheet.headers || []]);
      XLSX.utils.book_append_sheet(workbook, ws, sheet.name.substring(0, 31)); // Excel limit
      return;
    }

    const headers = sheet.headers || Object.keys(sheet.data[0]);
    const rows = sheet.data.map((row) =>
      headers.map((header) => row[header] ?? "")
    );

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set column widths based on content
    const colWidths = headers.map((header, idx) => {
      const maxLength = Math.max(
        header.length,
        ...rows.map((row) => String(row[idx] ?? "").length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, ws, sheet.name.substring(0, 31));
  });

  // Generate and download
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `${filename}.xlsx`);
};

// ============ PDF EXPORT ============

interface PDFSection {
  title: string;
  type: "summary" | "table" | "text";
  data?: CSVData[];
  headers?: string[];
  text?: string;
  summaryItems?: { label: string; value: string | number }[];
}

interface PDFOptions {
  title: string;
  subtitle?: string;
  generatedAt: string;
  sections: PDFSection[];
  orientation?: "portrait" | "landscape";
}

export const exportToPDF = (options: PDFOptions, filename: string): void => {
  const { title, subtitle, generatedAt, sections, orientation = "portrait" } = options;
  
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Helper to check and add new page if needed
  const checkNewPage = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // Subtitle
  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(subtitle, pageWidth / 2, yPos, { align: "center" });
    yPos += 8;
  }

  // Generated timestamp
  doc.setFontSize(9);
  doc.setTextColor(128);
  doc.text(`Generated: ${generatedAt}`, pageWidth / 2, yPos, { align: "center" });
  doc.setTextColor(0);
  yPos += 15;

  // Process sections
  sections.forEach((section) => {
    checkNewPage(30);

    // Section title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, margin, yPos);
    yPos += 8;

    if (section.type === "summary" && section.summaryItems) {
      // Summary items in two columns
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      const colWidth = (pageWidth - 2 * margin) / 2;
      let col = 0;
      let startY = yPos;
      
      section.summaryItems.forEach((item, idx) => {
        const x = margin + col * colWidth;
        const y = startY + Math.floor(idx / 2) * 7;
        
        checkNewPage(7);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`${item.label}:`, x, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(String(item.value), x + 45, y);
        
        col = (col + 1) % 2;
      });
      
      yPos = startY + Math.ceil(section.summaryItems.length / 2) * 7 + 5;
    }

    if (section.type === "table" && section.data && section.data.length > 0) {
      const headers = section.headers || Object.keys(section.data[0]);
      const rows = section.data.map((row) =>
        headers.map((header) => String(row[header] ?? ""))
      );

      autoTable(doc, {
        startY: yPos,
        head: [headers],
        body: rows,
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        didDrawPage: () => {
          yPos = margin;
        },
      });

      // Get the final Y position after the table
      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 10 || yPos + 20;
    }

    if (section.type === "text" && section.text) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(section.text, pageWidth - 2 * margin);
      lines.forEach((line: string) => {
        checkNewPage(6);
        doc.text(line, margin, yPos);
        yPos += 6;
      });
      yPos += 5;
    }
  });

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Meilleur Insights - Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  // Download
  doc.save(`${filename}.pdf`);
};

// ============ PRINT UTILITIES ============

export const openPrintView = (
  content: string,
  title: string,
  styles?: string
): void => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to use the print feature.");
    return;
  }

  const defaultStyles = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
      color: #333;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 5px;
      color: #1e293b;
    }
    h2 {
      font-size: 18px;
      margin-top: 25px;
      margin-bottom: 10px;
      color: #334155;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 5px;
    }
    h3 {
      font-size: 14px;
      margin-top: 20px;
      margin-bottom: 8px;
      color: #475569;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 5px;
    }
    .timestamp {
      color: #94a3b8;
      font-size: 12px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #f8fafc;
      font-weight: 600;
      color: #334155;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 15px 0;
    }
    .summary-item {
      background: #f8fafc;
      padding: 12px 15px;
      border-radius: 8px;
    }
    .summary-item .label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .summary-item .value {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
    }
    .positive {
      color: #16a34a !important;
    }
    .negative {
      color: #dc2626 !important;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
    .badge-success {
      background: #dcfce7;
      color: #16a34a;
    }
    .badge-warning {
      background: #fef3c7;
      color: #d97706;
    }
    .badge-danger {
      background: #fee2e2;
      color: #dc2626;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
    @page {
      margin: 1cm;
    }
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>${styles || defaultStyles}</style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

// ============ DOWNLOAD HELPER ============

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============ REPORT-SPECIFIC EXPORTERS ============

// Daily Report Exporters
export const exportDailyReport = {
  toCSV: (report: DailyReport): void => {
    const filename = `daily-report-${report.reportDate}`;
    
    // Revenue by service
    const revenueData = report.breakdown.revenueByService.map((item) => ({
      Service: item.serviceName,
      "Total Revenue": item.totalFormatted,
      Transactions: item.transactionCount,
      Percentage: item.percentage,
    }));
    exportToCSV(revenueData, `${filename}-revenue`);
  },

  toExcel: (report: DailyReport): void => {
    const filename = `daily-report-${report.reportDate}`;
    
    const sheets: ExcelSheet[] = [
      {
        name: "Summary",
        data: [
          {
            "Report Date": report.reportDate,
            "Total Revenue": report.summary.totalRevenueFormatted,
            "Total Expenses": report.summary.totalExpensesFormatted,
            "Net Profit": report.summary.netProfitFormatted,
            "Profit Margin": report.summary.profitMargin,
            "Debt Payments": report.summary.totalDebtPaymentsFormatted,
            "New Debts": report.summary.totalNewDebtsFormatted,
          },
        ],
      },
      {
        name: "Revenue by Service",
        data: report.breakdown.revenueByService.map((item) => ({
          Service: item.serviceName,
          "Total Revenue": item.totalFormatted,
          Transactions: item.transactionCount,
          Percentage: item.percentage,
        })),
      },
      {
        name: "Expenses by Category",
        data: report.breakdown.expensesByCategory.map((item) => ({
          Category: item.category,
          Total: item.totalFormatted,
          Transactions: item.transactionCount,
          Percentage: item.percentage,
        })),
      },
      {
        name: "Debt Payments",
        data: report.breakdown.debtPayments.map((item) => ({
          "Debtor Name": item.debtorName,
          Amount: item.amountFormatted,
        })),
      },
      {
        name: "New Debts",
        data: report.breakdown.newDebts.map((item) => ({
          "Debtor Name": item.debtorName,
          Amount: item.amountFormatted,
        })),
      },
    ];
    
    exportToExcel(sheets, filename);
  },

  toPDF: (report: DailyReport): void => {
    const filename = `daily-report-${report.reportDate}`;
    
    exportToPDF(
      {
        title: "Daily Summary Report",
        subtitle: format(new Date(report.reportDate), "EEEE, MMMM d, yyyy"),
        generatedAt: formatDateTime(report.generatedAt),
        sections: [
          {
            title: "Summary",
            type: "summary",
            summaryItems: [
              { label: "Total Revenue", value: report.summary.totalRevenueFormatted },
              { label: "Total Expenses", value: report.summary.totalExpensesFormatted },
              { label: "Net Profit", value: report.summary.netProfitFormatted },
              { label: "Profit Margin", value: report.summary.profitMargin },
              { label: "Debt Payments", value: report.summary.totalDebtPaymentsFormatted },
              { label: "New Debts", value: report.summary.totalNewDebtsFormatted },
            ],
          },
          {
            title: "Revenue by Service",
            type: "table",
            headers: ["Service", "Total Revenue", "Transactions", "% of Total"],
            data: report.breakdown.revenueByService.map((item) => ({
              Service: item.serviceName,
              "Total Revenue": item.totalFormatted,
              Transactions: item.transactionCount,
              "% of Total": item.percentage,
            })),
          },
          {
            title: "Expenses by Category",
            type: "table",
            headers: ["Category", "Total", "Transactions", "% of Total"],
            data: report.breakdown.expensesByCategory.map((item) => ({
              Category: item.category,
              Total: item.totalFormatted,
              Transactions: item.transactionCount,
              "% of Total": item.percentage,
            })),
          },
        ],
      },
      filename
    );
  },

  toPrint: (report: DailyReport): void => {
    const content = `
      <h1>Daily Summary Report</h1>
      <p class="subtitle">${format(new Date(report.reportDate), "EEEE, MMMM d, yyyy")}</p>
      <p class="timestamp">Generated: ${formatDateTime(report.generatedAt)}</p>
      
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Revenue</div>
          <div class="value">${report.summary.totalRevenueFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Expenses</div>
          <div class="value">${report.summary.totalExpensesFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Net Profit</div>
          <div class="value ${report.summary.netProfit >= 0 ? "positive" : "negative"}">${report.summary.netProfitFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Profit Margin</div>
          <div class="value">${report.summary.profitMargin}</div>
        </div>
        <div class="summary-item">
          <div class="label">Debt Payments Received</div>
          <div class="value positive">${report.summary.totalDebtPaymentsFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">New Debts</div>
          <div class="value negative">${report.summary.totalNewDebtsFormatted}</div>
        </div>
      </div>
      
      <h2>Revenue by Service</h2>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Total Revenue</th>
            <th>Transactions</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          ${report.breakdown.revenueByService
            .map(
              (item) => `
            <tr>
              <td>${item.serviceName}</td>
              <td>${item.totalFormatted}</td>
              <td>${item.transactionCount}</td>
              <td>${item.percentage}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      <h2>Expenses by Category</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Total</th>
            <th>Transactions</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          ${report.breakdown.expensesByCategory
            .map(
              (item) => `
            <tr>
              <td>${item.category}</td>
              <td>${item.totalFormatted}</td>
              <td>${item.transactionCount}</td>
              <td>${item.percentage}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      ${
        report.breakdown.debtPayments.length > 0
          ? `
        <h2>Debt Payments Received</h2>
        <table>
          <thead>
            <tr>
              <th>Debtor Name</th>
              <th>Amount Received</th>
            </tr>
          </thead>
          <tbody>
            ${report.breakdown.debtPayments
              .map(
                (item) => `
              <tr>
                <td>${item.debtorName}</td>
                <td class="positive">${item.amountFormatted}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `
          : ""
      }
      
      ${
        report.breakdown.newDebts.length > 0
          ? `
        <h2>New Debts</h2>
        <table>
          <thead>
            <tr>
              <th>Debtor Name</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${report.breakdown.newDebts
              .map(
                (item) => `
              <tr>
                <td>${item.debtorName}</td>
                <td class="negative">${item.amountFormatted}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `
          : ""
      }
    `;
    
    openPrintView(content, `Daily Report - ${report.reportDate}`);
  },
};

// Weekly Report Exporters
export const exportWeeklyReport = {
  toCSV: (report: WeeklyReport): void => {
    const filename = `weekly-report-${report.period.startDate}`;
    
    const dailyData = report.dailyBreakdown.map((day) => ({
      Date: day.date,
      Day: day.dayName,
      Revenue: day.revenueFormatted,
      Expenses: day.expensesFormatted,
      Profit: day.profitFormatted,
    }));
    exportToCSV(dailyData, filename);
  },

  toExcel: (report: WeeklyReport): void => {
    const filename = `weekly-report-${report.period.startDate}`;
    
    const sheets: ExcelSheet[] = [
      {
        name: "Summary",
        data: [
          {
            Period: `${report.period.startDate} to ${report.period.endDate}`,
            "Total Revenue": report.summary.totalRevenueFormatted,
            "Total Expenses": report.summary.totalExpensesFormatted,
            "Net Profit": report.summary.netProfitFormatted,
            "Profit Margin": report.summary.profitMargin,
            "Avg Daily Revenue": report.summary.avgDailyRevenueFormatted,
            "Debt Collected": report.summary.debtCollectedFormatted,
          },
        ],
      },
      {
        name: "Daily Breakdown",
        data: report.dailyBreakdown.map((day) => ({
          Date: day.date,
          Day: day.dayName,
          Revenue: day.revenueFormatted,
          Expenses: day.expensesFormatted,
          Profit: day.profitFormatted,
        })),
      },
      {
        name: "Service Performance",
        data: report.servicePerformance.map((svc) => ({
          Service: svc.serviceName,
          Revenue: svc.revenueFormatted,
          Expenses: svc.expensesFormatted,
          Profit: svc.profitFormatted,
          "Profit Margin": svc.profitMargin,
        })),
      },
      {
        name: "Goal Progress",
        data: report.goalProgress.map((goal) => ({
          Goal: goal.title,
          Target: goal.targetAmount,
          Current: goal.currentAmount,
          Progress: goal.progress,
          Status: goal.status,
        })),
      },
    ];
    
    exportToExcel(sheets, filename);
  },

  toPDF: (report: WeeklyReport): void => {
    const filename = `weekly-report-${report.period.startDate}`;
    
    exportToPDF(
      {
        title: "Weekly Performance Report",
        subtitle: `${format(new Date(report.period.startDate), "MMM d")} - ${format(new Date(report.period.endDate), "MMM d, yyyy")}`,
        generatedAt: formatDateTime(report.generatedAt),
        orientation: "landscape",
        sections: [
          {
            title: "Summary",
            type: "summary",
            summaryItems: [
              { label: "Total Revenue", value: report.summary.totalRevenueFormatted },
              { label: "Total Expenses", value: report.summary.totalExpensesFormatted },
              { label: "Net Profit", value: report.summary.netProfitFormatted },
              { label: "Profit Margin", value: report.summary.profitMargin },
              { label: "Avg Daily Revenue", value: report.summary.avgDailyRevenueFormatted },
              { label: "Debt Collected", value: report.summary.debtCollectedFormatted },
            ],
          },
          {
            title: "Daily Breakdown",
            type: "table",
            headers: ["Date", "Day", "Revenue", "Expenses", "Profit"],
            data: report.dailyBreakdown.map((day) => ({
              Date: day.date,
              Day: day.dayName,
              Revenue: day.revenueFormatted,
              Expenses: day.expensesFormatted,
              Profit: day.profitFormatted,
            })),
          },
          {
            title: "Service Performance",
            type: "table",
            headers: ["Service", "Revenue", "Expenses", "Profit", "Margin"],
            data: report.servicePerformance.map((svc) => ({
              Service: svc.serviceName,
              Revenue: svc.revenueFormatted,
              Expenses: svc.expensesFormatted,
              Profit: svc.profitFormatted,
              Margin: svc.profitMargin,
            })),
          },
        ],
      },
      filename
    );
  },

  toPrint: (report: WeeklyReport): void => {
    const content = `
      <h1>Weekly Performance Report</h1>
      <p class="subtitle">${format(new Date(report.period.startDate), "MMM d")} - ${format(new Date(report.period.endDate), "MMM d, yyyy")}</p>
      <p class="timestamp">Generated: ${formatDateTime(report.generatedAt)}</p>
      
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Revenue</div>
          <div class="value">${report.summary.totalRevenueFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Expenses</div>
          <div class="value">${report.summary.totalExpensesFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Net Profit</div>
          <div class="value ${report.summary.netProfit >= 0 ? "positive" : "negative"}">${report.summary.netProfitFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Profit Margin</div>
          <div class="value">${report.summary.profitMargin}</div>
        </div>
        <div class="summary-item">
          <div class="label">Avg Daily Revenue</div>
          <div class="value">${report.summary.avgDailyRevenueFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Debt Collected</div>
          <div class="value positive">${report.summary.debtCollectedFormatted}</div>
        </div>
      </div>
      
      ${
        report.highlights.bestDay
          ? `
        <h3>Highlights</h3>
        <p>📈 Best Day: ${report.highlights.bestDay.date} (${report.highlights.bestDay.revenueFormatted})</p>
        ${report.highlights.worstDay ? `<p>📉 Lowest Day: ${report.highlights.worstDay.date} (${report.highlights.worstDay.revenueFormatted})</p>` : ""}
        ${report.highlights.topService ? `<p>🏆 Top Service: ${report.highlights.topService.name} (${report.highlights.topService.revenueFormatted})</p>` : ""}
      `
          : ""
      }
      
      <h2>Daily Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Day</th>
            <th>Revenue</th>
            <th>Expenses</th>
            <th>Profit</th>
          </tr>
        </thead>
        <tbody>
          ${report.dailyBreakdown
            .map(
              (day) => `
            <tr>
              <td>${day.date}</td>
              <td>${day.dayName}</td>
              <td>${day.revenueFormatted}</td>
              <td>${day.expensesFormatted}</td>
              <td class="${day.profit >= 0 ? "positive" : "negative"}">${day.profitFormatted}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      <h2>Service Performance</h2>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Revenue</th>
            <th>Expenses</th>
            <th>Profit</th>
            <th>Margin</th>
          </tr>
        </thead>
        <tbody>
          ${report.servicePerformance
            .map(
              (svc) => `
            <tr>
              <td>${svc.serviceName}</td>
              <td>${svc.revenueFormatted}</td>
              <td>${svc.expensesFormatted}</td>
              <td class="${svc.profit >= 0 ? "positive" : "negative"}">${svc.profitFormatted}</td>
              <td>${svc.profitMargin}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
    
    openPrintView(content, `Weekly Report - ${report.period.startDate}`);
  },
};

// Monthly Report Exporters
export const exportMonthlyReport = {
  toCSV: (report: MonthlyReport): void => {
    const filename = `monthly-report-${report.period.year}-${String(report.period.month).padStart(2, "0")}`;
    
    const revenueByService = report.revenueBreakdown.byService.map((item) => ({
      Service: item.serviceName,
      Revenue: item.totalFormatted,
      Percentage: item.percentage,
    }));
    exportToCSV(revenueByService, filename);
  },

  toExcel: (report: MonthlyReport): void => {
    const filename = `monthly-report-${report.period.year}-${String(report.period.month).padStart(2, "0")}`;
    
    const sheets: ExcelSheet[] = [
      {
        name: "Summary",
        data: [
          {
            Month: report.period.monthName,
            Year: report.period.year,
            "Total Revenue": report.summary.totalRevenueFormatted,
            "Total Expenses": report.summary.totalExpensesFormatted,
            "Net Profit": report.summary.netProfitFormatted,
            "Profit Margin": report.summary.grossProfitMargin,
            "Avg Daily Revenue": report.summary.avgDailyRevenueFormatted,
            "Projected Monthly": report.summary.projectedMonthlyRevenueFormatted,
          },
        ],
      },
      {
        name: "Revenue by Service",
        data: report.revenueBreakdown.byService.map((item) => ({
          Service: item.serviceName,
          Revenue: item.totalFormatted,
          Percentage: item.percentage,
        })),
      },
      {
        name: "Revenue by Week",
        data: report.revenueBreakdown.byWeek.map((item) => ({
          Week: item.week,
          Revenue: item.totalFormatted,
        })),
      },
      {
        name: "Expenses by Category",
        data: report.expenseBreakdown.byCategory.map((item) => ({
          Category: item.category,
          Total: item.totalFormatted,
          Count: item.count,
          Percentage: item.percentage,
        })),
      },
      {
        name: "Expenses by Service",
        data: report.expenseBreakdown.byService.map((item) => ({
          Service: item.serviceName,
          Total: item.totalFormatted,
        })),
      },
      {
        name: "Debt Summary",
        data: [
          {
            "Total Outstanding": report.debtSummary.totalOutstandingFormatted,
            "Collected This Month": report.debtSummary.collectedThisMonthFormatted,
            "New Debts": report.debtSummary.newDebtsThisMonthFormatted,
            "Net Change": report.debtSummary.netDebtChange,
          },
        ],
      },
      {
        name: "Goal Progress",
        data: report.goalProgress.map((goal) => ({
          Goal: goal.title,
          Type: goal.goalType,
          Target: goal.targetAmountFormatted,
          Current: goal.currentAmountFormatted,
          Progress: goal.progress,
          Status: goal.status,
        })),
      },
    ];
    
    exportToExcel(sheets, filename);
  },

  toPDF: (report: MonthlyReport): void => {
    const filename = `monthly-report-${report.period.year}-${String(report.period.month).padStart(2, "0")}`;
    
    exportToPDF(
      {
        title: "Monthly Financial Report",
        subtitle: `${report.period.monthName} ${report.period.year}`,
        generatedAt: formatDateTime(report.generatedAt),
        orientation: "portrait",
        sections: [
          {
            title: "Financial Summary",
            type: "summary",
            summaryItems: [
              { label: "Total Revenue", value: report.summary.totalRevenueFormatted },
              { label: "Total Expenses", value: report.summary.totalExpensesFormatted },
              { label: "Net Profit", value: report.summary.netProfitFormatted },
              { label: "Profit Margin", value: report.summary.grossProfitMargin },
              { label: "Avg Daily Revenue", value: report.summary.avgDailyRevenueFormatted },
              { label: "Projected Monthly", value: report.summary.projectedMonthlyRevenueFormatted },
            ],
          },
          {
            title: "Revenue by Service",
            type: "table",
            headers: ["Service", "Revenue", "% of Total"],
            data: report.revenueBreakdown.byService.map((item) => ({
              Service: item.serviceName,
              Revenue: item.totalFormatted,
              "% of Total": item.percentage,
            })),
          },
          {
            title: "Expenses by Category",
            type: "table",
            headers: ["Category", "Total", "Count", "% of Total"],
            data: report.expenseBreakdown.byCategory.map((item) => ({
              Category: item.category,
              Total: item.totalFormatted,
              Count: item.count,
              "% of Total": item.percentage,
            })),
          },
          {
            title: "Debt Summary",
            type: "summary",
            summaryItems: [
              { label: "Total Outstanding", value: report.debtSummary.totalOutstandingFormatted },
              { label: "Collected This Month", value: report.debtSummary.collectedThisMonthFormatted },
              { label: "New Debts", value: report.debtSummary.newDebtsThisMonthFormatted },
            ],
          },
        ],
      },
      filename
    );
  },

  toPrint: (report: MonthlyReport): void => {
    const content = `
      <h1>Monthly Financial Report</h1>
      <p class="subtitle">${report.period.monthName} ${report.period.year}</p>
      <p class="timestamp">Generated: ${formatDateTime(report.generatedAt)}</p>
      
      <h2>Financial Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Revenue</div>
          <div class="value">${report.summary.totalRevenueFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Expenses</div>
          <div class="value">${report.summary.totalExpensesFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Net Profit</div>
          <div class="value ${report.summary.netProfit >= 0 ? "positive" : "negative"}">${report.summary.netProfitFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Profit Margin</div>
          <div class="value">${report.summary.grossProfitMargin}</div>
        </div>
        <div class="summary-item">
          <div class="label">Avg Daily Revenue</div>
          <div class="value">${report.summary.avgDailyRevenueFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Projected Monthly</div>
          <div class="value">${report.summary.projectedMonthlyRevenueFormatted}</div>
        </div>
      </div>
      
      <h2>Comparison with Previous Month</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Revenue Change</div>
          <div class="value ${parseFloat(report.comparison.revenueChange) >= 0 ? "positive" : "negative"}">${report.comparison.revenueChange}</div>
        </div>
        <div class="summary-item">
          <div class="label">Expense Change</div>
          <div class="value ${parseFloat(report.comparison.expenseChange) <= 0 ? "positive" : "negative"}">${report.comparison.expenseChange}</div>
        </div>
      </div>
      
      <h2>Revenue by Service</h2>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Revenue</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          ${report.revenueBreakdown.byService
            .map(
              (item) => `
            <tr>
              <td>${item.serviceName}</td>
              <td>${item.totalFormatted}</td>
              <td>${item.percentage}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      <h2>Expenses by Category</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Total</th>
            <th>Count</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          ${report.expenseBreakdown.byCategory
            .map(
              (item) => `
            <tr>
              <td>${item.category}</td>
              <td>${item.totalFormatted}</td>
              <td>${item.count}</td>
              <td>${item.percentage}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      <h2>Debt Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Outstanding</div>
          <div class="value negative">${report.debtSummary.totalOutstandingFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Collected This Month</div>
          <div class="value positive">${report.debtSummary.collectedThisMonthFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">New Debts</div>
          <div class="value negative">${report.debtSummary.newDebtsThisMonthFormatted}</div>
        </div>
      </div>
      
      ${
        report.goalProgress.length > 0
          ? `
        <h2>Goal Progress</h2>
        <table>
          <thead>
            <tr>
              <th>Goal</th>
              <th>Type</th>
              <th>Target</th>
              <th>Current</th>
              <th>Progress</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${report.goalProgress
              .map(
                (goal) => `
              <tr>
                <td>${goal.title}</td>
                <td>${goal.goalType}</td>
                <td>${goal.targetAmountFormatted}</td>
                <td>${goal.currentAmountFormatted}</td>
                <td>${goal.progress}</td>
                <td><span class="badge ${goal.status === "completed" ? "badge-success" : goal.status === "active" ? "badge-warning" : "badge-danger"}">${goal.status}</span></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `
          : ""
      }
    `;
    
    openPrintView(content, `Monthly Report - ${report.period.monthName} ${report.period.year}`);
  },
};

// Service Report Exporters
export const exportServiceReport = {
  toCSV: (report: ServiceReport): void => {
    const filename = `service-report-${sanitizeFilename(report.service.name)}-${report.period.startDate}`;
    
    const transactions = report.revenueBreakdown.transactions.map((t) => ({
      Date: t.date,
      Amount: t.amountFormatted,
      Description: t.description,
      "Payment Method": t.paymentMethod,
    }));
    exportToCSV(transactions, filename);
  },

  toExcel: (report: ServiceReport): void => {
    const filename = `service-report-${sanitizeFilename(report.service.name)}-${report.period.startDate}`;
    
    const sheets: ExcelSheet[] = [
      {
        name: "Summary",
        data: [
          {
            Service: report.service.name,
            Period: report.period.periodName,
            "Total Revenue": report.summary.totalRevenueFormatted,
            "Total Expenses": report.summary.totalExpensesFormatted,
            "Net Profit": report.summary.netProfitFormatted,
            "Profit Margin": report.summary.profitMargin,
            "Total Debt": report.summary.totalDebtFormatted,
            Transactions: report.summary.transactionCount,
          },
        ],
      },
      {
        name: "Revenue Transactions",
        data: report.revenueBreakdown.transactions.map((t) => ({
          Date: t.date,
          Amount: t.amountFormatted,
          Description: t.description,
          "Payment Method": t.paymentMethod,
        })),
      },
      {
        name: "Revenue by Payment Method",
        data: report.revenueBreakdown.byPaymentMethod.map((m) => ({
          Method: m.method,
          Total: m.totalFormatted,
          Percentage: m.percentage,
        })),
      },
      {
        name: "Expense Transactions",
        data: report.expenseBreakdown.transactions.map((t) => ({
          Date: t.date,
          Amount: t.amountFormatted,
          Category: t.category,
          Description: t.description,
        })),
      },
      {
        name: "Expenses by Category",
        data: report.expenseBreakdown.byCategory.map((c) => ({
          Category: c.category,
          Total: c.totalFormatted,
          Percentage: c.percentage,
        })),
      },
      {
        name: "Daily Breakdown",
        data: report.dailyBreakdown.map((d) => ({
          Date: d.date,
          Revenue: d.revenueFormatted,
          Expenses: d.expensesFormatted,
          Profit: d.profitFormatted,
        })),
      },
      {
        name: "Outstanding Debts",
        data: report.debts.map((d) => ({
          "Debtor Name": d.debtorName,
          "Original Amount": d.originalAmountFormatted,
          Balance: d.balanceFormatted,
          "Due Date": d.dueDate,
          Status: d.status,
        })),
      },
    ];
    
    exportToExcel(sheets, filename);
  },

  toPDF: (report: ServiceReport): void => {
    const filename = `service-report-${sanitizeFilename(report.service.name)}-${report.period.startDate}`;
    
    exportToPDF(
      {
        title: `Service Report: ${report.service.name}`,
        subtitle: report.period.periodName,
        generatedAt: formatDateTime(report.generatedAt),
        orientation: "portrait",
        sections: [
          {
            title: "Summary",
            type: "summary",
            summaryItems: [
              { label: "Total Revenue", value: report.summary.totalRevenueFormatted },
              { label: "Total Expenses", value: report.summary.totalExpensesFormatted },
              { label: "Net Profit", value: report.summary.netProfitFormatted },
              { label: "Profit Margin", value: report.summary.profitMargin },
              { label: "Outstanding Debt", value: report.summary.totalDebtFormatted },
              { label: "Transactions", value: report.summary.transactionCount },
            ],
          },
          {
            title: "Revenue by Payment Method",
            type: "table",
            headers: ["Method", "Total", "% of Total"],
            data: report.revenueBreakdown.byPaymentMethod.map((m) => ({
              Method: m.method,
              Total: m.totalFormatted,
              "% of Total": m.percentage,
            })),
          },
          {
            title: "Expenses by Category",
            type: "table",
            headers: ["Category", "Total", "% of Total"],
            data: report.expenseBreakdown.byCategory.map((c) => ({
              Category: c.category,
              Total: c.totalFormatted,
              "% of Total": c.percentage,
            })),
          },
          {
            title: "Outstanding Debts",
            type: "table",
            headers: ["Debtor", "Original", "Balance", "Due Date", "Status"],
            data: report.debts.map((d) => ({
              Debtor: d.debtorName,
              Original: d.originalAmountFormatted,
              Balance: d.balanceFormatted,
              "Due Date": d.dueDate,
              Status: d.status,
            })),
          },
        ],
      },
      filename
    );
  },

  toPrint: (report: ServiceReport): void => {
    const content = `
      <h1>Service Report: ${report.service.name}</h1>
      <p class="subtitle">${report.period.periodName}</p>
      <p class="timestamp">Generated: ${formatDateTime(report.generatedAt)}</p>
      
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Revenue</div>
          <div class="value">${report.summary.totalRevenueFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Expenses</div>
          <div class="value">${report.summary.totalExpensesFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Net Profit</div>
          <div class="value ${report.summary.netProfit >= 0 ? "positive" : "negative"}">${report.summary.netProfitFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Profit Margin</div>
          <div class="value">${report.summary.profitMargin}</div>
        </div>
        <div class="summary-item">
          <div class="label">Outstanding Debt</div>
          <div class="value negative">${report.summary.totalDebtFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Transactions</div>
          <div class="value">${report.summary.transactionCount}</div>
        </div>
      </div>
      
      <h2>Daily Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Revenue</th>
            <th>Expenses</th>
            <th>Profit</th>
          </tr>
        </thead>
        <tbody>
          ${report.dailyBreakdown
            .map(
              (d) => `
            <tr>
              <td>${d.date}</td>
              <td>${d.revenueFormatted}</td>
              <td>${d.expensesFormatted}</td>
              <td class="${d.profit >= 0 ? "positive" : "negative"}">${d.profitFormatted}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      <h2>Revenue by Payment Method</h2>
      <table>
        <thead>
          <tr>
            <th>Payment Method</th>
            <th>Total</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          ${report.revenueBreakdown.byPaymentMethod
            .map(
              (m) => `
            <tr>
              <td>${m.method}</td>
              <td>${m.totalFormatted}</td>
              <td>${m.percentage}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      ${
        report.debts.length > 0
          ? `
        <h2>Outstanding Debts</h2>
        <table>
          <thead>
            <tr>
              <th>Debtor</th>
              <th>Original Amount</th>
              <th>Balance</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${report.debts
              .map(
                (d) => `
              <tr>
                <td>${d.debtorName}</td>
                <td>${d.originalAmountFormatted}</td>
                <td class="negative">${d.balanceFormatted}</td>
                <td>${d.dueDate}</td>
                <td><span class="badge ${d.status === "paid" ? "badge-success" : d.status === "overdue" ? "badge-danger" : "badge-warning"}">${d.status}</span></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `
          : ""
      }
    `;
    
    openPrintView(content, `Service Report - ${report.service.name}`);
  },
};

// Debts Aging Report Exporters
export const exportDebtsAgingReport = {
  toCSV: (report: DebtsAgingReport): void => {
    const filename = `debts-aging-report-${report.reportDate}`;
    
    const allDebts = [
      ...report.agingDetails.current,
      ...report.agingDetails.days1to30,
      ...report.agingDetails.days31to60,
      ...report.agingDetails.days61to90,
      ...report.agingDetails.over90,
    ].map((d) => ({
      "Debtor Name": d.debtorName,
      Contact: d.debtorContact,
      Service: d.serviceName,
      "Original Amount": d.originalAmountFormatted,
      "Amount Paid": d.amountPaidFormatted,
      Balance: d.balanceFormatted,
      "Issue Date": d.issueDate,
      "Due Date": d.dueDate,
      "Days Overdue": d.daysOverdue,
      Status: d.status,
    }));
    exportToCSV(allDebts, filename);
  },

  toExcel: (report: DebtsAgingReport): void => {
    const filename = `debts-aging-report-${report.reportDate}`;
    
    const formatDebtsList = (debts: typeof report.agingDetails.current) =>
      debts.map((d) => ({
        "Debtor Name": d.debtorName,
        Contact: d.debtorContact,
        Service: d.serviceName,
        "Original Amount": d.originalAmountFormatted,
        "Amount Paid": d.amountPaidFormatted,
        Balance: d.balanceFormatted,
        "Issue Date": d.issueDate,
        "Due Date": d.dueDate,
        "Days Overdue": d.daysOverdue,
        Status: d.status,
      }));

    const sheets: ExcelSheet[] = [
      {
        name: "Summary",
        data: [
          {
            "Report Date": report.reportDate,
            "Total Outstanding": report.summary.totalOutstandingFormatted,
            "Total Overdue": report.summary.totalOverdueFormatted,
            "Total Debtors": report.summary.totalDebtors,
            "Overdue Percentage": report.summary.overduePercentage,
            "Avg Debt Age (days)": report.summary.avgDebtAge,
          },
        ],
      },
      {
        name: "Aging Buckets",
        data: [
          {
            Bucket: "Current (not due)",
            Count: report.agingBuckets.current.count,
            Total: report.agingBuckets.current.totalFormatted,
          },
          {
            Bucket: "1-30 Days Overdue",
            Count: report.agingBuckets.days1to30.count,
            Total: report.agingBuckets.days1to30.totalFormatted,
          },
          {
            Bucket: "31-60 Days Overdue",
            Count: report.agingBuckets.days31to60.count,
            Total: report.agingBuckets.days31to60.totalFormatted,
          },
          {
            Bucket: "61-90 Days Overdue",
            Count: report.agingBuckets.days61to90.count,
            Total: report.agingBuckets.days61to90.totalFormatted,
          },
          {
            Bucket: "Over 90 Days Overdue",
            Count: report.agingBuckets.over90.count,
            Total: report.agingBuckets.over90.totalFormatted,
          },
        ],
      },
      {
        name: "Current (Not Due)",
        data: formatDebtsList(report.agingDetails.current),
      },
      {
        name: "1-30 Days Overdue",
        data: formatDebtsList(report.agingDetails.days1to30),
      },
      {
        name: "31-60 Days Overdue",
        data: formatDebtsList(report.agingDetails.days31to60),
      },
      {
        name: "61-90 Days Overdue",
        data: formatDebtsList(report.agingDetails.days61to90),
      },
      {
        name: "Over 90 Days",
        data: formatDebtsList(report.agingDetails.over90),
      },
      {
        name: "Top Debtors",
        data: report.topDebtors.map((d) => ({
          "Debtor Name": d.debtorName,
          Contact: d.debtorContact,
          Service: d.serviceName,
          Balance: d.balanceFormatted,
          "Days Overdue": d.daysOverdue,
        })),
      },
      {
        name: "Debt by Service",
        data: report.debtByService.map((s) => ({
          Service: s.serviceName,
          "Total Balance": s.totalBalanceFormatted,
          Count: s.count,
          Percentage: s.percentage,
        })),
      },
      {
        name: "Collection History",
        data: report.collectionHistory.map((h) => ({
          Month: h.monthName,
          Collected: h.collectedFormatted,
        })),
      },
    ];
    
    exportToExcel(sheets, filename);
  },

  toPDF: (report: DebtsAgingReport): void => {
    const filename = `debts-aging-report-${report.reportDate}`;
    
    exportToPDF(
      {
        title: "Debts Aging Report",
        subtitle: `As of ${format(new Date(report.reportDate), "MMMM d, yyyy")}`,
        generatedAt: formatDateTime(report.generatedAt),
        orientation: "landscape",
        sections: [
          {
            title: "Summary",
            type: "summary",
            summaryItems: [
              { label: "Total Outstanding", value: report.summary.totalOutstandingFormatted },
              { label: "Total Overdue", value: report.summary.totalOverdueFormatted },
              { label: "Total Debtors", value: report.summary.totalDebtors },
              { label: "Overdue %", value: report.summary.overduePercentage },
              { label: "Avg Debt Age", value: `${report.summary.avgDebtAge} days` },
            ],
          },
          {
            title: "Aging Buckets",
            type: "table",
            headers: ["Aging Bucket", "Count", "Total Amount"],
            data: [
              { "Aging Bucket": "Current (not due)", Count: report.agingBuckets.current.count, "Total Amount": report.agingBuckets.current.totalFormatted },
              { "Aging Bucket": "1-30 Days Overdue", Count: report.agingBuckets.days1to30.count, "Total Amount": report.agingBuckets.days1to30.totalFormatted },
              { "Aging Bucket": "31-60 Days Overdue", Count: report.agingBuckets.days31to60.count, "Total Amount": report.agingBuckets.days31to60.totalFormatted },
              { "Aging Bucket": "61-90 Days Overdue", Count: report.agingBuckets.days61to90.count, "Total Amount": report.agingBuckets.days61to90.totalFormatted },
              { "Aging Bucket": "Over 90 Days", Count: report.agingBuckets.over90.count, "Total Amount": report.agingBuckets.over90.totalFormatted },
            ],
          },
          {
            title: "Top Debtors",
            type: "table",
            headers: ["Debtor", "Service", "Balance", "Days Overdue"],
            data: report.topDebtors.slice(0, 10).map((d) => ({
              Debtor: d.debtorName,
              Service: d.serviceName,
              Balance: d.balanceFormatted,
              "Days Overdue": d.daysOverdue,
            })),
          },
          {
            title: "Debt by Service",
            type: "table",
            headers: ["Service", "Total Balance", "Count", "% of Total"],
            data: report.debtByService.map((s) => ({
              Service: s.serviceName,
              "Total Balance": s.totalBalanceFormatted,
              Count: s.count,
              "% of Total": s.percentage,
            })),
          },
        ],
      },
      filename
    );
  },

  toPrint: (report: DebtsAgingReport): void => {
    const content = `
      <h1>Debts Aging Report</h1>
      <p class="subtitle">As of ${format(new Date(report.reportDate), "MMMM d, yyyy")}</p>
      <p class="timestamp">Generated: ${formatDateTime(report.generatedAt)}</p>
      
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Outstanding</div>
          <div class="value negative">${report.summary.totalOutstandingFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Overdue</div>
          <div class="value negative">${report.summary.totalOverdueFormatted}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Debtors</div>
          <div class="value">${report.summary.totalDebtors}</div>
        </div>
        <div class="summary-item">
          <div class="label">Overdue Percentage</div>
          <div class="value">${report.summary.overduePercentage}</div>
        </div>
        <div class="summary-item">
          <div class="label">Avg Debt Age</div>
          <div class="value">${report.summary.avgDebtAge} days</div>
        </div>
      </div>
      
      <h2>Aging Buckets</h2>
      <table>
        <thead>
          <tr>
            <th>Aging Bucket</th>
            <th>Count</th>
            <th>Total Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Current (not due)</td>
            <td>${report.agingBuckets.current.count}</td>
            <td>${report.agingBuckets.current.totalFormatted}</td>
          </tr>
          <tr>
            <td>1-30 Days Overdue</td>
            <td>${report.agingBuckets.days1to30.count}</td>
            <td class="negative">${report.agingBuckets.days1to30.totalFormatted}</td>
          </tr>
          <tr>
            <td>31-60 Days Overdue</td>
            <td>${report.agingBuckets.days31to60.count}</td>
            <td class="negative">${report.agingBuckets.days31to60.totalFormatted}</td>
          </tr>
          <tr>
            <td>61-90 Days Overdue</td>
            <td>${report.agingBuckets.days61to90.count}</td>
            <td class="negative">${report.agingBuckets.days61to90.totalFormatted}</td>
          </tr>
          <tr>
            <td>Over 90 Days</td>
            <td>${report.agingBuckets.over90.count}</td>
            <td class="negative">${report.agingBuckets.over90.totalFormatted}</td>
          </tr>
        </tbody>
      </table>
      
      <h2>Top Debtors</h2>
      <table>
        <thead>
          <tr>
            <th>Debtor Name</th>
            <th>Contact</th>
            <th>Service</th>
            <th>Balance</th>
            <th>Days Overdue</th>
          </tr>
        </thead>
        <tbody>
          ${report.topDebtors
            .slice(0, 15)
            .map(
              (d) => `
            <tr>
              <td>${d.debtorName}</td>
              <td>${d.debtorContact}</td>
              <td>${d.serviceName}</td>
              <td class="negative">${d.balanceFormatted}</td>
              <td>${d.daysOverdue > 0 ? `<span class="negative">${d.daysOverdue}</span>` : "Current"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      <h2>Debt by Service</h2>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Total Balance</th>
            <th>Count</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          ${report.debtByService
            .map(
              (s) => `
            <tr>
              <td>${s.serviceName}</td>
              <td class="negative">${s.totalBalanceFormatted}</td>
              <td>${s.count}</td>
              <td>${s.percentage}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      <h2>Collection History (Last 6 Months)</h2>
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Amount Collected</th>
          </tr>
        </thead>
        <tbody>
          ${report.collectionHistory
            .map(
              (h) => `
            <tr>
              <td>${h.monthName}</td>
              <td class="positive">${h.collectedFormatted}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
    
    openPrintView(content, `Debts Aging Report - ${report.reportDate}`);
  },
};

// Goals Report Exporters
export const exportGoalsReport = {
  toCSV: (report: GoalsReport): void => {
    const filename = `goals-report-${formatDate(new Date())}`;
    
    const activeGoals = report.activeGoals.map((g) => ({
      Title: g.title,
      Service: g.serviceName,
      Type: g.goalType,
      Period: g.period,
      Target: g.targetAmountFormatted,
      Current: g.currentAmountFormatted,
      Progress: g.progress,
      "Days Remaining": g.daysRemaining ?? "N/A",
      Status: g.status,
      "On Track": g.isOnTrack ? "Yes" : "No",
    }));
    exportToCSV(activeGoals, filename);
  },

  toExcel: (report: GoalsReport): void => {
    const filename = `goals-report-${formatDate(new Date())}`;
    
    const sheets: ExcelSheet[] = [
      {
        name: "Summary",
        data: [
          {
            "Total Active Goals": report.summary.totalActiveGoals,
            "On Track": report.summary.onTrackGoals,
            "At Risk": report.summary.atRiskGoals,
            "Completed (All Time)": report.summary.completedAllTime,
            "Missed (All Time)": report.summary.missedAllTime,
            "Avg Achievement Rate": report.summary.avgAchievementRate,
            "Success Rate": report.summary.successRate,
          },
        ],
      },
      {
        name: "Active Goals",
        data: report.activeGoals.map((g) => ({
          Title: g.title,
          Service: g.serviceName,
          Type: g.goalType,
          Period: g.period,
          Target: g.targetAmountFormatted,
          Current: g.currentAmountFormatted,
          Progress: g.progress,
          "Days Remaining": g.daysRemaining ?? "N/A",
          Status: g.status,
          "On Track": g.isOnTrack ? "Yes" : "No",
        })),
      },
      {
        name: "Goals by Type",
        data: [
          { Type: "Revenue", Count: report.goalsByType.revenue.count, "Total Target": report.goalsByType.revenue.totalTarget, "Total Current": report.goalsByType.revenue.totalCurrent },
          { Type: "Profit", Count: report.goalsByType.profit.count, "Total Target": report.goalsByType.profit.totalTarget, "Total Current": report.goalsByType.profit.totalCurrent },
          { Type: "Expense", Count: report.goalsByType.expense.count, "Total Target": report.goalsByType.expense.totalTarget, "Total Current": report.goalsByType.expense.totalCurrent },
        ],
      },
      {
        name: "Goals by Period",
        data: [
          { Period: "Daily", Count: report.goalsByPeriod.daily },
          { Period: "Weekly", Count: report.goalsByPeriod.weekly },
          { Period: "Monthly", Count: report.goalsByPeriod.monthly },
          { Period: "Yearly", Count: report.goalsByPeriod.yearly },
        ],
      },
      {
        name: "Achievement History",
        data: report.achievementHistory.map((h) => ({
          Title: h.title,
          Service: h.serviceName,
          Type: h.goalType,
          Period: h.period,
          Target: h.targetAmountFormatted,
          Achieved: h.achievedAmountFormatted,
          "Achievement Rate": h.achievementRate,
          Status: h.status,
          "Completed At": h.completedAt,
        })),
      },
    ];
    
    exportToExcel(sheets, filename);
  },

  toPDF: (report: GoalsReport): void => {
    const filename = `goals-report-${formatDate(new Date())}`;
    
    exportToPDF(
      {
        title: "Goals Achievement Report",
        subtitle: `As of ${format(new Date(), "MMMM d, yyyy")}`,
        generatedAt: formatDateTime(report.generatedAt),
        orientation: "portrait",
        sections: [
          {
            title: "Summary",
            type: "summary",
            summaryItems: [
              { label: "Total Active Goals", value: report.summary.totalActiveGoals },
              { label: "On Track", value: report.summary.onTrackGoals },
              { label: "At Risk", value: report.summary.atRiskGoals },
              { label: "Completed (All Time)", value: report.summary.completedAllTime },
              { label: "Success Rate", value: report.summary.successRate },
              { label: "Avg Achievement", value: report.summary.avgAchievementRate },
            ],
          },
          {
            title: "Active Goals",
            type: "table",
            headers: ["Goal", "Service", "Type", "Target", "Current", "Progress", "Status"],
            data: report.activeGoals.map((g) => ({
              Goal: g.title,
              Service: g.serviceName,
              Type: g.goalType,
              Target: g.targetAmountFormatted,
              Current: g.currentAmountFormatted,
              Progress: g.progress,
              Status: g.status,
            })),
          },
          {
            title: "Recent Achievement History",
            type: "table",
            headers: ["Goal", "Target", "Achieved", "Rate", "Status"],
            data: report.achievementHistory.slice(0, 10).map((h) => ({
              Goal: h.title,
              Target: h.targetAmountFormatted,
              Achieved: h.achievedAmountFormatted,
              Rate: h.achievementRate,
              Status: h.status,
            })),
          },
        ],
      },
      filename
    );
  },

  toPrint: (report: GoalsReport): void => {
    const content = `
      <h1>Goals Achievement Report</h1>
      <p class="subtitle">As of ${format(new Date(), "MMMM d, yyyy")}</p>
      <p class="timestamp">Generated: ${formatDateTime(report.generatedAt)}</p>
      
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Active Goals</div>
          <div class="value">${report.summary.totalActiveGoals}</div>
        </div>
        <div class="summary-item">
          <div class="label">On Track</div>
          <div class="value positive">${report.summary.onTrackGoals}</div>
        </div>
        <div class="summary-item">
          <div class="label">At Risk</div>
          <div class="value negative">${report.summary.atRiskGoals}</div>
        </div>
        <div class="summary-item">
          <div class="label">Completed (All Time)</div>
          <div class="value positive">${report.summary.completedAllTime}</div>
        </div>
        <div class="summary-item">
          <div class="label">Missed (All Time)</div>
          <div class="value negative">${report.summary.missedAllTime}</div>
        </div>
        <div class="summary-item">
          <div class="label">Success Rate</div>
          <div class="value">${report.summary.successRate}</div>
        </div>
      </div>
      
      <h2>Goals by Type</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Count</th>
            <th>Total Target</th>
            <th>Total Current</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Revenue</td>
            <td>${report.goalsByType.revenue.count}</td>
            <td>KES ${report.goalsByType.revenue.totalTarget.toLocaleString()}</td>
            <td>KES ${report.goalsByType.revenue.totalCurrent.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Profit</td>
            <td>${report.goalsByType.profit.count}</td>
            <td>KES ${report.goalsByType.profit.totalTarget.toLocaleString()}</td>
            <td>KES ${report.goalsByType.profit.totalCurrent.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Expense</td>
            <td>${report.goalsByType.expense.count}</td>
            <td>KES ${report.goalsByType.expense.totalTarget.toLocaleString()}</td>
            <td>KES ${report.goalsByType.expense.totalCurrent.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      
      <h2>Active Goals</h2>
      <table>
        <thead>
          <tr>
            <th>Goal</th>
            <th>Service</th>
            <th>Type</th>
            <th>Target</th>
            <th>Current</th>
            <th>Progress</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${report.activeGoals
            .map(
              (g) => `
            <tr>
              <td>${g.title}</td>
              <td>${g.serviceName}</td>
              <td>${g.goalType}</td>
              <td>${g.targetAmountFormatted}</td>
              <td>${g.currentAmountFormatted}</td>
              <td>${g.progress}</td>
              <td><span class="badge ${g.isOnTrack ? "badge-success" : "badge-warning"}">${g.status}</span></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      ${
        report.achievementHistory.length > 0
          ? `
        <h2>Recent Achievement History</h2>
        <table>
          <thead>
            <tr>
              <th>Goal</th>
              <th>Target</th>
              <th>Achieved</th>
              <th>Achievement Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${report.achievementHistory
              .slice(0, 15)
              .map(
                (h) => `
              <tr>
                <td>${h.title}</td>
                <td>${h.targetAmountFormatted}</td>
                <td>${h.achievedAmountFormatted}</td>
                <td>${h.achievementRate}</td>
                <td><span class="badge ${h.status === "completed" ? "badge-success" : "badge-danger"}">${h.status}</span></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `
          : ""
      }
    `;
    
    openPrintView(content, "Goals Achievement Report");
  },
};

// Export format type
export type ExportFormat = "pdf" | "excel" | "csv" | "print";

// Unified export function
export const exportReport = (
  reportType: string,
  format: ExportFormat,
  data: DailyReport | WeeklyReport | MonthlyReport | ServiceReport | DebtsAgingReport | GoalsReport
): void => {
  switch (reportType) {
    case "daily":
      const dailyData = data as DailyReport;
      if (format === "pdf") exportDailyReport.toPDF(dailyData);
      else if (format === "excel") exportDailyReport.toExcel(dailyData);
      else if (format === "csv") exportDailyReport.toCSV(dailyData);
      else if (format === "print") exportDailyReport.toPrint(dailyData);
      break;
    case "weekly":
      const weeklyData = data as WeeklyReport;
      if (format === "pdf") exportWeeklyReport.toPDF(weeklyData);
      else if (format === "excel") exportWeeklyReport.toExcel(weeklyData);
      else if (format === "csv") exportWeeklyReport.toCSV(weeklyData);
      else if (format === "print") exportWeeklyReport.toPrint(weeklyData);
      break;
    case "monthly":
      const monthlyData = data as MonthlyReport;
      if (format === "pdf") exportMonthlyReport.toPDF(monthlyData);
      else if (format === "excel") exportMonthlyReport.toExcel(monthlyData);
      else if (format === "csv") exportMonthlyReport.toCSV(monthlyData);
      else if (format === "print") exportMonthlyReport.toPrint(monthlyData);
      break;
    case "service":
      const serviceData = data as ServiceReport;
      if (format === "pdf") exportServiceReport.toPDF(serviceData);
      else if (format === "excel") exportServiceReport.toExcel(serviceData);
      else if (format === "csv") exportServiceReport.toCSV(serviceData);
      else if (format === "print") exportServiceReport.toPrint(serviceData);
      break;
    case "debts":
      const debtsData = data as DebtsAgingReport;
      if (format === "pdf") exportDebtsAgingReport.toPDF(debtsData);
      else if (format === "excel") exportDebtsAgingReport.toExcel(debtsData);
      else if (format === "csv") exportDebtsAgingReport.toCSV(debtsData);
      else if (format === "print") exportDebtsAgingReport.toPrint(debtsData);
      break;
    case "goals":
      const goalsData = data as GoalsReport;
      if (format === "pdf") exportGoalsReport.toPDF(goalsData);
      else if (format === "excel") exportGoalsReport.toExcel(goalsData);
      else if (format === "csv") exportGoalsReport.toCSV(goalsData);
      else if (format === "print") exportGoalsReport.toPrint(goalsData);
      break;
    default:
      console.warn(`Unknown report type: ${reportType}`);
  }
};
