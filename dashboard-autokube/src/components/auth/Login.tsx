"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("⚠️ Please fill in all fields!");
      return;
    }

    const loadingToast = toast.loading("🔄 Processing...");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.update(loadingToast, {
          render: "❌ Invalid email or password!",
          type: "error",
          isLoading: false,
          autoClose: 3000,
          closeOnClick: true,
        });
      } else {
        toast.update(loadingToast, {
          render: "✅ Login successful! 🚀 Redirecting...",
          type: "success",
          isLoading: false,
          autoClose: 2000,
          closeOnClick: true,
        });

        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      }
    } catch (error) {
      toast.update(loadingToast, {
        render: "❗ Something went wrong! Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
        closeOnClick: true,
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="border-2 border-[#696796] rounded-md shadow-md p-12 flex flex-col items-center gap-4 bg-gray-900">
        <Image src="/logo/logo-text.svg" alt="logo" width={300} height={80} />
        <h1 className="text-3xl font-semibold text-white">Login</h1>

        <form className="flex flex-col gap-4 w-96" onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-4">
            <label htmlFor="email" className="text-white">Email</label>
            <div className="relative">
              <input
                type="email"
                id="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[#0A51A5] text-white placeholder:text-gray-300 pl-10 py-2 w-full rounded-md"
                style={{
                  backgroundImage: 'url("/icons/user.svg")',
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "20px",
                  backgroundPosition: "10px center",
                }}
              />
            </div>

            <label htmlFor="password" className="text-white">Password</label>
            <div className="relative">
              <input
                type="password"
                id="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[#0A51A5] text-white placeholder:text-gray-300 pl-10 py-2 w-full rounded-md"
                style={{
                  backgroundImage: 'url("/icons/lock.svg")',
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
  );
};

export default Login;
