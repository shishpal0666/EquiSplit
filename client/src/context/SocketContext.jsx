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

    // Connect to socket server
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
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
