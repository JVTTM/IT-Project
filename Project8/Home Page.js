"use strict";

const searchBar = document.getElementById("searchBar");
const suggestions = document.getElementById("suggestions");
const searchForm = document.getElementById("searchForm");

const searchItems = [
    "University of Johannesburg",
    "University of Pretoria",
    "University of Cape Town",
    "University of the Witwatersrand",
    "Stellenbosch University",
    "Tshwane University of Technology",
    "Cape Peninsula University of Technology",
    "Colleges in South Africa",
    "Universities in South Africa",

    "Computer Science",
    "Information Technology",
    "Civil Engineering",
    "Mechanical Engineering",
    "Bachelor of Education",
    "Bachelor of Commerce",
    "Nursing",
    "Law"
];

const institutionKeywords = [
    "university",
    "universities",
    "college",
    "colleges",
    "institution",
    "institutions"
];

let activeIndex = -1;
let filteredItems = [];

searchBar.setAttribute("role", "combobox");
searchBar.setAttribute("aria-autocomplete", "list");
searchBar.setAttribute("aria-controls", "suggestions");
searchBar.setAttribute("aria-expanded", "false");
suggestions.setAttribute("role", "listbox");

function closeSuggestions() {
    suggestions.classList.remove("is-visible");
    searchBar.setAttribute("aria-expanded", "false");
    searchBar.removeAttribute("aria-activedescendant");
    activeIndex = -1;
}

function showSuggestions() {
    const query = searchBar.value.trim().toLowerCase();

    suggestions.replaceChildren();
    activeIndex = -1;

    if (!query) {
        filteredItems = [];
        closeSuggestions();
        return;
    }

    filteredItems = searchItems.filter(item =>
        item.toLowerCase().includes(query)
    );

    if (!filteredItems.length) {
        const message = document.createElement("div");
        message.className = "no-results";
        message.textContent = "No matching results found.";
        suggestions.appendChild(message);
    } else {
        filteredItems.forEach((item, index) => {
            const option = document.createElement("div");

            option.className = "suggestion-item";
            option.id = `suggestion-${index}`;
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", "false");
            option.textContent = item;

            option.addEventListener("mousedown", event => {
                event.preventDefault();
                searchBar.value = item;
                closeSuggestions();
            });

            suggestions.appendChild(option);
        });
    }

    suggestions.classList.add("is-visible");
    searchBar.setAttribute("aria-expanded", "true");
}

function updateActiveSuggestion() {
    const options = suggestions.querySelectorAll(
        ".suggestion-item"
    );

    options.forEach((option, index) => {
        const active = index === activeIndex;

        option.classList.toggle("active", active);
        option.setAttribute("aria-selected", String(active));
    });

    const selected = options[activeIndex];

    if (selected) {
        searchBar.setAttribute(
            "aria-activedescendant",
            selected.id
        );
        selected.scrollIntoView({ block: "nearest" });
    } else {
        searchBar.removeAttribute("aria-activedescendant");
    }
}

searchBar.addEventListener("input", showSuggestions);

searchBar.addEventListener("keydown", event => {
    const options = suggestions.querySelectorAll(
        ".suggestion-item"
    );

    if (event.key === "Escape") {
        closeSuggestions();
        return;
    }

    if (!suggestions.classList.contains("is-visible")) {
        if (event.key === "ArrowDown" && searchBar.value.trim()) {
            showSuggestions();
        } else {
            return;
        }
    }

    const count = suggestions.querySelectorAll(
        ".suggestion-item"
    ).length;

    if (!count) return;

    if (event.key === "ArrowDown") {
        event.preventDefault();
        activeIndex = (activeIndex + 1) % count;
        updateActiveSuggestion();
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        activeIndex = (activeIndex - 1 + count) % count;
        updateActiveSuggestion();
    } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        searchBar.value = filteredItems[activeIndex];
        closeSuggestions();
    }
});

document.addEventListener("click", event => {
    if (!event.target.closest(".autocomplete")) {
        closeSuggestions();
    }
});

searchForm.addEventListener("submit", event => {
    event.preventDefault();

    const query = searchBar.value.trim();

    if (!query) {
        searchBar.focus();
        return;
    }

    const term = query.toLowerCase();

    const isInstitution = institutionKeywords.some(keyword =>
        term.includes(keyword)
    );

    const page = isInstitution
        ? "institutions.html"
        : "courses.html";

    window.location.href =
        `${page}?q=${encodeURIComponent(query)}`;
});