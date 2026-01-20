import { useState, useMemo, useRef } from "react";
import { useReceiptSummary } from "@/hooks/use-receipts";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Download, FileText, Printer, Upload, Database, FileSpreadsheet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function Reports() {
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const { userId } = useUser();
  const { data: summary } = useReceiptSummary(year, userId) as {
    data: {
      totalExpenses: number;
      totalTax: number;
      monthlyBreakdown: { month: string; total: number; tax: number }[];
      categoryBreakdown: { category: string; total: number; tax: number }[];
      monthlyCategoryBreakdown: { month: string; categories: { category: string; total: number; tax: number }[] }[];
    } | undefined
  };

  const months = useMemo(() => {
    if (!summary?.monthlyCategoryBreakdown) return [];
    return summary.monthlyCategoryBreakdown.filter((m: any) => m.categories.length > 0);
  }, [summary]);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleBackup = () => {
    window.location.href = `/api/backup?userId=${userId}`;
    toast({ title: "Backup Started", description: "Your backup file is downloading." });
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipts: data.receipts, userId })
      });
      
      if (!res.ok) throw new Error("Restore failed");
      
      const result = await res.json();
      toast({ title: "Restore Complete", description: result.message });
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/receipts/summary'] });
    } catch (err) {
      toast({ title: "Restore Failed", description: "Could not restore from backup file.", variant: "destructive" });
    }
    
    e.target.value = "";
  };

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto w-full max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Tax Reports</h1>
          <p className="text-muted-foreground dark:text-primary dark:font-semibold mt-1">Export your data for tax season. Viewing: <span className="text-foreground font-semibold">{userId === 'user1' ? 'Person 1' : 'Person 2'}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32 h-11 rounded-xl bg-card">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handlePrint} className="h-11 rounded-xl" data-testid="button-print">
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              const params = new URLSearchParams();
              params.append('year', year);
              if (userId) params.append('userId', userId);
              window.location.href = `/api/receipts/export?${params.toString()}`;
            }}
            className="h-11 rounded-xl"
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              const params = new URLSearchParams();
              params.append('year', year);
              if (userId) params.append('userId', userId);
              window.location.href = `/api/receipts/export-pdf?${params.toString()}`;
            }}
            className="h-11 rounded-xl"
            data-testid="button-export-pdf"
          >
            <FileText className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button 
            variant="outline"
            onClick={handleBackup} 
            className="h-11 rounded-xl"
            data-testid="button-backup"
          >
            <Database className="w-4 h-4 mr-2" /> Backup
          </Button>
          <Button 
            variant="outline"
            onClick={handleRestoreClick} 
            className="h-11 rounded-xl"
            data-testid="button-restore"
          >
            <Upload className="w-4 h-4 mr-2" /> Restore
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleRestoreFile}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      <div className="bg-card p-8 md:p-12 rounded-3xl shadow-sm border border-border/50 print:shadow-none print:border-none print:p-0">
        <div className="text-center mb-12 border-b border-border/50 pb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-display font-bold text-foreground">Annual Expense Report</h2>
          <p className="text-lg text-muted-foreground mt-2">Fiscal Year {year} - {userId === 'user1' ? 'Person 1' : 'Person 2'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-muted/20 rounded-xl">
                <span className="font-medium">Total Expenses</span>
                <span className="text-2xl font-bold font-display text-primary">
                  ${summary?.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted/20 rounded-xl">
                <span className="font-medium">Total Tax (5% default)</span>
                <span className="text-2xl font-bold font-display text-sky-600">
                  ${summary?.totalTax?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-primary/10 rounded-xl border border-primary/20">
                <span className="font-medium">Grand Total</span>
                <span className="text-2xl font-bold font-display text-foreground">
                  ${((summary?.totalExpenses || 0) + (summary?.totalTax || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Category Breakdown</h3>
            <div className="space-y-3">
              {summary?.categoryBreakdown.map((cat, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary/20" />
                    {cat.category}
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-medium">${cat.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span className="text-xs text-muted-foreground ml-2">(+${cat.tax?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'} tax)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6">Monthly Detail by Category</h3>
          <div className="space-y-8">
            {months.map((month: any, i: number) => (
              <div key={i} className="rounded-2xl border border-border/50 overflow-hidden">
                <div className="bg-muted/30 px-6 py-3 flex justify-between items-center">
                  <h4 className="font-bold text-foreground">{month.month}</h4>
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">
                      Total: ${month.categories.reduce((sum: number, cat: any) => sum + cat.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-sky-600 ml-2">
                      (+${month.categories.reduce((sum: number, cat: any) => sum + (cat.tax || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} tax)
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-medium text-muted-foreground uppercase border-b border-border/30">
                        <th className="pb-2">Category</th>
                        <th className="pb-2 text-right">Amount</th>
                        <th className="pb-2 text-right">Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {month.categories.map((cat: any, ci: number) => (
                        <tr key={ci} className="hover:bg-muted/5 transition-colors">
                          <td className="py-2.5 text-sm text-foreground">{cat.category}</td>
                          <td className="py-2.5 text-sm text-right font-mono text-muted-foreground">
                            ${cat.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 text-sm text-right font-mono text-sky-600">
                            ${(cat.tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 text-center text-xs text-muted-foreground print:block hidden">
          Generated by TaXEaze for {userId === 'user1' ? 'Person 1' : 'Person 2'} on {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
