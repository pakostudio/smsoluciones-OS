"use client";

import { useState } from "react";
import LoginCard from "@/components/LoginCard";
import Dashboard from "@/components/Dashboard";

type User = {
  name: string;
  username: string;
  role: string;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  if (user) {
    return <Dashboard user={user} onLogout={() => setUser(null)} />;
  }

  return (
    <main
      className="page-shell"
      style={{
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <LoginCard onLogin={setUser} />
    </main>
  );
}
