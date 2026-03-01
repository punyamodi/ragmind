import { Sidebar } from './Sidebar'
import { Toaster } from 'react-hot-toast'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {children}
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151' },
          duration: 3000,
        }}
      />
    </div>
  )
}
