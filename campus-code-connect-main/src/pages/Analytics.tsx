import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const data = [
  { name: "Mon", signups: 24, posts: 12 },
  { name: "Tue", signups: 32, posts: 18 },
  { name: "Wed", signups: 45, posts: 22 },
  { name: "Thu", signups: 30, posts: 15 },
  { name: "Fri", signups: 50, posts: 28 },
  { name: "Sat", signups: 12, posts: 6 },
  { name: "Sun", signups: 8, posts: 3 },
];

const Analytics = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Weekly activity: signups and posts</p>
            <ChartContainer
              config={{ signups: { label: "Signups", color: "#7c3aed" }, posts: { label: "Posts", color: "#06b6d4" } }}
            >
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="signups" fill="#7c3aed" />
                <Bar dataKey="posts" fill="#06b6d4" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
