import { ArrowUpRight, TrendingUp, Wallet, PieChart } from "lucide-react";
import { useReceiptSummary } from "@/hooks/use-receipts";
import { useUser } from "@/context/UserContext";

interface StatsCardsProps {
  year?: string;
}

export function StatsCards({ year }: StatsCardsProps) {
  const { userId } = useUser();
  const selectedYear = year || new Date().getFullYear().toString();
  const { data: summary, isLoading } = useReceiptSummary(selectedYear, userId);

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 rounded-3xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  const total = summary.totalExpenses;
  // Mock comparison for visual flare (real implementation would compare to last year)
  const topCategory = summary.categoryBreakdown.sort((a, b) => b.total - a.total)[0];
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentMonthTotal = summary.monthlyBreakdown.find(m => m.month === currentMonth)?.total || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Expenses Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary p-6 text-white shadow-xl shadow-primary/20 group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Wallet className="w-32 h-32 transform rotate-12 -translate-y-8 translate-x-8" />
        </div>
        <div className="relative z-10">
          <p className="font-medium text-primary-foreground/80 mb-1">Total Expenses ({selectedYear})</p>
          <h3 className="text-4xl font-display font-bold tracking-tight mb-4">
            ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Tracked YTD</span>
          </div>
        </div>
      </div>

      {/* Monthly Spend Card */}
      <div className="relative overflow-hidden rounded-3xl bg-card p-6 border border-border/50 shadow-lg shadow-black/5 group hover:border-primary/20 transition-all duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <TrendingUp className="w-32 h-32 transform rotate-12 -translate-y-8 translate-x-8 text-primary" />
        </div>
        <div className="relative z-10">
          <p className="font-medium text-muted-foreground mb-1">{currentMonth} Spending</p>
          <h3 className="text-4xl font-display font-bold tracking-tight text-foreground mb-4">
            ${currentMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium">
            <span>Current Month</span>
          </div>
        </div>
      </div>

      {/* Top Category Card */}
      <div className="relative overflow-hidden rounded-3xl bg-card p-6 border border-border/50 shadow-lg shadow-black/5 group hover:border-primary/20 transition-all duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <PieChart className="w-32 h-32 transform rotate-12 -translate-y-8 translate-x-8 text-primary" />
        </div>
        <div className="relative z-10">
          <p className="font-medium text-muted-foreground mb-1">Top Category</p>
          <h3 className="text-3xl font-display font-bold tracking-tight text-foreground mb-4 truncate">
            {topCategory?.category || "No Data"}
          </h3>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
            <span>${topCategory?.total.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
