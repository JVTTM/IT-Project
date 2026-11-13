"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("loginButton");
    const loginMessage = document.getElementById("loginMessage");

    if (!loginForm || !usernameInput || !passwordInput ||
        !loginButton || !loginMessage) {
        console.error("Login HTML elements are missing.");
        return;
    }

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        loginButton.disabled = true;
        loginButton.textContent = "Signing in...";
        loginMessage.hidden = true;
        loginMessage.textContent = "";

        try {
            const response = await fetch("./admin-login.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    password: passwordInput.value
                })
            });

            const result = await response.json();

            if (!response.ok || result.success !== true) {
                throw new Error(
                    result.error || "Login failed. Please try again."
                );
            }

            window.location.replace(result.redirect || "./admin.html");

        } catch (error) {
            console.error("Login error:", error);

            loginMessage.textContent =
                error instanceof TypeError
                    ? "Unable to contact the server. Check XAMPP."
                    : error instanceof SyntaxError
                        ? "Invalid server response. Check login.php."
                        : error.message;

            loginMessage.style.color = "#dc2626";
            loginMessage.hidden = false;

            loginButton.disabled = false;
            loginButton.textContent = "Login";
        }
    });
});
