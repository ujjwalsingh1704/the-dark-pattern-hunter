import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-20 text-center">
      <h2 className="font-serif text-3xl font-bold text-ink mb-2">404 - Page Not Found</h2>
      <p className="text-inkfaint mb-6">The page or audit report you are looking for does not exist.</p>
      <Link
        href="/"
        className="inline-block border border-ink bg-ink px-5 py-2.5 text-sm text-paper font-medium rounded hover:bg-transparent hover:text-ink transition-colors"
      >
        Return Home
      </Link>
    </main>
  );
}
