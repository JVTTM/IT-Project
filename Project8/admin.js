"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const sidebar = document.getElementById("sidebar");
    const toggle = document.getElementById("sidebarToggle");
    const search = document.getElementById("institutionSearch");
    const status = document.getElementById("statusFilter");
    const tbody = document.querySelector("#institutionTable tbody");
    const noResults = document.getElementById("noResults");

    document.querySelectorAll("[data-year]").forEach(n => { n.textContent = new Date().getFullYear(); });

    if (sidebar && toggle) {
        toggle.addEventListener("click", () => {
            toggle.setAttribute("aria-expanded", String(sidebar.classList.toggle("open")));
        });
    }

    function el(tag, className, text) {
        const n = document.createElement(tag);
        if (className) n.className = className;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    function applyFilters() {
        const q = search.value.toLowerCase().trim(), s = status.value.toLowerCase();
        let visible = 0;
        tbody.querySelectorAll("tr").forEach(row => {
            const badge = row.querySelector(".status")?.textContent.trim().toLowerCase() || "";
            const show = row.textContent.toLowerCase().includes(q) && (!s || badge === s);
            row.hidden = !show;
            if (show) visible++;
        });
        noResults.hidden = visible !== 0;
    }

    try {
        const r = await fetch("api-admin.php", { credentials: "same-origin", cache: "no-store" });
        if (r.status === 401) { location.replace("admin-login.html"); return; }
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);

        document.querySelectorAll("[data-admin-name]").forEach(n => { n.textContent = data.adminName; });
        document.querySelectorAll("[data-stat]").forEach(n => {
            n.textContent = Number(data.stats[n.dataset.stat] ?? 0).toLocaleString("en-ZA");
        });

        data.institutions.forEach(i => {
            const tr = el("tr"), nameTd = el("td"), wrap = el("div", "institution-name");
            wrap.append(el("div", "institution-avatar", "🏛"), el("strong", "", i.name));
            nameTd.append(wrap);

            const statusTd = el("td");
            statusTd.append(el("span", "status status-" + i.status.toLowerCase().replace(/ /g, "-"), i.status));

            const actionTd = el("td"), a = el("a", "action-link", "Manage");
            a.href = "admin-institutions.html";
            actionTd.append(a);

            tr.append(nameTd, el("td", "", i.type), el("td", "", i.province), statusTd, actionTd);
            tbody.append(tr);
        });

        const activity = document.querySelector(".activity-list");
        data.activities.forEach(a => {
            const item = el("div", "activity-item"), d = el("div", "activity-details");
            d.append(el("strong", "", a.action), el("small", "", a.time));
            item.append(el("div", "activity-dot"), d);
            activity.append(item);
        });

        search.addEventListener("input", applyFilters);
        status.addEventListener("change", applyFilters);
    } catch (e) {
        noResults.textContent = "Unable to load dashboard data.";
        noResults.hidden = false;
    }
});
