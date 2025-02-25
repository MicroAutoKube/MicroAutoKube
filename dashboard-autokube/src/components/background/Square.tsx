import React from 'react'
import Image from "next/image";

const BackgroundSquare = () => {
    return (
        <div>
            <Image src="/bg/square.svg" alt="Square" width={1000} height={500} className="absolute top-5 left-5 -z-10" />
            <Image src="/bg/bg-blue.svg" alt="bg-blue" width={2000} height={1000} className="absolute top-0 left-0 rotate-180 -z-10" />
            <Image src="/bg/square.svg" alt="Square" width={1000} height={500} className="absolute bottom-5 right-5 -z-10" />
            <Image src="/bg/bg-blue.svg" alt="bg-blue" width={2000} height={1000} className="absolute bottom-0 right-0 -z-10" />
        </div>
    )
}

export default BackgroundSquare