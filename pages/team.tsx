import type { NextPage } from "next";
import Head from "next/head";
import {
  Team,

} from "../components/Team";
import { Footer, SecFooter } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { ChatButton } from "../components/Chat";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Zine | Team</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <Navbar />
      <ChatButton />
      <Team />
      <SecFooter />
    </>
  );
};

export default Home;