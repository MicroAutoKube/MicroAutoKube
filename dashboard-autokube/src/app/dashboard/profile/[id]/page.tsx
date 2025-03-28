import { SidebarButton } from "@/components/common"
import { FaArrowLeft } from "react-icons/fa"
import Mode from "./components/Mode"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params




  return <div>

    <div className="w-fit">
      <SidebarButton icon={<FaArrowLeft />} text="Back" route="/dashboard" />
    </div>
    <Mode id={id} />

  </div>
}