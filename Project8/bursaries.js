"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("searchForm");
    const bar = document.getElementById("searchBar");
    const select = document.getElementById("fieldFilter");
    const list = document.getElementById("bursaryList");
    const status = document.getElementById("status");
    let fieldsLoaded = false;

    function el(tag, className, text) {
        const n = document.createElement(tag);
        if (className) n.className = className;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    function safeUrl(value) {
        try {
            const u = new URL(value);
            return ["http:", "https:"].includes(u.protocol) ? u.href : null;
        } catch (e) { return null; }
    }

    function deadlinePill(deadline) {
        if (!deadline) return el("span", "pill warn", "Check provider for deadline");
        const days = Math.floor((new Date(deadline + "T23:59:59") - new Date()) / 86400000);
        if (days < 0) return el("span", "pill closed", "Closed");
        return el("span", "pill ok", "Closes in " + (days + 1) + (days === 0 ? " day" : " days"));
    }

    function card(b) {
        const art = el("article", "bursary");
        art.append(el("h3", "", b.name), el("p", "provider", b.provider));

        const pills = el("p");
        if (b.field_of_study) pills.append(el("span", "pill", b.field_of_study));
        if (b.amount) pills.append(el("span", "pill", b.amount));
        pills.append(deadlinePill(b.deadline));
        art.append(pills);

        if (b.description) art.append(el("p", "", b.description));

        const dl = el("dl");
        if (b.eligibility) {
            const d = el("div");
            d.append(el("dt", "", "Eligibility"), el("dd", "", b.eligibility));
            dl.append(d);
        }
        const dd = el("div");
        dd.append(el("dt", "", "Deadline"), el("dd", "", b.deadline
            ? new Date(b.deadline + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })
            : "Not specified"));
        dl.append(dd);
        art.append(dl);

        const url = safeUrl(b.application_url);
        if (url) {
            const a = el("a", "apply", "Application Information");
            a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
            art.append(a);
        }
        return art;
    }

    async function load() {
        status.hidden = false;
        status.textContent = "Loading...";
        const params = new URLSearchParams({ q: bar.value.trim(), field: select.value });
        try {
            const r = await fetch("api-bursaries.php?" + params, { credentials: "same-origin" });
            if (r.status === 401) { location.replace("Login%20Page.html"); return; }
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || "Request failed.");

            if (!fieldsLoaded) {
                data.fields.forEach(f => select.append(new Option(f, f)));
                fieldsLoaded = true;
            }
            list.replaceChildren(...data.bursaries.map(card));
            status.hidden = data.bursaries.length > 0;
            status.textContent = "No bursaries match your search.";
        } catch (e) {
            list.replaceChildren();
            status.hidden = false;
            status.textContent = e instanceof TypeError ? "Unable to contact the server. Check XAMPP." : e.message;
        }
    }

    form.addEventListener("submit", e => { e.preventDefault(); load(); });
    select.addEventListener("change", load);
    load();
});
