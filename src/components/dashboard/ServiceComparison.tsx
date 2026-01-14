import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const data = [
  { name: "Transport", revenue: 28500, target: 25000 },
  { name: "Logistics", revenue: 22300, target: 24000 },
  { name: "Real Estate", revenue: 18700, target: 20000 },
  { name: "Agriculture", revenue: 15200, target: 15000 },
  { name: "Retail", revenue: 12800, target: 14000 },
  { name: "Construction", revenue: 9400, target: 10000 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const revenue = payload[0]?.value || 0;
    const target = payload[1]?.value || 0;
    const percentage = ((revenue / target) * 100).toFixed(1);
    return (
      <div className="glass-card p-3 border border-border">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        <p className="text-sm text-primary">Revenue: ${revenue.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">Target: ${target.toLocaleString()}</p>
        <p className="text-sm mt-1">
          <span className={revenue >= target ? "text-success" : "text-danger"}>
            {percentage}% of target
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export function ServiceComparison() {
  return (
    <div className="chart-container h-80">
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title">Revenue by Service</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted" />
            <span className="text-sm text-muted-foreground">Target</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} layout="vertical" barGap={-20}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" horizontal={false} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            tickFormatter={(value) => `$${value / 1000}k`}
          />
          <YAxis
            dataKey="name"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="target" fill="hsl(222, 47%, 20%)" radius={[0, 4, 4, 0]} barSize={24} />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={24}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.revenue >= entry.target
                    ? "hsl(160, 84%, 39%)"
                    : "hsl(38, 92%, 50%)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
