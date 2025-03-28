import React from 'react'
import Image from "next/image";
import { FaHome, FaUser, FaCog, FaChartPie, FaSignOutAlt } from "react-icons/fa";
import { BackgroundLooper } from "@/components/background"
import { SidebarButton } from "@/components/common";
import { ToastContainer } from 'react-toastify';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
    children,
}: Readonly<LayoutProps>) => {
    return (
        <div className="w-screen h-screen gap-20">
            {/* Sidebar */}
            <div className="flex items-center bg-gray-800 bg-opacity-50 backdrop-blur-lg shadow-xl rounded-3xl p-3 mt-3 mx-3 border border-blue-800 ">
                {/* Logo */}
                <Image
                    src="/logo/logo.png"
                    width={80}
                    height={80}
                    alt="logo"
                    className=""
                />

                {/* Navigation Buttons */}
                {/* <div className="flex space-y-4 w-full">
                    <SidebarButton icon={<FaHome />} text="Dashboard" route="/dashboard" />
                    <SidebarButton icon={<FaChartPie />} text="Analytics" route="/analytics" />
                    <SidebarButton icon={<FaUser />} text="Profile" route="/profile" />
                    <SidebarButton icon={<FaCog />} text="Settings" route="/settings" />
                    <SidebarButton icon={<FaSignOutAlt />} text="Logout" route="/logout" />
                </div> */}
            </div>

            <div className=" flex min-h-[80vh] my-10 bg-gray-800 bg-opacity-50 backdrop-blur-lg shadow-xl rounded-3xl p-6 mx-3 border border-blue-800">
                {children}
            </div>
   

            <BackgroundLooper />
        </div>
    )
}

export default Layout