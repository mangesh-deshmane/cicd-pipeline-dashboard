import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Bar,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import { format, parseISO } from 'date-fns';

const ExecutionTrendsChart = ({ data, period }) => {
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <Box sx={{ 
        height: 300, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Typography color="text.secondary">
          No data available for the selected period
        </Typography>
      </Box>
    );
  }

  // Format data for the chart
  const chartData = data.map(item => ({
    ...item,
    date: format(parseISO(item.date), period === '1d' ? 'HH:mm' : 'MMM dd'),
    formattedDate: format(parseISO(item.date), 'PPP'),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            p: 2,
            boxShadow: theme.shadows[3],
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {data.formattedDate}
          </Typography>
          <Typography variant="body2" color="primary.main">
            Executions: {data.executions}
          </Typography>
          <Typography variant="body2" color="success.main">
            Success Rate: {data.success_rate}%
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis 
            dataKey="date" 
            stroke={theme.palette.text.secondary}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="executions"
            stroke={theme.palette.text.secondary}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="rate"
            orientation="right"
            stroke={theme.palette.text.secondary}
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Execution count as bars */}
          <Bar
            yAxisId="executions"
            dataKey="executions"
            fill={theme.palette.primary.main}
            fillOpacity={0.6}
            name="Executions"
            radius={[4, 4, 0, 0]}
          />
          
          {/* Success rate as line */}
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="success_rate"
            stroke={theme.palette.success.main}
            strokeWidth={3}
            dot={{ fill: theme.palette.success.main, strokeWidth: 2, r: 4 }}
            name="Success Rate (%)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ExecutionTrendsChart;
