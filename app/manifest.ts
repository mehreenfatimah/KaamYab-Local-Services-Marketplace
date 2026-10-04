import type { MetadataRoute } from "next";
export default function manifest():MetadataRoute.Manifest{return {name:"KaamYab",short_name:"KaamYab",description:"Local work, made simple.",start_url:"/",display:"standalone",background_color:"#F5F4EF",theme_color:"#0D5B45",icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml"}]}}
