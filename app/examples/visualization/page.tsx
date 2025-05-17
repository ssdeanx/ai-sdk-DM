'use client';

import { useState } from 'react';
import { VisualizationWithTracing } from '@/components/chat/visualization-with-tracing';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function VisualizationExamplePage() {
  const [chartType, setChartType] = useState<string>('bar');
  const [dataSet, setDataSet] = useState<string>('sales');

  // Sample data sets
  const dataSets = {
    sales: {
      title: 'Monthly Sales Data',
      data: [
        { label: 'Jan', value: 1200 },
        { label: 'Feb', value: 1900 },
        { label: 'Mar', value: 1500 },
        { label: 'Apr', value: 2200 },
        { label: 'May', value: 2800 },
        { label: 'Jun', value: 2400 },
        { label: 'Jul', value: 3000 },
        { label: 'Aug', value: 2700 },
        { label: 'Sep', value: 3200 },
        { label: 'Oct', value: 3500 },
        { label: 'Nov', value: 3100 },
        { label: 'Dec', value: 3800 },
      ],
    },
    performance: {
      title: 'Performance Metrics',
      data: [
        { label: 'Speed', value: 85 },
        { label: 'Reliability', value: 92 },
        { label: 'Usability', value: 78 },
        { label: 'Features', value: 95 },
        { label: 'Support', value: 88 },
      ],
    },
    comparison: {
      title: 'Product Comparison',
      data: [
        {
          name: 'Product A',
          data: [
            { label: 'Q1', value: 5000 },
            { label: 'Q2', value: 7000 },
            { label: 'Q3', value: 6500 },
            { label: 'Q4', value: 8000 },
          ],
        },
        {
          name: 'Product B',
          data: [
            { label: 'Q1', value: 4000 },
            { label: 'Q2', value: 6000 },
            { label: 'Q3', value: 7500 },
            { label: 'Q4', value: 9000 },
          ],
        },
        {
          name: 'Product C',
          data: [
            { label: 'Q1', value: 3000 },
            { label: 'Q2', value: 5500 },
            { label: 'Q3', value: 6000 },
            { label: 'Q4', value: 7500 },
          ],
        },
      ],
    },
  };

  // Get current data set
  const currentData = dataSets[dataSet as keyof typeof dataSets];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">
        Data Visualization with Tracing Example
      </h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Controls</CardTitle>
          <CardDescription>
            Change the visualization type and data set to see how tracing works
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2">
              <label className="block text-sm font-medium mb-2">
                Chart Type
              </label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select chart type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                  <SelectItem value="scatter">Scatter Plot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-1/2">
              <label className="block text-sm font-medium mb-2">Data Set</label>
              <Select value={dataSet} onValueChange={setDataSet}>
                <SelectTrigger>
                  <SelectValue placeholder="Select data set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Monthly Sales</SelectItem>
                  <SelectItem value="performance">
                    Performance Metrics
                  </SelectItem>
                  <SelectItem value="comparison">Product Comparison</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card rounded-lg border p-6">
        <VisualizationWithTracing
          title={currentData.title}
          data={currentData.data}
          type={chartType}
          className="w-full"
        />
      </div>

      <div className="mt-8 p-6 bg-muted/30 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">How It Works</h2>
        <p className="mb-4">
          This example demonstrates the integration of data visualization with
          Langfuse tracing. The visualization component creates traces for all
          user interactions and rendering events, allowing you to monitor
          performance and debug issues.
        </p>
        <p className="mb-4">Key features:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Automatic tracing of chart rendering performance</li>
          <li>
            Event logging for user interactions (changing chart type, copying
            data, etc.)
          </li>
          <li>Real-time visualization of tracing data</li>
          <li>Integration with Langfuse for advanced analytics</li>
        </ul>
        <p>
          Switch between the "Chart" and "Tracing" tabs to see both the
          visualization and its corresponding tracing data. Try changing the
          chart type or data set to see how the tracing updates in real-time.
        </p>
      </div>
    </div>
  );
}
