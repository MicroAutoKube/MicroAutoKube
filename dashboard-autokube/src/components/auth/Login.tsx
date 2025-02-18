import React from 'react'
import Image from 'next/image'

const Login = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className='border-2 border-[#696796] rounded-md shadow-md p-32 flex flex-col items-center gap-4 bg-gray-900'>
                <Image src="/logo-text.svg" alt="logo" width={500} height={100} />
                <h1 className="text-3xl font-semibold">Login</h1>
                <form className='flex flex-col gap-4'>
                    <div className="flex flex-col space-y-4 w-96">
                        <label htmlFor="email">Email</label>
                        <div className="relative">
                            <input
                                type="text"
                                id="email"
                                placeholder="Email"
                                required
                                className="bg-[#0A51A5] placeholder:text-white pl-10 py-2 w-full rounded-md"
                                style={{
                                    backgroundImage: 'url("/user.svg")',
                                    backgroundRepeat: "no-repeat",
                                    backgroundSize: "20px",
                                    backgroundPosition: "10px center",
                                }}
                            />
                        </div>

                        <label htmlFor="password">Password</label>
                        <div className="relative">
                            <input
                                type="password"
                                id="password"
                                placeholder="Password"
                                required
                                className="bg-[#0A51A5] placeholder:text-white pl-10 py-2 w-full rounded-md"
                                style={{
                                    backgroundImage: 'url("/lock.svg")',
                                    backgroundRepeat: "no-repeat",
                                    backgroundSize: "20px",
                                    backgroundPosition: "10px center",
                                }}
                            />
                        </div>

                        <button type="submit" className="bg-[#0A51A5] text-white p-2 rounded-md">
                            Submit
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}

export default Login