import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Działkometr — ocena i porównanie działek budowlanych',
  description: 'Scoring, ryzyka i cena w jednym miejscu. Od linku do decyzji.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#1E2B3C',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
