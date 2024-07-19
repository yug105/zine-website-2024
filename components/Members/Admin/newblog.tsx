import dynamic from "next/dynamic";
import React, { useState } from "react";

const Editor = dynamic(() => import("./BlogEditor"), { ssr: false });

const CreateNewBlog = () => {
  const [content, setContent] = useState(null);

  return (
    <div>
      <h1>Create a New Blog Post</h1>
      <Editor
        data={content}
        onChange={(e) => setContent(e)}
        holder="editor_create"
      />
      <button
        onClick={() => {
          console.log(content);
        }}
      >
        Submit
      </button>
    </div>
  );
};

export default CreateNewBlog;
