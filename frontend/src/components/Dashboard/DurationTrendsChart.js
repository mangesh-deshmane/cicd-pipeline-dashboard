import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import { format, parseISO } from 'date-fns';

const DurationTrendsChart = ({ data }) => {
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <Box sx={{ 
        height: 250, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Typography color="text.secondary">
          No duration data available
        </Typography>
      </Box>
    );
  }

  // Format data for the chart (take last 20 executions)
  const chartData = data.slice(-20).map((item, index) => ({
    ...item,
    index: index + 1,
    formattedDate: format(parseISO(item.created_at), 'MMM dd, HH:mm'),
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
            {data.execution_id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data.formattedDate}
          </Typography>
          <Typography variant="body2" color="info.main">
            Duration: {data.duration_minutes} minutes
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // Calculate average duration for reference line
  const avgDuration = chartData.reduce((sum, item) => sum + item.duration_minutes, 0) / chartData.length;

  return (
    <Box sx={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis 
            dataKey="index" 
            stroke={theme.palette.text.secondary}
            tick={{ fontSize: 12 }}
            label={{ value: 'Recent Executions', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            stroke={theme.palette.text.secondary}
            tick={{ fontSize: 12 }}
            label={{ value: 'Duration (minutes)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Duration line */}
          <Line
            type="monotone"
            dataKey="duration_minutes"
            stroke={theme.palette.info.main}
            strokeWidth={2}
            dot={{ 
              fill: theme.palette.info.main, 
              strokeWidth: 2, 
              r: 3 
            }}
            activeDot={{ 
              r: 5, 
              stroke: theme.palette.info.main,
              strokeWidth: 2,
              fill: theme.palette.background.paper 
            }}
          />
          
          {/* Average duration reference line */}
          <Line
            type="monotone"
            dataKey={() => avgDuration}
            stroke={theme.palette.warning.main}
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Average duration: {avgDuration.toFixed(1)} minutes (dashed line)
      </Typography>
    </Box>
  );
};

export default DurationTrendsChart;
