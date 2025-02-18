"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'

const Page = () => {
  const { data: session, status } = useSession()

  return (
    <div>{status === 'authenticated' ? 'Welcome!' : 'Page'}</div>
  )
}

export default Page