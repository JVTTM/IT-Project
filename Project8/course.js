"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("searchForm");
    const searchBar = document.getElementById("searchBar");
    const suggestions = document.getElementById("suggestions");

    const institutionTags = document.getElementById("institutionTags");
    const institutionFilterStatus = document.getElementById("institutionFilterStatus");
    const clearInstitutionFilter = document.getElementById("clearInstitutionFilter");

    const categoryFilter = document.getElementById("categoryFilter");
    const qualificationFilter = document.getElementById("qualificationFilter");
    const studyModeFilter = document.getElementById("studyModeFilter");
    const clearFilters = document.getElementById("clearFilters");

    const coursesContainer = document.getElementById("coursesContainer");
    const resultsCount = document.getElementById("resultsCount");
    const loadingState = document.getElementById("loadingState");
    const noCourses = document.getElementById("noCourses");
    const searchError = document.getElementById("searchError");
    const retryButton = document.getElementById("retryButton");

    const INSTITUTIONS_API = "api-institutions.php";
    const COURSES_API = "api-courses.php";

    let institutions = [];
    let courses = [];
    let selectedInstitutionId = null;
    let searchTerm = "";

    function hideSuggestions() {
        if (!suggestions) return;

        suggestions.replaceChildren();
        suggestions.hidden = true;
        suggestions.classList.remove("is-visible");
        searchBar?.setAttribute("aria-expanded", "false");
    }

    function setLoading(isLoading) {
        if (loadingState) loadingState.hidden = !isLoading;

        if (coursesContainer) {
            coursesContainer.setAttribute(
                "aria-busy",
                String(isLoading)
            );
        }
    }

    function showCourseError(show) {
        if (searchError) searchError.hidden = !show;
    }

    async function fetchJSON(url) {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        const text = await response.text();

        let data;

        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(
                `The server returned invalid JSON (HTTP ${response.status}). ` +
                "Check the PHP error log."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.error || `Request failed: HTTP ${response.status}`
            );
        }
        return data;
    }

    function getInstitutionId(course) {
        const value =
            course.institution_id ??
            course.institutionId ??
            course.institution?.id;

        return value == null ? null : String(value);
    }

    function getInstitutionName(course) {
        return (
            course.institution_name ??
            course.institutionName ??
            course.institution?.name ??
            ""
        );
    }

    function normalise(value) {
        return String(value ?? "").trim().toLowerCase();
    }

    function createTagButton(institution, isActive) {
        const button = document.createElement("button");

        button.type = "button";
        button.className =
            "institution-filter-tag" + (isActive ? " active" : "");

        button.textContent = institution.name;
        button.setAttribute("aria-pressed", String(isActive));

        button.addEventListener("click", () => {
            selectedInstitutionId = isActive
                ? null
                : String(institution.id);

            renderInstitutionTags();
            renderCourses();
        });

        return button;
    }

    function renderInstitutionTags() {
        if (!institutionTags) return;

        institutionTags.replaceChildren();

        const allButton = document.createElement("button");
        allButton.type = "button";
        allButton.className =
            "institution-filter-tag" +
            (selectedInstitutionId === null ? " active" : "");

        allButton.textContent = "All institutions";
        allButton.setAttribute(
            "aria-pressed",
            String(selectedInstitutionId === null)
        );

        allButton.addEventListener("click", () => {
            selectedInstitutionId = null;
            renderInstitutionTags();
            renderCourses();
        });

        institutionTags.appendChild(allButton);

        institutions.forEach(institution => {
            institutionTags.appendChild(
                createTagButton(
                    institution,
                    selectedInstitutionId === String(institution.id)
                )
            );
        });

        if (institutionFilterStatus) {
            const selected = institutions.find(
                item => String(item.id) === selectedInstitutionId
            );

            institutionFilterStatus.textContent = selected
                ? `Showing courses for ${selected.name}`
                : "Showing courses from all institutions";
        }
    }

    function createCard(course) {
        const card = document.createElement("article");
        card.className = "card";

        const imageUrl = course.image_url || course.imageUrl || "";
        const courseName = course.name || course.course_name || "Untitled course";
        const description =
            course.description || "Contact the institution for programme details.";

        if (imageUrl) {
            const picture = document.createElement("div");
            picture.className = "card_picture";

            const image = document.createElement("img");
            image.className = "card_img";
            image.src = imageUrl;
            image.alt = courseName;
            image.loading = "lazy";

            image.addEventListener("error", () => {
                picture.remove();
            }, { once: true });

            picture.appendChild(image);
            card.appendChild(picture);
        }

        const heading = document.createElement("div");
        heading.className = "card_heading";

        const title = document.createElement("h3");
        title.className = "card_title";
        title.textContent = courseName;

        heading.appendChild(title);
        card.appendChild(heading);

        const descriptionElement = document.createElement("p");
        descriptionElement.className = "card_description";
        descriptionElement.textContent = description;
        card.appendChild(descriptionElement);

        const institutionName = getInstitutionName(course);

        if (institutionName) {
            const institutionElement = document.createElement("p");
            institutionElement.className = "institution_name";
            institutionElement.textContent = `Institution: ${institutionName}`;
            card.appendChild(institutionElement);
        }

        const tagContainer = document.createElement("div");
        tagContainer.className = "card_tag";

        [
            course.category,
            course.qualification,
            course.min_aps ? "Min APS " + course.min_aps : null,
            course.study_mode ?? course.studyMode
        ].filter(Boolean).forEach(value => {
            const tag = document.createElement("span");
            tag.className = "tags";
            tag.textContent = String(value);
            tagContainer.appendChild(tag);
        });

        if (tagContainer.childElementCount > 0) {
            card.appendChild(tagContainer);
        }

        const website = course.website_url || course.websiteUrl || "";

        if (website) {
            try {
                const parsedUrl = new URL(website, window.location.href);

                if (["http:", "https:"].includes(parsedUrl.protocol)) {
                    const link = document.createElement("a");
                    link.className = "apply";
                    link.href = parsedUrl.href;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    link.textContent = "View programme";
                    card.appendChild(link);
                }
            } catch {
            }
        }

        const detailsLink = document.createElement("a");
        detailsLink.className = "apply";
        detailsLink.href = "course-details.html?id=" + encodeURIComponent(course.id);
        detailsLink.textContent = "View Details";
        card.appendChild(detailsLink);

        return card;
    }

    function renderCourses() {
        if (!coursesContainer) return;

        coursesContainer.replaceChildren();

        const filtered = courses.filter(course => {
            const matchesInstitution =
                selectedInstitutionId === null ||
                getInstitutionId(course) === selectedInstitutionId;

            const searchableText = normalise([
                course.name,
                course.course_name,
                course.description,
                course.category,
                course.qualification,
                course.study_mode,
                getInstitutionName(course)
            ].join(" "));

            const matchesSearch =
                !searchTerm ||
                searchableText.includes(normalise(searchTerm));

            const matchesCategory =
                !categoryFilter?.value ||
                normalise(course.category) === normalise(categoryFilter.value);

            const matchesQualification =
                !qualificationFilter?.value ||
                normalise(course.qualification).includes(
                    normalise(qualificationFilter.value)
                );

            const matchesStudyMode =
                !studyModeFilter?.value ||
                normalise(course.study_mode ?? course.studyMode).includes(
                    normalise(studyModeFilter.value)
                );

            return matchesInstitution &&
                matchesSearch &&
                matchesCategory &&
                matchesQualification &&
                matchesStudyMode;
        });

        filtered.forEach(course => {
            coursesContainer.appendChild(createCard(course));
        });

        if (resultsCount) {
            resultsCount.textContent =
                `${filtered.length} course${filtered.length === 1 ? "" : "s"} found`;
        }

        if (noCourses) noCourses.hidden = filtered.length !== 0;

        if (loadingState) loadingState.hidden = true;

        showCourseError(false);

        coursesContainer.setAttribute("aria-busy", "false");
    }

    function updateSuggestions() {
        if (!suggestions || !searchBar) return;
        const term = normalise(searchBar.value);
        suggestions.replaceChildren();

        if (!term) {
            hideSuggestions();
            return;
        }

        const matches = courses
            .map(course => course.name || course.course_name)
            .filter(Boolean)
            .filter((name, index, list) =>
                list.findIndex(item => normalise(item) === normalise(name)) === index
            )
            .filter(name => normalise(name).includes(term))
            .slice(0, 8);

        if (matches.length === 0) {
            const message = document.createElement("div");
            message.className = "no-results";
            message.textContent = "No suggestions found";
            suggestions.appendChild(message);
        } else {
            matches.forEach(name => {
                const button = document.createElement("button");

                button.type = "button";
                button.className = "suggestion-item";
                button.setAttribute("role", "option");
                button.textContent = name;

                button.addEventListener("click", () => {
                    searchBar.value = name;
                    searchTerm = name;
                    hideSuggestions();
                    renderCourses();
                });

                suggestions.appendChild(button);
            });
        }

        suggestions.hidden = false;
        suggestions.classList.add("is-visible");
        searchBar.setAttribute("aria-expanded", "true");
    }

    async function loadInstitutions() {
        const data = await fetchJSON(INSTITUTIONS_API);

        institutions = Array.isArray(data.institutions)
            ? data.institutions
            : [];

        renderInstitutionTags();
    }

    async function loadCourses() {
        setLoading(true);
        showCourseError(false);

        try {
            const data = await fetchJSON(COURSES_API);

            courses = Array.isArray(data.courses)
                ? data.courses
                : [];

            renderCourses();
        } catch (error) {
            console.error("Course loading failed:", error);

            if (loadingState) loadingState.hidden = true;

            showCourseError(true);

            if (resultsCount) {
                resultsCount.textContent = "Courses could not be loaded";
            }

            coursesContainer?.setAttribute("aria-busy", "false");
        }
    }

    searchForm?.addEventListener("submit", event => {
        event.preventDefault();

        searchTerm = searchBar.value.trim();
        hideSuggestions();
        renderCourses();
    });

    searchBar?.addEventListener("input", () => {
        updateSuggestions();
    });

    document.addEventListener("click", event => {
        if (
            suggestions &&
            !suggestions.contains(event.target) &&
            event.target !== searchBar
        ) {
            hideSuggestions();
        }
    });

    [
        categoryFilter,
        qualificationFilter,
        studyModeFilter
    ].forEach(filter => {
        filter?.addEventListener("change", renderCourses);
    });

    clearInstitutionFilter?.addEventListener("click", () => {
        selectedInstitutionId = null;
        renderInstitutionTags();
        renderCourses();
    });

    clearFilters?.addEventListener("click", () => {
        if (searchBar) searchBar.value = "";
        if (categoryFilter) categoryFilter.value = "";
        if (qualificationFilter) qualificationFilter.value = "";
        if (studyModeFilter) studyModeFilter.value = "";
        searchTerm = "";
        selectedInstitutionId = null;

        hideSuggestions();
        renderInstitutionTags();
        renderCourses();
    });

    retryButton?.addEventListener("click", async () => {
        await loadCourses();
    });

    async function initialise() {
        try {
            await loadInstitutions();
        } catch (error) {
            console.error("Institution loading failed:", error);

            if (institutionTags) {
                institutionTags.replaceChildren();
                const message = document.createElement("p");
                message.className = "loading-text";
                message.textContent = "Unable to load institutions. Please refresh the page.";

                institutionTags.appendChild(message);
            }
        }
        await loadCourses();
    }
    initialise();
});
