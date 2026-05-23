const loadJson = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
};

let activeBlogTag = null;

const updateBlogFilter = (container, posts, strip) => {
  const cards = container.querySelectorAll("article.card");
  cards.forEach((card, i) => {
    const matches = !activeBlogTag || posts[i].tags.includes(activeBlogTag);
    card.hidden = !matches;
  });

  container.querySelectorAll(".tag--clickable").forEach((tagEl) => {
    tagEl.classList.toggle("tag--active", tagEl.dataset.tag === activeBlogTag);
  });

  if (activeBlogTag) {
    strip.hidden = false;
    strip.querySelector(".blog-filter-label").textContent = activeBlogTag;
  } else {
    strip.hidden = true;
  }
};

const renderBlog = (container, posts) => {
  container.innerHTML = "";

  if (posts.length === 0) {
    const emptyState = document.createElement("article");
    emptyState.className = "card";
    emptyState.innerHTML = "<h3>No published posts yet</h3><p>New posts will appear here after running the blog generation script.</p>";
    container.appendChild(emptyState);
    return;
  }

  const strip = document.createElement("div");
  strip.className = "blog-filter-strip";
  strip.hidden = true;
  strip.innerHTML = `<span>Showing: <strong class="blog-filter-label"></strong></span><button class="blog-filter-clear">Clear filter</button>`;
  strip.querySelector(".blog-filter-clear").addEventListener("click", () => {
    activeBlogTag = null;
    updateBlogFilter(container, posts, strip);
  });
  container.before(strip);

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "card";

    const link = document.createElement("a");
    link.className = "card-link";
    link.href = post.postUrl;
    link.target = "_blank";
    link.rel = "noreferrer";

    const title = document.createElement("h3");
    title.textContent = post.title;

    const meta = document.createElement("div");
    meta.className = "meta-row";
    meta.innerHTML = `<span>${post.date}</span>`;

    const summary = document.createElement("p");
    summary.textContent = post.summary;

    const tags = document.createElement("ul");
    tags.className = "tag-list";
    post.tags.forEach((tag) => {
      const tagItem = document.createElement("li");
      tagItem.className = "tag tag--clickable";
      tagItem.dataset.tag = tag;
      tagItem.textContent = tag;
      tagItem.addEventListener("click", (e) => {
        e.preventDefault();
        activeBlogTag = activeBlogTag === tag ? null : tag;
        updateBlogFilter(container, posts, strip);
      });
      tags.appendChild(tagItem);
    });

    link.append(title, meta, summary, tags);
    card.append(link);
    container.appendChild(card);
  });
};

const initialize = async () => {
  try {
    const blogIndex = await loadJson("data/blog-index.json");
    renderBlog(document.querySelector("#blog-list-full"), blogIndex.posts);
  } catch (error) {
    console.error(error);
    document.querySelector("main").innerHTML =
      "<section class=\"section\"><div class=\"container\"><h2>Unable to load posts</h2><p>Check that data files exist and run the generation scripts.</p></div></section>";
  }
};

initialize();
