import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      // Disconnect if user logs out
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Ensure we don't connect to /api namespace if VITE_API_URL has /api suffix
    let socketUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');
    socketUrl = socketUrl.replace(/\/api\/?$/, '');

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true // match server's credentials: true
    });

    newSocket.on('connect', () => {
      console.log('⚡ Socket connected:', newSocket.id);
      // Join personal room for dashboard updates
      newSocket.emit('join-user', user._id);
    });

    newSocket.on('disconnect', () => {
      console.log('⚡ Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user?._id]);

  // Helper: join a group room
  const joinGroup = (groupId) => {
    if (socket) {
      socket.emit('join-group', groupId);
    }
  };

  // Helper: leave a group room
  const leaveGroup = (groupId) => {
    if (socket) {
      socket.emit('leave-group', groupId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, joinGroup, leaveGroup }}>
      {children}
    </SocketContext.Provider>
  );
};
