import React from 'react';

const Menu = ({
  mode,
  setMode,
}: {
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const getButtonClass = (targetMode: string) => {
    return `px-4 py-2 rounded text-xl font-bold transition ${
      mode === targetMode
        ? 'text-[#58F5FF]'
        : 'text-white '
    }`;
  };

  return (
    <div className="flex flex-col items-start border rounded-xl px-2 min-w-[200px] h-fit mt-5">
      <button onClick={() => setMode('configuration')} className={getButtonClass('configuration')}>
        {mode === 'configuration' && "●"} Configuration
      </button>
      <button onClick={() => setMode('application')} className={getButtonClass('application')}>
        {mode === 'application' && "●"} Application
      </button>
      <button onClick={() => setMode('logs')} className={getButtonClass('logs')}>
        {mode === 'logs' && "●"} Logs
      </button>
    </div>
  );
};

export default Menu;
