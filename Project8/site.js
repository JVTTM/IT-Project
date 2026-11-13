"use strict";

(function () {
    const GUEST_NAV = [
        ["index.html", "Home"], ["about.html", "About"], ["contact.html", "Contact"],
        ["Login%20Page.html", "Log In"], ["signup.html", "Sign Up"]
    ];
    const STUDENT_NAV = [
        ["dashboard.html", "Dashboard"], ["bursaries.html", "Bursaries"],
        ["courses.html", "Courses"], ["aps.html", "APS Calculator"],
        ["institutions.html", "Institutions"],
        ["about.html", "About"], ["contact.html", "Contact"]
    ];

    const here = decodeURIComponent(location.pathname.split("/").pop() || "index.html");

    async function getSession(scope) {
        try {
            const r = await fetch("session.php?scope=" + scope,
                { credentials: "same-origin", cache: "no-store" });
            return await r.json();
        } catch (e) {
            return { loggedIn: false };
        }
    }

    function buildNav(nav, loggedIn) {
        nav.replaceChildren();
        (loggedIn ? STUDENT_NAV : GUEST_NAV).forEach(([href, label]) => {
            const a = document.createElement("a");
            a.href = href;
            a.textContent = label;
            if (decodeURIComponent(href) === here) a.setAttribute("aria-current", "page");
            nav.appendChild(a);
        });
        if (loggedIn) {
            const out = document.createElement("a");
            out.href = "#";
            out.textContent = "Sign Out";
            out.dataset.logout = "student";
            nav.appendChild(out);
        }
    }

    async function logout(scope) {
        try {
            await fetch("logout.php", {
                method: "POST", credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scope })
            });
        } finally {
            location.replace("index.html");
        }
    }

    document.addEventListener("DOMContentLoaded", async () => {
        const mode = document.body.dataset.auth;           // "student" | "admin" | undefined
        const session = await getSession(mode === "admin" ? "admin" : "student");

        if (mode && !session.loggedIn) {
            location.replace(mode === "admin" ? "admin-login.html" : "Login%20Page.html");
            return;
        }

        const nav = document.getElementById("navlist");
        if (nav) buildNav(nav, session.loggedIn);

        document.querySelectorAll("[data-username]").forEach(n => { n.textContent = session.username || ""; });
        document.querySelectorAll("[data-admin-name]").forEach(n => { n.textContent = session.username || "Admin"; });
        document.querySelectorAll("[data-guest]").forEach(n => { n.hidden = session.loggedIn; });
        document.querySelectorAll("[data-member]").forEach(n => { n.hidden = !session.loggedIn; });

        document.addEventListener("click", e => {
            const link = e.target.closest("[data-logout]");
            if (link) { e.preventDefault(); logout(link.dataset.logout); }
        });

        document.documentElement.classList.remove("auth-pending");
    });

    window.addEventListener("pageshow", e => {
        if (e.persisted && document.body.dataset.auth) location.reload();
    });

    window.EduSite = { logout };
})();
