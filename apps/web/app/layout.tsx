import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'DecisionEngine — Działki',
  description: 'Twój system decyzyjny dla działek budowlanych',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#060C18',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" className={inter.variable}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-c0 text-text-primary antialiased">{children}</body>
    </html>
  )
}
