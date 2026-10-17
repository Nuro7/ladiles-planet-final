/**
 * Connection Manager for handling WebSocket notifications and progress updates
 */
class ConnectionManager {
    constructor() {
        this.connections = new Map();
    }

    /**
     * Store a connection with a sessionId
     * @param {string} sessionId 
     * @param {object} socket 
     */
    addConnection(sessionId, socket) {
        this.connections.set(sessionId, socket);
        console.log(`[ConnectionManager] Socket added for session: ${sessionId}`);
    }

    /**
     * Remove a connection
     * @param {string} sessionId 
     */
    removeConnection(sessionId) {
        this.connections.delete(sessionId);
        console.log(`[ConnectionManager] Socket removed for session: ${sessionId}`);
    }

    /**
     * Notify the client about progress or completion
     * @param {string} sessionId 
     * @param {object} data 
     */
    notify(sessionId, data) {
        // Since we might not have a real socket server yet, we log it
        // and check if a socket exists to emit
        const socket = this.connections.get(sessionId);

        console.log(`[${sessionId}] 📡 NOTIFY:`, JSON.stringify(data));

        if (socket && typeof socket.emit === 'function') {
            socket.emit('workflow_update', data);
        }
    }
}

module.exports = new ConnectionManager();
