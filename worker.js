export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Главная страница
    if (url.pathname === "/") {
      return env.ASSETS.fetch(request);
    }

    // API: получить новости
    if (url.pathname === "/api/news" && request.method === "GET") {
      const { results } = await env.DB
        .prepare(`
          SELECT id, title, content, image, author, created_at, updated_at
          FROM news
          ORDER BY created_at DESC
        `)
        .all();

      return Response.json(results);
    }

    // API: получить одну новость
    if (url.pathname.startsWith("/api/news/") && request.method === "GET") {
      const id = url.pathname.split("/").pop();

      const news = await env.DB
        .prepare("SELECT * FROM news WHERE id = ?")
        .bind(id)
        .first();

      if (!news) {
        return Response.json(
          { error: "Новость не найдена" },
          { status: 404 }
        );
      }

      return Response.json(news);
    }

    return new Response("Not Found", { status: 404 });
  }
};
