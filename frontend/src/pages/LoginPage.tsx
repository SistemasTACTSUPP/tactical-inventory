import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const LoginPage = () => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Por favor ingresa un código de acceso");
      return;
    }

    setLoading(true);
    try {
      const success = await login(code.trim());
      if (success) {
        navigate("/dashboard");
      } else {
        setError("Código de acceso incorrecto");
        setCode("");
      }
    } catch (err: any) {
      console.error("Error en login:", err);
      const errorMessage = err?.message || err?.error || "Error al conectar con el servidor. Verifica que el backend esté corriendo.";
      setError(errorMessage);
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top left, #101827, #020617 60%)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "radial-gradient(circle at top left, rgba(15, 23, 42, 0.96), #020617)",
          borderRadius: "1.1rem",
          padding: "2rem",
          border: "1px solid rgba(148, 163, 184, 0.4)",
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.9)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "999px",
              background: "radial-gradient(circle at 30% 20%, #38bdf8, #0ea5e9 40%, #0369a1)",
              boxShadow: "0 0 0 2px rgba(56, 189, 248, 0.35), 0 0 24px rgba(56, 189, 248, 0.4)",
              margin: "0 auto 1rem",
            }}
          />
          <h1
            style={{
              margin: "0 0 0.5rem",
              fontSize: "1.5rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#e5e7eb",
            }}
          >
            TACTICAL SUPPORT
          </h1>
          <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
            Gestión de Inventario
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#9ca3af",
                marginBottom: "0.5rem",
              }}
            >
              Código de acceso
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              placeholder="Ingresa tu código de acceso"
              autoFocus
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: "0.65rem",
                border: error
                  ? "1px solid rgba(239, 68, 68, 0.5)"
                  : "1px solid rgba(148, 163, 184, 0.55)",
                background: "rgba(15, 23, 42, 0.95)",
                color: "#e5e7eb",
                fontSize: "0.9rem",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#38bdf8";
                e.target.style.boxShadow = "0 0 0 1px rgba(56, 189, 248, 0.6)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = error
                  ? "rgba(239, 68, 68, 0.5)"
                  : "rgba(148, 163, 184, 0.55)";
                e.target.style.boxShadow = "none";
              }}
            />
            {error && (
              <p
                style={{
                  margin: "0.5rem 0 0",
                  color: "#fb7185",
                  fontSize: "0.8rem",
                }}
              >
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.65rem 1.1rem",
              borderRadius: "999px",
              border: "1px solid transparent",
              background: loading 
                ? "rgba(148, 163, 184, 0.3)"
                : "linear-gradient(90deg, #0ea5e9, #22c55e)",
              color: "#0b1120",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 18px 35px rgba(34, 197, 94, 0.28)",
              transition: "all 0.16s ease-out",
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-0.5px)";
                e.currentTarget.style.filter = "brightness(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.filter = "brightness(1)";
            }}
          >
            {loading ? "Conectando..." : "Iniciar sesión"}
          </button>
        </form>

        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid rgba(148, 163, 184, 0.25)",
            fontSize: "0.75rem",
            color: "#6b7280",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0 }}>
            Ingresa tu código de acceso para continuar
          </p>
        </div>
      </div>
    </div>
  );
};

