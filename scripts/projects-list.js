import { loadJson, renderProjects } from "./utils.js";
import { renderNav } from "./nav.js";

const initialize = async () => {
  try {
    const projectsData = await loadJson("data/projects.json");
    renderProjects(
    document.querySelector("#projects-list-full"),
    projectsData.projects,
    "Projects will appear here once repos are added to the featured list."
  );
  } catch (error) {
    console.error(error);
    document.querySelector("main").innerHTML =
      "<section class=\"section\"><div class=\"container\"><h2>Unable to load projects</h2><p>Check that data files exist and run the generation scripts.</p></div></section>";
  }
};

renderNav();
initialize();
