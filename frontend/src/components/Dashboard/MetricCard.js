import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';

const MetricCard = ({ 
  title, 
  value, 
  suffix = '', 
  subtitle, 
  color = 'primary',
  trend = null,
  trendValue = null,
  icon = null 
}) => {
  const theme = useTheme();

  const getColorValue = (colorName) => {
    switch (colorName) {
      case 'success':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'info':
        return theme.palette.info.main;
      case 'secondary':
        return theme.palette.secondary.main;
      default:
        return theme.palette.primary.main;
    }
  };

  const getTrendIcon = (trendDirection) => {
    switch (trendDirection) {
      case 'up':
        return <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'down':
        return <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />;
      case 'flat':
        return <TrendingFlatIcon sx={{ fontSize: 16, color: 'text.secondary' }} />;
      default:
        return null;
    }
  };

  const formatValue = (val) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return (val / 1000000).toFixed(1) + 'M';
      } else if (val >= 1000) {
        return (val / 1000).toFixed(1) + 'K';
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${getColorValue(color)}15 0%, ${getColorValue(color)}05 100%)`,
        border: `1px solid ${getColorValue(color)}30`,
      }}
    >
      <CardContent sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography color="text.secondary" gutterBottom variant="body2" component="div">
            {title}
          </Typography>
          {icon && (
            <Box sx={{ color: getColorValue(color), opacity: 0.7 }}>
              {icon}
            </Box>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 1 }}>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: getColorValue(color) }}>
            {formatValue(value)}
          </Typography>
          {suffix && (
            <Typography variant="h6" color="text.secondary">
              {suffix}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
          
          {trend && trendValue !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getTrendIcon(trend)}
              <Typography 
                variant="caption" 
                sx={{ 
                  color: trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary',
                  fontWeight: 'medium'
                }}
              >
                {Math.abs(trendValue)}{suffix}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
