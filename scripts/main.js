import { loadJson, renderProjects } from "./utils.js";
import { renderNav } from "./nav.js";

const renderParagraphs = (container, paragraphs) => {
  container.innerHTML = "";

  if (paragraphs.length === 0) {
    const placeholder = document.createElement("p");
    placeholder.className = "muted";
    placeholder.textContent = "More details coming soon.";
    container.appendChild(placeholder);
    return;
  }

  paragraphs.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    container.appendChild(p);
  });
};

const renderSkills = (container, skills) => {
  container.innerHTML = "";
  skills.forEach((skillGroup) => {
    const card = document.createElement("article");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = skillGroup.category;

    const list = document.createElement("ul");
    skillGroup.items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });

    card.append(title, list);
    container.appendChild(card);
  });
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
      tagItem.className = "tag";
      tagItem.textContent = tag;
      tags.appendChild(tagItem);
    });

    link.append(title, meta, summary, tags);
    card.append(link);
    container.appendChild(card);
  });
};

const renderContact = (container, links) => {
  container.innerHTML = "";

  links.forEach((linkItem) => {
    const li = document.createElement("li");
    const anchor = document.createElement("a");
    anchor.href = linkItem.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.textContent = linkItem.label;
    li.appendChild(anchor);
    container.appendChild(li);
  });
};

const initialize = async () => {
  try {
    const [profile, blogIndex, projectsData] = await Promise.all([
      loadJson("data/profile.json"),
      loadJson("data/blog-index.json"),
      loadJson("data/projects.json")
    ]);

    document.querySelector("#name").textContent = profile.name;
    document.querySelector("#tagline").textContent = profile.tagline;
    document.querySelector("#resume-link").href = profile.resumeUrl;
    document.querySelector("#contact-intro").textContent = profile.contactIntro;

    renderParagraphs(document.querySelector("#about-content"), profile.about);
    renderSkills(document.querySelector("#skills-list"), profile.skills);
    renderProjects(document.querySelector("#projects-list"), projectsData.projects.slice(0, 3));
    renderBlog(document.querySelector("#blog-list"), blogIndex.posts.slice(0, 3));
    renderContact(document.querySelector("#contact-links"), profile.contactLinks);
  } catch (error) {
    console.error(error);
    document.querySelector("main").innerHTML =
      "<section class=\"section\"><div class=\"container\"><h2>Unable to load content</h2><p>Check that data files exist and run the generation scripts.</p></div></section>";
  }
};

renderNav();
initialize();
