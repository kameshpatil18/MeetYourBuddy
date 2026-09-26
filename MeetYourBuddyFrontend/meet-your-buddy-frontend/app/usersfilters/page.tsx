import { Suspense } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import UsersFilters from '@/components/UsersFilters'

function UsersFiltersLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050816',
        color: '#cbd5e1',
        fontSize: '15px',
        fontWeight: 600,
      }}
    >
      Loading buddies...
    </div>
  )
}

export default function Page() {
  return (
    <DashboardLayout>
      <Suspense fallback={<UsersFiltersLoading />}>
        <UsersFilters />
      </Suspense>
    </DashboardLayout>
  )
}