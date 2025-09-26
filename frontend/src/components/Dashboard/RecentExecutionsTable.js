import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
  CircularProgress,
  TablePagination,
  Link,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { executionsApi } from '../../services/api';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const RecentExecutionsTable = ({ projectId = null, limit = 10 }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(limit);
  const navigate = useNavigate();

  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['executions', projectId, page, rowsPerPage],
    queryFn: () => executionsApi.getAll({
      project_id: projectId,
      limit: rowsPerPage,
      offset: page * rowsPerPage,
      sort_by: 'created_at',
      sort_order: 'desc'
    }),
    select: (response) => response.data,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failure':
        return 'error';
      case 'running':
        return 'info';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'failure':
        return '❌';
      case 'running':
        return '🔄';
      case 'pending':
        return '⏳';
      case 'cancelled':
        return '🚫';
      default:
        return '❓';
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (execution) => {
    navigate(`/projects/${execution.project_id}?execution=${execution.id}`);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="error" gutterBottom>
          Error loading executions: {error.message}
        </Typography>
        <IconButton onClick={() => refetch()} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>
    );
  }

  const executions = data?.executions || [];
  const totalCount = data?.pagination?.total || 0;

  if (executions.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No executions found
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Execution ID</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Triggered By</TableCell>
              <TableCell>Started</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {executions.map((execution) => (
              <TableRow 
                key={execution.id}
                hover
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell>
                  <Chip
                    icon={<span>{getStatusIcon(execution.status)}</span>}
                    label={execution.status}
                    color={getStatusColor(execution.status)}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => navigate(`/projects/${execution.project_id}`)}
                    sx={{ textAlign: 'left' }}
                  >
                    {execution.project_name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {execution.execution_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={execution.branch || 'N/A'} 
                    size="small" 
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                </TableCell>
                <TableCell>
                  {execution.duration_minutes ? (
                    <Typography variant="body2">
                      {execution.duration_minutes} min
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {execution.triggered_by || 'System'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip 
                    title={execution.started_at ? format(parseISO(execution.started_at), 'PPpp') : 'Not started'}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {execution.started_at 
                        ? formatDistanceToNow(parseISO(execution.started_at), { addSuffix: true })
                        : 'Not started'
                      }
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="View Details">
                    <IconButton 
                      size="small" 
                      onClick={() => handleViewDetails(execution)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {execution.raw_data?.html_url && (
                    <Tooltip title="Open in CI System">
                      <IconButton 
                        size="small" 
                        component="a"
                        href={execution.raw_data.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {totalCount > rowsPerPage && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
    </Box>
  );
};

export default RecentExecutionsTable;
