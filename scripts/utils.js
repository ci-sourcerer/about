export const loadJson = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
};

export const renderProjects = (container, projects, emptyMessage = "Projects will appear here once they are added.") => {
  container.innerHTML = "";

  if (projects.length === 0) {
    const emptyState = document.createElement("article");
    emptyState.className = "card";
    emptyState.innerHTML = `<h3>No projects yet</h3><p>${emptyMessage}</p>`;
    container.appendChild(emptyState);
    return;
  }

  projects.forEach((project) => {
    const card = document.createElement("article");
    card.className = "card";

    const link = document.createElement("a");
    link.className = "card-link";
    link.href = project.url;
    link.target = "_blank";
    link.rel = "noreferrer";

    if (project.status) {
      const status = document.createElement("p");
      status.className = "status-chip";
      status.textContent = project.status;
      link.appendChild(status);
    }

    const title = document.createElement("h3");
    title.textContent = project.title;

    const summary = document.createElement("p");
    summary.textContent = project.summary;

    const tags = document.createElement("ul");
    tags.className = "tag-list";
    (project.tags ?? []).forEach((tag) => {
      const tagItem = document.createElement("li");
      tagItem.className = "tag";
      tagItem.textContent = tag;
      tags.appendChild(tagItem);
    });

    link.append(title, summary, tags);
    card.append(link);
    container.appendChild(card);
  });
};
