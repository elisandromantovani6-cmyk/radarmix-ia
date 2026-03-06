'use client'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
export default function LogoutButton() {
  const router = useRouter(); const supabase = createClient()
  return <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); router.refresh() }}
    className="btn-ghost px-3 py-1.5 text-[11px] font-semibold">Sair</button>
}

