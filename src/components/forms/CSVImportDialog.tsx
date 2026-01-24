import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Download, AlertCircle, CheckCircle } from "lucide-react";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "revenue" | "expense";
  importFn: (data: any[]) => Promise<{ message: string; imported: number; failed: number; errors: any[] }>;
}

interface ParsedRow {
  [key: string]: string | number | boolean | undefined;
}

export function CSVImportDialog({ open, onOpenChange, type, importFn }: CSVImportDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: any[] } | null>(null);

  const importMutation = useMutation({
    mutationFn: importFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [type === "revenue" ? "revenue" : "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setImportResult(data);
      if (data.imported > 0) {
        toast.success(`Successfully imported ${data.imported} ${type} entries`);
      }
      if (data.failed > 0) {
        toast.warning(`${data.failed} entries failed to import`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || `Failed to import ${type} data`);
    },
  });

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: ParsedRow = {};

      headers.forEach((header, index) => {
        const value = values[index] || "";
        
        // Map common CSV headers to API fields
        if (type === "revenue") {
          switch (header) {
            case "serviceid":
            case "service_id":
            case "service":
              row.serviceId = parseInt(value) || undefined;
              break;
            case "amount":
              row.amount = parseFloat(value) || 0;
              break;
            case "date":
              row.date = value;
              break;
            case "description":
              row.description = value || undefined;
              break;
            case "paymentmethod":
            case "payment_method":
            case "payment":
              row.paymentMethod = value || "cash";
              break;
            case "reference":
              row.reference = value || undefined;
              break;
          }
        } else {
          // Expense mapping
          switch (header) {
            case "serviceid":
            case "service_id":
            case "service":
              row.serviceId = parseInt(value) || undefined;
              break;
            case "amount":
              row.amount = parseFloat(value) || 0;
              break;
            case "date":
              row.date = value;
              break;
            case "category":
              row.category = value || "other";
              break;
            case "description":
              row.description = value || undefined;
              break;
            case "vendor":
              row.vendor = value || undefined;
              break;
            case "isrecurring":
            case "is_recurring":
            case "recurring":
              row.isRecurring = value.toLowerCase() === "true" || value === "1";
              break;
          }
        }
      });

      // Validate required fields
      if (row.amount && row.date) {
        rows.push(row);
      }
    }

    return rows;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setPreviewData(parsed.slice(0, 5)); // Show first 5 rows
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      
      if (parsed.length === 0) {
        toast.error("No valid data found in CSV file");
        return;
      }

      importMutation.mutate(parsed);
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    let csvContent = "";
    
    if (type === "revenue") {
      csvContent = "serviceId,amount,date,description,paymentMethod,reference\n";
      csvContent += "1,1500.00,2026-01-24,Monthly subscription,cash,REF001\n";
      csvContent += "2,2500.00,2026-01-24,Service fee,bank,REF002\n";
    } else {
      csvContent = "serviceId,amount,date,category,description,vendor,isRecurring\n";
      csvContent += "1,500.00,2026-01-24,operating,Office supplies,Office Depot,false\n";
      csvContent += ",1200.00,2026-01-24,rent,Monthly rent,Property Management,true\n";
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_import_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import {type === "revenue" ? "Revenue" : "Expenses"} from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import {type} entries. Download the template for the correct format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <Button variant="outline" className="w-full gap-2" onClick={downloadTemplate}>
            <Download className="w-4 h-4" />
            Download CSV Template
          </Button>

          {/* File Upload */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-success">
                <FileText className="w-6 h-6" />
                <span>{file.name}</span>
              </div>
            ) : (
              <div className="text-muted-foreground">
                <Upload className="w-8 h-8 mx-auto mb-2" />
                <p>Click to select a CSV file</p>
                <p className="text-xs mt-1">or drag and drop</p>
              </div>
            )}
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Preview (first 5 rows)</h4>
              <div className="max-h-40 overflow-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {type === "revenue" ? (
                        <>
                          <th className="p-2 text-left">Service ID</th>
                          <th className="p-2 text-left">Amount</th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Method</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2 text-left">Amount</th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Category</th>
                          <th className="p-2 text-left">Vendor</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-t">
                        {type === "revenue" ? (
                          <>
                            <td className="p-2">{row.serviceId || "-"}</td>
                            <td className="p-2">${Number(row.amount).toFixed(2)}</td>
                            <td className="p-2">{row.date}</td>
                            <td className="p-2">{row.paymentMethod || "cash"}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-2">${Number(row.amount).toFixed(2)}</td>
                            <td className="p-2">{row.date}</td>
                            <td className="p-2">{row.category || "other"}</td>
                            <td className="p-2">{row.vendor || "-"}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="space-y-2">
              {importResult.imported > 0 && (
                <Alert className="border-success">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription>
                    Successfully imported {importResult.imported} entries
                  </AlertDescription>
                </Alert>
              )}
              {importResult.failed > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {importResult.failed} entries failed to import
                    {importResult.errors.length > 0 && (
                      <ul className="mt-2 text-xs">
                        {importResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>Row {err.row}: {JSON.stringify(err.error)}</li>
                        ))}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {importResult ? "Close" : "Cancel"}
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={!file || importMutation.isPending}
            >
              {importMutation.isPending ? "Importing..." : `Import ${previewData.length > 0 ? `(${previewData.length}+ rows)` : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
