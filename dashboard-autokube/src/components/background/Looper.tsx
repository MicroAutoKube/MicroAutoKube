import React from 'react'
import Image from "next/image";

const BackgroundLooper = () => {
    return (
        <div>
            <Image src="/bg/bg-blue.svg" alt="bg-blue" width={2000} height={1000} className="absolute top-0 left-0 rotate-180 -z-10" />
            <Image src="/bg/bg-blue.svg" alt="bg-blue" width={2000} height={1000} className="absolute bottom-0 right-0 -z-10" />
            <Image
                src="/bg/bg-looper.svg"
                alt="bg-looper"
                width={2000}
                height={1000}
                className="absolute bottom-0 left-0 w-full h-auto -z-10"
            />
        </div>
    )
}

export default BackgroundLooper