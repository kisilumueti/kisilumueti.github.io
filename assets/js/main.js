(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const root = document.documentElement;
  const savedTheme = localStorage.getItem("jb-theme");
  if (savedTheme) root.dataset.theme = savedTheme;

  const themeButton = $("#theme-toggle");
  const setTheme = theme => {
    root.dataset.theme = theme;
    localStorage.setItem("jb-theme", theme);
    if (themeButton) themeButton.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
    if (themeButton) themeButton.textContent = theme === "light" ? "☾" : "☼";
  };
  setTheme(root.dataset.theme || "dark");
  themeButton?.addEventListener("click", () => setTheme(root.dataset.theme === "light" ? "dark" : "light"));

  const menuButton = $("#menu-toggle");
  const nav = $("#primary-nav");
  menuButton?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.textContent = open ? "×" : "☰";
  });
  $$("#primary-nav a").forEach(link => {
    if (new URL(link.href, location.href).pathname === location.pathname) link.classList.add("active");
    link.addEventListener("click", () => nav.classList.remove("open"));
  });

  const revealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      }), { threshold: 0.12 })
    : null;
  $$(".reveal").forEach(el => revealObserver ? revealObserver.observe(el) : el.classList.add("visible"));

  const backTop = $(".back-top");
  const onScroll = () => backTop?.classList.toggle("show", window.scrollY > 500);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  backTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  const typed = $("[data-rotate-words]");
  if (typed) {
    const words = typed.dataset.rotateWords.split("|").filter(Boolean);
    let index = 0, char = 0, deleting = false;
    const tick = () => {
      const word = words[index] || "";
      typed.textContent = word.slice(0, char);
      if (!deleting && char < word.length) char++;
      else if (!deleting) { deleting = true; setTimeout(tick, 1150); return; }
      else if (char > 0) char--;
      else { deleting = false; index = (index + 1) % words.length; }
      setTimeout(tick, deleting ? 42 : 78);
    };
    tick();
  }

  const projectsRoot = $("#github-projects");
  if (projectsRoot) initProjects(projectsRoot);

  function initProjects(container) {
    const search = $("#project-search");
    const language = $("#project-language");
    const sort = $("#project-sort");
    const pagination = $("#project-pagination");
    const count = $("#project-count");
    const status = $("#project-status");
    const perPage = 6;
    let allRepos = [], page = 1, loading = false;
    const escapeText = value => String(value ?? "");
    const make = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const card = repo => {
      const article = make("article", "card project-card reveal");
      const eyebrow = make("div", "eyebrow", repo.language || "SOFTWARE PROJECT");
      const title = make("h3", "", repo.name.replace(/[-_]/g, " "));
      const description = make("p", "", repo.description || "Repository and source code.");
      const tags = make("div", "tag-list");
      [repo.language, repo.fork ? "Fork" : "Original", repo.archived ? "Archived" : "Maintained"].filter(Boolean).forEach(t => tags.append(make("span", "tag", t)));
      const bottom = make("div", "project-bottom");
      const meta = make("span", "meta muted", "★ " + repo.stargazers_count + "  · ⑂ " + repo.forks_count);
      const link = make("a", "", "Explore repository ↗");
      link.href = repo.html_url; link.target = "_blank"; link.rel = "noopener noreferrer";
      bottom.append(meta, link); article.append(eyebrow, title, description, tags, bottom);
      return article;
    };
    const filtered = () => {
      const q = (search?.value || "").trim().toLowerCase();
      const lang = language?.value || "all";
      let list = allRepos.filter(repo => {
        const text = [repo.name, repo.description, repo.language, ...(repo.topics || [])].join(" ").toLowerCase();
        return (!q || text.includes(q)) && (lang === "all" || repo.language === lang);
      });
      const mode = sort?.value || "updated";
      list.sort((a,b) => mode === "stars" ? b.stargazers_count-a.stargazers_count : mode === "name" ? a.name.localeCompare(b.name) : new Date(b.pushed_at)-new Date(a.pushed_at));
      return list;
    };
    const render = () => {
      const list = filtered(), pages = Math.max(1, Math.ceil(list.length / perPage));
      page = Math.min(page, pages);
      container.replaceChildren();
      if (!list.length) {
        const empty = make("div", "empty-state", "No repositories match those filters. Try another keyword or language.");
        container.append(empty);
      } else list.slice((page-1)*perPage, page*perPage).forEach(repo => container.append(card(repo)));
      if (count) count.textContent = list.length + " public repositories";
      if (status) status.textContent = "Page " + page + " of " + pages;
      if (pagination) {
        pagination.replaceChildren();
        const addButton = (label, target, disabled, current = false) => {
          const button = make("button", "page-btn", label);
          button.type = "button"; button.disabled = disabled;
          if (current) button.setAttribute("aria-current", "page");
          button.addEventListener("click", () => { page = target; render(); });
          pagination.append(button);
        };
        addButton("←", page-1, page === 1);
        const start = Math.max(1, Math.min(page-2, pages-4));
        const end = Math.min(pages, start+4);
        for (let n=start;n<=end;n++) addButton(String(n), n, false, n===page);
        addButton("→", page+1, page === pages);
      }
      const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => entries.forEach(e => { if(e.isIntersecting){e.target.classList.add("visible");observer.unobserve(e.target);}}),{threshold:.08}) : null;
      $$(".reveal", container).forEach(el => observer ? observer.observe(el) : el.classList.add("visible"));
    };
    const load = async () => {
      if (loading) return; loading = true;
      container.innerHTML = '<div class="loading shimmer">Loading live GitHub repositories…</div>';
      try {
        const pages = await Promise.all([1,2,3].map(n => fetch("https://api.github.com/users/kisilumueti/repos?per_page=100&sort=updated&page="+n, {headers:{Accept:"application/vnd.github+json"}})));
        if (pages.some(r => !r.ok)) throw new Error("GitHub API returned " + pages.find(r => !r.ok).status);
        const results = await Promise.all(pages.map(r => r.json()));
        allRepos = results.flat().filter(repo => !repo.private && !repo.disabled);
        const langs = [...new Set(allRepos.map(r=>r.language).filter(Boolean))].sort();
        if (language) langs.forEach(lang => language.append(new Option(lang, lang)));
        render();
      } catch (error) {
        container.replaceChildren();
        const fallback = make("div","empty-state","Live project data could not be loaded right now. You can still browse all repositories directly on GitHub.");
        const link = make("a","btn btn-primary","Open GitHub repositories ↗");
        link.href="https://github.com/kisilumueti?tab=repositories"; link.target="_blank"; link.rel="noopener noreferrer";
        fallback.append(document.createElement("br"),link); container.append(fallback);
        if (status) status.textContent = "GitHub connection unavailable";
      } finally { loading = false; }
    };
    [search,language,sort].forEach(control => control?.addEventListener("input", () => { page=1; render(); }));
    load();
  }

  const contactForm = $("#contact-form");
  contactForm?.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(contactForm);
    const subject = encodeURIComponent("Portfolio enquiry: " + data.get("subject"));
    const body = encodeURIComponent("Name: " + data.get("name") + "\nEmail: " + data.get("email") + "\n\n" + data.get("message"));
    location.href = "mailto:muetijohnbosco35@gmail.com?subject=" + subject + "&body=" + body;
  });
})();