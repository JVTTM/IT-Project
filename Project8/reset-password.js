"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("resetForm");
    const password = document.getElementById("password");
    const confirm = document.getElementById("confirm");
    const button = document.getElementById("resetButton");
    const message = document.getElementById("resetMessage");
    const token = new URLSearchParams(location.search).get("token") || "";

    function show(text, ok) {
        message.textContent = text;
        message.style.color = ok ? "#067647" : "#dc2626";
        message.hidden = false;
    }

    if (!/^[a-f0-9]{64}$/.test(token)) {
        button.disabled = true;
        show("This reset link is invalid. Request a new one.", false);
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const pass = password.value;

        if (pass.length < 8 || !/[A-Z]/.test(pass) ||
            !/[a-z]/.test(pass) || !/[0-9]/.test(pass)) {
            show("Password needs 8 characters, uppercase, lowercase, and a number.", false);
            return;
        }
        if (pass !== confirm.value) {
            show("Passwords do not match.", false);
            return;
        }

        button.disabled = true;
        try {
            const response = await fetch("./reset-password.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password: pass })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Reset failed.");

            show("Password updated. Redirecting to login...", true);
            setTimeout(() => location.replace("./Login%20Page.html"), 1500);
        } catch (error) {
            show(error instanceof TypeError
                ? "Unable to contact the server. Check XAMPP." : error.message, false);
            button.disabled = false;
        }
    });
});
