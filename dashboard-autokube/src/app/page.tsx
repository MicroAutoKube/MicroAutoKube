import Image from "next/image";
import { BackgroundSquare } from "@/components/background"
import { Login } from "@/components/auth";

export default async function Home() {

  return (
    <div>
      <Login />
      <BackgroundSquare />
    </div>
  );
}
