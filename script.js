// ===============================
// COLLAPSIBLE PROGRAM CARDS
// ===============================
document.querySelectorAll('.program-header').forEach(header => {
    header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        content.style.display =
            content.style.display === 'block' ? 'none' : 'block';

        const icon = header.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-chevron-up');
        }
    });
});


// ===============================
// CHATBOT SYSTEM
// ===============================
const chatBtn = document.getElementById("chatBtn");
const chatBox = document.getElementById("chatBox");
const messages = document.getElementById("messages");
const inputField = document.getElementById("userInput");

// Hide chat initially and only run chatbot code on pages that have the chatbot elements
if (chatBtn && chatBox && messages && inputField) {
    chatBox.style.display = "none";

    // Toggle chat
    chatBtn.onclick = () => {
        chatBox.style.display =
            chatBox.style.display === "block" ? "none" : "block";

        // Welcome message (only first time)
        if (chatBox.style.display === "block" && messages.innerHTML === "") {
            messages.innerHTML = `
                <p><b>Bot:</b> 👋 Welcome to the MUT ICT Assistant.<br>
                You can ask about:<br>
                • Admission requirements<br>
                • How to apply<br>
                • NSFAS<br>
                • Course duration<br>
                • Contact details</p>
            `;
        }
    };
}


// ===============================
// SEND MESSAGE FUNCTION
// ===============================
async function sendMessage() {
    if (!inputField || !messages) return;

    const text = inputField.value.trim();
    if (!text) return;

    messages.innerHTML += `<p><b>You:</b> ${text}</p>`;
    inputField.value = "";

    try {
        const response = await fetch(`/api/chat?message=${encodeURIComponent(text)}`);
        const data = await response.json();

        messages.innerHTML += `<p><b>Bot:</b><br>${data.answer}</p>`;
    } catch (error) {
        messages.innerHTML += `<p><b>Bot:</b><br>Chatbot is not available. Please make sure the server is running.</p>`;
    }

    messages.scrollTop = messages.scrollHeight;
}


// ===============================
// ENTER KEY SUPPORT
// ===============================
if (inputField) {
    inputField.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            sendMessage();
        }
    });
}
// ===============================
// COOKIE CONSENT SYSTEM
// ===============================
document.addEventListener("DOMContentLoaded", function () {

    const banner = document.getElementById("cookieBanner");
    const acceptBtn = document.getElementById("acceptCookies");

    if (!banner || !acceptBtn) return;

    // Check if cookie already exists
    if (document.cookie.includes("cookiesAccepted=true")) {
        banner.style.display = "none";
    }

    // When user clicks accept
    acceptBtn.addEventListener("click", function () {
        document.cookie = "cookiesAccepted=true; path=/; max-age=" + 60 * 60 * 24 * 365;
        banner.style.display = "none";
    });

});

// ===============================
// SMART SEARCH SYSTEM
// ===============================
document.addEventListener("DOMContentLoaded", function () {
    const searchIcon = document.getElementById("searchIcon");
    const searchBox = document.getElementById("searchBox");
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");

    if (!searchIcon || !searchBox || !searchInput || !searchResults) return;

    function clearSearchResults() {
        searchResults.innerHTML = "";
    }

    function showMessage(message) {
        searchResults.innerHTML = `<div class="search-result-item">${message}</div>`;
    }

    function renderResults(results) {
        clearSearchResults();

        if (!results || results.length === 0) {
            showMessage("No results found");
            return;
        }

        results.forEach(item => {
            const resultLink = document.createElement("a");
            resultLink.href = item.url;
            resultLink.className = "search-result-item";

            const title = document.createElement("strong");
            title.textContent = item.title;

            const snippet = document.createElement("small");
            snippet.textContent = item.snippet || "Open this page";

            resultLink.appendChild(title);
            resultLink.appendChild(document.createElement("br"));
            resultLink.appendChild(snippet);
            searchResults.appendChild(resultLink);
        });
    }

    searchIcon.addEventListener("click", function () {
        searchBox.style.display = searchBox.style.display === "block" ? "none" : "block";
        searchInput.focus();
    });

    searchInput.addEventListener("input", async function () {
        const query = searchInput.value.trim();

        if (query.length < 2) {
            clearSearchResults();
            return;
        }

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            renderResults(data.results);
        } catch (error) {
            showMessage("Search is not available. Please make sure the Node.js server is running.");
        }
    });

    document.addEventListener("click", function (event) {
        if (!searchBox.contains(event.target) && event.target !== searchIcon) {
            searchBox.style.display = "none";
        }
    });
});

// ===============================
// REAL-TIME NOTICES (WEBSOCKET TICKER)
// ===============================
const socket = new WebSocket("ws://localhost:4000");

socket.onmessage = function (event) {
    const data = JSON.parse(event.data);
    const box = document.getElementById("noticesBox");
    if (!box) return;

    box.textContent = data.notice;
};