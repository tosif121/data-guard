'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { reliableFetch } from '@/lib/api';
import toast from 'react-hot-toast';

interface ConnectionContextType {
  isConnected: boolean;
  serviceId: string | null;
  setConnectionState: (connected: boolean, id: string | null) => void;
  disconnect: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [serviceId, setServiceId] = useState<string | null>(null);

  const setConnectionState = (connected: boolean, id: string | null) => {
    setIsConnected(connected);
    setServiceId(id);
  };

  const disconnect = async () => {
    if (!serviceId) return;

    try {
      const { success, error } = await reliableFetch('/services/disconnect', {
        method: 'POST',
        data: { serviceId },
      });

      if (success) {
        toast.success('Disconnected successfully');
        setIsConnected(false);
        setServiceId(null);
        // Force refresh to clear dashboard state
        window.location.reload();
      } else {
        toast.error(`Disconnect failed: ${error}`);
      }
    } catch (err: any) {
      toast.error(`Disconnect error: ${err.message}`);
    }
  };

  return (
    <ConnectionContext.Provider value={{ isConnected, serviceId, setConnectionState, disconnect }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};
