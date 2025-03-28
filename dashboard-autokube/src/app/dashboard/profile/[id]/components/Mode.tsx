'use client'
import { useState } from "react"
import Menu from "./Menu";
const Mode = ({ id }: { id: string }) => {
  const [mode, setMode] = useState("configuration");

  return (
    <div>
      <Menu mode={mode} setMode={setMode} />
    </div>
  )
}

export default Mode