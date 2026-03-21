import DefaultTheme from "vitepress/theme";
import { inBrowser, useData } from "vitepress";
import { h, onMounted, onUnmounted, watch } from "vue";
import MdpPlaygroundLayout from "./components/MdpPlaygroundLayout.vue";
import MermaidDiagram from "./components/MermaidDiagram.vue";
import SidebarDirectorySearch from "./components/SidebarDirectorySearch.vue";
import "./custom.css";

function setPagedHomeClass(enabled: boolean) {
  if (!inBrowser) {
    return;
  }

  document.documentElement.classList.toggle("mdp-home-paged", enabled);
  document.body.classList.toggle("mdp-home-paged", enabled);
}

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "sidebar-nav-before": () => h(SidebarDirectorySearch)
    });
  },
  enhanceApp({ app }) {
    app.component("MdpPlaygroundLayout", MdpPlaygroundLayout);
    app.component("MermaidDiagram", MermaidDiagram);
  },
  setup() {
    if (!inBrowser) {
      return;
    }

    const { frontmatter } = useData();
    let stop: (() => void) | undefined;

    onMounted(() => {
      stop = watch(
        () => frontmatter.value.layout,
        layout => {
          setPagedHomeClass(layout === "home");
        },
        { immediate: true }
      );
    });

    onUnmounted(() => {
      stop?.();
      setPagedHomeClass(false);
    });
  }
};
