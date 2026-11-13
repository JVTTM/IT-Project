
"use strict";

const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) return;

    const button = contactForm.querySelector('button[type="submit"]');

    button.disabled = true;
    button.textContent = "Sending...";

    formStatus.hidden = false;

    try {
        const response = await fetch("send-message.php", {
            method: "POST",
            body: new FormData(contactForm)
        });

        const result = await response.text();

        if (!response.ok) {
            throw new Error(result);
        }

        if (!result.startsWith("SUCCESS:")) {
            throw new Error(result);
        }

        formStatus.textContent = result;
        contactForm.reset();

    } catch (error) {
        formStatus.textContent = error.message;
        console.error(error);

    } finally {
        button.disabled = false;
        button.textContent = "Send Message";
    }
});
