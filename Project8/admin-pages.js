"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    const API = "api-admin-manage.php";
    const $ = id => document.getElementById(id);

    function el(tag, className, text) {
        const n = document.createElement(tag);
        if (className) n.className = className;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    async function call(action, body) {
        const opts = { credentials: "same-origin", cache: "no-store" };
        if (body) {
            opts.method = "POST";
            opts.headers = { "Content-Type": "application/json" };
            opts.body = JSON.stringify(body);
        }
        const r = await fetch(API + "?action=" + action, opts);
        if (r.status === 401) { location.replace("admin-login.html"); throw new Error("Signed out."); }
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Request failed.");
        return data;
    }

    const friendly = e => e instanceof TypeError ? "Unable to contact the server. Check XAMPP." : e.message;

    document.querySelectorAll("[data-year]").forEach(n => { n.textContent = new Date().getFullYear(); });
    const sidebar = $("sidebar"), toggle = $("sidebarToggle");
    if (sidebar && toggle) {
        toggle.addEventListener("click", () => toggle.setAttribute("aria-expanded", String(sidebar.classList.toggle("open"))));
    }
    call("stats").then(s => document.querySelectorAll("[data-stat]").forEach(n => {
        n.textContent = Number(s[n.dataset.stat] ?? 0).toLocaleString("en-ZA");
    })).catch(() => {});

    const tbody = $("rows"), empty = $("empty");

    function applyFilters() {
        const q = ($("q")?.value || "").toLowerCase().trim();
        const s = ($("statusFilter")?.value || "").toLowerCase();
        let visible = 0;
        tbody.querySelectorAll("tr").forEach(row => {
            const badge = row.querySelector(".status")?.textContent.trim().toLowerCase() || "";
            const show = row.textContent.toLowerCase().includes(q) && (!s || badge === s);
            row.hidden = !show;
            if (show) visible++;
        });
        empty.hidden = visible !== 0;
    }

    function fillRows(rows, build) {
        tbody.replaceChildren(...rows.map(build));
        $("q")?.addEventListener("input", applyFilters);
        $("statusFilter")?.addEventListener("change", applyFilters);
        applyFilters();
    }

    const td = (text) => el("td", "", text ?? "—");
    const statusTd = ok => {
        const c = el("td");
        c.append(el("span", "status status-" + (ok ? "verified" : "pending"), ok ? "Verified" : "Pending"));
        return c;
    };
    const nameTd = name => {
        const c = el("td"), w = el("div", "institution-name");
        w.append(el("div", "institution-avatar", "🏛"), el("strong", "", name));
        c.append(w);
        return c;
    };

    function deleteButton(action, id, label, warning, row) {
        const b = el("button", "small-btn danger", "Delete");
        b.type = "button";
        b.addEventListener("click", async () => {
            if (!confirm("Permanently delete " + label + "?\n\n" + warning + "\n\nThis cannot be undone.")) return;
            b.disabled = true;
            try {
                await call(action, { id });
                row.remove();
                applyFilters();
                call("stats").then(s => document.querySelectorAll("[data-stat]").forEach(n => {
                    n.textContent = Number(s[n.dataset.stat] ?? 0).toLocaleString("en-ZA");
                })).catch(() => {});
            } catch (err) {
                b.disabled = false;
                alert(friendly(err));
            }
        });
        return b;
    }

    function bindForm(form, action, opts = {}) {
        const msg = form.querySelector(".form-msg"), btn = form.querySelector("[type=submit]");
        form.addEventListener("submit", async e => {
            e.preventDefault();
            const body = {};
            new FormData(form).forEach((v, k) => { body[k] = typeof v === "string" ? v.trim() : v; });
            form.querySelectorAll("input[type=checkbox]").forEach(c => { body[c.name] = c.checked; });

            if (opts.validate) {
                const problem = opts.validate(body);
                if (problem) { msg.textContent = problem; msg.className = "form-msg err"; return; }
            }
            btn.disabled = true;
            msg.textContent = "";
            try {
                const d = await call(action, body);
                msg.textContent = d.message;
                msg.className = "form-msg ok";
                if (opts.reset !== false) form.reset();
                if (opts.done) opts.done(d, body);
            } catch (err) {
                msg.textContent = friendly(err);
                msg.className = "form-msg err";
            } finally {
                btn.disabled = false;
            }
        });
    }

    const pages = {
        async institutions() {
            const { institutions } = await call("institutions");
            fillRows(institutions, i => {
                const tr = el("tr"), a = el("a", "action-link", "Review");
                a.href = "admin-verification.html";
                const act = el("td", "action-cell");
                act.append(a, deleteButton("delete_institution", i.id, i.name,
                    "Its course links and tags will also be removed. The courses themselves stay.", tr));
                tr.append(nameTd(i.name), td(i.institution_type), td(i.province), statusTd(i.is_accredited), act);
                return tr;
            });
        },

        async courses() {
            const { courses } = await call("courses");
            fillRows(courses, c => {
                const tr = el("tr");
                const act = el("td", "action-cell");
                act.append(deleteButton("delete_course", c.id, c.name,
                    "It will be removed from every institution that offers it.", tr));
                tr.append(td(c.name), td(c.qualification), td(c.category), td(String(c.institutions)), act);
                return tr;
            });
        },

        async students() {
            const { students } = await call("students");
            fillRows(students, s => {
                const tr = el("tr"), act = el("td", "action-cell");
                act.append(deleteButton("delete_student", s.id, "the account \"" + s.username + "\"",
                    "The student will no longer be able to sign in.", tr));
                tr.append(td(s.username), td(s.email), act);
                return tr;
            });
        },

        async verification() {
            let { institutions } = await call("institutions");
            const dlg = $("detailsDialog"), form = $("dlgForm"), msg = form.querySelector(".form-msg");
            let current = null;

            function render() {
                institutions.sort((a, b) => Number(a.is_accredited) - Number(b.is_accredited) || a.name.localeCompare(b.name));
                fillRows(institutions, i => {
                    const tr = el("tr"), btn = el("button", "small-btn", "Review");
                    btn.type = "button";
                    btn.addEventListener("click", () => {
                        current = i;
                        $("dlgTitle").textContent = i.name;
                        form.registration_number.value = i.registration_number || "";
                        form.accreditation_details.value = i.accreditation_details || "";
                        form.is_accredited.checked = i.is_accredited;
                        msg.textContent = "";
                        dlg.showModal();
                    });
                    const act = el("td"); act.append(btn);
                    tr.append(nameTd(i.name), td(i.province), td(i.registration_number), statusTd(i.is_accredited), act);
                    return tr;
                });
            }
            render();

            $("dlgCancel").addEventListener("click", () => dlg.close());
            form.addEventListener("submit", async e => {
                e.preventDefault();
                const body = {
                    id: current.id,
                    registration_number: form.registration_number.value.trim(),
                    accreditation_details: form.accreditation_details.value.trim(),
                    is_accredited: form.is_accredited.checked
                };
                try {
                    await call("set_verification", body);
                    Object.assign(current, { registration_number: body.registration_number || null,
                        accreditation_details: body.accreditation_details || null, is_accredited: body.is_accredited });
                    dlg.close();
                    render();
                    call("stats").then(s => document.querySelectorAll("[data-stat=pending]").forEach(n => { n.textContent = s.pending; }));
                } catch (err) {
                    msg.textContent = friendly(err);
                    msg.className = "form-msg err";
                }
            });
        },

        async reports() {
            const d = await call("reports");
            const groups = [["Institutions by province", d.by_province], ["Institutions by type", d.by_type],
                ["Verification status", d.by_status], ["Courses by category", d.by_category], ["Bursary deadlines", d.bursaries]];
            $("reportGrid").replaceChildren(...groups.map(([title, rows]) => {
                const card = el("div", "dashboard-card"), h = el("h2", "", title);
                card.append(h);
                const max = Math.max(1, ...rows.map(r => Number(r.n)));
                if (!rows.length) card.append(el("p", "empty-row", "No data yet."));
                rows.forEach(r => {
                    const row = el("div", "bar-row"), bar = el("div", "bar"), fill = el("span");
                    fill.style.width = (Number(r.n) / max * 100) + "%";
                    bar.append(fill);
                    row.append(el("span", "", r.label), bar, el("strong", "", String(r.n)));
                    card.append(row);
                });
                return card;
            }));
        },

        async bursaries() {
            const { bursaries } = await call("bursaries");
            fillRows(bursaries, b => {
                const tr = el("tr"), act = el("td", "action-cell");
                act.append(deleteButton("delete_bursary", b.id, b.name, "Students will no longer see it.", tr));
                tr.append(td(b.name), td(b.provider), td(b.field_of_study),
                    td(b.deadline ? new Date(b.deadline + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "Not set"), act);
                return tr;
            });
        },

        "add-bursary"() { bindForm($("adminForm"), "add_bursary"); },

        "add-student"() {
            bindForm($("adminForm"), "add_student", {
                validate: b => /^[a-zA-Z0-9_]{3,50}$/.test(b.username) ? "" : "Username must be 3-50 letters, numbers or underscores."
            });
        },

        settings() {
            bindForm($("adminForm"), "change_password", {
                validate: b => b.new_password !== b.confirm_password ? "New passwords do not match." : ""
            });
        },

        "add-institution"() {
            bindForm($("adminForm"), "add_institution", {
                validate: b => b.is_accredited && !b.registration_number
                    ? "Enter a registration number to mark an institution as verified." : ""
            });
        },

        async "add-course"() {
            const form = $("adminForm");
            bindForm(form, "add_course");
            try {
                const { institutions } = await call("institutions");
                institutions.forEach(i => form.institution_id.append(new Option(i.name, i.id)));
            } catch (err) {
                form.querySelector(".form-msg").textContent = friendly(err);
            }
        }
    };

    const start = pages[page];
    if (start) {
        Promise.resolve(start()).catch(err => {
            if (empty) { empty.textContent = friendly(err); empty.hidden = false; }
        });
    }
});