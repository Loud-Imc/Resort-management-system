import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (token && user) {
      const socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        path: '/socket.io',
        auth: {
            token: token
        },
        query: {
          userId: user.id,
        },
      });

      socketInstance.on('connect', () => {
        setIsConnected(true);
        console.log('Socket connected:', socketInstance.id);
        socketInstance.emit('join_room', `user_${user.id}`);
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket disconnected');
      });

      socketInstance.on('NEW_NOTIFICATION', (data) => {
        // Invalidate notifications query to refresh count
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        
        toast.success((t) => (
          <div className="flex flex-col gap-1 cursor-pointer" onClick={() => {
              toast.dismiss(t.id);
              window.location.href = '/notifications';
          }}>
            <div className="font-bold flex items-center gap-2">
              <span className="animate-pulse w-2 h-2 bg-primary rounded-full"></span>
              New Alert
            </div>
            <div className="text-xs font-semibold">
              {data.title}
            </div>
            <div className="text-[11px] opacity-80 line-clamp-2">
              {data.message}
            </div>
          </div>
        ), {
            duration: 5000,
            icon: '🔔'
        });
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    } else {
        setSocket(null);
        setIsConnected(false);
    }
  }, [token, user, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
