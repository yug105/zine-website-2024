
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import LinkTool from '@editorjs/link';
import Embed from '@editorjs/embed';
import Image from '@editorjs/image';
import Table from '@editorjs/table';
import Marker from '@editorjs/marker';
import Code from '@editorjs/code';
import Quote from '@editorjs/quote';


const Edit = () =>{
const Editor = new EditorJS(
    {
        holder: 'editorjs',
        tools: { 
            embed:{
                //@ts-ignore
              class: Embed, 
              inlineToolbar: ['link'] 
            },  
            image:{
                //@ts-ignore
              class: Image, 
              inlineToolbar: ['link'] 
            }, 
            // link: {
            //     //@ts-ignore
            //   class: LinkTool, 
            //   inlineToolbar: ['link'] 
            // }, 
            
            // table: {
            //     //@ts-ignore
            //   class: Table, 
            //   inlineToolbar: ['link'] 
            // }, 
            
            // marker: {
            //     //@ts-ignore
            //   class: Marker, 
            //   inlineToolbar: ['link'] 
            // }, 
            
            // code:{
            //     //@ts-ignore
            //   class: Code, 
            //   inlineToolbar: ['link'] 
            // }, 
            
            // quote: {
            //     //@ts-ignore
            //   class: Quote, 
            //   inlineToolbar: ['link'] 
            // }, 
            
            header: {
                //@ts-ignore
              class: Header, 
              inlineToolbar: ['link'] 
            }, 
            // list: { 
            //   class: List, 
            //   inlineToolbar: true 
            // } 
          }, 
    }
);


return <>

<div id="editorjs"></div>
<button onClick={() => Editor.save().then(data => 

console.log(data))}>Save</button>
</> 
}
export default Edit