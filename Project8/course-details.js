"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const status = document.getElementById("status");
    const root = document.getElementById("detail");
    const id = new URLSearchParams(location.search).get("id");

    function el(tag, className, text) {
        const n = document.createElement(tag);
        if (className) n.className = className;
        if (text !== undefined) n.textContent = text;
        return n;
    }
    function safeUrl(v) {
        try { const u = new URL(v); return ["http:", "https:"].includes(u.protocol) ? u.href : null; }
        catch (e) { return null; }
    }
    function section(title) {
        const s = el("section", "detail-section");
        s.append(el("h3", "", title));
        return s;
    }
    function savedAps() {
        try { const v = localStorage.getItem("eduAps"); return v === null ? null : Number(v); }
        catch (e) { return null; }
    }

    try {
        const r = await fetch("api-course.php?id=" + encodeURIComponent(id || ""), { credentials: "same-origin" });
        if (r.status === 401) { location.replace("Login%20Page.html"); return; }
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Course not found.");

        const c = data.course;
        document.title = c.name + " | EduConnect SA";

        const card = el("article", "detail-card"), body = el("div", "detail-body");
        body.append(el("h1", "", c.name));

        const pills = el("p");
        if (c.qualification) pills.append(el("span", "pill", c.qualification));
        if (c.category) pills.append(el("span", "pill", c.category));
        if (c.min_aps !== null) pills.append(el("span", "pill", "Minimum APS " + c.min_aps));
        const mine = savedAps();
        if (c.min_aps !== null && mine !== null) {
            pills.append(mine >= c.min_aps
                ? el("span", "pill ok", "Your APS " + mine + ": you qualify")
                : el("span", "pill closed", "Your APS " + mine + ": " + (c.min_aps - mine) + " short"));
        }
        body.append(pills);
        if (c.description) body.append(el("p", "", c.description));

        const apsSec = section("Admission requirements");
        apsSec.append(el("p", "", c.min_aps !== null
            ? "Indicative minimum APS: " + c.min_aps + ". Institutions calculate APS differently and may also require specific subjects, so confirm on the institution's website."
            : "No APS requirement has been listed for this course yet. Check the institution's website."));
        const calc = el("a", "back-link", "Open the APS calculator \u2192");
        calc.href = "aps.html";
        apsSec.append(calc);
        body.append(apsSec);

        const careers = section("Career paths");
        if (!c.career_paths.length) careers.append(el("p", "", "Career information has not been added for this course yet."));
        else {
            const ul = el("ul", "career-list");
            c.career_paths.forEach(p => ul.append(el("li", "", p)));
            careers.append(ul);
        }
        body.append(careers);

        if (data.tags.length) {
            const s = section("Related topics"), t = el("div", "card_tag");
            data.tags.forEach(x => t.append(el("span", "tags", x)));
            s.append(t); body.append(s);
        }

        const offered = section("Offered by");
        if (!data.institutions.length) offered.append(el("p", "", "No verified institutions list this course yet."));
        else {
            const ul = el("ul", "course-list");
            data.institutions.forEach(i => {
                const li = el("li"), name = el("a", "", i.name);
                name.href = "institution-details.html?id=" + encodeURIComponent(i.id);
                const left = el("span"); left.append(name);
                if (i.province) left.append(" \u00b7 " + i.province);
                li.append(left);
                const u = safeUrl(i.application_url);
                if (u) { const a = el("a", "", "Apply \u2192"); a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer"; li.append(a); }
                ul.append(li);
            });
            offered.append(ul);
        }
        body.append(offered);

        card.append(body);
        root.replaceChildren(card);
        status.hidden = true;
    } catch (e) {
        status.textContent = e instanceof TypeError ? "Unable to contact the server. Check XAMPP." : e.message;
    }
});
