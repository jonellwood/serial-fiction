<script lang="ts">
  let {
    title,
    author = 'Alex Morgan',
    variant = 0,
    image = '',
  }: {
    title: string;
    author?: string;
    variant?: number;
    image?: string;
  } = $props();
</script>

<div
  class="book-cover cover-{variant % 3}"
  style={image ? `background-image:url("${encodeURI(image)}")` : ''}
>
  <div class="cover-top">A BETWEEN LINES ORIGINAL</div>
  <div class="cover-art"><span></span><span></span><span></span></div>
  <div class="cover-title">{title}</div>
  <div class="cover-author">{author}</div>
</div>
