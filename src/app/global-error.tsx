"use client";

// Siste sikkerhetsnett: brukes bare hvis selve rammen rundt alle sider feiler.
// Har egen html og body, og kan ikke bruke stilarket, så stilen ligger her.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="nb">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", color: "#101b3b", background: "#fff" }}>
        <main style={{ maxWidth: "28rem", margin: "0 auto", padding: "4rem 1.5rem" }} role="alert">
          <title>Noe gikk galt · Spott</title>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 800, margin: "0 0 1rem" }}>Spott kunne ikke vises</h1>
          <p style={{ color: "#4a5672", margin: "0 0 1.5rem", lineHeight: 1.6 }}>Noe gikk galt hos oss. Prøv igjen om litt.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ border: 0, borderRadius: "999px", background: "#101b3b", color: "#fff", padding: "0.75rem 1.25rem", fontSize: "1rem", fontWeight: 600, cursor: "pointer" }}
          >
            Prøv igjen
          </button>
        </main>
      </body>
    </html>
  );
}
