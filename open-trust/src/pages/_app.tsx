import type { AppProps } from "next/app";
import Head from "next/head";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>3GGE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="3GGE — live on-chain fraud interception and verification." />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
