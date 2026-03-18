import { Head, Html, Main, NextScript } from 'next/document';

const themeInitScript = `
(function () {
  try {
    var storedTheme = window.localStorage.getItem('theme');
    var resolvedTheme = storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  } catch (error) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function Document() {
  return (
    <Html lang="zh-CN" suppressHydrationWarning>
      <Head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
