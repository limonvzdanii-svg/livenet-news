export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // -----------------------------
    // HELPERS
    // -----------------------------

    function json(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ...corsHeaders
        }
      });
    }

    function getAdminPassword(request) {
      const auth = request.headers.get("Authorization");

      if (!auth) return null;

      if (auth.startsWith("Bearer ")) {
        return auth.substring(7);
      }

      return null;
    }

    function isAdmin(request, env) {
      const password = getAdminPassword(request);

      // Если ADMIN_PASSWORD задан в Cloudflare,
      // используем его.
      if (env.ADMIN_PASSWORD) {
        return password === env.ADMIN_PASSWORD;
      }

      // Временно для первого запуска.
      // ОБЯЗАТЕЛЬНО потом задай ADMIN_PASSWORD.
      return password === "livenet-admin";
    }

    // -----------------------------
    // API: GET ALL NEWS
    // -----------------------------

    if (url.pathname === "/api/news" && method === "GET") {
      try {
        const result = await env.DB
          .prepare(`
            SELECT
              id,
              title,
              description,
              content,
              image,
              author,
              category,
              created_at,
              updated_at
            FROM news
            ORDER BY created_at DESC
          `)
          .all();

        return json({
          success: true,
          news: result.results || []
        });
      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    // -----------------------------
    // API: GET ONE NEWS
    // -----------------------------

    const newsMatch = url.pathname.match(/^\/api\/news\/(\d+)$/);

    if (newsMatch && method === "GET") {
      const id = Number(newsMatch[1]);

      try {
        const news = await env.DB
          .prepare(`
            SELECT
              id,
              title,
              description,
              content,
              image,
              author,
              category,
              created_at,
              updated_at
            FROM news
            WHERE id = ?
          `)
          .bind(id)
          .first();

        if (!news) {
          return json({
            success: false,
            error: "Новость не найдена"
          }, 404);
        }

        return json({
          success: true,
          news
        });
      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    // -----------------------------
    // API: CREATE NEWS
    // -----------------------------

    if (url.pathname === "/api/news" && method === "POST") {
      if (!isAdmin(request, env)) {
        return json({
          success: false,
          error: "Доступ запрещён"
        }, 401);
      }

      try {
        const body = await request.json();

        const title = String(body.title || "").trim();
        const description = String(body.description || "").trim();
        const content = String(body.content || "").trim();
        const image = String(body.image || "").trim();
        const author = String(body.author || "LiveNet").trim();
        const category = String(body.category || "Новости").trim();

        if (!title || !content) {
          return json({
            success: false,
            error: "Название и текст новости обязательны"
          }, 400);
        }

        const result = await env.DB
          .prepare(`
            INSERT INTO news
            (
              title,
              description,
              content,
              image,
              author,
              category,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `)
          .bind(
            title,
            description,
            content,
            image,
            author,
            category
          )
          .run();

        return json({
          success: true,
          message: "Новость опубликована",
          id: result.meta.last_row_id
        }, 201);

      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    // -----------------------------
    // API: UPDATE NEWS
    // -----------------------------

    if (newsMatch && method === "PUT") {
      if (!isAdmin(request, env)) {
        return json({
          success: false,
          error: "Доступ запрещён"
        }, 401);
      }

      const id = Number(newsMatch[1]);

      try {
        const body = await request.json();

        const title = String(body.title || "").trim();
        const description = String(body.description || "").trim();
        const content = String(body.content || "").trim();
        const image = String(body.image || "").trim();
        const author = String(body.author || "LiveNet").trim();
        const category = String(body.category || "Новости").trim();

        if (!title || !content) {
          return json({
            success: false,
            error: "Название и текст новости обязательны"
          }, 400);
        }

        const result = await env.DB
          .prepare(`
            UPDATE news
            SET
              title = ?,
              description = ?,
              content = ?,
              image = ?,
              author = ?,
              category = ?,
              updated_at = datetime('now')
            WHERE id = ?
          `)
          .bind(
            title,
            description,
            content,
            image,
            author,
            category,
            id
          )
          .run();

        if (result.meta.changes === 0) {
          return json({
            success: false,
            error: "Новость не найдена"
          }, 404);
        }

        return json({
          success: true,
          message: "Новость обновлена"
        });

      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    // -----------------------------
    // API: DELETE NEWS
    // -----------------------------

    if (newsMatch && method === "DELETE") {
      if (!isAdmin(request, env)) {
        return json({
          success: false,
          error: "Доступ запрещён"
        }, 401);
      }

      const id = Number(newsMatch[1]);

      try {
        const result = await env.DB
          .prepare(`
            DELETE FROM news
            WHERE id = ?
          `)
          .bind(id)
          .run();

        if (result.meta.changes === 0) {
          return json({
            success: false,
            error: "Новость не найдена"
          }, 404);
        }

        return json({
          success: true,
          message: "Новость удалена"
        });

      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    // -----------------------------
    // API: ADMIN LOGIN CHECK
    // -----------------------------

    if (url.pathname === "/api/admin/check" && method === "GET") {
      return json({
        success: true,
        admin: isAdmin(request, env)
      });
    }

    // -----------------------------
    // API HOME
    // -----------------------------

    if (url.pathname === "/api" || url.pathname === "/api/") {
      return json({
        success: true,
        service: "LiveNet News API",
        version: "1.0.0",
        database: "D1"
      });
    }

    // -----------------------------
    // STATIC FILES
    // -----------------------------

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders
    });
  }
};
