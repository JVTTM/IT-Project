"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const SUBJECTS = [
        ["home", "Home Language"], ["fal", "First Additional Language"],
        ["maths", "Mathematics / Maths Literacy"], ["lo", "Life Orientation"],
        ["e1", "Elective 1"], ["e2", "Elective 2"], ["e3", "Elective 3"]
    ];
    const STORE = "eduApsMarks";
    const $ = id => document.getElementById(id);
    const grid = $("marksGrid"), countLo = $("countLo");
    const inputs = {}, pointCells = {};
    let aps = 0, hasMarks = false, courses = [];

    function el(tag, className, text) {
        const n = document.createElement(tag);
        if (className) n.className = className;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    const points = m => m >= 80 ? 7 : m >= 70 ? 6 : m >= 60 ? 5 : m >= 50 ? 4 : m >= 40 ? 3 : m >= 30 ? 2 : 1;

    function readMark(key) {
        const raw = inputs[key].value.trim();
        if (raw === "") { inputs[key].removeAttribute("aria-invalid"); return null; }
        const n = Number(raw);
        const ok = Number.isFinite(n) && n >= 0 && n <= 100;
        inputs[key].setAttribute("aria-invalid", String(!ok));
        return ok ? n : null;
    }

    function calculate() {
        let total = 0, entered = 0;
        SUBJECTS.forEach(([key]) => {
            const mark = readMark(key);
            const counted = key !== "lo" || countLo.checked;
            pointCells[key].textContent = mark === null ? "" : String(points(mark));
            if (mark !== null) { entered++; if (counted) total += points(mark); }
        });
        aps = total;
        hasMarks = entered > 0;
        $("apsScore").textContent = String(aps);
        $("apsMax").textContent = String(countLo.checked ? 49 : 42);
        save();
        render();
    }

    function save() {
        try {
            const marks = {};
            SUBJECTS.forEach(([k]) => { marks[k] = inputs[k].value; });
            localStorage.setItem(STORE, JSON.stringify({ marks, countLo: countLo.checked }));
            if (hasMarks) localStorage.setItem("eduAps", String(aps)); else localStorage.removeItem("eduAps");
        } catch (e) {}
    }

    function restore() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORE) || "null");
            if (!saved) return;
            SUBJECTS.forEach(([k]) => { if (saved.marks?.[k] !== undefined) inputs[k].value = saved.marks[k]; });
            countLo.checked = !!saved.countLo;
        } catch (e) {}
    }

    SUBJECTS.forEach(([key, label]) => {
        const row = el("div", "mark-row"), lab = el("label", "", label);
        const input = el("input");
        input.type = "number"; input.min = "0"; input.max = "100"; input.step = "1";
        input.id = "mark-" + key; input.inputMode = "numeric"; input.placeholder = "%";
        lab.htmlFor = input.id;
        const pts = el("span", "mark-pts");
        pts.setAttribute("aria-label", "points");
        inputs[key] = input; pointCells[key] = pts;
        input.addEventListener("input", calculate);
        row.append(lab, input, pts);
        grid.append(row);
    });
    countLo.addEventListener("change", calculate);
    $("clearMarks").addEventListener("click", () => {
        SUBJECTS.forEach(([k]) => { inputs[k].value = ""; });
        countLo.checked = false;
        calculate();
    });
    $("apsForm").addEventListener("submit", e => e.preventDefault());

    function statusOf(c) {
        if (c.min_aps === null || c.min_aps === undefined) return { key: "unknown", label: "Requirement not listed", cls: "warn" };
        return aps >= c.min_aps
            ? { key: "yes", label: "You qualify", cls: "ok" }
            : { key: "no", label: "Need " + (c.min_aps - aps) + " more point" + (c.min_aps - aps === 1 ? "" : "s"), cls: "closed" };
    }

    function card(c, st) {
        const art = el("article", "bursary");
        art.append(el("h3", "", c.name));
        const pills = el("p");
        if (c.qualification) pills.append(el("span", "pill", c.qualification));
        if (c.category) pills.append(el("span", "pill", c.category));
        if (c.min_aps !== null && c.min_aps !== undefined) pills.append(el("span", "pill", "Min APS " + c.min_aps));
        if (hasMarks) pills.append(el("span", "pill " + st.cls, st.label));
        art.append(pills);
        if (c.description) art.append(el("p", "", c.description.length > 180 ? c.description.slice(0, 177) + "..." : c.description));
        const n = c.institutions.length;
        art.append(el("p", "provider", n ? "Offered by " + n + " verified institution" + (n === 1 ? "" : "s") : "No verified institutions list this course yet"));
        const a = el("a", "apply", "View Details & Career Paths");
        a.href = "course-details.html?id=" + encodeURIComponent(c.id);
        art.append(a);
        return art;
    }

    function render() {
        const status = $("status"), list = $("courseList");
        if (!courses.length) return;
        const q = $("q").value.toLowerCase().trim(), cat = $("category").value, mode = $("mode").value;

        let rows = courses.filter(c =>
            (!q || [c.name, c.description, c.category, c.qualification].join(" ").toLowerCase().includes(q)) &&
            (!cat || c.category === cat));

        if (hasMarks) {
            rows = rows.map(c => ({ c, st: statusOf(c) })).filter(({ st }) =>
                mode === "all" || (mode === "qualify" ? st.key !== "no" : st.key === "yes"));
            const rank = { yes: 0, unknown: 1, no: 2 };
            rows.sort((a, b) => rank[a.st.key] - rank[b.st.key] ||
                (b.c.min_aps ?? 0) - (a.c.min_aps ?? 0) || a.c.name.localeCompare(b.c.name));
        } else {
            rows = rows.map(c => ({ c, st: statusOf(c) }));
        }

        list.replaceChildren(...rows.map(({ c, st }) => card(c, st)));
        status.hidden = rows.length > 0;
        status.textContent = hasMarks ? "No courses match your score and filters." : "No courses match your filters.";
        if (!hasMarks && rows.length) { status.hidden = false; status.textContent = "Enter your marks to see which courses you qualify for."; }
    }

    $("q").addEventListener("input", render);
    $("category").addEventListener("change", render);
    $("mode").addEventListener("change", render);

    restore();
    (async () => {
        try {
            const r = await fetch("api-courses.php", { credentials: "same-origin" });
            if (r.status === 401) { location.replace("Login%20Page.html"); return; }
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || "Unable to load courses.");
            courses = data.courses.map(c => ({ ...c, min_aps: c.min_aps === null ? null : Number(c.min_aps), institutions: c.institutions || [] }));
            [...new Set(courses.map(c => c.category).filter(Boolean))].sort()
                .forEach(v => $("category").append(new Option(v, v)));
            calculate();
        } catch (e) {
            $("status").textContent = e instanceof TypeError ? "Unable to contact the server. Check XAMPP." : e.message;
        }
    })();
    calculate();
});
