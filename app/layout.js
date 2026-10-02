import "./globals.css";

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),

  title: {
    default: "Electrosoft Seminar Platform",
    template: "%s | Electrosoft System",
  },

  description:
    "Electrosoft System Seminar Platform for managing college seminars, student registrations, QR-based access, presentations, notes and learning resources.",

  applicationName: "Electrosoft Seminar Platform",

  keywords: [
    "Electrosoft System",
    "seminar management",
    "college seminar",
    "student registration",
    "seminar QR code",
    "college lecture",
    "student resources",
    "seminar notes",
    "seminar presentation",
    "technical seminar",
    "college event management",
  ],

  authors: [
    {
      name: "Electrosoft System",
    },
  ],

  creator: "Electrosoft System",
  publisher: "Electrosoft System",

  category: "Education",

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Electrosoft Seminar Platform",

    title: "Electrosoft Seminar Platform",

    description:
      "Manage college seminars, student registrations, QR-based access and seminar learning resources with Electrosoft System.",

    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Electrosoft Seminar Platform",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "Electrosoft Seminar Platform",

    description:
      "College seminar registration, QR access and learning resource platform by Electrosoft System.",

    images: ["/og-image.png"],
  },

  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any",
      },
      {
        url: "/icon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],

    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  manifest: "/manifest.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",

  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#ffffff",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#020617",
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
