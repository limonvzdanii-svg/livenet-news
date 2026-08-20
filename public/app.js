const API = "/api";

const $ = (selector) => document.querySelector(selector);

function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(date) {
    if (!date) return "";

    return new Date(date).toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

/* =========================
   NEWS
========================= */

async function getNews() {
    const response = await fetch(`${API}/news`);

    if (!response.ok) {
        throw new Error("Не удалось получить новости");
    }

    return response.json();
}

async function getArticle(id) {
    const response = await fetch(`${API}/news/${encodeURIComponent(id)}`);

    if (!response.ok) {
        throw new Error("Новость не найдена");
    }

    return response.json();
}

/* =========================
   NEWS CARD
========================= */

function createNewsCard(news) {
    return `
        <a class="news-card" href="article.html?id=${encodeURIComponent(news.id)}">

            ${
                news.image
                    ? `<img class="news-image"
                            src="${escapeHTML(news.image)}"
                            alt="${escapeHTML(news.title)}">`
                    : `<div class="news-image"></div>`
            }

            <div class="news-content">

                ${
                    news.category
                        ? `<div class="news-category">
                            ${escapeHTML(news.category)}
                           </div>`
                        : ""
                }

                <h2 class="news-title">
                    ${escapeHTML(news.title)}
                </h2>

                <p class="news-description">
                    ${escapeHTML(news.description || "")}
                </p>

                <div class="news-meta">
                    <span>${formatDate(news.created_at)}</span>
                    <span>Читать →</span>
                </div>

            </div>
        </a>
    `;
}

/* =========================
   HOME
========================= */

async function loadHome() {
    const container = $("#news");

    if (!container) return;

    container.innerHTML = `<div class="loading">Загрузка новостей...</div>`;

    try {
        const news = await getNews();

        if (!Array.isArray(news) || news.length === 0) {
            container.innerHTML = `
                <div class="empty">
                    <h2>Пока нет новостей</h2>
                    <p>Новые публикации появятся здесь.</p>
                </div>
            `;

            return;
        }

        container.innerHTML = news
            .map(createNewsCard)
            .join("");

        setupSearch(news);

    } catch (error) {
        console.error(error);

        container.innerHTML = `
            <div class="empty">
                <h2>Ошибка загрузки</h2>
                <p>Не удалось загрузить новости.</p>
            </div>
        `;
    }
}

/* =========================
   SEARCH
========================= */

function setupSearch(news) {
    const search = $("#search");

    if (!search) return;

    search.addEventListener("input", () => {
        const query = search.value
            .trim()
            .toLowerCase();

        const filtered = news.filter(item => {
            return (
                String(item.title || "")
                    .toLowerCase()
                    .includes(query) ||

                String(item.description || "")
                    .toLowerCase()
                    .includes(query) ||

                String(item.category || "")
                    .toLowerCase()
                    .includes(query)
            );
        });

        const container = $("#news");

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty">
                    <h2>Ничего не найдено</h2>
                    <p>Попробуй изменить запрос.</p>
                </div>
            `;

            return;
        }

        container.innerHTML = filtered
            .map(createNewsCard)
            .join("");
    });
}

/* =========================
   ARTICLE
========================= */

async function loadArticle() {
    const articleContainer = $("#article");

    if (!articleContainer) return;

    const params = new URLSearchParams(location.search);
    const id = params.get("id");

    if (!id) {
        articleContainer.innerHTML = `
            <div class="empty">
                <h2>Новость не указана</h2>
            </div>
        `;

        return;
    }

    articleContainer.innerHTML = `
        <div class="loading">
            Загрузка новости...
        </div>
    `;

    try {
        const news = await getArticle(id);

        articleContainer.innerHTML = `
            <article class="article">

                ${
                    news.category
                        ? `<div class="news-category">
                            ${escapeHTML(news.category)}
                           </div>`
                        : ""
                }

                <h1>
                    ${escapeHTML(news.title)}
                </h1>

                <div class="article-meta">
                    ${formatDate(news.created_at)}
                </div>

                ${
                    news.image
                        ? `<img
                            class="article-image"
                            src="${escapeHTML(news.image)}"
                            alt="${escapeHTML(news.title)}"
                           >`
                        : ""
                }

                <div class="article-body">
                    ${escapeHTML(news.content || news.description || "")}
                </div>

            </article>
        `;

    } catch (error) {
        console.error(error);

        articleContainer.innerHTML = `
            <div class="empty">
                <h2>Новость не найдена</h2>
                <p>Возможно, она была удалена.</p>
            </div>
        `;
    }
}

/* =========================
   ADMIN
========================= */

function getAdminToken() {
    return localStorage.getItem("livenet_admin_token");
}

function setAdminToken(token) {
    localStorage.setItem(
        "livenet_admin_token",
        token
    );
}

function logoutAdmin() {
    localStorage.removeItem(
        "livenet_admin_token"
    );

    location.reload();
}

/* =========================
   ADMIN LOGIN
========================= */

function setupAdminLogin() {
    const form = $("#loginForm");

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const password = $("#password")?.value;

        if (!password) {
            alert("Введите пароль");
            return;
        }

        try {
            const response = await fetch(`${API}/admin/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Неверный пароль"
                );
            }

            setAdminToken(data.token);

            location.reload();

        } catch (error) {
            alert(error.message);
        }
    });
}

