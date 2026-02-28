import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      const socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        path: '/socket.io',
        query: {
          userId: user.id,
          roles: JSON.stringify(user.roles || []),
        },
      });

      socketInstance.on('connect', () => {
        setIsConnected(true);
        console.log('Socket connected:', socketInstance.id);
        
        // Join property-specific room
        if (user.propertyId) {
            socketInstance.emit('join_room', `property_${user.propertyId}`);
        }
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket disconnected');
      });

      socketInstance.on('NEW_BOOKING', (data) => {
        toast.success((t) => (
          <div className="flex flex-col gap-1">
            <div className="font-bold flex items-center gap-2">
              <span className="animate-pulse w-2 h-2 bg-emerald-500 rounded-full"></span>
              Reservation Alert!
            </div>
            <div className="text-xs opacity-80">
              {data.bookingNumber} • {data.roomType?.name}
            </div>
            <button 
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = `/bookings/${data.id}`;
              }}
              className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700"
            >
              Check Booking
            </button>
          </div>
        ), {
            duration: 6000,
            icon: '🏢'
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
  }, [isAuthenticated, user]);

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
