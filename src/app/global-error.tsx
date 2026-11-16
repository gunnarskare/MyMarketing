"use client";

// Siste sikkerhetsnett: brukes bare hvis selve rammen rundt alle sider feiler.
// Har egen html og body, og kan ikke bruke stilarket, så stilen ligger her.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="nb">
      <body style={{ margin: 0, fontFamily: "Arial, Helvetica, sans-serif", color: "#2b211d", background: "#fff3e3" }}>
        <main style={{ maxWidth: "28rem", margin: "0 auto", padding: "4rem 1.5rem" }} role="alert">
          <title>Noe gikk galt · Spyd</title>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "2.25rem", fontWeight: 400, margin: "0 0 1rem" }}>Spyd kunne ikke vises</h1>
          <p style={{ color: "#62514a", margin: "0 0 1.5rem", lineHeight: 1.6 }}>Noe gikk galt hos oss. Prøv igjen om litt.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ border: 0, borderRadius: "0.5rem", background: "#963f30", color: "#fff3e3", padding: "0.75rem 1.25rem", fontSize: "1rem", fontWeight: 600, cursor: "pointer" }}
          >
            Prøv igjen
          </button>
        </main>
      </body>
    </html>
  );
}
