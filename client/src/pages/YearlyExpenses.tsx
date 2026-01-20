import { useState, useMemo } from "react";
import { useReceipts } from "@/hooks/use-receipts";
import { useUser } from "@/context/UserContext";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table as TableIcon, ChevronDown, ChevronRight, Search, Filter, X, Download, FileText } from "lucide-react";
import { categories } from "@shared/schema";

export default function YearlyExpenses() {
  const { userId } = useUser();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());
  const months = [
    { value: "all", label: "All Months" },
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  
  const { data: receipts, isLoading } = useReceipts({ 
    userId,
    year: selectedYear,
    month: selectedMonth !== "all" ? selectedMonth : undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    search: searchQuery || undefined
  });

  const groupedByMonth = useMemo(() => {
    return receipts?.reduce((acc, receipt) => {
      const monthKey = format(new Date(receipt.date), 'yyyy-MM');
      const monthLabel = format(new Date(receipt.date), 'MMMM yyyy');
      if (!acc[monthKey]) {
        acc[monthKey] = { label: monthLabel, receipts: [], total: 0, tax: 0 };
      }
      acc[monthKey].receipts.push(receipt);
      acc[monthKey].total += Number(receipt.amount);
      acc[monthKey].tax += Number(receipt.tax || (Number(receipt.amount) - Number(receipt.amount) / 1.05));
      return acc;
    }, {} as Record<string, { label: string; receipts: typeof receipts; total: number; tax: number }>) || {};
  }, [receipts]);

  const sortedMonths = Object.entries(groupedByMonth).sort((a, b) => b[0].localeCompare(a[0]));

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => 
      prev.includes(monthKey) 
        ? prev.filter(m => m !== monthKey)
        : [...prev, monthKey]
    );
  };

  const grandTotal = sortedMonths.reduce((sum, [, data]) => sum + data.total, 0);
  const grandTax = sortedMonths.reduce((sum, [, data]) => sum + data.tax, 0);

  const hasFilters = selectedMonth !== "all" || selectedCategory !== "all" || searchQuery;

  const clearFilters = () => {
    setSelectedMonth("all");
    setSelectedCategory("all");
    setSearchQuery("");
  };

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto w-full max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Yearly Expenses</h1>
          <p className="text-muted-foreground dark:text-primary dark:font-semibold mt-1">View all expenses organized by year and month.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            className="h-11 px-4 rounded-xl"
            onClick={() => {
              const params = new URLSearchParams();
              params.append('year', selectedYear);
              if (selectedMonth !== "all") params.append('month', selectedMonth);
              if (selectedCategory !== "all") params.append('category', selectedCategory);
              if (searchQuery) params.append('search', searchQuery);
              if (userId) params.append('userId', userId);
              window.location.href = `/api/receipts/export?${params.toString()}`;
            }}
            data-testid="button-export-excel"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button 
            variant="outline"
            className="h-11 px-4 rounded-xl"
            onClick={() => {
              const params = new URLSearchParams();
              params.append('year', selectedYear);
              if (selectedMonth !== "all") params.append('month', selectedMonth);
              if (selectedCategory !== "all") params.append('category', selectedCategory);
              if (searchQuery) params.append('search', searchQuery);
              if (userId) params.append('userId', userId);
              window.location.href = `/api/receipts/export-pdf?${params.toString()}`;
            }}
            data-testid="button-export-pdf"
          >
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search merchants..." 
              className="pl-10 h-11 bg-muted/20 border-border rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>

          {/* Year */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32 h-11 rounded-xl bg-muted/20 border-border" data-testid="select-year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Month */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40 h-11 rounded-xl bg-muted/20 border-border" data-testid="select-month">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Category */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-44 h-11 rounded-xl bg-muted/20 border-border" data-testid="select-category">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters} className="h-11 px-4" data-testid="button-clear-filters">
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-4 bg-muted/20 rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">Receipts</p>
            <p className="text-3xl font-bold font-display text-foreground">
              {receipts?.length || 0}
            </p>
          </div>
          <div className="p-4 bg-muted/20 rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
            <p className="text-3xl font-bold font-display text-primary">
              ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-muted/20 rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">Total Tax</p>
            <p className="text-3xl font-bold font-display text-sky-600">
              ${grandTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Grand Total</p>
            <p className="text-3xl font-bold font-display text-foreground">
              ${(grandTotal + grandTax).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : sortedMonths.length === 0 ? (
        <div className="bg-card rounded-3xl p-12 border border-border/50 shadow-sm text-center">
          <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <TableIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No expenses found</h3>
          <p className="text-muted-foreground mt-2">
            {hasFilters ? "Try adjusting your filters." : `Upload receipts for ${selectedYear} to see them here.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMonths.map(([monthKey, data]) => {
            const isExpanded = expandedMonths.includes(monthKey);
            return (
              <div key={monthKey} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleMonth(monthKey)}
                  className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
                  data-testid={`button-toggle-month-${monthKey}`}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="font-bold text-foreground">{data.label}</span>
                    <span className="text-sm text-muted-foreground">({data.receipts.length} receipts)</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Paid</p>
                      <p className="font-bold text-primary">${data.total.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Tax Included</p>
                      <p className="font-bold text-secondary">${data.tax.toFixed(2)}</p>
                    </div>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="border-t border-border/50 overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Merchant</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pre-Tax</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tax</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {data.receipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(receipt => {
                          const total = Number(receipt.amount);
                          const tax = Number(receipt.tax || (total - total / 1.05));
                          const preTax = total - tax;
                          return (
                            <tr key={receipt.id} className="hover:bg-muted/10" data-testid={`row-expense-${receipt.id}`}>
                              <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">
                                {format(new Date(receipt.date), 'MMM d')}
                              </td>
                              <td className="px-5 py-3 text-sm font-medium text-foreground">
                                {receipt.merchantName}
                              </td>
                              <td className="px-5 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground whitespace-nowrap">
                                  {receipt.category}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                                {receipt.description || '-'}
                              </td>
                              <td className="px-5 py-3 text-sm font-medium text-right whitespace-nowrap">
                                ${preTax.toFixed(2)}
                              </td>
                              <td className="px-5 py-3 text-sm text-right text-secondary whitespace-nowrap">
                                ${tax.toFixed(2)}
                              </td>
                              <td className="px-5 py-3 text-sm font-bold text-right text-foreground whitespace-nowrap">
                                ${total.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
