import { serve } from "bun";

const server = serve({
    port: 1235,
    async fetch(req) {
        const url = new URL(req.url);
        const targetUrl = "http://localhost:8080" + url.pathname + url.search;

        const response = await fetch(targetUrl);
        const html = await response.text();

        // Inject script
        const injectedHtml = html.replace(
            "</body>",
            "<script>console.log('injected');</script></body>"
        );

        return new Response(injectedHtml, {
            headers: { "Content-Type": "text/html" },
        });
    },
});

console.log(`Proxy server running at ${server.url}`);
