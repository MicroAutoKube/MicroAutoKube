import React from 'react'
import Image from "next/image";

const BackgroundSquare = () => {
    return (
        <div>
            <Image src="/square.svg" alt="Square" width={500} height={500} className="absolute top-5 left-5" />
            <Image src="/bg-blue.svg" alt="bg-blue" width={1000} height={1000} className="absolute top-0 left-0 rotate-180" />
            <Image src="/square.svg" alt="Square" width={500} height={500} className="absolute bottom-5 right-5" />
            <Image src="/bg-blue.svg" alt="bg-blue" width={1000} height={1000} className="absolute bottom-0 right-0" />
        </div>
    )
}

export default BackgroundSquare