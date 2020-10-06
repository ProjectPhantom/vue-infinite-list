<template>
  <span class="scrollable" ref="scrollable">
    <div class="pusher" :style="scrollHeightPreserverStyle"></div>
    <div class="content" :style="contentWrapperStyle">
      <div
        class="sentinel-top"
        ref="sentinel-top"
        :style="getSentinelStyle('bottom')"
      ></div>

      <div
        class="row"
        v-for="(num, index) in pageSize * 3"
        :key="'infiniteListItem' + index"
        :style="getRowStyle(index)"
        :class="visibilitySentinel(index)"
        :data-index="index"
        :ref="'row' + index"
      >
        <slot
          :item="list[getListIndexFromOffset(index)]"
          :index="getListIndexFromOffset(index)"
        />
      </div>

      <div
        class="sentinel-bottom"
        ref="sentinel-bottom"
        :style="getSentinelStyle('bottom')"
      ></div>
    </div>
  </span>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from "vue-property-decorator";

@Component
export default class InfiniteList extends Vue {
  @Prop({ default: 0 }) itemHeight!: number;
  @Prop({ required: true }) pageSize!: number;

  @Prop({ required: true }) list!: unknown[];

  /**
   *
   *    Lifecycle
   *
   */

  mounted() {
    this.setUpSizeObserver();
    this.setUpObserver();
  }

  beforeDestroy() {
    this.destroyObserver();
    this.destroySizeObserver();
    this.clearShiftInterval();
  }

  /**
   *
   *    Intersection observer
   *
   */

  observer: IntersectionObserver | null = null;
  sizeObserver: ResizeObserver | null = null;

  shiftInterval: number | null = null;

  visibility: Record<string, boolean | undefined> = {};

  @Watch("list")
  setUpObserver() {
    const sTop = this.$refs["sentinel-top"] as HTMLElement;
    const sBottom = this.$refs["sentinel-bottom"] as HTMLElement;

    const sentinels: Element[] = [
      sTop,
      sBottom,
      ...this.$el.querySelectorAll(".vis-sentinel"),
    ];

    const scrollable = this.$refs.scrollable as HTMLElement;
    const marginSize = 200;

    this.observer = new IntersectionObserver(
      (intersecting) => {
        for (const entry of intersecting) {
          const el = entry.target;

          if (el.classList.contains("vis-sentinel")) {
            const index = el.getAttribute("data-index");
            this.$set(this.visibility, index || "", entry.isIntersecting);
          }

          const changeNeeded = this.changePage();
          if (changeNeeded) this.setShiftInterval();
        }
      },
      {
        root: scrollable,
        rootMargin: `${marginSize}px 0px ${marginSize}px 0px`,
      }
    );

    for (const s of sentinels) {
      this.observer.observe(s);
    }
  }

  destroyObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  setShiftInterval() {
    if (this.shiftInterval != null) return;

    // let lastPos = 0;

    this.shiftInterval = setInterval(() => {
      const scrollable = this.$refs.scrollable as HTMLElement | null;
      if (!scrollable) return;

      // console.log("Checking visibility");

      const anyVisible = Object.values(this.visibility).reduce(
        (a, v) => a || v,
        false
      );

      if (anyVisible) {
        this.clearShiftInterval();
      } else {
        this.changePage();
      }
    }, 100);
  }

  clearShiftInterval() {
    if (this.shiftInterval == null) return;
    clearInterval(this.shiftInterval);
    this.shiftInterval = null;
  }

