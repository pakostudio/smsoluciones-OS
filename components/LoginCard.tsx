"use client";

import { useState } from "react";
import { demoUsers } from "@/lib/mockData";

type Props = {
  onLogin: (user: { name: string; username: string; role: string }) => void;
};

export default function LoginCard({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const user = demoUsers.find(
      (item) => item.username.toLowerCase() === username.toLowerCase() && item.pin === pin
    );

    if (!user) {
      setError("Usuario o PIN incorrecto.");
      return;
    }

    setError("");
    onLogin({ name: user.name, username: user.username, role: user.role });
  }

  return (
    <div className="card" style={{ width: "100%", maxWidth: 440, padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 700, letterSpacing: 1 }}>
          SM SOLUCIONES
        </div>
        <h1 style={{ margin: "8px 0 6px", fontSize: 38, lineHeight: 1 }}>SM OS</h1>
        <p style={{ margin: 0, color: "#6b7280" }}>
          Sistema Operativo de Gestión Interna
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <label style={{ fontSize: 13, fontWeight: 700 }}>Usuario</label>
        <input
          className="input"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="pako"
          style={{ marginTop: 8, marginBottom: 16 }}
        />

        <label style={{ fontSize: 13, fontWeight: 700 }}>PIN</label>
        <input
          className="input"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="1234"
          type="password"
          inputMode="numeric"
          style={{ marginTop: 8, marginBottom: 16 }}
        />

        {error && (
          <div style={{ color: "#c62828", fontSize: 13, marginBottom: 14, fontWeight: 700 }}>
            {error}
          </div>
        )}

        <button className="btn" style={{ width: "100%" }} type="submit">
          Entrar
        </button>
      </form>
    </div>
  );
}
