import InfiniteList from "./components/InfiniteList.vue";

const VueInfiniteListPlugin = {
  // eslint-disable-next-line
  install(Vue: any, options = {}) {
    Vue.component("vue-infinite-list", InfiniteList);
  }
}

export default VueInfiniteListPlugin

if (typeof window !== 'undefined' && window.Vue) {
  window.Vue.use(VueInfiniteListPlugin)
}