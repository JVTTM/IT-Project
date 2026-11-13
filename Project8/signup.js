"use strict";

const form = document.getElementById("signupForm");
const username = document.getElementById("username");
const email = document.getElementById("email");
const password = document.getElementById("password");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";

    const user = username.value.trim();
    const mail = email.value.trim();
    const pass = password.value;

    if (!/^[a-zA-Z0-9_]{3,50}$/.test(user)) {
        message.textContent = "Username must be 3–50 letters, numbers, or underscores.";
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
        message.textContent = "Enter a valid email address.";
        return;
    }

    if (pass.length < 8 || !/[A-Z]/.test(pass) ||
        !/[a-z]/.test(pass) || !/[0-9]/.test(pass)) {
        message.textContent = "Password needs 8 characters, uppercase, lowercase, and a number.";
        return;
    }

    try {
        const response = await fetch("signup.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: user, email: mail, password: pass })
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "Registration failed.");

        message.style.color = "green";
        message.textContent = result.message || "Account created successfully!";
        form.reset();
        setTimeout(() => location.replace("Login Page.html"), 1500);
    } catch (error) {
        message.style.color = "red";
        message.textContent = error.message || "Unable to connect to the server.";
    }
});