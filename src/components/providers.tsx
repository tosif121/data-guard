'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { components, tools } from '@/lib/tambo-config';
import { TamboProvider } from '@tambo-ai/react';
import { Toaster } from 'react-hot-toast';

import { ConnectionProvider } from '@/lib/context/ConnectionContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TamboProvider tools={tools} components={components} apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY ?? ''}>
        <ConnectionProvider>
          {children}
          <Toaster position="top-right" />
        </ConnectionProvider>
      </TamboProvider>
    </ThemeProvider>
  );
}
