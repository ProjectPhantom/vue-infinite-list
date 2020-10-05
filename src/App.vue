<template>
  <div id="app">
    <!-- <div
      class="marker"
      :style="`top: calc(50% - ${itemHeight}px * ${pageSize / 2})`"
    ></div>
    <div
      class="marker"
      :style="`top: calc(50% + ${itemHeight}px * ${pageSize / 2})`"
    ></div> -->
    <InfiniteList :itemHeight="30" :pageSize="pageSize" :list="posts">
      <template slot-scope="{ item }">
        <PostComponent :post="item" />
      </template>
    </InfiniteList>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import InfiniteList from "./components/InfiniteList.vue";
import PostComponent from "./components/Post.vue";

@Component({
  components: {
    InfiniteList,
    PostComponent,
  },
})
export default class App extends Vue {
  itemHeight = 30;
  pageSize = 30;

  get posts() {
    const postArr: [string, boolean][] = [];
    for (let i = 0; i < 10_000; i++) {
      postArr.push(["Post number: " + i, Math.random() < 0.5]);
    }
    return postArr;
  }
}
</script>

<style lang="scss">
html,
body,
#app {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.marker {
  position: absolute;
  width: 100%;
  border-bottom: 1px solid grey;
}
</style>
