import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AetherDungeon — Autonomous AI Dungeon Master Roguelike & Staked Vault',
  description: 'On-chain tabletop RPG where GenLayer AI serves as the autonomous Dungeon Master, evaluating natural language player strategies.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
