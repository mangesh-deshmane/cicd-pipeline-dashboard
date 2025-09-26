class WebSocketService {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Store client connection info
      this.connectedClients.set(socket.id, {
        socket,
        subscribedProjects: new Set(),
        connectedAt: new Date()
      });

      // Handle project subscription
      socket.on('subscribe_project', (projectId) => {
        try {
          const client = this.connectedClients.get(socket.id);
          if (client) {
            client.subscribedProjects.add(projectId);
            socket.join(`project_${projectId}`);
            console.log(`Client ${socket.id} subscribed to project ${projectId}`);
            
            socket.emit('subscription_confirmed', { 
              projectId, 
              message: 'Successfully subscribed to project updates' 
            });
          }
        } catch (error) {
          console.error('Error handling project subscription:', error);
          socket.emit('error', { message: 'Failed to subscribe to project' });
        }
      });

      // Handle project unsubscription
      socket.on('unsubscribe_project', (projectId) => {
        try {
          const client = this.connectedClients.get(socket.id);
          if (client) {
            client.subscribedProjects.delete(projectId);
            socket.leave(`project_${projectId}`);
            console.log(`Client ${socket.id} unsubscribed from project ${projectId}`);
            
            socket.emit('unsubscription_confirmed', { 
              projectId, 
              message: 'Successfully unsubscribed from project updates' 
            });
          }
        } catch (error) {
          console.error('Error handling project unsubscription:', error);
          socket.emit('error', { message: 'Failed to unsubscribe from project' });
        }
      });

      // Handle global subscription (all projects)
      socket.on('subscribe_global', () => {
        try {
          socket.join('global_updates');
          console.log(`Client ${socket.id} subscribed to global updates`);
          
          socket.emit('subscription_confirmed', { 
            type: 'global',
            message: 'Successfully subscribed to global updates' 
          });
        } catch (error) {
          console.error('Error handling global subscription:', error);
          socket.emit('error', { message: 'Failed to subscribe to global updates' });
        }
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedClients.delete(socket.id);
      });

      // Send initial connection confirmation
      socket.emit('connected', {
        message: 'WebSocket connection established',
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    });
  }

  // Broadcast execution update to relevant clients
  broadcastExecutionUpdate(execution) {
    try {
      const update = {
        type: 'execution_updated',
        data: {
          id: execution.id,
          project_id: execution.project_id,
          execution_id: execution.execution_id,
          status: execution.status,
          branch: execution.branch,
          duration_seconds: execution.duration_seconds,
          started_at: execution.started_at,
          completed_at: execution.completed_at,
          updated_at: execution.updated_at
        },
        timestamp: new Date().toISOString()
      };

      // Broadcast to project-specific subscribers
      this.io.to(`project_${execution.project_id}`).emit('execution_update', update);
      
      // Broadcast to global subscribers
      this.io.to('global_updates').emit('execution_update', update);

      console.log(`Broadcasted execution update for project ${execution.project_id}, execution ${execution.execution_id}`);
    } catch (error) {
      console.error('Error broadcasting execution update:', error);
    }
  }

  // Broadcast metrics update
  broadcastMetricsUpdate(projectId, metrics) {
    try {
      const update = {
        type: 'metrics_updated',
        data: {
          project_id: projectId,
          metrics: metrics
        },
        timestamp: new Date().toISOString()
      };

      // Broadcast to project-specific subscribers
      this.io.to(`project_${projectId}`).emit('metrics_update', update);
      
      // Broadcast to global subscribers
      this.io.to('global_updates').emit('metrics_update', update);

      console.log(`Broadcasted metrics update for project ${projectId}`);
    } catch (error) {
      console.error('Error broadcasting metrics update:', error);
    }
  }

  // Broadcast alert notification
  broadcastAlert(alert) {
    try {
      const notification = {
        type: 'alert_triggered',
        data: alert,
        timestamp: new Date().toISOString()
      };

      // Broadcast to project-specific subscribers
      if (alert.project_id) {
        this.io.to(`project_${alert.project_id}`).emit('alert', notification);
      }
      
      // Broadcast to global subscribers
      this.io.to('global_updates').emit('alert', notification);

      console.log(`Broadcasted alert for project ${alert.project_id}: ${alert.message}`);
    } catch (error) {
      console.error('Error broadcasting alert:', error);
    }
  }

  // Broadcast system status update
  broadcastSystemStatus(status) {
    try {
      const update = {
        type: 'system_status',
        data: status,
        timestamp: new Date().toISOString()
      };

      // Broadcast to all connected clients
      this.io.emit('system_status', update);

      console.log('Broadcasted system status update');
    } catch (error) {
      console.error('Error broadcasting system status:', error);
    }
  }

  // Get connection statistics
  getConnectionStats() {
    const stats = {
      total_connections: this.connectedClients.size,
      connections: Array.from(this.connectedClients.values()).map(client => ({
        socket_id: client.socket.id,
        connected_at: client.connectedAt,
        subscribed_projects: Array.from(client.subscribedProjects),
        ip_address: client.socket.handshake.address
      }))
    };

    return stats;
  }

  // Send message to specific client
  sendToClient(socketId, event, data) {
    try {
      const client = this.connectedClients.get(socketId);
      if (client) {
        client.socket.emit(event, data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error sending message to client:', error);
      return false;
    }
  }

  // Disconnect all clients (for maintenance)
  disconnectAllClients(reason = 'Server maintenance') {
    try {
      this.io.emit('server_shutdown', { 
        message: reason,
        timestamp: new Date().toISOString()
      });
      
      setTimeout(() => {
        this.io.disconnectSockets(true);
      }, 1000);
      
      console.log('Disconnected all clients for:', reason);
    } catch (error) {
      console.error('Error disconnecting clients:', error);
    }
  }
}

module.exports = WebSocketService;
