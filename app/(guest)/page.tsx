"use client";
import AuthForm from "@/components/features/auth/AuthForm";

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-56px)] grid grid-cols-1 md:grid-cols-2">
      <section className="hidden md:flex items-center justify-center p-8 bg-linear-to-br from-teal-600 via-teal-500 to-cyan-500 text-white">
        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight">Virtual Memory is Real.</h1>
          <p className="text-lg opacity-90">思い出を共有しよう。</p>
          <ul className="space-y-1 text-sm opacity-90">
            <li>• スマートなアルバム共有</li>
            <li>• フレンドとウォッチで発見</li>
            <li>• タイムラインで最新をチェック</li>
          </ul>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <AuthForm />
      </section>
    </div>
  );
}
