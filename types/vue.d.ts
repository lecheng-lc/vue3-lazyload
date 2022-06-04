
 import { VueLazyloadHandler } from "./index";

 declare module "vue/types/vue" {
   interface Vue {
     $Lazyload: VueLazyloadHandler;
   }
 }