  setUpSizeObserver() {
    this.sizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        const index = el.getAttribute("data-index");

        this.updateRenderedOffset(
          parseInt(index || "0"),
          entry.contentRect.height
        );
      }
    });

    const rows = this.$el.querySelectorAll(".row") as NodeListOf<HTMLElement>;
    for (const row of rows) {
      this.sizeObserver.observe(row);

      const rowIndex = parseInt(row.getAttribute("data-index") || "0");
      this.updateRenderedOffset(rowIndex, row.offsetHeight);
    }
  }

  destroySizeObserver() {
    if (this.sizeObserver) {
      this.sizeObserver.disconnect();
      this.sizeObserver = null;
    }
  }

  /**
   *
   *    Pagination
   *
   */

  pageIndex = 1;
  pageOffsets = [0, 1, 2];
  renderedPageOffsets: number[] = [0];
  itemHeights: number[] = [];

  getRowStyle(rowIndex: number) {
    const listItemIndex = this.getListIndexFromOffset(rowIndex);

    if (this.itemHeight) {
      return `
        position: absolute;
        transform: translateY(${listItemIndex * this.itemHeight}px); 
        height: ${this.itemHeight}px;
      `;
    }

    return ``;
  }

  get scrollHeightPreserverStyle() {
    if (this.itemHeight) return "";
    return `padding-top: ${
      this.renderedPageOffsets[this.renderedPageOffsets.length - 1]
    }px;`;
  }

  get contentWrapperStyle() {
    if (this.itemHeight) {
      return `height: ${this.list.length * this.itemHeight}px;`;
    }

    const lowestOffset = this.pageIndex ? this.pageIndex - 1 : 0;
    return `
      position: absolute;
      transform: translateY(${this.renderedPageOffsets[lowestOffset] || 0}px);
    `;
  }

  getPageOffset(high: boolean) {
    const po = this.pageOffsets;
    let changeIndex = 0;

    for (let i = 0; i < po.length; i++) {
      if (high && po[i] > po[changeIndex]) {
        changeIndex = i;
      } else if (!high && po[i] < po[changeIndex]) {
        changeIndex = i;
      }
    }

    return changeIndex;
  }

  getListIndexFromOffset(rowIndex: number) {
    const pageNum = Math.floor(rowIndex / this.pageSize);
    const intraPageOffset = rowIndex % this.pageSize;
    const pageOffset = this.pageOffsets[pageNum];

    return pageOffset * this.pageSize + intraPageOffset;
  }

  getPageIndexFromCurrentScrolledPos() {
    const scrollable = this.$refs.scrollable as HTMLElement | null;
    if (!scrollable) return 0;

    const scrolledPos = scrollable.scrollTop;

    if (this.itemHeight) {
      const viewedIndex = Math.floor(scrolledPos / this.itemHeight);
      return Math.round(viewedIndex / this.pageSize);
    }

    const rpo = this.renderedPageOffsets;
    for (let i = 0; i < rpo.length; i++) {
      if (rpo[i] <= scrolledPos && (rpo[i + 1] || Infinity) > scrolledPos) {
        // console.log("Checking offset", i, rpo[i], scrolledPos);
        return i;
      }
    }

    return rpo.length - 1;
  }

  visibilitySentinel(index: number) {
    if (index % Math.floor(this.pageSize / 2) == 0) return "vis-sentinel";
    return "";
  }

  getSentinelStyle(bt: "bottom" | "top") {
    if (!this.itemHeight) {
      return "";
    }

    if (bt == "top") {
      let viewStart = (this.pageIndex - 1) * this.pageSize;
      viewStart = viewStart > 0 ? viewStart : 0;

      return `
        position: absolute;
        transform: translateY(${viewStart * this.itemHeight}px)
      `;
    }

    let viewEnd = (this.pageIndex + 1) * this.pageSize + this.pageSize;
    if (viewEnd > this.list.length) viewEnd = this.list.length;
    return `
      position: absolute;
      transform: translateY(${viewEnd * this.itemHeight}px)
    `;
  }

  scrollTo(index: number, options?: { middle?: boolean }) {
    const scrollable = this.$refs.scrollable as HTMLElement | null;
    if (!scrollable) return;

    // if (this.isVisible(index)) {
    //   this.scrollVisible(index);
    //   return;
    // }

    let px = index * this.itemHeight;

    if (options && options.middle) {
      px = px - scrollable.clientHeight / 2;
      if (px < 0) px = 0;
    }

    scrollable.scrollTo(0, px);
    // this.changePage();
  }

  changePage() {
    let newPageIndex = this.getPageIndexFromCurrentScrolledPos();
    newPageIndex = newPageIndex ? newPageIndex : 1;
    if (newPageIndex == this.pageIndex) return false;

    // Just set all the rows to something that works
    if (
      !this.itemHeight ||
      newPageIndex > this.pageIndex + 1 ||
      newPageIndex < this.pageIndex - 1
    ) {
      this.pageOffsets[0] = newPageIndex - 1;
      this.pageOffsets[1] = newPageIndex;
      this.pageOffsets[2] = newPageIndex + 1;
    }

    // Move top page to bottom
    else if (newPageIndex == this.pageIndex + 1) {
      const offsetIndex = this.getPageOffset(false);
      this.pageOffsets[offsetIndex] = newPageIndex + 1;
    }

    // Move bottom page to top
    else {
      const offsetIndex = this.getPageOffset(true);
      this.pageOffsets[offsetIndex] = newPageIndex - 1;
    }

    this.pageIndex = newPageIndex;
    this.updateCurrentRenderedOffsets();
    return true;
  }

  updateCurrentRenderedOffsets() {
    if (this.itemHeight) return;

    const rows = this.$el.querySelectorAll(".row") as NodeListOf<HTMLElement>;
    for (const row of rows) {
      const rowIndex = parseInt(row.getAttribute("data-index") || "0");
      this.updateRenderedOffset(rowIndex, row.offsetHeight);
    }
  }

  updateRenderedOffset(rowIndex: number, height: number) {
    if (this.itemHeight) return;

    const listIndex = this.getListIndexFromOffset(rowIndex);
    const heightDiff = height - (this.itemHeights[listIndex] || 0);
    if (heightDiff == 0) return;

    this.itemHeights[listIndex] = height;

    const pageIndex = Math.floor(listIndex / this.pageSize);
    const rpo = this.renderedPageOffsets;

    let last = 0;
    for (
      let i = pageIndex + 1;
      i <= Math.max(rpo.length - 1, this.pageIndex + 1);
      i++
    ) {
      // console.log("Updating offset for page", i);

      let startIndex = 0;
      if (last) startIndex = (i - 1) * this.pageSize;

      const slice = this.itemHeights.slice(startIndex, i * this.pageSize);

      const offset = last + slice.reduce((a, v) => a + v, 0);
      last = offset;

      this.$set(rpo, i, offset);
    }

    // let row = this.$refs["row" + rowIndex] as HTMLElement | HTMLElement[];
    // if (Array.isArray(row)) row = row[0];
    // if (!row) return;

    // const listIndex = this.getListIndexFromOffset(rowIndex);

    // this.itemHeights[listIndex] = row.offsetHeight;

    // if (listIndex == 0 || this.renderedOffsets[listIndex]) return;

    // const lastHeight = this.renderedOffsets[listIndex - 1] || 0;

    // if (lastHeight + row.offsetHeight != this.renderedOffsets[listIndex])
    //   this.$set(this.renderedOffsets, listIndex, lastHeight + row.offsetHeight);
  }
}
</script>

<style lang="scss" scoped>
.scrollable {
  display: flex;
  flex-flow: column;
  position: relative;

  flex-grow: 1;
  min-height: 0;
  height: 100%;

  overflow-y: scroll;

  .content {
    flex-shrink: 0;
    width: 100%;
  }

  .sentinel-top,
  .sentinel-bottom {
    top: 0;
  }

  .row {
    // position: absolute;
    top: 0;
    left: 0;

    display: flex;
    width: 100%;
  }
}
</style>
