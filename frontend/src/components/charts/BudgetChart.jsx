// components/charts/BudgetChart.jsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ['#0e8960', '#9d2f2f', '#2356a7', '#56389c', '#996100'];

export default function BudgetChart({ budgets }) {
  if (!budgets || budgets.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-center h-64">
        <p className="text-slate-500">No budget data to display</p>
      </div>
    );
  }

  const barData = budgets.map((b) => ({
    name: b.Project?.title || "Project",
    budget: b.totalBudget,
    spent: b.spent,
    remaining: Math.max(b.totalBudget - b.spent, 0),
  }));

  const pieData = budgets.map((b) => ({
    name: b.Project?.title || "Project",
    value: b.totalBudget,
  }));

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Bar Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="font-black mb-4">Budget vs Spent</h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="budget" fill="#0a825a" name="Budget" />
              <Bar dataKey="spent" fill="#a33131" name="Spent" />
              <Bar dataKey="remaining" fill="#2255a6" name="Remaining" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="font-black mb-4">Budget Distribution</h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#5f5c92"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}