/* =========================
   ADMIN NEWS
========================= */

async function loadAdminNews() {
    const container = $("#adminNews");

    if (!container) return;

    const token = getAdminToken();

    if (!token) return;

    container.innerHTML = `
        <div class="loading">
            Загрузка...
        </div>
    `;

    try {
        const response = await fetch(`${API}/news`);

        if (!response.ok) {
            throw new Error("Ошибка");
        }

        const news = await response.json();

        if (!news.length) {
            container.innerHTML = `
                <div class="empty">
                    Новостей пока нет.
                </div>
            `;

            return;
        }

        container.innerHTML = news.map(item => `
            <div class="admin-news">

                <div class="admin-news-info">
                    <strong>
                        ${escapeHTML(item.title)}
                    </strong>

                    <small>
                        ${formatDate(item.created_at)}
                    </small>
                </div>

                <div class="admin-actions">

                    <button
                        class="btn btn-secondary"
                        onclick="editNews('${encodeURIComponent(item.id)}')">
                        Изменить
                    </button>

                    <button
                        class="btn btn-danger"
                        onclick="deleteNews('${encodeURIComponent(item.id)}')">
                        Удалить
                    </button>

                </div>

            </div>
        `).join("");

    } catch (error) {
        console.error(error);

        container.innerHTML = `
            <div class="empty">
                Не удалось загрузить новости.
            </div>
        `;
    }
}

/* =========================
   CREATE NEWS
========================= */

async function createNews(event) {
    event.preventDefault();

    const token = getAdminToken();

    if (!token) {
        alert("Сначала войдите как администратор");
        return;
    }

    const title = $("#title")?.value.trim();
    const description = $("#description")?.value.trim();
    const content = $("#content")?.value.trim();
    const category = $("#category")?.value.trim();
    const image = $("#image")?.value.trim();

    if (!title || !content) {
        alert("Заполните заголовок и текст новости");
        return;
    }

    try {
        const response = await fetch(`${API}/news`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },

            body: JSON.stringify({
                title,
                description,
                content,
                category,
                image
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Не удалось создать новость"
            );
        }

        alert("Новость опубликована!");

        event.target.reset();

        loadAdminNews();

    } catch (error) {
        alert(error.message);
    }
}

/* =========================
   DELETE
========================= */

async function deleteNews(id) {
    const token = getAdminToken();

    if (!token) {
        alert("Нет авторизации");
        return;
    }

    id = decodeURIComponent(id);

    if (!confirm("Удалить эту новость?")) {
        return;
    }

    try {
        const response = await fetch(
            `${API}/news/${encodeURIComponent(id)}`,
            {
                method: "DELETE",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Ошибка удаления"
            );
        }

        loadAdminNews();

    } catch (error) {
        alert(error.message);
    }
}

/* =========================
   EDIT
========================= */

async function editNews(id) {
    id = decodeURIComponent(id);

    try {
        const news = await getArticle(id);

        const title = prompt(
            "Заголовок:",
            news.title || ""
        );

        if (title === null) return;

        const description = prompt(
            "Описание:",
            news.description || ""
        );

        if (description === null) return;

        const content = prompt(
            "Текст новости:",
            news.content || ""
        );

        if (content === null) return;

        const token = getAdminToken();

        const response = await fetch(
            `${API}/news/${encodeURIComponent(id)}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify({
                    title,
                    description,
                    content
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Ошибка изменения"
            );
        }

        alert("Новость изменена!");

        loadAdminNews();

    } catch (error) {
        alert(error.message);
    }
}

/* =========================
   ADMIN PAGE
========================= */

function initAdmin() {
    const adminPanel = $("#adminPanel");
    const loginBox = $("#loginBox");

    if (!adminPanel && !loginBox) return;

    const token = getAdminToken();

    if (token) {
        if (loginBox) {
            loginBox.style.display = "none";
        }

        if (adminPanel) {
            adminPanel.style.display = "block";
        }

        loadAdminNews();

    } else {
        if (loginBox) {
            loginBox.style.display = "block";
        }

        if (adminPanel) {
            adminPanel.style.display = "none";
        }
    }

    const form = $("#newsForm");

    if (form) {
        form.addEventListener(
            "submit",
            createNews
        );
    }

    const logout = $("#logout");

    if (logout) {
        logout.addEventListener(
            "click",
            logoutAdmin
        );
    }
}

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {
    loadHome();
    loadArticle();
    setupAdminLogin();
    initAdmin();
});
