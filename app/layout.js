import './globals.css';

export const metadata = {
  title: 'Cinematic Night - Inspiration (Hindi)',
  description: 'Cinematic 2D canvas animation with Hindi narration and music'
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>{children}</body>
    </html>
  );
}
