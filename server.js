const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require("ws");

const PORT = process.env.PORT || 4000;
const PUBLIC_DIR = __dirname;

const pageFiles = [
    'index.html',
    'programs.html',
    'career.html',
    'gallery.html',
    'testimonials.html',
    'contact.html',
    'apply.html',
    'dashboard.html'
];

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
};

function stripHtml(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
        .replace(/<header[\s\S]*?<\/header>/gi, ' ')
        .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function getTitle(html, fallback) {
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const raw = h1?.[1] || title?.[1] || fallback;
    return stripHtml(raw).replace(' - Mangosuthu University of Technology', '');
}

function loadPages() {
    return pageFiles
        .filter(file => fs.existsSync(path.join(PUBLIC_DIR, file)))
        .map(file => {
            const html = fs.readFileSync(path.join(PUBLIC_DIR, file), 'utf8');
            return {
                file,
                title: getTitle(html, file),
                text: stripHtml(html).toLowerCase(),
                displayText: stripHtml(html)
            };
        });
}

function scorePage(page, queryWords, phrase) {
    let score = 0;

    const title = page.title.toLowerCase();
    const file = page.file.toLowerCase();

    if (title.includes(phrase)) score += 40;
    if (file.includes(phrase)) score += 40;
    if (page.text.includes(phrase)) score += 25;

    for (const word of queryWords) {
        if (title.includes(word)) score += 12;
        if (file.includes(word)) score += 12;

        const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = page.text.match(new RegExp(safeWord, 'gi'));

        score += matches ? Math.min(matches.length * 3, 30) : 0;
    }

    return score;
}
function makeSnippet(text, queryWords) {
    const lower = text.toLowerCase();
    let index = -1;
    for (const word of queryWords) {
        index = lower.indexOf(word);
        if (index !== -1) break;
    }
    if (index === -1) index = 0;
    const start = Math.max(0, index - 80);
    const snippet = text.slice(start, start + 120).trim();
    return (start > 0 ? '...' : '') + snippet + (start + 220 < text.length ? '...' : '');
}

function searchSite(query) {

    query = query
        .replace(/testimonals/gi, "testimonials")
        .replace(/program/gi, "programs")
        .replace(/carrer/gi, "career");

    const phrase = query.toLowerCase().trim();
    const queryWords = phrase.split(/\s+/).filter(word => word.length > 0);
    if (!queryWords.length) return [];

    return loadPages()
        .map(page => ({
            title: page.title,
            url: '/' + encodeURIComponent(page.file).replace(/%2F/g, '/'),
            snippet: makeSnippet(page.displayText, queryWords),
            score: scorePage(page, queryWords, phrase)
        }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
}

function safeFilePath(urlPath) {
    let decodedPath = decodeURIComponent(urlPath.split('?')[0]);
    if (decodedPath === '/') decodedPath = '/index.html';
    const filePath = path.normalize(path.join(PUBLIC_DIR, decodedPath));
    if (!filePath.startsWith(PUBLIC_DIR)) return null;
    return filePath;
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // ===============================
    // CHATBOT API (ADD HERE)
    // ===============================
    if (url.pathname === "/api/chat") {
        const message = (url.searchParams.get("message") || "").toLowerCase();

        let reply = "Sorry, I don't understand.";

        if (message.includes("hi") || message.includes("hello") || message.includes("hey")) {
            reply = "Hello 👋 How can I assist you today?";
        }
        else if (message.includes("apply")) {
            reply = "You can apply through the MUT admissions portal or CAO.";
        }

        else if (message.includes("course") || message.includes("program")) {
            reply = "We offer ICT programmes including IT, networking, software development and support services.";
        }
        else if (message.includes("contact")) {
            reply = "You can contact MUT at 031 907 7111 or info@mut.ac.za.";
        }
        else if (message.includes("nsfas") || message.includes("funding")) {
            reply = "NSFAS funding is available for qualifying students.";
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ answer: reply }));
        return;
    }

    // ===============================
    // SMART SEARCH (ALREADY EXISTS)
    // ===============================
    if (url.pathname === '/api/search') {
        const q = url.searchParams.get('q') || '';
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ query: q, results: searchSite(q) }));
        return;
    }

    const filePath = safeFilePath(url.pathname);
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 - Page not found</h1><p>Go back to <a href="/index.html">Home</a>.</p>');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
    console.log(`MUT ICT website running at http://localhost:${PORT}`);
});

const wss = new WebSocket.Server({ server });

const notices = [
    "Applications for ICT programmes are now open.",
    "NSFAS funding is available for qualifying students.",
    "Check your student email for timetable updates.",
    "Work Integrated Learning briefing coming soon."
];

setInterval(() => {
    const notice = notices[Math.floor(Math.random() * notices.length)];

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ notice }));
        }
    });
}, 10000);
