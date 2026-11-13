"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const searchBar = document.getElementById("searchBar");
    const searchForm = document.getElementById("searchForm");
    const container = document.getElementById("institutionsContainer");
    const noInstitutions = document.getElementById("noInstitutions");
    const searchError = document.getElementById("searchError");

    if (!searchBar || !searchForm || !container ||
        !noInstitutions || !searchError) {
        console.error("Institution.html is missing required elements.");
        return;
    }

    async function loadInstitutions(query = "") {
        searchError.hidden = true;

        try {
            const url = new URL(
                "/Project/api-institutions.php",
                window.location.origin
            );

            url.searchParams.set("q", query.trim());

            console.log("Fetching:", url.href);

            const response = await fetch(url.href, {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }

            const data = await response.json();

            if (!Array.isArray(data.institutions)) {
                throw new Error("Invalid response from api-institutions.php");
            }

            container.replaceChildren();

            data.institutions.forEach(institution => {
                const card = document.createElement("article");
                card.className = "card";

                const title = document.createElement("h3");
                title.className = "card_title";
                title.textContent = institution.name || "Unnamed institution";

                const description = document.createElement("p");
                description.className = "card_description";
                description.textContent =
                    institution.description || "No description available.";

                const details = document.createElement("p");
                details.className = "card_description";
                details.textContent = [
                    institution.institution_type,
                    institution.city,
                    institution.province
                ].filter(Boolean).join(" · ");

                card.append(title, description, details);

                if (Array.isArray(institution.tags)) {
                    const tags = document.createElement("div");
                    tags.className = "card_tag";

                    institution.tags.forEach(tag => {
                        const span = document.createElement("span");
                        span.className = "tags";
                        span.textContent = tag;
                        tags.appendChild(span);
                    });

                    card.appendChild(tags);
                }

                const detailsLink = document.createElement("a");
                detailsLink.className = "apply";
                detailsLink.href = "institution-details.html?id=" + encodeURIComponent(institution.id);
                detailsLink.textContent = "View Details";
                card.appendChild(detailsLink);

                if (institution.website_url) {
                    try {
                        const website = new URL(institution.website_url);

                        if (["http:", "https:"].includes(website.protocol)) {
                            const link = document.createElement("a");
                            link.className = "apply";
                            link.href = website.href;
                            link.target = "_blank";
                            link.rel = "noopener noreferrer";
                            link.textContent = "Visit Website";
                            card.appendChild(link);
                        }
                    } catch (error) {
                        console.warn("Invalid institution website URL.");
                    }
                }

                container.appendChild(card);
            });

            noInstitutions.hidden = data.institutions.length > 0;

            console.log(
                "Cards displayed:",
                container.querySelectorAll(".card").length
            );

        } catch (error) {
            console.error("Institution loading failed:", error);
            container.replaceChildren();
            noInstitutions.hidden = true;
            searchError.hidden = false;
            searchError.textContent =
                "Unable to load institutions. Check the Console.";
        }
    }

    searchForm.addEventListener("submit", event => {
        event.preventDefault();
        loadInstitutions(searchBar.value);
    });

    loadInstitutions("");
});
