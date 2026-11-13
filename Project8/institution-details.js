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
    function link(cls, text, href) {
        const a = el("a", cls, text);
        a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer";
        return a;
    }
    function section(title) {
        const s = el("section", "detail-section");
        s.append(el("h3", "", title));
        return s;
    }

    try {
        const r = await fetch("api-institution.php?id=" + encodeURIComponent(id || ""), { credentials: "same-origin" });
        if (r.status === 401) { location.replace("Login%20Page.html"); return; }
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Institution not found.");

        const i = data.institution;
        document.title = i.name + " | EduConnect SA";

        const card = el("article", "detail-card");
        const imgUrl = safeUrl(i.image_url);
        if (imgUrl) { const img = el("img"); img.src = imgUrl; img.alt = i.name; card.append(img); }

        const body = el("div", "detail-body");
        body.append(el("h1", "", i.name));

        const pills = el("p");
        pills.append(i.is_accredited ? el("span", "pill ok", "Accredited") : el("span", "pill warn", "Accreditation not yet verified"));
        if (i.institution_type) pills.append(el("span", "pill", i.institution_type));
        const loc = [i.city, i.province].filter(Boolean).join(", ");
        if (loc) pills.append(el("span", "pill", loc));
        body.append(pills);
        if (i.description) body.append(el("p", "", i.description));

        const reg = section("Registration & Accreditation");
        const rn = el("p"); rn.append(el("strong", "", "Registration number: "), i.registration_number || "Not yet recorded");
        reg.append(rn, el("p", "", i.accreditation_details ||
            "Confirm accreditation with the DHET, SAQA or the Council on Higher Education before applying."));
        body.append(reg);

        if (data.tags.length) {
            const s = section("Focus Areas"), t = el("div", "card_tag");
            data.tags.forEach(x => t.append(el("span", "tags", x)));
            s.append(t); body.append(s);
        }

        const cs = section("Courses Offered");
        if (!data.courses.length) cs.append(el("p", "", "No courses are listed for this institution yet."));
        else {
            const ul = el("ul", "course-list");
            data.courses.forEach(c => {
                const li = el("li"), name = el("span");
                name.append(el("strong", "", c.name));
                if (c.qualification) name.append(" · " + c.qualification);
                li.append(name);
                const u = safeUrl(c.application_url);
                if (u) li.append(link("", "Apply →", u));
                ul.append(li);
            });
            cs.append(ul);
        }
        body.append(cs);

        const site = safeUrl(i.website_url);
        if (site) { const s = section("Official Website"); s.append(link("apply", "Visit Official Website", site)); body.append(s); }

        card.append(body);
        root.replaceChildren(card);
        status.hidden = true;
    } catch (e) {
        status.textContent = e instanceof TypeError ? "Unable to contact the server. Check XAMPP." : e.message;
    }
});
