export const renderNav = () => {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const isHome = page === "index.html" || page === "";
  const prefix = isHome ? "" : "index.html";

  const nav = document.createElement("nav");
  nav.className = "nav container";
  nav.setAttribute("aria-label", "Primary");

  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = isHome ? "#top" : "index.html";
  brand.textContent = "ci-sourcerer";

  const ul = document.createElement("ul");
  ul.className = "nav-links";

  const links = [
    { label: "About", href: `${prefix}#about` },
    { label: "Skills", href: `${prefix}#skills` },
    { label: "Projects", href: "projects.html", page: "projects.html" },
    { label: "Blog", href: "blog.html", page: "blog.html" },
    { label: "Contact", href: `${prefix}#contact` },
  ];

  for (const link of links) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.label;
    if (link.page === page) {
      a.setAttribute("aria-current", "page");
    }
    li.appendChild(a);
    ul.appendChild(li);
  }

  nav.append(brand, ul);
  document.getElementById("nav-mount").appendChild(nav);
};
