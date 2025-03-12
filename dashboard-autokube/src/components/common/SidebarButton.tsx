// Sidebar Button Component
interface SidebarButtonProps {
    icon: React.ReactNode;
    text: string;
  }
  
  const SidebarButton = ({ icon, text }: SidebarButtonProps) => {
    return (
      <button className="flex items-center w-full text-left px-4 py-3 text-white rounded-lg transition-all duration-300 hover:bg-gray-700 hover:scale-105 active:scale-95">
        <span className="text-lg mr-3">{icon}</span>
        <span className="font-medium">{text}</span>
      </button>
    );
  };

  export default SidebarButton;
  