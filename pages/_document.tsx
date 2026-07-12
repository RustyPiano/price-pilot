import NextDocument, {
  Head,
  Html,
  Main,
  NextScript,
  type DocumentContext,
  type DocumentInitialProps,
} from 'next/document';

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

type DocumentProps = DocumentInitialProps & { pathname: string };

export default function Document({ pathname }: DocumentProps) {
  return (
    <Html lang={pathname === '/en' ? 'en-US' : 'zh-CN'} suppressHydrationWarning>
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

Document.getInitialProps = async (ctx: DocumentContext): Promise<DocumentProps> => {
  const initialProps = await NextDocument.getInitialProps(ctx);
  return { ...initialProps, pathname: ctx.pathname };
};
