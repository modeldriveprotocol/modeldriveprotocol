import DefaultTheme from "vitepress/theme";
import MdpPlaygroundLayout from "./components/MdpPlaygroundLayout.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("MdpPlaygroundLayout", MdpPlaygroundLayout);
  }
};
