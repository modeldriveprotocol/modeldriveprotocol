<script setup lang="ts">
import { useData } from "vitepress";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const HIDDEN_ITEM_CLASS = "mdp-sidebar-filter-hidden";
const HIDDEN_GROUP_CLASS = "mdp-sidebar-filter-hidden-group";
const FORCE_OPEN_CLASS = "mdp-sidebar-force-open";

const query = ref("");
const hasNoResults = ref(false);
const { lang, page } = useData();

const copy = computed(() =>
  lang.value === "zh-Hans"
    ? {
        label: "侧边栏搜索",
        placeholder: "筛选当前目录",
        clear: "清除筛选",
        noResults: "目录中没有匹配项"
      }
    : {
        label: "Sidebar search",
        placeholder: "Filter this section",
        clear: "Clear filter",
        noResults: "No sidebar entries matched"
      }
);

let frame = 0;

watch(query, () => {
  scheduleFilter();
});

watch(
  () => page.value.relativePath,
  () => {
    scheduleFilter();
  }
);

onMounted(() => {
  scheduleFilter();
});

onBeforeUnmount(() => {
  if (frame) {
    cancelAnimationFrame(frame);
  }

  resetSidebarFilter();
});

function scheduleFilter() {
  if (typeof window === "undefined") {
    return;
  }

  cancelAnimationFrame(frame);
  frame = window.requestAnimationFrame(() => {
    void nextTick(applyFilter);
  });
}

function applyFilter() {
  const term = query.value.trim().toLowerCase();
  const groups = getSidebarGroups();

  if (!term) {
    resetSidebarFilter();
    hasNoResults.value = false;
    return;
  }

  let matches = 0;

  groups.forEach(group => {
    const root = getGroupRoot(group);
    const matched = root ? filterItem(root, term) : false;

    group.classList.toggle(HIDDEN_GROUP_CLASS, !matched);
    if (matched) {
      matches += 1;
    }
  });

  hasNoResults.value = matches === 0;
}

function resetSidebarFilter() {
  const selectors = [
    `.${HIDDEN_ITEM_CLASS}`,
    `.${HIDDEN_GROUP_CLASS}`,
    `.${FORCE_OPEN_CLASS}`
  ].join(", ");

  document.querySelectorAll<HTMLElement>(selectors).forEach(element => {
    element.classList.remove(HIDDEN_ITEM_CLASS, HIDDEN_GROUP_CLASS, FORCE_OPEN_CLASS);
  });
}

function filterItem(item: HTMLElement, term: string): boolean {
  const label = getItemText(item);
  const childItems = getChildItems(item);
  const ownMatch = label.includes(term);
  let descendantMatch = false;

  childItems.forEach(child => {
    descendantMatch = filterItem(child, term) || descendantMatch;
  });

  const matched = ownMatch || descendantMatch;

  item.classList.toggle(HIDDEN_ITEM_CLASS, !matched);
  item.classList.toggle(FORCE_OPEN_CLASS, matched && childItems.length > 0);

  return matched;
}

function getSidebarGroups() {
  return Array.from(document.querySelectorAll<HTMLElement>("#VPSidebarNav .group"));
}

function getGroupRoot(group: HTMLElement) {
  return group.querySelector<HTMLElement>(":scope > .VPSidebarItem");
}

function getChildItems(item: HTMLElement) {
  const container = item.querySelector<HTMLElement>(":scope > .items");
  if (!container) {
    return [];
  }

  return Array.from(container.children).filter(
    child => child instanceof HTMLElement && child.classList.contains("VPSidebarItem")
  ) as HTMLElement[];
}

function getItemText(item: HTMLElement) {
  const row = item.querySelector<HTMLElement>(":scope > .item");
  const text = row?.querySelector<HTMLElement>(".text")?.textContent ?? "";
  return text.trim().toLowerCase();
}

function clearQuery() {
  query.value = "";
}
</script>

<template>
  <div class="mdp-sidebar-filter">
    <label class="visually-hidden" for="mdp-sidebar-filter-input">{{ copy.label }}</label>
    <div class="mdp-sidebar-filter__field">
      <span class="mdp-sidebar-filter__icon" aria-hidden="true"></span>
      <input
        id="mdp-sidebar-filter-input"
        v-model="query"
        class="mdp-sidebar-filter__input"
        type="search"
        :placeholder="copy.placeholder"
        autocomplete="off"
        spellcheck="false"
      />
      <button
        v-if="query"
        class="mdp-sidebar-filter__clear"
        type="button"
        :aria-label="copy.clear"
        @click="clearQuery"
      >
        x
      </button>
    </div>
    <p v-if="hasNoResults" class="mdp-sidebar-filter__empty">{{ copy.noResults }}</p>
  </div>
</template>
