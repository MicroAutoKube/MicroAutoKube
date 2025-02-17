import Image from "next/image";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const data = await prisma.user.findMany();
  return (
    <div>
      {data.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
