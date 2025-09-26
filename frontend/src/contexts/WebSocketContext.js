import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [subscribedProjects, setSubscribedProjects] = useState(new Set());

  // Event listeners
  const [executionListeners, setExecutionListeners] = useState(new Set());
  const [metricsListeners, setMetricsListeners] = useState(new Set());
  const [alertListeners, setAlertListeners] = useState(new Set());

  const connectSocket = useCallback(() => {
    if (socket?.connected) return;

    const newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      setConnectionStatus('connected');
      toast.success('Real-time connection established');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnected(false);
      setConnectionStatus('disconnected');
      if (reason !== 'io client disconnect') {
        toast.error('Real-time connection lost');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('error');
      toast.error('Failed to connect to real-time updates');
    });

    newSocket.on('reconnect', () => {
      console.log('WebSocket reconnected');
      setConnected(true);
      setConnectionStatus('connected');
      toast.success('Real-time connection restored');
      
      // Re-subscribe to projects
      subscribedProjects.forEach(projectId => {
        newSocket.emit('subscribe_project', projectId);
      });
    });

    // Data events
    newSocket.on('execution_update', (data) => {
      console.log('Execution update received:', data);
      executionListeners.forEach(listener => listener(data));
    });

    newSocket.on('metrics_update', (data) => {
      console.log('Metrics update received:', data);
      metricsListeners.forEach(listener => listener(data));
    });

    newSocket.on('alert', (data) => {
      console.log('Alert received:', data);
      alertListeners.forEach(listener => listener(data));
      
      // Show toast notification for alerts
      const severity = data.data.severity || 'medium';
      const message = data.data.message || 'Pipeline alert';
      
      switch (severity) {
        case 'critical':
        case 'high':
          toast.error(message);
          break;
        case 'medium':
          toast(message, { icon: '⚠️' });
          break;
        default:
          toast(message, { icon: 'ℹ️' });
      }
    });

    newSocket.on('system_status', (data) => {
      console.log('System status update:', data);
      // Handle system status updates if needed
    });

    newSocket.on('subscription_confirmed', (data) => {
      console.log('Subscription confirmed:', data);
    });

    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
      toast.error(error.message || 'WebSocket error occurred');
    });

    setSocket(newSocket);
  }, [socket, subscribedProjects, executionListeners, metricsListeners, alertListeners]);

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
      setConnectionStatus('disconnected');
    }
  }, [socket]);

  // Subscribe to project updates
  const subscribeToProject = useCallback((projectId) => {
    if (socket && connected) {
      socket.emit('subscribe_project', projectId);
      setSubscribedProjects(prev => new Set([...prev, projectId]));
    }
  }, [socket, connected]);

  // Unsubscribe from project updates
  const unsubscribeFromProject = useCallback((projectId) => {
    if (socket && connected) {
      socket.emit('unsubscribe_project', projectId);
      setSubscribedProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  }, [socket, connected]);

  // Subscribe to global updates
  const subscribeToGlobal = useCallback(() => {
    if (socket && connected) {
      socket.emit('subscribe_global');
    }
  }, [socket, connected]);

  // Event listener management
  const addExecutionListener = useCallback((listener) => {
    setExecutionListeners(prev => new Set([...prev, listener]));
    return () => {
      setExecutionListeners(prev => {
        const newSet = new Set(prev);
        newSet.delete(listener);
        return newSet;
      });
    };
  }, []);

  const addMetricsListener = useCallback((listener) => {
    setMetricsListeners(prev => new Set([...prev, listener]));
    return () => {
      setMetricsListeners(prev => {
        const newSet = new Set(prev);
        newSet.delete(listener);
        return newSet;
      });
    };
  }, []);

  const addAlertListener = useCallback((listener) => {
    setAlertListeners(prev => new Set([...prev, listener]));
    return () => {
      setAlertListeners(prev => {
        const newSet = new Set(prev);
        newSet.delete(listener);
        return newSet;
      });
    };
  }, []);

  // Send ping to check connection
  const ping = useCallback(() => {
    if (socket && connected) {
      socket.emit('ping');
    }
  }, [socket, connected]);

  // Initialize connection
  useEffect(() => {
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  // Auto-reconnect logic
  useEffect(() => {
    if (!connected && connectionStatus === 'disconnected') {
      const timeout = setTimeout(() => {
        if (!connected) {
          console.log('Attempting to reconnect...');
          connectSocket();
        }
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [connected, connectionStatus, connectSocket]);

  const value = {
    socket,
    connected,
    connectionStatus,
    subscribedProjects: Array.from(subscribedProjects),
    
    // Connection management
    connect: connectSocket,
    disconnect: disconnectSocket,
    ping,
    
    // Subscription management
    subscribeToProject,
    unsubscribeFromProject,
    subscribeToGlobal,
    
    // Event listeners
    addExecutionListener,
    addMetricsListener,
    addAlertListener,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
