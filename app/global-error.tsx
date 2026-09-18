"use client"

/** Last-resort boundary when the root layout itself fails. Must render its own <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html lang="en">
            <body style={{ margin: 0, background: "#F7F5F0", color: "#141312", fontFamily: "Helvetica, Arial, sans-serif" }}>
                <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
                    <p style={{ letterSpacing: "0.42em", fontSize: "13px", margin: 0 }}>MITI HOME</p>
                    <h1 style={{ fontWeight: 300, fontSize: "28px", margin: "24px 0 12px" }}>We&apos;ll be right back</h1>
                    <p style={{ color: "#675d53", maxWidth: "420px", lineHeight: 1.7, fontSize: "14px" }}>
                        Something went wrong while loading the store. Please try again in a moment.
                    </p>
                    <button
                        type="button"
                        onClick={reset}
                        style={{ marginTop: "28px", background: "#141312", color: "#F7F5F0", border: 0, padding: "14px 28px", letterSpacing: "0.2em", fontSize: "11px", textTransform: "uppercase", cursor: "pointer" }}
                    >
                        Try again
                    </button>
                </main>
            </body>
        </html>
    )
}
