"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("forgotForm");
    const email = document.getElementById("email");
    const button = document.getElementById("forgotButton");
    const message = document.getElementById("forgotMessage");

    function show(text, ok) {
        message.textContent = text;
        message.style.color = ok ? "#067647" : "#dc2626";
        message.hidden = false;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const value = email.value.trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            show("Enter a valid email address.", false);
            return;
        }

        button.disabled = true;
        button.textContent = "Sending...";

        try {
            const response = await fetch("./forgot-password.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: value })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Request failed.");

            show(result.message, true);
            form.reset();
        } catch (error) {
            show(error instanceof TypeError
                ? "Unable to contact the server. Check XAMPP."
                : error.message, false);
        } finally {
            button.disabled = false;
            button.textContent = "Send Reset Link";
        }
    });
});
