<template>
  <div class="post">
    {{ post[0] }}
    <img src="/cat.jpg" v-if="post[1]" />
  </div>
</template>

<script lang='ts'>
import { Vue, Component, Prop } from "vue-property-decorator";

@Component
export default class PostComponent extends Vue {
  @Prop() post!: [string, boolean];
}
</script>

<style lang="scss" scoped>
.post {
  padding: 1em;
  width: 100%;
  border-top: 1px solid #ccc;
  border-bottom: 1px solid #ccc;

  display: flex;

  img {
    max-height: 100px;
  }
}
</style>