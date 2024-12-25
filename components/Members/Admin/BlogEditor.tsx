import React, { useEffect, useRef } from "react";
import EditorJS from "@editorjs/editorjs";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Embed from "@editorjs/embed";
import Image from "@editorjs/image";
import Header from "@editorjs/header";

// Firebase storage reference
const storage = getStorage();
const storageref = ref(storage, 'blogimages');

// Define the tool configuration with explicit types
const EDITOR_TOOLS = {
  embed: {
    class: Embed as any,  // Using `as any` to bypass type issues temporarily
    config: {
      services: {
        youtube: true,
        coub: true,
      },
    },
  },
  image: {
    class: Image,
    config: {
      uploader: {
        uploadByFile: (file: File) => {
          return new Promise((resolve, reject) => {
            const storageRef = ref(storageref, file.name);
            uploadBytes(storageRef, file)
              .then((snapshot) => {
                getDownloadURL(snapshot.ref).then((url) => {
                  resolve({ success: 1, file: { url: url } });
                  console.log(url);
                }).catch(reject);
              })
              .catch(reject);
          });
        },
      },
    },
  },
  header: {
    class: Header,
    shortcut: "CMD+H",
    inlineToolbar: true,
    config: {
      placeholder: "Enter a Header",
      levels: [2, 3, 4],
      defaultLevel: 2,
    },
  },
};

interface EditorProps {
  data: any;
  onChange: (newData: any) => void;
  holder: string;
}

function Editor({ data, onChange, holder }: EditorProps) {
  const ref = useRef<EditorJS | null>(null);

  useEffect(() => {
    if (!ref.current) {
      const editor = new EditorJS({
        holder: holder,
        placeholder: "Start writing here...",
        //@ts-ignore
        tools: EDITOR_TOOLS,
        data,
        async onChange(api, event) {
          const content = await api.saver.save();
          onChange(content);
        },
      });
      ref.current = editor;
    }

    return () => {
      if (ref.current && ref.current.destroy) {
        ref.current.destroy();
      }
    };
  }, [holder, data, onChange]);

  return (
    <div
      id={holder}
      className="width-full border border-2 m-2 p-2 h-1/6 rounded-md bg-gray-100"
    />
  );
}

export default Editor;
