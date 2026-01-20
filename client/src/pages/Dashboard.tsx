import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/StatsCards";
import { ExpensesBarChart, CategoryPieChart } from "@/components/Charts";
import { UploadReceiptModal } from "@/components/UploadReceiptModal";
import { useReceipts, useReceiptSummary } from "@/hooks/use-receipts";
import { useUser } from "@/context/UserContext";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard() {
  const { userId } = useUser();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const currentActualYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentActualYear.toString());
  
  const { data: recentReceipts, isLoading } = useReceipts({ userId, year: selectedYear });
  
  const previousYear = (parseInt(selectedYear) - 1).toString();
  
  const { data: currentYearSummary } = useReceiptSummary(selectedYear, userId);
  const { data: lastYearSummary } = useReceiptSummary(previousYear, userId);
  
  // Generate year options (last 10 years)
  const yearOptions = Array.from({ length: 10 }, (_, i) => (currentActualYear - i).toString());
  
  const currentTotal = (currentYearSummary as any)?.totalExpenses || 0;
  const lastTotal = (lastYearSummary as any)?.totalExpenses || 0;
  const yoyChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0; 

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto w-full max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground dark:text-primary dark:font-semibold mt-1">Overview of your expenses and receipts.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32 h-12 rounded-xl bg-card" data-testid="select-dashboard-year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => setIsUploadOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 h-12 rounded-xl shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Receipt
          </Button>
        </div>
      </div>

      <StatsCards year={selectedYear} />

      {/* Year-over-Year Comparison */}
      {lastTotal > 0 && (
        <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm">
          <h3 className="text-lg font-bold font-display mb-4">Year-over-Year Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-muted/20 rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">{previousYear} Total</p>
              <p className="text-2xl font-bold font-display text-foreground">
                ${lastTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 bg-muted/20 rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">{selectedYear} Total</p>
              <p className="text-2xl font-bold font-display text-primary">
                ${currentTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${yoyChange > 0 ? 'bg-destructive/10' : yoyChange < 0 ? 'bg-accent' : 'bg-muted/20'}`}>
              <p className="text-sm text-muted-foreground mb-1">Change</p>
              <div className="flex items-center gap-2">
                {yoyChange > 0 ? (
                  <TrendingUp className="w-5 h-5 text-destructive" />
                ) : yoyChange < 0 ? (
                  <TrendingDown className="w-5 h-5 text-primary" />
                ) : (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                )}
                <p className={`text-2xl font-bold font-display ${yoyChange > 0 ? 'text-destructive' : yoyChange < 0 ? 'text-primary' : 'text-foreground'}`}>
                  {yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-3xl p-6 border border-border/50 shadow-sm">
          <h3 className="text-lg font-bold font-display mb-6">Monthly Activity ({selectedYear})</h3>
          <ExpensesBarChart year={selectedYear} />
        </div>
        <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm">
          <h3 className="text-lg font-bold font-display mb-6">By Category ({selectedYear})</h3>
          <CategoryPieChart year={selectedYear} />
        </div>
      </div>

      {/* Recent Receipts Table */}
      <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border/50 flex justify-between items-center">
          <h3 className="text-lg font-bold font-display">Recent Receipts</h3>
          <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/5">View All</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Merchant</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : recentReceipts?.slice(0, 5).map((receipt) => (
                <motion.tr 
                  key={receipt.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-muted/10 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {format(new Date(receipt.date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {receipt.merchantName.charAt(0)}
                      </div>
                      {receipt.merchantName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {receipt.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-foreground">
                    ${Number(receipt.amount).toFixed(2)}
                  </td>
                </motion.tr>
              ))}
              {recentReceipts?.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No receipts found. Upload one to get started!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UploadReceiptModal open={isUploadOpen} onOpenChange={setIsUploadOpen} />
    </div>
  );
}
