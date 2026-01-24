// Data Export Utilities

interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: unknown, row: T) => string;
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Build header row
  const headers = columns.map((col) => `"${col.header}"`).join(",");

  // Build data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = getNestedValue(row, col.key as string);
        const formatted = col.formatter ? col.formatter(value, row) : String(value ?? "");
        // Escape quotes and wrap in quotes
        return `"${formatted.replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  // Combine header and rows
  const csv = [headers, ...rows].join("\n");

  // Create and download file
  downloadFile(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

/**
 * Export data to JSON format
 */
export function exportToJSON<T>(data: T[], filename: string): void {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${filename}.json`, "application/json;charset=utf-8;");
}

/**
 * Generate a simple PDF report (uses browser print dialog)
 */
export function exportToPDF(
  title: string,
  content: string,
  filename: string
): void {
  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Could not open print window");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        h1 {
          color: #1a1a1a;
          border-bottom: 2px solid #0ea5e9;
          padding-bottom: 10px;
        }
        h2 {
          color: #374151;
          margin-top: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 10px;
          text-align: left;
        }
        th {
          background-color: #f3f4f6;
          font-weight: 600;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .summary-card {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          margin: 10px 0;
        }
        .text-success { color: #10b981; }
        .text-danger { color: #ef4444; }
        .text-warning { color: #f59e0b; }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${content}
      <div class="footer">
        <p>Generated on ${new Date().toLocaleString()} | Meilleur Insights Dashboard</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load then trigger print
  printWindow.onload = () => {
    printWindow.print();
  };
}

/**
 * Create downloadable file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Get nested object value by dot notation path
 */
function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split(".").reduce((current, key) => {
    return current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined;
  }, obj as unknown);
}

// Pre-defined export configurations

export const serviceExportColumns = [
  { key: "name", header: "Service Name" },
  { key: "description", header: "Description" },
  { key: "revenue", header: "Revenue", formatter: (v: unknown) => `$${Number(v || 0).toLocaleString()}` },
  { key: "profit", header: "Profit", formatter: (v: unknown) => `$${Number(v || 0).toLocaleString()}` },
  { key: "margin", header: "Margin %", formatter: (v: unknown) => `${Number(v || 0).toFixed(1)}%` },
  { key: "goalMet", header: "Goal Status", formatter: (v: unknown) => (v ? "On Track" : "Below Target") },
  { key: "isActive", header: "Active", formatter: (v: unknown) => (v ? "Yes" : "No") },
];

export const revenueExportColumns = [
  { key: "date", header: "Date" },
  { key: "serviceName", header: "Service" },
  { key: "amount", header: "Amount", formatter: (v: unknown) => `$${Number(v || 0).toLocaleString()}` },
  { key: "paymentMethod", header: "Payment Method" },
  { key: "reference", header: "Reference" },
  { key: "description", header: "Description" },
];

export const madeniExportColumns = [
  { key: "debtorName", header: "Debtor Name" },
  { key: "debtorContact", header: "Contact" },
  { key: "serviceName", header: "Service" },
  { key: "originalAmount", header: "Original Amount", formatter: (v: unknown) => `$${Number(v || 0).toLocaleString()}` },
  { key: "amountPaid", header: "Amount Paid", formatter: (v: unknown) => `$${Number(v || 0).toLocaleString()}` },
  { key: "balance", header: "Balance", formatter: (v: unknown) => `$${Number(v || 0).toLocaleString()}` },
  { key: "issueDate", header: "Issue Date" },
  { key: "dueDate", header: "Due Date" },
  { key: "status", header: "Status" },
];

export const goalExportColumns = [
  { key: "title", header: "Goal" },
  { key: "serviceName", header: "Service" },
  { key: "goalType", header: "Type" },
  { key: "period", header: "Period" },
  { key: "targetAmount", header: "Target", formatter: (v: unknown) => `$${Number(v || 0).toLocaleString()}` },
  { key: "currentAmount", header: "Current", formatter: (v: unknown) => `$${Number(v || 0).toLocaleString()}` },
  { key: "progress", header: "Progress %", formatter: (v: unknown) => `${Number(v || 0).toFixed(1)}%` },
  { key: "status", header: "Status" },
  { key: "startDate", header: "Start Date" },
  { key: "endDate", header: "End Date" },
];

export const expenseExportColumns = [
  { key: "date", header: "Date", formatter: (v: unknown) => new Date(v as string).toLocaleDateString() },
  { key: "serviceName", header: "Service" },
  { key: "category", header: "Category" },
  { key: "vendor", header: "Vendor" },
  { key: "description", header: "Description" },
  { key: "amount", header: "Amount", formatter: (v: unknown) => `$${Number(v || 0).toLocaleString()}` },
  { key: "isRecurring", header: "Recurring", formatter: (v: unknown) => (v as boolean) ? "Yes" : "No" },
];

// HTML table generator for PDF exports
export function generateTableHTML<T>(
  data: T[],
  columns: ExportColumn<T>[]
): string {
  if (data.length === 0) {
    return "<p>No data available</p>";
  }

  const headers = columns.map((col) => `<th>${col.header}</th>`).join("");

  const rows = data
    .map((row) => {
      const cells = columns
        .map((col) => {
          const value = getNestedValue(row, col.key as string);
          const formatted = col.formatter ? col.formatter(value, row) : String(value ?? "-");
          return `<td>${formatted}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// Summary card generator for PDF exports
export function generateSummaryHTML(items: { label: string; value: string | number; type?: "success" | "danger" | "warning" }[]): string {
  return `
    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
      ${items
        .map(
          (item) => `
        <div class="summary-card" style="flex: 1; min-width: 150px;">
          <div style="font-size: 12px; color: #6b7280;">${item.label}</div>
          <div style="font-size: 24px; font-weight: bold;" class="${item.type ? `text-${item.type}` : ""}">
            ${typeof item.value === "number" ? item.value.toLocaleString() : item.value}
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}
