import { BackgroundLooper } from '@/components/background'
import React from 'react'

const Page = () => {

  return (

    <div className="flex flex-col items-center justify-center h-screen">
      <div className="border-2 border-[#696796] rounded-md shadow-md p-12 flex flex-col items-center gap-4 bg-gray-900">
        
      </div>
      <BackgroundLooper />
    </div>
  )
}

export default Page