"use client"

import { BackgroundLooper } from '@/components/background'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'

const Page = () => {
  const { data: session, status } = useSession()

  return (

    <div className="flex flex-col items-center justify-center h-screen">
      <div className="border-2 border-[#696796] rounded-md shadow-md p-12 flex flex-col items-center gap-4 bg-gray-900">
        <div className='border-2 border-dashed shadow-md p-12 flex flex-col items-center gap-4'>
          Hello world

        </div>



      </div>
      <BackgroundLooper />
    </div>
  )
}

export default Page