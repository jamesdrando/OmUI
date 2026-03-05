import type { Child } from "hono/jsx";

interface HtmlDocumentProps {
  title: string;
  children: Child;
  scripts?: string[] | undefined;
}

export function HtmlDocument(props: HtmlDocumentProps) {
  const { title, children, scripts = [] } = props;

  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="stylesheet" href="/css/theme.css" />
        <link rel="stylesheet" href="/css/dashboard-shell.css" />
        <link rel="stylesheet" href="/css/vtg-styles.css" />
        <link rel="stylesheet" href="/css/theme-light.css" />
      </head>
      <body>{children}{scripts.map((src) => <script src={src} defer></script>)}</body>
    </html>
  );
}
