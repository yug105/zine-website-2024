import type { NextPage } from "next";
import CreateNewBlog from "../components/Members/Admin/newblog";
import Head from "next/head";
import Edit from "../components/Members/Admin/editor";
import {
  Gallery,
  Carousal

} from "../components/Gallery";
import { SecFooter } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { ChatButton } from "../components/Chat";

const GalleryImages: NextPage = () => {
  return (
    <>
      <Head>
        <title>Zine | Gallery</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <Navbar />
      <ChatButton />
      <Carousal />
      <Gallery />
      <CreateNewBlog />
      {/* <Edit /> */}
      <SecFooter />
    </>
  );
};

export default GalleryImages;
