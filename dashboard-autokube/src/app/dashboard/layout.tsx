import React from 'react'
import Image from "next/image";
import { FaHome, FaUser, FaCog, FaChartPie, FaSignOutAlt } from "react-icons/fa";
import { BackgroundLooper } from "@/components/background"
import { SidebarButton } from "@/components/common";

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
    children,
}: Readonly<LayoutProps>) => {
    return (
        <div className="flex w-screen h-screen">
            {/* Sidebar */}
            <div className="flex flex-col items-center w-64 bg-gray-800 bg-opacity-50 backdrop-blur-lg shadow-xl rounded-r-3xl p-6 border-r border-gray-700">
                {/* Logo */}
                <Image
                    src="/logo/logo.png"
                    width={80}
                    height={80}
                    alt="logo"
                    className="mb-8"
                />

                {/* Navigation Buttons */}
                <div className="flex flex-col space-y-4 w-full">
                    <SidebarButton icon={<FaHome />} text="Dashboard"  route="/dashboard" />
                    <SidebarButton icon={<FaChartPie />} text="Analytics" route="/analytics" />
                    <SidebarButton icon={<FaUser />} text="Profile" route="/profile" />
                    <SidebarButton icon={<FaCog />} text="Settings" route="/settings" />
                    <SidebarButton icon={<FaSignOutAlt />} text="Logout" route="/logout" />
                </div>
            </div>

            {children}
            <BackgroundLooper />
        </div>
    )
}

export default Layout