import "./globals.css";

export const metadata = {
  title: "Dark Pattern Hunter",
  description: "An agent that walks real signup and cancellation flows and catches manipulative UX with evidence."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
