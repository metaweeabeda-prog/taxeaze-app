import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend } from "recharts";
import { useReceiptSummary } from "@/hooks/use-receipts";
import { useUser } from "@/context/UserContext";

// Professional color palette with good contrast and distinction
const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#059669',      // Emerald
  'Travel': '#0284C7',             // Sky Blue
  'Lodging': '#7C3AED',            // Violet
  'Utilities': '#EA580C',          // Orange
  'Office Supplies': '#0891B2',    // Cyan
  'Medical': '#DC2626',            // Red
  'Entertainment': '#D946EF',      // Fuchsia
  'Vehicle & Gas': '#4F46E5',      // Indigo
  'Insurance': '#65A30D',          // Lime
  'Professional Services': '#0D9488', // Teal
  'Education': '#2563EB',          // Blue
  'Other': '#6B7280',              // Gray
};

const CHART_COLORS = [
  '#059669', '#0284C7', '#7C3AED', '#EA580C', '#0891B2', 
  '#DC2626', '#D946EF', '#4F46E5', '#65A30D', '#0D9488',
  '#2563EB', '#6B7280'
];

function getCategoryColor(category: string, index: number): string {
  return CATEGORY_COLORS[category] || CHART_COLORS[index % CHART_COLORS.length];
}

interface ChartProps {
  year?: string;
}

export function ExpensesBarChart({ year }: ChartProps) {
  const { userId } = useUser();
  const selectedYear = year || new Date().getFullYear().toString();
  const { data: summary } = useReceiptSummary(selectedYear, userId);
  
  // Sort months chronologically if needed, but assuming API handles it or simple mapping
  const data = summary?.monthlyBreakdown.map(item => ({
    name: item.month.substring(0, 3), // Jan, Feb
    total: item.total
  })) || [];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748B', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748B', fontSize: 12 }} 
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            cursor={{ fill: '#F1F5F9' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === data.length - 1 ? '#059669' : '#94A3B8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryPieChart({ year }: ChartProps) {
  const { userId } = useUser();
  const selectedYear = year || new Date().getFullYear().toString();
  const { data: summary } = useReceiptSummary(selectedYear, userId);
  
  const rawData = summary?.categoryBreakdown || [];
  const total = rawData.reduce((sum, item) => sum + item.total, 0);
  
  // Add percentage to data
  const data = rawData.map((item, index) => ({
    ...item,
    percentage: total > 0 ? ((item.total / total) * 100).toFixed(1) : 0,
    fill: getCategoryColor(item.category, index)
  }));

  if (data.length === 0) return <div className="h-[400px] flex items-center justify-center text-muted-foreground">No data yet</div>;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-xl p-3 shadow-lg">
          <p className="font-semibold text-foreground">{item.category}</p>
          <p className="text-sm text-muted-foreground">${item.total.toFixed(2)} ({item.percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="h-[220px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={3}
              dataKey="total"
              nameKey="category"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total</p>
            <p className="text-xl font-bold text-foreground">${total.toFixed(0)}</p>
          </div>
        </div>
      </div>
      
      {/* Legend with amounts */}
      <div className="mt-4 space-y-2 max-h-[160px] overflow-y-auto">
        {data.slice(0, 6).map((item, index) => (
          <div key={item.category} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-foreground truncate max-w-[120px]">{item.category}</span>
            </div>
            <span className="text-muted-foreground font-medium">${item.total.toFixed(0)}</span>
          </div>
        ))}
        {data.length > 6 && (
          <p className="text-xs text-muted-foreground text-center pt-1">+{data.length - 6} more categories</p>
        )}
      </div>
    </div>
  );
}
